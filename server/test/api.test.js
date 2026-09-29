const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

test('Oracle-backed authentication and user CRUD with an isolated database stub', async t => {
    const records = new Map([
        ['U001', ['U001', 'Test', 'Admin', '0200000000', 'D0001', 'P1', 'test-admin']],
        ['U002', ['U002', 'Test', 'Driver', '0300000000', 'D0002', 'P2', 'test-driver']],
    ]);
    const calls = [];
    let opened = 0, closed = 0, broken = false;
    const app = createApp(async () => {
        opened++;
        return {
            async execute(sql, binds, options) {
                calls.push({ sql, binds, options });
                if (broken) throw new Error('simulated connection error');
                if (sql.startsWith('SELECT')) {
                    const rows = binds.userId ? (records.has(binds.userId) ? [records.get(binds.userId)] : []) : [...records.values()];
                    return { rows: rows.map(row => sql.includes('FIRST_NAME, LAST_NAME, POS_ID') ? [row[0], row[1], row[2], row[5]] : sql.includes(', PASSWORD FROM') ? [...row] : row.slice(0, 6)) };
                }
                const old = records.get(binds.userId);
                if (sql.startsWith('INSERT')) {
                    if (old) throw Object.assign(new Error('duplicate'), { errorNum: 1 });
                    records.set(binds.userId, [binds.userId, binds.firstName, binds.lastName, binds.phone, binds.deptId, binds.posId, binds.password]);
                } else if (sql.startsWith('UPDATE')) {
                    if (!old) return { rowsAffected: 0 };
                    records.set(binds.userId, [binds.userId, binds.firstName, binds.lastName, binds.phone, binds.deptId, binds.posId, binds.password || old[6]]);
                } else if (sql.startsWith('DELETE')) {
                    if (!records.delete(binds.userId)) return { rowsAffected: 0 };
                }
                assert.equal(options.autoCommit, true);
                return { rowsAffected: 1 };
            },
            async close() { closed++; },
        };
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(path, { method = 'GET', body, cookie = '' } = {}) {
        const res = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body && JSON.stringify(body) });
        return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0], cookieHeader: res.headers.get('set-cookie') };
    }
    await t.test('anonymous, invalid login, no password disclosure', async () => {
        assert.equal((await request('/users')).status, 401);
        assert.equal((await request('/auth/login', { method: 'POST', body: { userId: 'U001', password: 'wrong' } })).status, 401);
        assert.equal((await request('/auth/login', { method: 'POST', body: { userId: "U001' OR '1'='1", password: 'wrong' } })).status, 401);
        assert.equal((await request('/auth/login', { method: 'POST', body: {} })).status, 400);
    });
    const admin = await request('/auth/login', { method: 'POST', body: { userId: ' u001 ', password: 'test-admin' } });
    const driver = await request('/auth/login', { method: 'POST', body: { userId: 'U002', password: 'test-driver' } });
    assert.equal(admin.status, 200);
    assert.match(admin.cookieHeader, /HttpOnly/);
    assert.match(admin.cookieHeader, /SameSite=Strict/);
    assert.equal(admin.body.password, undefined);
    await t.test('server enforces roles, restores session and sanitizes directory', async () => {
        assert.equal((await request('/auth/me', { cookie: admin.cookie })).body.userId, 'U001');
        assert.equal((await request('/users', { cookie: driver.cookie })).status, 403);
        assert.equal((await request('/users/U001', { method: 'DELETE', cookie: driver.cookie })).status, 403);
        const users = await request('/users', { cookie: admin.cookie });
        assert.equal(users.body[0].password, undefined);
        const directory = await request('/directory', { cookie: driver.cookie });
        assert.equal(directory.body[0].phone, undefined);
        assert.equal(directory.body[0].password, undefined);
    });
    await t.test('create, edit retaining password, required fields, leading zeroes and duplicate IDs', async () => {
        const user = { userId: 'U100', firstName: 'ทดสอบ', lastName: 'ระบบ', phone: '0123456789', password: 'test-user', posId: 'P3' };
        assert.equal((await request('/users', { method: 'POST', cookie: admin.cookie, body: { ...user, phone: 123 } })).status, 400);
        assert.equal((await request('/users', { method: 'POST', cookie: admin.cookie, body: user })).status, 201);
        assert.equal(records.get('U100')[3], '0123456789');
        assert.equal(records.get('U100')[4], null);
        assert.equal((await request('/users', { method: 'POST', cookie: admin.cookie, body: user })).status, 409);
        assert.equal((await request('/users/U100', { method: 'PUT', cookie: admin.cookie, body: { ...user, password: '' } })).status, 200);
        assert.equal(records.get('U100')[6], 'test-user');
        assert.equal((await request('/users/missing', { method: 'PUT', cookie: admin.cookie, body: user })).status, 404);
        assert.equal((await request('/users/missing', { cookie: admin.cookie })).status, 404);
    });
    await t.test('self protection and session revocation', async () => {
        assert.equal((await request('/users/U001', { method: 'DELETE', cookie: admin.cookie })).status, 400);
        assert.equal((await request('/users/U001', { method: 'PUT', cookie: admin.cookie, body: { firstName: 'Admin', lastName: 'Test', posId: 'P3' } })).status, 400);
        await request('/users/U002', { method: 'PUT', cookie: admin.cookie, body: { firstName: 'Test', lastName: 'Driver', posId: 'P2', password: 'changed' } });
        assert.equal((await request('/auth/me', { cookie: driver.cookie })).status, 401);
        assert.equal((await request('/users/U100', { method: 'DELETE', cookie: admin.cookie })).status, 200);
        assert.equal((await request('/users/U100', { method: 'DELETE', cookie: admin.cookie })).status, 404);
    });
    await t.test('database failure, connection cleanup and logout', async () => {
        broken = true;
        assert.equal((await request('/users', { cookie: admin.cookie })).status, 500);
        broken = false;
        await request('/auth/logout', { method: 'POST', cookie: admin.cookie });
        assert.equal((await request('/auth/me', { cookie: admin.cookie })).status, 401);
        assert.equal(opened, closed);
        for (const call of calls) assert.ok(!call.sql.includes("OR '1'='1"));
    });
});
