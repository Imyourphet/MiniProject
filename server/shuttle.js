// Oracle adapter for the verified shuttle schema. No DDL or seed writes.
const SPECS = [
    ['departments', 'DEPARTMENT', { id: 'DEPT_ID', name: 'DEPT_NAME' }, ['id']],
    ['positions', 'POSITION', { id: 'POS_ID', name: 'POS_NAME' }, ['id']],
    ['screens', 'SCREEN', { id: 'SCREEN_ID', name: 'SCREEN_NAME' }, ['id']],
    ['perms', 'PERMISSION', { posId: 'POS_ID', screenId: 'SCREEN_ID', seq: 'SEQ' }, ['posId', 'screenId']],
    ['carTypes', 'CAR_TYPE', { id: 'TYPE_ID', name: 'TYPE_NAME', seats: 'SEATS' }, ['id']],
    ['carStatuses', 'CAR_STATUS', { id: 'STATUS_ID', name: 'STATUS_NAME' }, ['id']],
    ['cars', 'CAR', { id: 'CAR_ID', plate: 'PLATE_NO', statusId: 'STATUS_ID', typeId: 'TYPE_ID' }, ['id']],
    ['routes', 'ROUTE', { id: 'ROUTE_ID', name: 'ROUTE_NAME' }, ['id']],
    ['stops', 'STOP_POINT', { id: 'STOP_ID', name: 'STOP_NAME' }, ['id']],
    ['routeStops', 'ROUTE_STOP', { routeId: 'ROUTE_ID', seq: 'STOP_SEQ', stopId: 'STOP_ID', travelTime: 'TRAVEL_TIME' }, ['routeId', 'seq']],
    ['schedules', 'SCHEDULE', { id: 'SCHED_ID', time: 'DEPART_TIME', routeId: 'ROUTE_ID', carId: 'CAR_ID', empId: 'USER_ID' }, ['id']],
    ['roundStatuses', 'ROUND_STATUS', { id: 'STATUS_ID', name: 'STATUS_NAME' }, ['id']],
    ['rounds', 'TRIP_ROUND', { id: 'ROUND_ID', date: 'TRIP_DATE', scheduleId: 'SCHED_ID', statusId: 'STATUS_ID' }, ['id']],
    ['bookingStatuses', 'BOOKING_STATUS', { id: 'STATUS_ID', name: 'STATUS_NAME' }, ['id']],
    ['bookings', 'BOOKING', { id: 'BOOKING_ID', bookDate: 'BOOK_DATE', userId: 'USER_ID' }, ['id']],
    ['bookingDetails', 'BOOKING_DETAIL', { bookingId: 'BOOKING_ID', seq: 'ITEM_SEQ', originStopId: 'ORIGIN_STOP_ID', roundId: 'ROUND_ID', destStopId: 'DEST_STOP_ID', seats: 'SEATS', qrcode: 'QR_CODE', statusId: 'STATUS_ID' }, ['bookingId', 'seq']],
];

const STATUS_MAP = {
    bookingStatuses: { BS001: 'BS1', BS002: 'BS2', BS003: 'BS5', BS004: 'BS3', BS005: 'BS4' },
    roundStatuses: { BC001: 'RS1', BC002: 'RS2', BC003: 'RS3', BC004: 'RS4' },
    carStatuses: { CS001: 'CS1', CS002: 'CS3', CS003: 'CS2' },
};

const statusGroup = { bookingDetails: 'bookingStatuses', rounds: 'roundStatuses', cars: 'carStatuses' };
const error400 = message => Object.assign(new Error(message), { status: 400 });
const error403 = () => Object.assign(new Error('ไม่มีสิทธิ์ทำรายการนี้'), { status: 403 });

function normalizeDate(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!match) throw error400(`รูปแบบวันที่ในฐานข้อมูลไม่รองรับ: ${value}`);
    let year = Number(match[3]);
    if (year < 100) year += 2500;
    if (year >= 2400) year -= 543;
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function encodeStatus(collection, field, value) {
    const group = field === 'statusId' ? statusGroup[collection] : field === 'id' ? collection : null;
    if (!STATUS_MAP[group]) return value;
    return Object.entries(STATUS_MAP[group]).find(([, normalized]) => normalized === value)?.[0] || value;
}

async function loadShuttle(connection) {
    const data = {};
    for (const [collection, table, fields] of SPECS) {
        const result = await connection.execute(`SELECT ${Object.values(fields).join(', ')} FROM ${table}`);
        data[collection] = result.rows.map(row => Object.fromEntries(Object.keys(fields).map((key, i) => [key, row[i]])));
    }
    for (const [group, map] of Object.entries(STATUS_MAP)) data[group].forEach(item => { item.id = map[item.id] || item.id; });
    for (const [collection, group] of Object.entries(statusGroup)) data[collection].forEach(item => { item.statusId = STATUS_MAP[group][item.statusId] || item.statusId; });
    data.rounds.forEach(round => {
        round.date = normalizeDate(round.date);
        const schedule = data.schedules.find(s => s.id === round.scheduleId);
        const car = data.cars.find(c => c.id === schedule?.carId);
        round.seats = data.carTypes.find(t => t.id === car?.typeId)?.seats || 0;
    });
    data.bookings.forEach(booking => { booking.bookDate = normalizeDate(booking.bookDate); });
    data.routeStops.forEach(stop => { stop.travelTime ??= 0; });
    const refs = await connection.execute('SELECT USER_ID, POS_ID, DEPT_ID FROM USERS');
    data.userRefs = refs.rows.map(row => ({ userId: row[0], posId: row[1], deptId: row[2] }));
    data.seq = Math.max(100, ...[...data.schedules, ...data.rounds, ...data.bookings].map(item => Number(String(item.id).replace(/^\D+/, '')) || 0));
    return data;
}

function publicShuttle(data, user) {
    const result = structuredClone(data);
    delete result.userRefs;
    for (const screen of [{ id: 'SC10', name: 'จัดการแผนก' }, { id: 'SC11', name: 'จัดการรถ' }]) {
        if (!result.screens.some(s => s.id === screen.id)) {
            result.screens.push({ ...screen, fixed: true });
            result.perms.push({ posId: 'P1', screenId: screen.id, seq: result.perms.length + 1 });
        }
    }
    for (const round of result.rounds) round.reservedSeats = data.bookingDetails.filter(d => d.roundId === round.id && d.statusId !== 'BS5').reduce((n, d) => n + d.seats, 0);
    if (user.posId !== 'P1') {
        const mine = new Set(data.bookings.filter(b => b.userId === user.userId).map(b => b.id));
        const assigned = new Set(data.rounds.filter(r => data.schedules.some(s => s.id === r.scheduleId && s.empId === user.userId)).map(r => r.id));
        const canDrive = data.perms.some(p => p.posId === user.posId && ['SC06', 'SC07', 'SC08'].includes(p.screenId));
        result.bookingDetails = result.bookingDetails.filter(d => mine.has(d.bookingId) || (canDrive && assigned.has(d.roundId)));
        result.bookings = result.bookings.filter(b => mine.has(b.id) || result.bookingDetails.some(d => d.bookingId === b.id));
    }
    return result;
}

function validateAction(data, action, user) {
    const { type, payload: p } = action;
    const masterScreen = { departments: 'SC10', positions: 'SC02', cars: 'SC11', carTypes: 'SC11', routes: 'SC03', stops: 'SC03' };
    const screen = ['saveMaster', 'deleteMaster'].includes(type) ? masterScreen[p.collection] : { permission: 'SC02', addStop: 'SC03', removeStop: 'SC03', addSchedule: 'SC04', deleteSchedule: 'SC04', openRounds: 'SC04', deleteRound: 'SC04', book: 'SC09', cancelBooking: 'SC09', start: 'SC06', checkIn: 'SC07', alight: 'SC07', close: 'SC08' }[type];
    if (!screen) throw error400('ไม่รู้จักคำสั่ง');
    const fixed = ['SC10', 'SC11'].includes(screen) && user.posId === 'P1';
    if (!fixed && !data.perms.some(pm => pm.posId === user.posId && pm.screenId === screen)) throw error403();
    if (type === 'permission' && !data.screens.some(s => s.id === p.screenId)) throw error400('เมนูนี้เป็นสิทธิ์ผู้ดูแลแบบคงที่');
    if (type === 'saveMaster') {
        const spec = SPECS.find(s => s[0] === p.collection);
        if (!p.item || typeof p.item !== 'object') throw error400('ข้อมูลไม่ครบถ้วน');
        const item = {};
        for (const field of Object.keys(spec[2])) {
            const value = p.item[field];
            if (field === 'seats') { if (!Number.isInteger(value) || value < 1) throw error400('จำนวนที่นั่งไม่ถูกต้อง'); }
            else if (typeof value !== 'string' || !value.trim()) throw error400(`กรอก ${field} ให้ครบ`);
            if ((field === 'id' || field.endsWith('Id')) && value.length > 10) throw error400('รหัสต้องไม่เกิน 10 ตัวอักษร');
            item[field] = value;
        }
        p.item = item;
    }
    if (type === 'deleteMaster') p.inUse = data.userRefs.some(u => p.collection === 'departments' ? u.deptId === p.id : p.collection === 'positions' ? u.posId === p.id : false);
    if (type === 'addSchedule') {
        const driver = data.userRefs.find(u => u.userId === p.empId);
        if (!driver || !data.perms.some(pm => pm.posId === driver.posId && pm.screenId === 'SC06')) throw error400('คนขับไม่มีสิทธิ์ตารางงาน');
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)) throw error400('เวลาออกไม่ถูกต้อง');
    }
    if (type === 'openRounds' && (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || new Date(p.date + 'T00:00:00Z').toISOString().slice(0, 10) !== p.date)) throw error400('วันที่ไม่ถูกต้อง');
    if (type === 'book' && (!Array.isArray(p.items) || p.items.length > 50)) throw error400('การจองต้องมีไม่เกิน 50 รายการ');
}

// แก้ไขฟังก์ชันบันทึกข้อมูล ป้องกันปัญหา Reserved Keyword และฟิลด์ที่ไม่ตรงกับ DB
async function persistChanges(connection, before, after) {
    const keyOf = (item, keys) => JSON.stringify(keys.map(key => item[key]));
    
    // ลบรายการแถวลูกก่อนตามลำดับ Foreign Keys
    for (const [collection, table, fields, keys] of [...SPECS].reverse()) {
        const remaining = new Set(after[collection].map(item => keyOf(item, keys)));
        for (const item of before[collection]) {
            if (!remaining.has(keyOf(item, keys))) {
                const whereClauses = [];
                const binds = {};
                keys.forEach(k => {
                    const bindName = `b_${k}`;
                    whereClauses.push(`${fields[k]} = :${bindName}`);
                    binds[bindName] = encodeStatus(collection, k, item[k]);
                });
                await connection.execute(`DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`, binds);
            }
        }
    }

    // Insert หรือ Update แถวข้อมูล
    for (const [collection, table, fields, keys] of SPECS) {
        const old = new Map(before[collection].map(item => [keyOf(item, keys), item]));
        const validFields = Object.keys(fields);

        for (const item of after[collection]) {
            const previous = old.get(keyOf(item, keys));

            if (!previous) {
                // INSERT แถวใหม่
                for (const key of keys) {
                    if (typeof item[key] === 'string' && item[key].length > 10) throw error400('รหัสที่สร้างยาวเกิน 10 ตัวอักษร');
                }
                const insertColumns = [];
                const bindParams = [];
                const binds = {};

                validFields.forEach(k => {
                    insertColumns.push(fields[k]);
                    bindParams.push(`:b_${k}`);
                    binds[`b_${k}`] = encodeStatus(collection, k, item[k]);
                });

                await connection.execute(
                    `INSERT INTO ${table} (${insertColumns.join(', ')}) VALUES (${bindParams.join(', ')})`,
                    binds
                );
            } else {
                // UPDATE แถวเดิม
                const changed = validFields.filter(k => !keys.includes(k) && item[k] !== previous[k]);
                if (!changed.length) continue;

                const setClauses = [];
                const whereClauses = [];
                const binds = {};

                changed.forEach(k => {
                    setClauses.push(`${fields[k]} = :val_${k}`);
                    binds[`val_${k}`] = encodeStatus(collection, k, item[k]);
                });

                keys.forEach(k => {
                    whereClauses.push(`${fields[k]} = :key_${k}`);
                    binds[`key_${k}`] = encodeStatus(collection, k, item[k]);
                });

                await connection.execute(
                    `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`,
                    binds
                );
            }
        }
    }
}

async function applyAction(connection, input, authenticatedUser) {
    if (!input || typeof input.type !== 'string' || !input.payload || typeof input.payload !== 'object') throw error400('ข้อมูลคำสั่งไม่ถูกต้อง');
    
    await connection.execute('LOCK TABLE USERS IN SHARE MODE WAIT 5');
    await connection.execute(`LOCK TABLE ${SPECS.map(spec => spec[1]).join(', ')} IN EXCLUSIVE MODE WAIT 5`);
    
    const before = await loadShuttle(connection);
    const user = before.userRefs.find(u => u.userId === authenticatedUser.userId);
    if (!user) throw error403();
    
    const action = structuredClone(input);
    validateAction(before, action, user);
    
    const { transition, activeSeats } = await import('../shared/shuttle.mjs');
    let after;
    try { 
        after = transition(before, action, user); 
    } catch (error) { 
        throw error400(error.message); 
    }

    for (const round of after.rounds) {
        const schedule = after.schedules.find(s => s.id === round.scheduleId);
        const car = after.cars.find(c => c.id === schedule?.carId);
        const capacity = after.carTypes.find(t => t.id === car?.typeId)?.seats || 0;
        if (capacity < activeSeats(after, round.id)) throw error400('จำนวนที่นั่งรถน้อยกว่าจำนวนที่จองแล้ว');
        round.seats = capacity;
    }

    await persistChanges(connection, before, after);
    await connection.commit();
    return publicShuttle(after, user);
}

function installShuttle(app, connect) {
    app.get('/api/shuttle', async (req, res) => {
        let connection;
        try {
            connection = await connect();
            await connection.execute('SET TRANSACTION READ ONLY');
            res.json(publicShuttle(await loadShuttle(connection), req.user));
        } finally { 
            if (connection) await connection.close(); 
        }
    });

    app.post('/api/shuttle/actions', async (req, res) => {
        let connection;
        try {
            connection = await connect();
            res.json(await applyAction(connection, req.body, req.user));
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally { 
            if (connection) await connection.close(); 
        }
    });
}

module.exports = { installShuttle, loadShuttle, publicShuttle, applyAction, persistChanges, normalizeDate, SPECS, STATUS_MAP };