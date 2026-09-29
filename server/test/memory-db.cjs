const { SPECS, STATUS_MAP } = require('../shuttle');
function memoryDatabase(seed, users) {
    const tables = { USERS: users.map(row => ({ USER_ID: row[0], FIRST_NAME: row[1], LAST_NAME: row[2], PHONE: row[3], DEPT_ID: row[4], POS_ID: row[5], PASSWORD: row[6] })) };
    const groupOf = { cars: 'carStatuses', rounds: 'roundStatuses', bookingDetails: 'bookingStatuses' };
    for (const [collection, table, fields] of SPECS) tables[table] = seed[collection].map(item => Object.fromEntries(Object.entries(fields).map(([key, col]) => {
        const group = key === 'statusId' ? groupOf[collection] : key === 'id' ? collection : null;
        const value = Object.entries(STATUS_MAP[group] || {}).find(([, canonical]) => canonical === item[key])?.[0] || item[key];
        return [col, value];
    })));
    let state = tables, queue = Promise.resolve();
    const logs = [], metrics = { opened: 0, closed: 0, commits: 0, rollbacks: 0 };
    let failWrite = false;
    return {
        metrics, logs, tables: () => state, failWrites: value => { failWrite = value; },
        async connect() {
            metrics.opened++;
            let local = structuredClone(state), release;
            return {
                async execute(sql, binds = {}) {
                    logs.push({ sql, binds: structuredClone(binds) });
                    if (sql.startsWith('LOCK TABLE USERS')) {
                        const previous = queue;
                        queue = new Promise(resolve => { release = resolve; });
                        await previous;
                        local = structuredClone(state);
                        return {};
                    }
                    if (sql.startsWith('LOCK ') || sql.startsWith('SET TRANSACTION')) return {};
                    if (sql.startsWith('SELECT')) {
                        const match = sql.match(/^SELECT (.+) FROM (\w+)(?: WHERE (.+?))?(?: ORDER BY .+)?$/);
                        if (!match) throw new Error(`Unsupported fixture SELECT: ${sql}`);
                        let rows = local[match[2]];
                        if (match[3]) rows = rows.filter(row => row.USER_ID === binds.userId);
                        const cols = match[1].split(',').map(col => col.trim());
                        return { rows: rows.map(row => cols.map(col => row[col] ?? null)) };
                    }
                    if (failWrite) throw new Error('simulated transaction write failure');
                    let match;
                    if ((match = sql.match(/^INSERT INTO (\w+) \((.+)\) VALUES \((.+)\)$/))) {
                        const cols = match[2].split(',').map(v => v.trim()), values = match[3].split(',').map(v => binds[v.trim().slice(1)]);
                        local[match[1]].push(Object.fromEntries(cols.map((col, i) => [col, values[i]])));
                        return { rowsAffected: 1 };
                    }
                    const matches = (row, where) => where.split(' AND ').every(condition => { const [col, bind] = condition.split(' = '); return row[col] === binds[bind.slice(1)]; });
                    if ((match = sql.match(/^DELETE FROM (\w+) WHERE (.+)$/))) {
                        const previous = local[match[1]];
                        local[match[1]] = previous.filter(row => !matches(row, match[2]));
                        return { rowsAffected: previous.length - local[match[1]].length };
                    }
                    if ((match = sql.match(/^UPDATE (\w+) SET (.+) WHERE (.+)$/))) {
                        const rows = local[match[1]].filter(row => matches(row, match[3]));
                        for (const row of rows) for (const assignment of match[2].split(', ')) {
                            const [col, bind] = assignment.split(' = '); row[col] = binds[bind.slice(1)];
                        }
                        return { rowsAffected: rows.length };
                    }
                    throw new Error(`Unsupported fixture SQL: ${sql}`);
                },
                async commit() { state = structuredClone(local); metrics.commits++; release?.(); release = null; },
                async rollback() { metrics.rollbacks++; release?.(); release = null; },
                async close() { metrics.closed++; release?.(); release = null; },
            };
        },
    };
}
module.exports = { memoryDatabase };
