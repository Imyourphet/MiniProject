// Read-only verification. Never selects passwords or writes application data.
const { getConnection } = require('../db');
const timer = setTimeout(() => { console.error('Database check timed out'); process.exit(2); }, 15000);
(async () => {
    let connection;
    try {
        connection = await getConnection();
        for (const [label, sql] of [
            ['screens', 'SELECT SCREEN_ID, SCREEN_NAME FROM SCREEN ORDER BY SCREEN_ID'],
            ['permissions', 'SELECT POS_ID, SCREEN_ID, SEQ FROM PERMISSION ORDER BY POS_ID, SEQ'],
            ['positions', 'SELECT POS_ID, POS_NAME FROM POSITION ORDER BY POS_ID'],
            ['times', 'SELECT DEPART_TIME FROM SCHEDULE WHERE ROWNUM <= 3'],
        ]) console.log(JSON.stringify({ label, rows: (await connection.execute(sql)).rows }));
    } finally { if (connection) await connection.close(); clearTimeout(timer); }
})().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });