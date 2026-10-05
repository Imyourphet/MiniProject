const { createHash, timingSafeEqual } = require('node:crypto');
const invalid = message => Object.assign(new Error(message), { status: 400 });

function nextUserId(rows) {
    const maximum = rows.reduce((max, [id]) => {
        if (!/^U\d+$/.test(id)) return max;
        const number = BigInt(id.slice(1));
        return number > max ? number : max;
    }, 0n);
    const next = maximum + 1n;
    if (next > 999999999n) throw invalid('รหัสผู้ใช้งานเต็มช่วงที่ฐานข้อมูลรองรับ');
    return `U${String(next).padStart(3, '0')}`;
}

function passwordsMatch(stored, supplied) {
    const digest = value => createHash('sha256').update(String(value)).digest();
    return timingSafeEqual(digest(stored), digest(supplied));
}

async function createUser(connection, actorId, values) {
    try {
        // Assign the ID inside the same transaction as the insert so two admins
        // saving concurrently cannot receive the same ID. No schema change needed.
        await connection.execute('LOCK TABLE USERS IN EXCLUSIVE MODE WAIT 5');
        const actor = await connection.execute('SELECT POS_ID FROM USERS WHERE USER_ID = :userId', { userId: actorId });
        const access = actor.rows.length && await connection.execute('SELECT SCREEN_ID FROM PERMISSION WHERE POS_ID = :posId AND SCREEN_ID = :screenId', { posId: actor.rows[0][0], screenId: 'SC01' });
        if (!access || !access.rows.length) throw Object.assign(new Error('ไม่มีสิทธิ์จัดการผู้ใช้งาน'), { status: 403 });
        const ids = await connection.execute('SELECT USER_ID FROM USERS');
        const userId = nextUserId(ids.rows);
        await connection.execute(`INSERT INTO USERS (USER_ID, FIRST_NAME, LAST_NAME, PHONE, PASSWORD, DEPT_ID, POS_ID)
            VALUES (:userId, :firstName, :lastName, :phone, :password, :deptId, :posId)`, { ...values, userId });
        await connection.commit();
        return userId;
    } catch (error) { await connection.rollback(); throw error; }
}

async function updateProfile(connection, userId, body) {
    const { firstName, lastName, currentPassword, newPassword = '', confirmPassword = '' } = body;
    if (![firstName, lastName].every(value => typeof value === 'string' && value.trim())) throw invalid('กรอกชื่อและนามสกุลให้ครบ');
    if (typeof newPassword !== 'string') throw invalid('รหัสผ่านต้องเป็นข้อความ');
    if (!newPassword && (currentPassword || confirmPassword)) throw invalid('กรอกรหัสผ่านใหม่ หรือเว้นช่องรหัสผ่านทั้งหมดว่างเพื่อเปลี่ยนเฉพาะชื่อ');
    if (newPassword && (newPassword.length < 8 || newPassword.length > 50)) throw invalid('รหัสผ่านใหม่ต้องมีความยาว 8–50 ตัวอักษร');
    if (newPassword && newPassword !== confirmPassword) throw invalid('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
    if (newPassword && (typeof currentPassword !== 'string' || !currentPassword)) throw invalid('กรอกรหัสผ่านปัจจุบันเพื่อเปลี่ยนรหัสผ่าน');
    try {
        const result = await connection.execute('SELECT PASSWORD FROM USERS WHERE USER_ID = :userId FOR UPDATE', { userId });
        if (!result.rows.length) throw invalid('ไม่พบบัญชีผู้ใช้งาน');
        if (newPassword && !passwordsMatch(result.rows[0][0], currentPassword)) throw invalid('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        await connection.execute(`UPDATE USERS SET FIRST_NAME = :firstName, LAST_NAME = :lastName,
            PASSWORD = NVL(:password, PASSWORD) WHERE USER_ID = :userId`, {
            userId, firstName: firstName.trim(), lastName: lastName.trim(), password: newPassword || null,
        });
        // Read back the database result while the row remains locked.
        const saved = await connection.execute('SELECT USER_ID, FIRST_NAME, LAST_NAME, PHONE, DEPT_ID, POS_ID FROM USERS WHERE USER_ID = :userId', { userId });
        await connection.commit();
        return { row: saved.rows[0], passwordChanged: !!newPassword };
    } catch (error) { await connection.rollback(); throw error; }
}

module.exports = { nextUserId, createUser, updateProfile, passwordsMatch };
