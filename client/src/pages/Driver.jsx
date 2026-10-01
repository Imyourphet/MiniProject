import { useState } from 'react';
import { ActionButton, ActionForm, Badge, Card, Field, Select, Table } from '../components/UI';
import Scanner from '../components/Scanner';
import { BS, RS, todayISO, fmtDate } from '../lib/demoData';
import { byId, fullName, minutes, routeStops, timeText } from '../lib/shuttle';

function Live({ data, users, round, dispatch, canScan }) {
  const details = data.bookingDetails.filter(d => d.roundId === round.id && d.statusId !== BS.CANCEL);
  const count = status => details.filter(d => d.statusId === status).reduce((sum, d) => sum + d.seats, 0);
  return <><div className="stats"><div><strong>{count(BS.BOARD)}</strong>อยู่บนรถ</div><div><strong>{round.seats - count(BS.BOARD)}</strong>ที่นั่งบนรถว่าง</div><div><strong>{count(BS.WAIT)}</strong>รอขึ้นรถ</div></div>
    <Table heads={['ผู้โดยสาร', 'จุดขึ้น → ลง', 'ที่นั่ง', 'สถานะ', 'จัดการ']} empty={!details.length}>{details.map(detail => {
      const booking = byId(data.bookings, detail.bookingId), user = users.find(u => u.userId === booking.userId);
      return <tr key={`${detail.bookingId}-${detail.seq}`}><td>{user ? fullName(user) : booking.userId}<small>{detail.bookingId}-{detail.seq}</small></td><td>{byId(data.stops, detail.originStopId).name} → {byId(data.stops, detail.destStopId).name}</td><td>{detail.seats}</td><td>{byId(data.bookingStatuses, detail.statusId).name}</td><td>{canScan && detail.statusId === BS.BOARD && <ActionButton action={() => dispatch('alight', { roundId: round.id, code: detail.qrcode })}>ลงรถ</ActionButton>}</td></tr>;
    })}</Table>
  </>;
}

export function Driver({ data, users, me, dispatch, closing = false, canScan }) {
  const [date, setDate] = useState(todayISO());
  const rounds = data.rounds.filter(r => r.date === date && byId(data.schedules, r.scheduleId).empId === me.userId);
  return <><Card><Field label="วันที่เดินรถ" type="date" value={date} onChange={event => setDate(event.target.value)} /></Card>
    {!rounds.length && <Card>ไม่มีรอบเดินรถที่ได้รับมอบหมายในวันที่เลือก</Card>}
    {rounds.map(round => {
      const schedule = byId(data.schedules, round.scheduleId), details = data.bookingDetails.filter(d => d.roundId === round.id);
      let time = minutes(schedule.time);
      const stops = routeStops(data, schedule.routeId).map(stop => { time += stop.travelTime; return { ...stop, time }; });
      const sum = status => details.filter(d => d.statusId === status).reduce((n, d) => n + d.seats, 0);
      return <Card key={round.id} title={`${round.id} · ${byId(data.routes, schedule.routeId).name}`}><p>{fmtDate(round.date)} · ออก {schedule.time} · รถ {byId(data.cars, schedule.carId).plate}</p><Badge>{byId(data.roundStatuses, round.statusId).name}</Badge>
        {!closing && round.statusId === RS.WAIT && <ActionButton disabled={date !== todayISO()} action={() => dispatch('start', { roundId: round.id })}>เริ่มงาน</ActionButton>}
        {closing && round.statusId === RS.RUN && <ActionButton className="danger" confirm="ปิดรอบนี้และบันทึกผู้ไม่มาเป็น No Show?" action={() => dispatch('close', { roundId: round.id })}>ปิดรอบ</ActionButton>}
        {round.statusId === RS.RUN && <Live data={data} users={users} round={round} dispatch={dispatch} canScan={canScan} />}
        {!closing && <Table heads={['ลำดับ', 'จุดจอด', 'เวลาโดยประมาณ', 'ขึ้น', 'ลง']}>{stops.map(stop => <tr key={stop.seq}><td>{stop.seq}</td><td>{byId(data.stops, stop.stopId).name}</td><td>{timeText(stop.time)}</td><td>{details.filter(d => d.statusId !== BS.CANCEL && d.originStopId === stop.stopId).reduce((n, d) => n + d.seats, 0)}</td><td>{details.filter(d => d.statusId !== BS.CANCEL && d.destStopId === stop.stopId).reduce((n, d) => n + d.seats, 0)}</td></tr>)}</Table>}
        {round.statusId === RS.CLOSED && <p className="success">ผู้เดินทาง {sum(BS.DONE)} คน · No Show {sum(BS.NOSHOW)} คน</p>}
      </Card>;
    })}</>;
}

export function ScanPage({ data, users, me, dispatch }) {
  const [selected, setSelected] = useState(''), [result, setResult] = useState(null), [log, setLog] = useState([]);
  const mine = data.rounds.filter(r => r.date === todayISO() && byId(data.schedules, r.scheduleId).empId === me.userId);
  const running = mine.filter(r => r.statusId === RS.RUN), waiting = mine.filter(r => r.statusId === RS.WAIT);
  const round = running.find(r => r.id === selected) || running[0];
  function scan(code) {
    let entry;
    try { dispatch('checkIn', { roundId: round.id, code }); entry = { ok: true, message: `เช็กอินสำเร็จ ${code}` }; }
    catch (error) { entry = { ok: false, message: error.message }; }
    setResult(entry); setLog(items => [{ ...entry, time: new Date().toLocaleTimeString('th-TH') }, ...items].slice(0, 6));
  }
  if (!round) return <Card title="ยังไม่มีรอบที่กำลังเดินทาง"><p>เริ่มงานที่หน้าตารางงานคนขับก่อนสแกน QR</p>{waiting.map(r => <p key={r.id}>{r.id} · {byId(data.schedules, r.scheduleId).time}</p>)}</Card>;
  return <><Card title="สแกน QR ผู้โดยสาร"><Select label="รอบที่กำลังเดินทาง" empty={false} value={round.id} options={running.map(r => ({ id: r.id, name: `${r.id} · ${byId(data.routes, byId(data.schedules, r.scheduleId).routeId).name}` }))} onChange={event => { setSelected(event.target.value); setResult(null); }} />
    <Scanner key={round.id} onScan={scan} />
    <ActionForm submit="ตรวจสอบรหัส" reset onSubmit={values => scan(values.code)}><Field label="กรอกรหัส QR แทนการสแกน" name="code" placeholder="QR-B00001-1" required /></ActionForm>
    {result && <p role="status" className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    <div className="scan-log">{log.map((entry, i) => <p key={i} className={entry.ok ? 'success' : 'error'}>{entry.time} · {entry.message}</p>)}</div>
  </Card><Card title="ผู้โดยสารในรอบนี้"><Live data={data} users={users} round={round} dispatch={dispatch} canScan /></Card></>;
}