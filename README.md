# MUT Shuttle Bus · MiniProject

แปลงหน้าจอ G1-DONE_YET_v2 เป็น React โดยแยก component, state, API และกฎการทำงานออกจากกัน

## สถานะการเชื่อมข้อมูล

| ส่วน | แหล่งข้อมูล |
| --- | --- |
| ล็อกอิน / session / รายชื่อผู้ใช้ / เพิ่ม แก้ไข ลบผู้ใช้ | API ของ Express ใช้ตาราง Oracle `USERS` |
| แผนก / ตำแหน่ง / สิทธิ์หน้าจอ / รถ / เส้นทาง / ตารางและรอบเดินรถ / การจอง / QR | ตัวอย่างจาก G1 บันทึกในเบราว์เซอร์ มีป้ายโหมดตัวอย่างบนหน้าจอ |
| รายงาน SC05 | แสดงสถานะรอพัฒนาเหมือนต้นฉบับ |

ยังไม่ได้เขียน SQL ของระบบรถและการจอง รอโครงสร้างตารางจริงจากผู้ใช้ ไม่มีการสร้างตารางหรือคัดลอกบัญชีตัวอย่าง G1 ลง Oracle
ข้อมูลตัวอย่างใช้ key `miniproject_shuttle_preview_v1` แยกจากต้นฉบับ G1 และไม่มีรหัสผ่านผู้ใช้ใน seed ฝั่ง client
ข้อมูลตัวอย่างใช้ร่วมกันระหว่างบัญชี/แท็บของ origin เดียวกัน แต่ไม่ซิงก์ข้ามเครื่อง และยังไม่รองรับ transaction สำหรับผู้ใช้หลายเครื่อง

## เปิดใช้งาน

เปิด terminal ใน `server` แล้วรัน:

```powershell
npm install
npm start
```

เปิดอีก terminal ใน `client` แล้วรัน:

```powershell
npm install
npm run dev
```

เปิด URL ที่ Vite แสดงและล็อกอินด้วยบัญชีใน `USERS` ของ Oracle จริง ไม่มีบัญชีสำรองอัตโนมัติเมื่อฐานข้อมูลล่ม
Vite ส่ง `/api` ไป `http://127.0.0.1:5000` โดยสามารถกำหนด `API_TARGET` ใน environment ได้
เมื่อนำ production build ไปใช้ ต้องให้เว็บเซิร์ฟเวอร์ส่ง `/api` ไป backend, รองรับ SPA fallback และใช้ HTTPS

`server/db.js` คงเดิมและอ่าน `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_SERVICE` จาก `server/.env`
รูปแบบที่ได้ต้องเป็น `host:port/service` โดย DB_HOST เป็น host/IP เดียว ไม่ต่อ IP ภายนอกและภายในด้วย `//`
ระหว่างทดสอบพบ NJS-515 จากรูปแบบค่า host เดิม จึงยังยืนยันการเชื่อม Oracle จริงไม่ได้ และยังไม่ได้แก้ `.env`

## API ที่เพิ่ม/ปรับ

- `POST /api/auth/login` รับ `{ userId, password }` และสร้าง cookie session
- `GET /api/auth/me` คืนผู้ใช้ปัจจุบัน
- `POST /api/auth/logout` ยกเลิก session
- `GET /api/directory` คืนเฉพาะรหัส ชื่อ นามสกุล และตำแหน่งสำหรับหน้าระบบรถ
- `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id` ใช้ได้เฉพาะ P1

ข้อมูล JSON ใช้ `userId`, `firstName`, `lastName`, `phone`, `deptId`, `posId`
รหัสผ่านส่งเฉพาะตอนล็อกอิน/เพิ่ม/แก้ไข ไม่ปรากฏใน API อ่านผู้ใช้; การแก้ไขเว้น password ว่างเพื่อคงรหัสเดิม
เบอร์โทรและรหัสผ่านเป็น string เพื่อรักษาเลข 0 ด้านหน้า; แผนกต้องเป็นรหัสจริงใน Oracle
ห้ามลบหรือเปลี่ยนตำแหน่งของบัญชี Admin ที่กำลังใช้งาน

Session ใช้ HttpOnly/SameSite cookie อายุ 8 ชั่วโมง เก็บในหน่วยความจำ server และหมดเมื่อ restart
การเปลี่ยนรหัสผ่านจะยกเลิก session ของผู้ใช้คนนั้น
การตรวจรหัสผ่านยังเข้ากันกับข้อมูล `USERS.PASSWORD VARCHAR2(50)` เดิม ไม่ได้ย้ายเป็น password hash ในฐานข้อมูล; ต้องวางแผนปรับ schema/ข้อมูลก่อนใช้ระบบจริงภายนอก

## โครงสร้าง React

- `client/src/App.jsx`: โหลด session, routing, ตรวจเมนูตามสิทธิ์ และเชื่อมหน้าจอ
- `client/src/pages/`: Login, Users, Masters, Routes, Schedules, Booking, Driver/ScanPage
- `client/src/components/`: Sidebar, ฟอร์ม/ตารางร่วม, QRCode, Scanner
- `client/src/lib/api.js`: เรียก backend พร้อม cookie และจัดการ session หมดอายุ
- `client/src/lib/demoData.js`: ข้อมูลตัวอย่างระบบรถจาก G1
- `client/src/lib/previewStore.js`: ตัวเชื่อมข้อมูลตัวอย่างสำหรับแทนที่ด้วย API เมื่อทราบ schema
- `client/src/lib/shuttle.js`: ตรวจสิทธิ์, ที่นั่ง, เวลาซ้อน, QR และการเปลี่ยนสถานะในตัวอย่าง

หน้าสแกนเปิดกล้องเมื่อกดปุ่มเท่านั้นและปิด stream เมื่อเปลี่ยนหน้า/ซ่อนแท็บ รองรับกรอกรหัสเมื่อไม่ใช้กล้อง
การสแกนด้วยกล้องจริงต้องใช้ HTTPS หรือ localhost และได้รับอนุญาตจากผู้ใช้

## ตรวจสอบ

ใน `server`: `npm test`

ใน `client`: `npm test`, `npm run lint`, `npm run build`

การทดสอบ API ใช้ฐานข้อมูลจำลอง ไม่เขียน Oracle ส่วนกฎการจองทดสอบที่นั่งเต็ม, QR ซ้ำ, เจ้าของรายการ, เวลารถซ้อน และ No Show

สำหรับทดสอบ UI แบบแยกจาก Oracle เท่านั้น:

```powershell
# terminal 1: server
node test/preview-server.cjs
# terminal 2: client
$env:API_TARGET='http://127.0.0.1:5001'
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

บัญชี fixture: U001 / preview-admin, U002 / preview-driver, U005 / preview-user
fixture นี้ไม่รองรับการเขียนผู้ใช้และไม่ถูกเรียกจาก `npm start` ห้ามใช้แทน backend จริง
