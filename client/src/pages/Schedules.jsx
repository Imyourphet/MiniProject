import { useState } from 'react';
import { ActionButton, ActionForm, Card, Field, Select, Table } from '../components/UI';
import { byId, fullName, activeSeats, duration, minutes, timeText, permissions } from '../lib/shuttle';
import { todayISO, fmtDate } from '../lib/demoData';

export default function Schedules({ data, users, dispatch }) {
  const [date, setDate] = useState(todayISO());
  const name = id => fullName(users.find(u => u.userId === id));
  return <><Card title="เพิ่มตารางเดินรถ"><ActionForm submit="เพิ่มตารางเดินรถ" onSubmit={values => dispatch('addSchedule', values)}>
    <Select label="เส้นทาง" name="routeId" options={data.routes} required /><Field label="เวลาออก" name="time" type="time" defaultValue="09:30" required />
    <Select label="คนขับ" name="empId" options={users.filter(u => permissions(data, u.posId).includes('SC06')).map(u => ({ id: u.userId, name: fullName(u) }))} required />
    <Select label="รถ" name="carId" options={data.cars.filter(c => c.statusId !== 'CS2').map(c => ({ id: c.id, name: c.plate }))} required />
  </ActionForm></Card>
  <Card title="ตารางเดินรถ"><Table heads={['รหัส', 'เส้นทาง', 'เวลา', 'คนขับ', 'รถ', 'จัดการ']} empty={!data.schedules.length}>
    {data.schedules.map(s => <tr key={s.id}><td>{s.id}</td><td>{byId(data.routes, s.routeId).name}</td><td>{s.time}–{timeText(minutes(s.time) + duration(data, s.routeId))}</td><td>{name(s.empId)}</td><td>{byId(data.cars, s.carId).plate}</td><td><ActionButton className="danger" confirm="ลบตารางและรอบที่ยังไม่ถูกใช้งาน?" action={() => dispatch('deleteSchedule', { id: s.id })}>ลบ</ActionButton></td></tr>)}
  </Table></Card>
  <Card title="เปิดรอบเดินรถรายวัน"><ActionForm submit="เปิดรอบเดินรถ" onSubmit={values => { dispatch('openRounds', { date: values.date, days: Number(values.days) }); setDate(values.date); }}>
    <Field label="วันเริ่มต้น" name="date" type="date" min={todayISO()} defaultValue={todayISO()} required /><Select label="เปิดต่อเนื่อง" name="days" defaultValue="1" empty={false} options={[1, 3, 7].map(n => ({ id: n, name: `${n} วัน` }))} />
  </ActionForm></Card>
  <Card title={`รอบวันที่ ${fmtDate(date)}`}><Field label="วันที่เดินรถ" type="date" value={date} onChange={event => setDate(event.target.value)} />
    <Table heads={['รหัสรอบ', 'เวลา', 'เส้นทาง', 'จอง/ทั้งหมด', 'สถานะ', 'จัดการ']} empty={!data.rounds.some(r => r.date === date)}>{data.rounds.filter(r => r.date === date).map(round => {
      const s = byId(data.schedules, round.scheduleId);
      return <tr key={round.id}><td>{round.id}</td><td>{s.time}</td><td>{byId(data.routes, s.routeId).name}</td><td>{activeSeats(data, round.id)}/{round.seats}</td><td>{byId(data.roundStatuses, round.statusId).name}</td><td><ActionButton className="danger" confirm="ลบรอบนี้?" action={() => dispatch('deleteRound', { id: round.id })}>ลบ</ActionButton></td></tr>;
    })}</Table>
  </Card></>;
}