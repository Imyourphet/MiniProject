import { useState } from 'react';
import { ActionButton, ActionForm, Badge, Card, Field, Select, Table } from '../components/UI';
import BookingQR from '../components/QRCode';
import { BS, RS, todayISO, fmtDate } from '../lib/dates';
import { byId, routeStops, seatsLeft } from '../lib/shuttle';

export default function Booking({ data, me, dispatch }) {
  const [search, setSearch] = useState(null), [draft, setDraft] = useState([]), [target, setTarget] = useState(''), [filter, setFilter] = useState('upcoming'), [message, setMessage] = useState('');
  const roundLabel = id => { const r = byId(data.rounds, id), s = byId(data.schedules, r.scheduleId); return `${fmtDate(r.date)} ${s.time || ''} · ${byId(data.routes, s.routeId).name || '-'}`; };
  const results = search ? data.rounds.filter(r => {
    const s = byId(data.schedules, r.scheduleId), stops = routeStops(data, s.routeId), origin = stops.find(stop => stop.stopId === search.originStopId);
    return r.date === search.date && r.statusId === RS.WAIT && (r.date !== todayISO() || s.time > new Date().toTimeString().slice(0, 5)) && origin && stops.some(stop => stop.stopId === search.destStopId && stop.seq > origin.seq);
  }) : [];
  const matches = detail => filter === 'upcoming' ? [BS.WAIT, BS.BOARD].includes(detail.statusId) : filter === 'done' ? [BS.DONE, BS.NOSHOW].includes(detail.statusId) : detail.statusId === BS.CANCEL;
  const groups = data.bookings.filter(b => b.userId === me.userId).map(b => ({ ...b, details: data.bookingDetails.filter(d => d.bookingId === b.id && matches(d)) })).filter(b => b.details.length).reverse();
  return <><Card title="ค้นหารอบเดินรถ"><ActionForm submit="ค้นหารอบ" onSubmit={values => {
    if (values.originStopId === values.destStopId) throw new Error('จุดขึ้นและจุดลงต้องต่างกัน');
    setSearch({ ...values, seats: Number(values.seats) }); setMessage('');
  }}><Field label="วันเดินทาง" name="date" type="date" min={todayISO()} defaultValue={todayISO()} required />
    <Select label="จุดขึ้นรถ" name="originStopId" options={data.stops} defaultValue={data.stops[0]?.id} required />
    <Select label="จุดลงรถ" name="destStopId" options={data.stops} defaultValue={data.stops[1]?.id} required />
    <Field label="จำนวนที่นั่ง" name="seats" type="number" min="1" max="6" defaultValue="1" required />
  </ActionForm>{search && <Table heads={['รอบเดินรถ', 'ที่นั่งว่าง', 'เลือก']} empty={!results.length}>{results.map(round => {
    const left = seatsLeft(data, round.id) - draft.filter(d => d.roundId === round.id).reduce((sum, d) => sum + d.seats, 0);
    return <tr key={round.id}><td>{roundLabel(round.id)}</td><td>{left}/{round.seats}</td><td><button disabled={left < search.seats} onClick={() => setDraft(items => [...items, { roundId: round.id, originStopId: search.originStopId, destStopId: search.destStopId, seats: search.seats }])}>{left < search.seats ? 'ที่นั่งไม่พอ' : '+ เพิ่มในการจอง'}</button></td></tr>;
  })}</Table>}</Card>
  <Card title={target ? `เพิ่มรายการในการจอง ${target}` : 'รายการที่จะจอง'}><Table heads={['รอบ', 'จุดขึ้น → ลง', 'ที่นั่ง', 'จัดการ']} empty={!draft.length}>{draft.map((item, i) => <tr key={i}><td>{roundLabel(item.roundId)}</td><td>{byId(data.stops, item.originStopId).name} → {byId(data.stops, item.destStopId).name}</td><td>{item.seats}</td><td><button className="danger" onClick={() => setDraft(items => items.filter((_, index) => index !== i))}>ลบ</button></td></tr>)}</Table>
    <div className="actions"><ActionButton disabled={!draft.length} className="primary" action={async () => { await dispatch('book', { items: draft, bookingId: target || null }); setDraft([]); setTarget(''); setFilter('upcoming'); setMessage('ยืนยันการจองแล้ว'); }}>ยืนยันการจอง</ActionButton><button className="secondary" onClick={() => { setDraft([]); setTarget(''); }}>ล้างรายการ</button></div>
    {message && <p className="success" role="status">{message}</p>}
  </Card>
  <Card title="การจองของฉัน"><div className="tabs">{[['upcoming', 'กำลังจะถึง'], ['done', 'เสร็จแล้ว'], ['cancel', 'ยกเลิก']].map(([key, label]) => <button key={key} className={filter === key ? '' : 'secondary'} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {!groups.length && <p className="muted">ยังไม่มีรายการ</p>}{groups.map(booking => <article className="booking-group" key={booking.id}><div className="section-heading"><h3>{booking.id} · จองเมื่อ {fmtDate(booking.bookDate)}</h3>{filter === 'upcoming' && <button className="secondary" onClick={() => { setTarget(booking.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>เพิ่มรายการ</button>}</div>
      {booking.details.map(detail => <div className="booking-detail" key={detail.seq}><h4>รายการที่ {detail.seq} · {roundLabel(detail.roundId)}</h4><p>{byId(data.stops, detail.originStopId).name} → {byId(data.stops, detail.destStopId).name} · {detail.seats} ที่นั่ง</p><Badge>{byId(data.bookingStatuses, detail.statusId).name}</Badge>
        {detail.statusId === BS.WAIT && <><BookingQR value={detail.qrcode} /><ActionButton className="danger" confirm="ยกเลิกรายการจองนี้?" action={() => dispatch('cancelBooking', { bookingId: booking.id, seq: detail.seq })}>ยกเลิกรายการนี้</ActionButton></>}
      </div>)}
    </article>)}
  </Card></>;
}
