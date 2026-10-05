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
            ['departments', 'SELECT DEPT_ID, DEPT_NAME FROM DEPARTMENT ORDER BY DEPT_ID'],
            ['testPositionReferences', "SELECT P.POS_ID, COUNT(U.USER_ID) FROM POSITION P LEFT JOIN USERS U ON U.POS_ID = P.POS_ID WHERE P.POS_NAME = 'ทดลองระบบ' GROUP BY P.POS_ID"],
            ['permissionColumns', "SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH FROM USER_TAB_COLUMNS WHERE TABLE_NAME IN ('PERMISSION', 'SCREEN') ORDER BY TABLE_NAME, COLUMN_ID"],
            ['times', 'SELECT DEPART_TIME FROM SCHEDULE WHERE ROWNUM <= 3'],
        ]) console.log(JSON.stringify({ label, rows: (await connection.execute(sql)).rows }));
        const { loadShuttle } = require('../shuttle');
        const data = await loadShuttle(connection);
        console.log(JSON.stringify({ adapter: 'PASS', counts: Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])) }));
    } finally { if (connection) await connection.close(); clearTimeout(timer); }
})().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
