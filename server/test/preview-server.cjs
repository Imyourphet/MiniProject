// Isolated UI fixture: same SQL adapter, entirely in-memory; never connects to Oracle.
const { createApp } = require('../server');
const { memoryDatabase } = require('./memory-db.cjs');
(async () => {
    const { createDemoData } = await import('../../client/src/lib/demoData.js');
    const db = memoryDatabase(createDemoData(), [
        ['U001', 'ทดสอบ', 'ผู้ดูแล', '0200000000', 'D0001', 'P1', 'preview-admin'],
        ['U002', 'ทดสอบ', 'คนขับ', '0300000000', 'D0002', 'P2', 'preview-driver'],
        ['U003', 'คนขับ', 'สอง', null, 'D0002', 'P2', 'preview-driver'],
        ['U004', 'คนขับ', 'สาม', null, 'D0002', 'P2', 'preview-driver'],
        ['U005', 'ทดสอบ', 'ผู้โดยสาร', '0600000000', null, 'P3', 'preview-user'],
    ]);
    createApp(db.connect).listen(5001, '127.0.0.1', () => console.log('Isolated UI fixture: http://127.0.0.1:5001'));
})().catch(error => { console.error(error); process.exitCode = 1; });
