const express = require('express');
const cors = require('cors');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const { getConnection } = require('./db');
const { installShuttle } = require('./shuttle');
require('dotenv').config();
const COLUMNS = 'USER_ID, FIRST_NAME, LAST_NAME, PHONE, DEPT_ID, POS_ID';
const SESSION_AGE = 8 * 60 * 60 * 1000;
const toUser = row => ({ userId: row[0], firstName: row[1], lastName: row[2], phone: row[3], deptId: row[4], posId: row[5] });

function validateUser(user, editing = false) {
    const required = ['userId', 'firstName', 'lastName', 'posId'];
    if (!editing) required.push('password');
    for (const field of required) {
        if (typeof user[field] !== 'string' || !user[field].trim()) return `${field} ต้องเป็นข้อความและห้ามว่าง`;
    }
    for (const field of ['phone', 'deptId', 'password']) {
        if (user[field] != null && typeof user[field] !== 'string') return `${field} ต้องเป็นข้อความ`;
    }
    return null;
}

function createApp(connect = getConnection) {
    const app = express();
    const sessions = new Map();
    app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
    app.use(express.json({ limit: '32kb' }));
    app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    async function query(sql, binds = {}, options = {}) {
        let connection;
        try {
            connection = await connect();
            return await connection.execute(sql, binds, options);
        } finally {
            if (connection) await connection.close();
        }
    }
    function cookie(res, token, maxAge) {
        res.cookie('mut_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge });
    }
    function tokenOf(req) {
        return (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('mut_session='))?.slice(12);
    }
    function invalidate(userId) {
        for (const [token, session] of sessions) if (session.userId === userId) sessions.delete(token);
    }
    app.get('/', (req, res) => res.json({ message: 'MUT Shuttle API Server Running' }));
    app.post('/api/auth/login', async (req, res) => {
        const { userId, password } = req.body || {};
        if (typeof userId !== 'string' || !userId.trim() || typeof password !== 'string' || !password) return res.status(400).json({ message: 'กรอกรหัสผู้ใช้และรหัสผ่าน' });
        const result = await query(`SELECT ${COLUMNS}, PASSWORD FROM USERS WHERE USER_ID = :userId`, { userId: userId.trim().toUpperCase() });
        const row = result.rows[0];
        // Compatibility with the existing USERS.PASSWORD data; never return it to the client.
        const digest = value => createHash('sha256').update(String(value)).digest();
        if (!row || !timingSafeEqual(digest(row[6]), digest(password))) return res.status(401).json({ message: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        const now = Date.now();
        for (const [key, session] of sessions) if (session.expires <= now) sessions.delete(key);
        sessions.delete(tokenOf(req));
        const token = randomBytes(32).toString('hex');
        sessions.set(token, { userId: row[0], expires: now + SESSION_AGE });
        cookie(res, token, SESSION_AGE);
        res.json(toUser(row));
    });
    app.post('/api/auth/logout', (req, res) => {
        sessions.delete(tokenOf(req));
        cookie(res, '', 0);
        res.json({ message: 'ออกจากระบบแล้ว' });
    });
    app.use('/api', async (req, res, next) => {
        const token = tokenOf(req), session = sessions.get(token);
        if (!session || session.expires <= Date.now()) {
            sessions.delete(token);
            return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบใหม่' });
        }
        const result = await query(`SELECT ${COLUMNS} FROM USERS WHERE USER_ID = :userId`, { userId: session.userId });
        if (!result.rows.length) { sessions.delete(token); return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้งาน' }); }
        req.user = toUser(result.rows[0]);
        next();
    });
    app.get('/api/auth/me', (req, res) => res.json(req.user));
    app.get('/api/directory', async (req, res) => {
        const result = await query('SELECT USER_ID, FIRST_NAME, LAST_NAME, POS_ID FROM USERS ORDER BY USER_ID');
        res.json(result.rows.map(row => ({ userId: row[0], firstName: row[1], lastName: row[2], posId: row[3] })));
    });
    installShuttle(app, connect);
    app.use('/api/users', (req, res, next) => {
        if (req.user.posId !== 'P1') return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
        next();
    });
    app.get('/api/users', async (req, res) => {
        const result = await query(`SELECT ${COLUMNS} FROM USERS ORDER BY USER_ID`);
        res.json(result.rows.map(toUser));
    });
    app.get('/api/users/:id', async (req, res) => {
        const result = await query(`SELECT ${COLUMNS} FROM USERS WHERE USER_ID = :userId`, { userId: req.params.id });
        if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        res.json(toUser(result.rows[0]));
    });
    app.post('/api/users', async (req, res) => {
        const { userId, firstName, lastName, phone = null, password, deptId = null, posId } = req.body || {};
        const user = { userId, firstName, lastName, phone, password, deptId, posId };
        const error = validateUser(user);
        if (error) return res.status(400).json({ message: error });
        await query(`INSERT INTO USERS (USER_ID, FIRST_NAME, LAST_NAME, PHONE, PASSWORD, DEPT_ID, POS_ID)
            VALUES (:userId, :firstName, :lastName, :phone, :password, :deptId, :posId)`, user, { autoCommit: true });
        res.status(201).json({ message: 'เพิ่มผู้ใช้งานแล้ว' });
    });
    app.put('/api/users/:id', async (req, res) => {
        const { firstName, lastName, phone = null, password = null, deptId = null, posId } = req.body || {};
        const user = { userId: req.params.id, firstName, lastName, phone, password: password || null, deptId, posId };
        const error = validateUser({ ...user, password }, true);
        if (error) return res.status(400).json({ message: error });
        if (user.userId === req.user.userId && posId !== 'P1') return res.status(400).json({ message: 'เปลี่ยนสิทธิ์ผู้ดูแลของบัญชีที่กำลังใช้งานไม่ได้' });
        const result = await query(`UPDATE USERS SET FIRST_NAME = :firstName, LAST_NAME = :lastName,
            PHONE = :phone, PASSWORD = NVL(:password, PASSWORD), DEPT_ID = :deptId, POS_ID = :posId
            WHERE USER_ID = :userId`, user, { autoCommit: true });
        if (!result.rowsAffected) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        if (user.password) invalidate(user.userId);
        res.json({ message: 'บันทึกผู้ใช้งานแล้ว' });
    });
app.delete('/api/users/:id', async (req, res) => {
  if (req.params.id === req.user.userId) return res.status(400).json({ message: 'ลบบัญชีที่กำลังใช้งานไม่ได้' });

  // [เงื่อนไข SC01]: ตรวจสอบว่าคนขับยังมีรอบรถอยู่ในระบบหรือไม่
  const check = await query('SELECT COUNT(*) AS CNT FROM SCHEDULES WHERE DRIVER_ID = :userId', { userId: req.params.id });
  const count = check.rows[0]?.[0] ?? check.rows[0]?.CNT ?? 0;
  if (count > 0) return res.status(400).json({ message: `ลบไม่ได้! คนขับยังมีรอบรถอยู่ในระบบ (${count} รอบ)` });

  const result = await query('DELETE FROM USERS WHERE USER_ID = :userId', { userId: req.params.id }, { autoCommit: true });
  if (!result.rowsAffected) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
  invalidate(req.params.id);
  res.json({ message: 'ลบผู้ใช้งานแล้ว' });
});
    app.use('/api', (req, res) => res.status(404).json({ message: 'ไม่พบ API' }));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'รูปแบบ JSON ไม่ถูกต้อง' });
        if ([400, 403].includes(error.status)) return res.status(error.status).json({ message: error.message });
        if ([54, 30006].includes(error.errorNum)) return res.status(409).json({ message: 'มีรายการอื่นกำลังบันทึก กรุณาลองใหม่' });
        if (error.errorNum === 1) return res.status(409).json({ message: 'รหัสนี้มีอยู่แล้ว' });
        if ([2291, 2292].includes(error.errorNum)) return res.status(409).json({ message: 'ข้อมูลอ้างอิงไม่ถูกต้อง หรือมีรายการอื่นใช้งานข้อมูลนี้อยู่' });
        if (error.errorNum === 12899) return res.status(400).json({ message: 'ข้อมูลยาวเกินขนาดคอลัมน์ในฐานข้อมูล' });
        console.error('API error:', error.code || error.name);
        res.status(500).json({ message: 'ติดต่อฐานข้อมูลไม่สำเร็จ กรุณาตรวจสอบเซิร์ฟเวอร์' });
    });
    return app;
}
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    createApp().listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}
module.exports = { createApp };
