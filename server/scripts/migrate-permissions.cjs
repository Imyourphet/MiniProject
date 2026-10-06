// One-time data migration: persist formerly virtual screens and remove the
// explicitly requested, unreferenced "ทดลองระบบ" position. Safe to rerun.
const { loadShuttle, persistChanges, SPECS } = require('../shuttle');

async function migratePermissions(connection) {
    try {
        await connection.execute('LOCK TABLE USERS IN SHARE MODE WAIT 5');
        await connection.execute(`LOCK TABLE ${SPECS.map(spec => spec[1]).join(', ')} IN EXCLUSIVE MODE WAIT 5`);
        const before = await loadShuttle(connection), after = structuredClone(before);
        const added = [], removed = [];
        for (const screen of [{ id: 'SC10', name: 'จัดการแผนก' }, { id: 'SC11', name: 'จัดการรถ' }]) {
            if (after.screens.some(item => item.id === screen.id)) continue;
            after.screens.push(screen);
            added.push(screen.id);
            // Preserve the access these formerly virtual screens already had.
            // Only initialize newly inserted screens; never undo a later revocation.
            if (after.positions.some(position => position.id === 'P1') && !after.perms.some(p => p.posId === 'P1' && p.screenId === screen.id)) {
                after.perms.push({ posId: 'P1', screenId: screen.id, seq: Math.max(0, ...after.perms.map(p => p.seq)) + 1 });
            }
        }
        for (const position of before.positions.filter(p => p.name.trim() === 'ทดลองระบบ')) {
            if (before.userRefs.some(user => user.posId === position.id)) throw new Error(`ตำแหน่ง ${position.id} ยังมีผู้ใช้อ้างอิง จึงยังลบไม่ได้`);
            after.perms = after.perms.filter(p => p.posId !== position.id);
            after.positions = after.positions.filter(p => p.id !== position.id);
            removed.push(position.id);
        }
        await persistChanges(connection, before, after);
        await connection.commit();
        return { addedScreens: added, removedPositions: removed };
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}

if (require.main === module) {
    const { getConnection } = require('../db');
    (async () => {
        const connection = await getConnection();
        try { console.log(JSON.stringify(await migratePermissions(connection))); }
        finally { await connection.close(); }
    })().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
}
module.exports = { migratePermissions };
