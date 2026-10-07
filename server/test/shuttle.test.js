const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadShuttle, publicShuttle, applyAction, normalizeDate } = require('../shuttle');
const { memoryDatabase } = require('./memory-db.cjs');
const { createApp } = require('../server');
const users = [
    ['U001', 'Test', 'Admin', null, 'D0001', 'P1', 'test-admin'],
    ['U002', 'Test', 'Driver', null, 'D0002', 'P2', 'test-driver'],
    ['U005', 'Test', 'Passenger', null, null, 'P3', 'test-user'],
    ['U006', 'Test', 'Other', null, null, 'P3', 'test-other'],
];

test('date adapter handles actual Oracle string date formats', () => {
    assert.equal(normalizeDate('14/9/69'), '2026-09-14');
    assert.equal(normalizeDate('13/09/2026'), '2026-09-13');
    assert.equal(normalizeDate('13/09/2569'), '2026-09-13');
    assert.equal(normalizeDate('2026-09-13'), '2026-09-13');
});

test('opening rounds through the API persists 1, 3 and 7 days without duplicates', async t => {
    const { createDemoData } = await import('../../shared/test/fixtures.mjs');
    const { todayISO, addDays } = await import('../../shared/dates.mjs');
    for (const days of [1, 3, 7]) await t.test(`${days} days`, async () => {
        const seed = createDemoData();
        seed.cars[0].statusId = 'CS2'; // A car under repair must not get new rounds.
        const db = memoryDatabase(seed, users);
        const server = createApp(db.connect).listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        try {
            const base = `http://127.0.0.1:${server.address().port}/api`;
            const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'U001', password: 'test-admin' }) });
            assert.equal(login.status, 200);
            const cookie = login.headers.get('set-cookie').split(';')[0];
            const date = addDays(todayISO(), 10);
            const request = () => fetch(base + '/shuttle/actions', {
                method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'openRounds', payload: { date, days } }),
            });
            const response = await request();
            assert.equal(response.status, 200);
            const opened = (await response.json()).rounds.filter(round => round.date >= date);
            const eligible = seed.schedules.filter(schedule => seed.cars.find(car => car.id === schedule.carId).statusId !== 'CS2');
            assert.equal(opened.length, eligible.length * days);
            for (let day = 0; day < days; day++) for (const schedule of eligible) {
                const round = opened.find(item => item.scheduleId === schedule.id && item.date === addDays(date, day));
                assert.ok(round);
                assert.equal(round.statusId, 'RS1');
                const stored = db.tables().TRIP_ROUND.find(item => item.ROUND_ID === round.id);
                assert.equal(stored.TRIP_DATE, round.date);
                assert.equal(stored.STATUS_ID, 'BC001');
            }
            const beforeRepeat = structuredClone(db.tables());
            assert.equal((await request()).status, 200);
            assert.deepEqual(db.tables(), beforeRepeat);
            const snapshot = await fetch(base + '/shuttle', { headers: { Cookie: cookie } });
            assert.equal(snapshot.status, 200);
            assert.deepEqual((await snapshot.json()).rounds.filter(round => round.date >= date), opened);
        } finally { await new Promise(resolve => server.close(resolve)); }
        assert.equal(db.metrics.opened, db.metrics.closed);
    });
});

test('Oracle mappings, transactions, rollback, privacy and seat contention', async t => {
    const { createDemoData, todayISO, addDays } = await import('../../shared/test/fixtures.mjs');
    const db = memoryDatabase(createDemoData(), users);
    const admin = { userId: 'U001', posId: 'P1' }, passenger = { userId: 'U005', posId: 'P3' };
    async function read() { const c = await db.connect(); try { return await loadShuttle(c); } finally { await c.close(); } }
    async function act(type, payload, user = admin) {
        const c = await db.connect();
        try { return await applyAction(c, { type, payload }, user); }
        catch (error) { await c.rollback(); throw error; }
        finally { await c.close(); }
    }
    const data = await read();
    await t.test('database status codes map correctly and private bookings are filtered', async () => {
        assert.equal(data.bookingStatuses.find(s => s.id === 'BS5').name, 'ยกเลิก');
        assert.equal(data.rounds[0].seats, 12);
        const visible = publicShuttle(data, passenger);
        assert.ok(visible.bookings.every(b => b.userId === 'U005'));
        assert.equal(visible.userRefs, undefined);
        assert.equal(visible.rounds[0].reservedSeats, 2);
        assert.ok(!JSON.stringify(visible).includes('test-admin'));
    });
    await t.test('new departments are persisted and failures roll back atomically', async () => {
        await act('saveMaster', { collection: 'departments', item: { id: 'DTEST', name: 'ทดสอบ' } });
        assert.ok(db.tables().DEPARTMENT.some(d => d.DEPT_ID === 'DTEST'));
        const before = JSON.stringify(db.tables());
        db.failWrites(true);
        await assert.rejects(act('saveMaster', { collection: 'departments', item: { id: 'DFAIL', name: 'ทดสอบ' } }));
        db.failWrites(false);
        assert.equal(JSON.stringify(db.tables()), before);
        await assert.rejects(act('deleteMaster', { collection: 'departments', id: 'D0001', inUse: false }));
        await assert.rejects(act('saveMaster', { collection: 'departments', item: { id: 'DENY', name: 'ทดสอบ' } }, passenger));
    });
    await t.test('two concurrent bookings cannot take the same last seats', async () => {
        const current = await read(), round = current.rounds.find(r => r.date === addDays(todayISO(), 1));
        const payload = { items: [{ roundId: round.id, originStopId: 'S001', destStopId: 'S002', seats: 4 }] };
        // Reserve four first, leaving six seats: only one concurrent group of four fits.
        await act('book', payload, passenger);
        const outcomes = await Promise.allSettled([act('book', payload, passenger), act('book', payload, { userId: 'U006', posId: 'P3' })]);
        assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
        const persisted = await read();
        assert.equal(persisted.bookingDetails.filter(d => d.roundId === round.id).reduce((n, d) => n + d.seats, 0), 10);
        const rejected = outcomes.find(o => o.status === 'rejected');
        assert.match(rejected.reason.message, /ที่นั่งไม่เพียงพอ/);
        assert.ok(db.logs.some(log => log.sql.startsWith('LOCK TABLE') && log.sql.includes('IN EXCLUSIVE MODE WAIT 5')));
        const newDetail = db.tables().BOOKING_DETAIL.find(d => d.BOOKING_ID.startsWith('B1'));
        assert.equal(newDetail.STATUS_ID, 'BS001');
    });
    await t.test('HTTP integration routes apply real adapter and revoke unauthorized writes', async () => {
        const server = createApp(db.connect).listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        try {
            const base = `http://127.0.0.1:${server.address().port}/api`;
            const login = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'U005', password: 'test-user' }) });
            const cookie = login.headers.get('set-cookie').split(';')[0];
            const snapshot = await fetch(base + '/shuttle', { headers: { Cookie: cookie } });
            assert.equal(snapshot.status, 200);
            const response = await snapshot.json();
            assert.ok(response.bookings.every(b => b.userId === 'U005'));
            const denied = await fetch(base + '/shuttle/actions', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'openRounds', payload: { date: todayISO(), days: 1 } }) });
            assert.equal(denied.status, 403);
        } finally { await new Promise(resolve => server.close(resolve)); }
    });
    assert.equal(db.metrics.opened, db.metrics.closed);
    assert.ok(db.metrics.rollbacks > 0);
});
