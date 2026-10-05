const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { nextUserId, createUser } = require('../user-accounts');
const { memoryDatabase } = require('./memory-db.cjs');

test('user numbering handles gaps, digit rollover and database column limits', () => {
    assert.equal(nextUserId([]), 'U001');
    assert.equal(nextUserId([['U001'], ['U099'], ['OTHER999']]), 'U100');
    assert.equal(nextUserId([['U1000'], ['U010']]), 'U1001');
    assert.throws(() => nextUserId([['U999999999']]), { status: 400 });
});

test('account creation and self-service profile persist through transactions', async t => {
    const { createDemoData } = await import('../../shared/test/fixtures.mjs');
    const seed = createDemoData();
    seed.permissions = [{ posId: 'P1', screenId: 'SC01' }];
    const db = memoryDatabase(seed, [
        ['U001', 'Test', 'Admin', '0111111111', 'D0001', 'P1', 'test-admin'],
        ['U002', 'Test', 'Driver', '0222222222', 'D0002', 'P2', 'test-driver'],
        ['U003', 'Test', 'Passenger', '0333333333', 'D0003', 'P3', 'test-passenger'],
    ]);
    const server = createApp(db.connect).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    async function request(path, { method = 'GET', cookie = '', body } = {}) {
        const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body && JSON.stringify(body) });
        return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
    }
    const login = (userId, password) => request('/auth/login', { method: 'POST', body: { userId, password } });
    const admin = await login('U001', 'test-admin');
    const driver = await login('U002', 'test-driver');
    const passenger = await login('U003', 'test-passenger');
    const values = { firstName: 'New', lastName: 'Member', phone: '0123456789', deptId: 'D0003', posId: 'P3', password: 'random-test@1' };

    await t.test('ID preview is protected and concurrent saves receive distinct server-assigned IDs', async () => {
        assert.equal((await request('/users/next-id')).status, 401);
        assert.equal((await request('/users/next-id', { cookie: driver.cookie })).status, 403);
        for (let i = 0; i < 2; i++) assert.equal((await request('/users/next-id', { cookie: admin.cookie })).body.userId, 'U004');
        const results = await Promise.all([0, 1].map(() => request('/users', { method: 'POST', cookie: admin.cookie, body: { ...values, userId: 'U001' } })));
        results.forEach(result => { assert.equal(result.status, 201); assert.equal(result.body.password, undefined); });
        assert.deepEqual(results.map(result => result.body.userId).sort(), ['U004', 'U005']);
        assert.equal(db.tables().USERS.length, 5);
        assert.equal(db.tables().USERS.find(row => row.USER_ID === 'U004').PHONE, '0123456789');
    });
    await t.test('failed insert rolls back and revoked permission cannot create accounts', async () => {
        const before = structuredClone(db.tables());
        db.failWrites(true);
        assert.equal((await request('/users', { method: 'POST', cookie: admin.cookie, body: values })).status, 500);
        db.failWrites(false);
        assert.deepEqual(db.tables(), before);
        const connection = await db.connect();
        await assert.rejects(createUser(connection, 'U002', values), { status: 403 });
        await connection.close();
        assert.deepEqual(db.tables(), before);
        assert.equal((await request('/users', { method: 'POST', cookie: admin.cookie, body: { ...values, password: 'short' } })).status, 400);
    });
    await t.test('driver and passenger edit only their own names without administration access', async () => {
        assert.equal((await request('/auth/profile', { method: 'PUT', body: {} })).status, 401);
        for (const [id, session] of [['U002', driver], ['U003', passenger]]) {
            const before = structuredClone(db.tables().USERS);
            const result = await request('/auth/profile', { method: 'PUT', cookie: session.cookie, body: { userId: 'U001', firstName: ' ชื่อใหม่ ', lastName: ' นามสกุลใหม่ ', posId: 'P1', deptId: 'D0001', phone: 'changed' } });
            assert.equal(result.status, 200);
            assert.equal(result.body.user.userId, id);
            assert.equal(result.body.user.firstName, 'ชื่อใหม่');
            assert.equal(result.body.user.password, undefined);
            const expected = before.map(row => row.USER_ID === id ? { ...row, FIRST_NAME: 'ชื่อใหม่', LAST_NAME: 'นามสกุลใหม่' } : row);
            assert.deepEqual(db.tables().USERS, expected);
            assert.equal((await request('/auth/me', { cookie: session.cookie })).body.firstName, 'ชื่อใหม่');
            assert.equal((await request('/users', { cookie: session.cookie })).status, 403);
        }
    });
    await t.test('invalid password changes and write failures leave all profile data untouched', async () => {
        const before = structuredClone(db.tables());
        const profile = { firstName: 'Changed', lastName: 'Name', currentPassword: 'test-driver', newPassword: 'new-password@1', confirmPassword: 'new-password@1' };
        for (const changes of [{ currentPassword: 'wrong' }, { currentPassword: '' }, { confirmPassword: 'different' }, { firstName: '' }, { newPassword: 'short', confirmPassword: 'short' }, { newPassword: 'a'.repeat(51) }, { newPassword: '' }]) {
            assert.equal((await request('/auth/profile', { method: 'PUT', cookie: driver.cookie, body: { ...profile, ...changes } })).status, 400);
            assert.deepEqual(db.tables(), before);
        }
        db.failWrites(true);
        assert.equal((await request('/auth/profile', { method: 'PUT', cookie: driver.cookie, body: profile })).status, 500);
        db.failWrites(false);
        assert.deepEqual(db.tables(), before);
        assert.equal((await request('/auth/me', { cookie: driver.cookie })).status, 200);
    });
    await t.test('both roles change passwords, keep a rotated session and invalidate old logins and sessions', async () => {
        for (const [id, oldPassword, session] of [['U002', 'test-driver', driver], ['U003', 'test-passenger', passenger]]) {
            const otherSession = await login(id, oldPassword);
            const result = await request('/auth/profile', { method: 'PUT', cookie: session.cookie, body: { firstName: 'Saved', lastName: 'Name', currentPassword: oldPassword, newPassword: 'new-password@1', confirmPassword: 'new-password@1' } });
            assert.equal(result.status, 200);
            assert.ok(result.cookie && result.cookie !== session.cookie);
            assert.equal((await request('/auth/me', { cookie: result.cookie })).body.firstName, 'Saved');
            assert.equal((await request('/auth/me', { cookie: session.cookie })).status, 401);
            assert.equal((await request('/auth/me', { cookie: otherSession.cookie })).status, 401);
            assert.equal((await login(id, oldPassword)).status, 401);
            assert.equal((await login(id, 'new-password@1')).status, 200);
            assert.equal(db.tables().USERS.find(row => row.USER_ID === id).PASSWORD, 'new-password@1');
        }
    });
    assert.equal(db.metrics.opened, db.metrics.closed);
    assert.ok(db.metrics.rollbacks >= 3);
});
