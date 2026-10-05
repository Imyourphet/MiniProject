const { test } = require('node:test');
const assert = require('node:assert/strict');
const { memoryDatabase } = require('./memory-db.cjs');
const { loadShuttle, applyAction, publicShuttle } = require('../shuttle');
const { migratePermissions } = require('../scripts/migrate-permissions.cjs');
const users = [
    ['U001', 'Test', 'Admin', null, 'D0001', 'P1', 'test-admin'],
    ['U005', 'Test', 'Member', null, 'D0002', 'P3', 'test-member'],
];
const admin = { userId: 'U001', posId: 'P1' }, member = { userId: 'U005', posId: 'P3' };
async function fixture() {
    const { createDemoData } = await import('../../shared/test/fixtures.mjs');
    return memoryDatabase(createDemoData(), users);
}
async function act(db, type, payload, user = admin) {
    const c = await db.connect();
    try { return await applyAction(c, { type, payload }, user); }
    catch (error) { await c.rollback(); throw error; }
    finally { await c.close(); }
}
async function snapshot(db) {
    const c = await db.connect();
    try { return await loadShuttle(c); } finally { await c.close(); }
}

test('Oracle adapter persists position and department CRUD and flexible permission grants', async () => {
    const db = await fixture();
    await act(db, 'saveMaster', { collection: 'positions', item: { id: 'PNEW', name: 'ตำแหน่งใหม่' } });
    await act(db, 'saveMaster', { collection: 'positions', item: { id: 'PNEW', name: 'ตำแหน่งแก้ไข' }, editing: true });
    await act(db, 'permission', { posId: 'PNEW', screenId: 'SC01', on: true });
    assert.equal((await snapshot(db)).positions.find(p => p.id === 'PNEW').name, 'ตำแหน่งแก้ไข');
    assert.ok(db.tables().PERMISSION.some(p => p.POS_ID === 'PNEW' && p.SCREEN_ID === 'SC01'));
    await act(db, 'deleteMaster', { collection: 'positions', id: 'PNEW' });
    assert.ok(!db.tables().PERMISSION.some(p => p.POS_ID === 'PNEW'));
    await act(db, 'permission', { posId: 'P3', screenId: 'SC10', on: true });
    await act(db, 'saveMaster', { collection: 'departments', item: { id: 'DNEW', name: 'แผนกใหม่' } }, member);
    await act(db, 'saveMaster', { collection: 'departments', item: { id: 'DNEW', name: 'แผนกแก้ไข' }, editing: true }, member);
    assert.equal((await snapshot(db)).departments.find(d => d.id === 'DNEW').name, 'แผนกแก้ไข');
    await act(db, 'deleteMaster', { collection: 'departments', id: 'DNEW' }, member);
    assert.ok(!db.tables().DEPARTMENT.some(d => d.DEPT_ID === 'DNEW'));
    await act(db, 'permission', { posId: 'P3', screenId: 'SC10', on: false });
    await assert.rejects(act(db, 'saveMaster', { collection: 'departments', item: { id: 'DDENY', name: 'ไม่มีสิทธิ์' } }, member), { status: 403 });
    await act(db, 'permission', { posId: 'P1', screenId: 'SC10', on: false });
    await assert.rejects(act(db, 'deleteMaster', { collection: 'departments', id: 'D0001' }), { status: 403 });
    await act(db, 'permission', { posId: 'P1', screenId: 'SC02', on: false });
    await assert.rejects(act(db, 'permission', { posId: 'P1', screenId: 'SC02', on: true }), { status: 403 });
});

test('migration persists missing screens and removes only the unused test position; reruns preserve revocations', async () => {
    const { createDemoData } = await import('../../shared/test/fixtures.mjs');
    const seed = createDemoData();
    seed.screens = seed.screens.filter(s => !['SC10', 'SC11'].includes(s.id));
    seed.perms = seed.perms.filter(p => !['SC10', 'SC11'].includes(p.screenId));
    seed.positions.push({ id: 'P4', name: 'ทดลองระบบ' });
    seed.perms.push({ posId: 'P4', screenId: 'SC09', seq: 50 });
    const db = memoryDatabase(seed, users), c = await db.connect();
    try {
        const result = await migratePermissions(c);
        assert.deepEqual(result, { addedScreens: ['SC10', 'SC11'], removedPositions: ['P4'] });
    } finally { await c.close(); }
    const saved = await snapshot(db);
    assert.ok(!saved.positions.some(p => p.id === 'P4'));
    assert.ok(!saved.perms.some(p => p.posId === 'P4'));
    assert.ok(saved.perms.some(p => p.posId === 'P1' && p.screenId === 'SC10'));
    await act(db, 'permission', { posId: 'P1', screenId: 'SC10', on: false });
    const again = await db.connect();
    try { assert.deepEqual(await migratePermissions(again), { addedScreens: [], removedPositions: [] }); }
    finally { await again.close(); }
    assert.ok(!(await snapshot(db)).perms.some(p => p.posId === 'P1' && p.screenId === 'SC10'));
    const visible = publicShuttle(await snapshot(db), admin);
    assert.ok(!visible.perms.some(p => p.posId === 'P1' && p.screenId === 'SC10'));
    assert.ok(visible.screens.every(s => !s.fixed));
});

test('migration rolls back if the test position is referenced', async () => {
    const { createDemoData } = await import('../../shared/test/fixtures.mjs');
    const seed = createDemoData(); seed.positions.push({ id: 'P4', name: 'ทดลองระบบ' });
    const db = memoryDatabase(seed, [...users, ['UTEST', 'Test', 'Member', null, null, 'P4', 'test']]);
    const before = JSON.stringify(db.tables()), c = await db.connect();
    try { await assert.rejects(migratePermissions(c), /ยังมีผู้ใช้อ้างอิง/); } finally { await c.close(); }
    assert.equal(JSON.stringify(db.tables()), before);
});
