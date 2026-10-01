import { BS, RS, CS, todayISO, addDays } from './dates.mjs';

export const byId = (items, id) => items.find(item => item.id === id) || {};
export const fullName = user => user ? `${user.firstName} ${user.lastName}` : '-';
export const minutes = time => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
export const timeText = n => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const routeStops = (data, id) => data.routeStops.filter(stop => stop.routeId === id).sort((a, b) => a.seq - b.seq);
export const duration = (data, id) => routeStops(data, id).reduce((sum, stop) => sum + stop.travelTime, 0);
export const activeSeats = (data, id) => byId(data.rounds, id).reservedSeats ?? data.bookingDetails.filter(item => item.roundId === id && item.statusId !== BS.CANCEL).reduce((sum, item) => sum + item.seats, 0);
export const seatsLeft = (data, id) => (byId(data.rounds, id).seats || 0) - activeSeats(data, id);
export const permissions = (data, posId) => data.perms.filter(p => p.posId === posId).sort((a, b) => a.seq - b.seq).map(p => p.screenId);
export function passengerStops(data, routeId, detail) {
  const stops = routeStops(data, routeId);
  const origin = stops.find(stop => stop.stopId === detail.originStopId);
  const destination = stops.find(stop => stop.stopId === detail.destStopId && stop.seq > (origin?.seq ?? Infinity));
  return { originSeq: origin?.seq, destSeq: destination?.seq };
}
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };

// Shared business rules. The server applies these inside an Oracle transaction.
export function transition(current, action, user) {
  const data = structuredClone(current);
  const nextId = prefix => prefix + (++data.seq);
  const can = screen => permissions(data, user.posId).includes(screen);
  const admin = () => requireValue(user.posId === 'P1', 'เฉพาะผู้ดูแลระบบ');
  const ownedRound = id => {
    const round = byId(data.rounds, id), schedule = byId(data.schedules, round.scheduleId);
    requireValue(round.id && schedule.empId === user.userId, 'ไม่ใช่รอบที่ได้รับมอบหมาย');
    return round;
  };
  const { type, payload: p } = action;
  if (type === 'saveMaster') {
    admin();
    requireValue(['departments', 'positions', 'stops', 'routes', 'carTypes', 'cars'].includes(p.collection), 'ประเภทข้อมูลไม่ถูกต้อง');
    requireValue(p.item.id && (p.item.name?.trim() || p.item.plate?.trim()), 'กรอกรหัสและชื่อให้ครบ');
    const old = byId(data[p.collection], p.item.id);
    requireValue(p.editing || !old.id, 'รหัสนี้มีอยู่แล้ว');
    if (p.collection === 'carTypes') requireValue(Number.isInteger(p.item.seats) && p.item.seats > 0, 'จำนวนที่นั่งต้องเป็นจำนวนเต็มมากกว่า 0');
    if (p.collection === 'cars') {
      requireValue(byId(data.carTypes, p.item.typeId).id, 'เลือกประเภทรถ');
      requireValue(!data.cars.some(c => c.id !== p.item.id && c.plate === p.item.plate), 'ทะเบียนรถซ้ำ');
    }
    if (old.id) Object.assign(old, p.item); else data[p.collection].push(p.item);
  } else if (type === 'deleteMaster') {
    admin();
    requireValue(['departments', 'positions', 'stops', 'routes', 'carTypes', 'cars'].includes(p.collection), 'ประเภทข้อมูลไม่ถูกต้อง');
    const used = p.collection === 'routes' ? data.schedules.some(s => s.routeId === p.id)
      : p.collection === 'stops' ? data.routeStops.some(s => s.stopId === p.id) || data.bookingDetails.some(d => d.originStopId === p.id || d.destStopId === p.id)
      : p.collection === 'cars' ? data.schedules.some(s => s.carId === p.id)
      : p.collection === 'carTypes' ? data.cars.some(c => c.typeId === p.id)
      : p.inUse;
    requireValue(!used && !(p.collection === 'positions' && ['P1', 'P2', 'P3'].includes(p.id)), 'มีข้อมูลอื่นใช้งานรายการนี้อยู่');
    data[p.collection] = data[p.collection].filter(item => item.id !== p.id);
    if (p.collection === 'routes') data.routeStops = data.routeStops.filter(s => s.routeId !== p.id);
    if (p.collection === 'positions') data.perms = data.perms.filter(pm => pm.posId !== p.id);
  } else if (type === 'permission') {
    admin();
    requireValue(!(p.on && p.posId !== 'P1' && ['SC01', 'SC02', 'SC03', 'SC04', 'SC05', 'SC10', 'SC11'].includes(p.screenId)), 'หน้าจัดการข้อมูลสงวนไว้สำหรับ P1');
    requireValue(!(p.posId === 'P1' && ['SC01', 'SC02'].includes(p.screenId) && !p.on), 'ต้องคงเมนูผู้ใช้และสิทธิ์ของผู้ดูแลไว้');
    data.perms = data.perms.filter(pm => !(pm.posId === p.posId && pm.screenId === p.screenId));
    if (p.on) data.perms.push({ posId: p.posId, screenId: p.screenId, seq: Math.max(0, ...data.perms.filter(pm => pm.posId === p.posId).map(pm => pm.seq)) + 1 });
  } else if (type === 'addStop') {
    admin();
    requireValue(!data.schedules.some(s => s.routeId === p.routeId), 'เส้นทางนี้มีตารางเดินรถแล้ว ลบตารางก่อนเปลี่ยนจุดจอด');
    requireValue(byId(data.routes, p.routeId).id && byId(data.stops, p.stopId).id, 'เลือกเส้นทางและจุดจอด');
    requireValue(Number.isInteger(p.travelTime) && p.travelTime >= 0, 'เวลาเดินทางต้องไม่ติดลบ');
    data.routeStops.push({ ...p, seq: routeStops(data, p.routeId).length + 1 });
  } else if (type === 'removeStop') {
    admin();
    requireValue(!data.schedules.some(s => s.routeId === p.routeId), 'เส้นทางนี้มีตารางเดินรถแล้ว');
    data.routeStops = data.routeStops.filter(s => !(s.routeId === p.routeId && s.seq === p.seq));
    routeStops(data, p.routeId).forEach((stop, i) => { stop.seq = i + 1; });
  } else if (type === 'addSchedule') {
    admin();
    requireValue(p.empId && byId(data.cars, p.carId).id && routeStops(data, p.routeId).length > 1, 'เลือกรถ คนขับ และเส้นทางที่มีอย่างน้อย 2 จุดจอด');
    requireValue(byId(data.cars, p.carId).statusId !== CS.REPAIR, 'รถอยู่ระหว่างซ่อมบำรุง');
    requireValue(/^\d{2}:\d{2}$/.test(p.time), 'ระบุเวลาออก');
    const start = minutes(p.time), end = start + duration(data, p.routeId);
    requireValue(end < 1440, 'ตัวอย่างนี้รองรับรอบที่จบภายในวันเดียวกัน');
    requireValue(!data.schedules.some(s => start < minutes(s.time) + duration(data, s.routeId) && minutes(s.time) < end && (s.empId === p.empId || s.carId === p.carId)), 'รถหรือคนขับมีตารางเวลาซ้อนกัน');
    data.schedules.push({ id: nextId('TS'), ...p });
  } else if (type === 'deleteSchedule' || type === 'deleteRound') {
    admin();
    const rounds = data.rounds.filter(r => type === 'deleteRound' ? r.id === p.id : r.scheduleId === p.id);
    requireValue(rounds.every(r => r.statusId === RS.WAIT && !data.bookingDetails.some(d => d.roundId === r.id && d.statusId !== BS.CANCEL)), 'ลบไม่ได้ มีการจองหรือเริ่มเดินทางแล้ว');
    const ids = rounds.map(r => r.id);
    data.rounds = data.rounds.filter(r => !ids.includes(r.id));
    data.bookingDetails = data.bookingDetails.filter(d => !ids.includes(d.roundId));
    if (type === 'deleteSchedule') data.schedules = data.schedules.filter(s => s.id !== p.id);
  } else if (type === 'openRounds') {
    admin();
    requireValue(p.date >= todayISO() && [1, 3, 7].includes(p.days), 'เลือกวันที่ปัจจุบันหรืออนาคต');
    for (let i = 0; i < p.days; i++) for (const schedule of data.schedules) {
      const date = addDays(p.date, i), car = byId(data.cars, schedule.carId);
      if (car.statusId === CS.REPAIR || data.rounds.some(r => r.scheduleId === schedule.id && r.date === date)) continue;
      data.rounds.push({ id: nextId('RD'), scheduleId: schedule.id, date, seats: byId(data.carTypes, car.typeId).seats, statusId: RS.WAIT });
    }
  } else if (type === 'book') {
    requireValue(can('SC09'), 'ไม่มีสิทธิ์จองรถ');
    requireValue(p.items.length, 'ยังไม่มีรายการจอง');
    const totals = {};
    for (const item of p.items) {
      const round = byId(data.rounds, item.roundId), schedule = byId(data.schedules, round.scheduleId);
      requireValue(round.id && round.date >= todayISO() && round.statusId === RS.WAIT, 'รอบไม่พร้อมให้จอง');
      requireValue(round.date !== todayISO() || schedule.time > new Date().toTimeString().slice(0, 5), 'เลยเวลาออกเดินทางแล้ว');
      const stops = routeStops(data, schedule.routeId), origin = stops.find(s => s.stopId === item.originStopId);
      requireValue(origin && item.originStopId !== item.destStopId && stops.some(s => s.stopId === item.destStopId && s.seq > origin.seq), 'จุดขึ้นลงไม่ตรงกับเส้นทาง');
      requireValue(Number.isInteger(item.seats) && item.seats > 0 && item.seats <= 6, 'จำนวนที่นั่งต้องอยู่ระหว่าง 1–6');
      totals[round.id] = (totals[round.id] || 0) + item.seats;
    }
for (const [id, total] of Object.entries(totals)) requireValue(seatsLeft(data, id) >= total, 'ที่นั่งไม่เพียงพอ กรุณาค้นหาใหม่');
    let booking = p.bookingId && byId(data.bookings, p.bookingId);
    if (p.bookingId) requireValue(booking?.userId === user.userId, 'ไม่ใช่การจองของคุณ');
    if (!booking) { 
      // ดึงเฉพาะตัวเลขออกมา แล้วเติมเลข 0 นำหน้าให้ครบ 5 หลักเสมอ (เช่น B00001, B00116)
      const rawId = nextId('B');
      const numPart = String(rawId).replace(/\D/g, '');
      const formattedBookingId = `B${numPart.padStart(5, '0')}`;

      booking = { id: formattedBookingId, userId: user.userId, bookDate: todayISO() }; 
      data.bookings.push(booking); 
    }
    let seq = Math.max(0, ...data.bookingDetails.filter(d => d.bookingId === booking.id).map(d => d.seq));
    for (const item of p.items) { 
      seq++; 
      data.bookingDetails.push({ 
        ...item, 
        bookingId: booking.id, 
        seq, 
        qrcode: `QR-${booking.id}-${seq}`, 
        statusId: BS.WAIT 
      }); 
    }
  } else if (type === 'cancelBooking') {
    const detail = data.bookingDetails.find(d => d.bookingId === p.bookingId && d.seq === p.seq);
    requireValue(detail && byId(data.bookings, p.bookingId).userId === user.userId, 'ไม่ใช่การจองของคุณ');
    requireValue(detail.statusId === BS.WAIT, 'ยกเลิกได้เฉพาะรายการที่ยังไม่ขึ้นรถ');
    detail.statusId = BS.CANCEL;
  } else if (['start', 'close', 'checkIn', 'alight'].includes(type)) {
    requireValue(can(type === 'close' ? 'SC08' : type === 'start' ? 'SC06' : 'SC07'), 'ไม่มีสิทธิ์ทำรายการ');
    const round = ownedRound(p.roundId);
    requireValue(round.date === todayISO(), 'ทำรายการได้เฉพาะรอบของวันนี้');
    if (type === 'start') {
      requireValue(round.statusId === RS.WAIT, 'รอบนี้เริ่มหรือปิดแล้ว');
      round.statusId = RS.RUN;
    } else {
      requireValue(round.statusId === RS.RUN, 'ต้องเริ่มรอบก่อน');
      if (type === 'close') {
        round.statusId = RS.CLOSED;
        for (const detail of data.bookingDetails.filter(d => d.roundId === round.id)) {
          if (detail.statusId === BS.BOARD) detail.statusId = BS.DONE;
          else if (detail.statusId === BS.WAIT) detail.statusId = BS.NOSHOW;
        }
      } else {
        const detail = data.bookingDetails.find(d => d.qrcode === p.code.trim().toUpperCase());
        requireValue(detail && detail.roundId === round.id, 'ไม่พบ QR หรือ QR ไม่ตรงรอบ');
        requireValue(detail.statusId === (type === 'checkIn' ? BS.WAIT : BS.BOARD), 'สถานะไม่ถูกต้อง หรือทำรายการแล้ว');
        detail.statusId = type === 'checkIn' ? BS.BOARD : BS.DONE;
      }
    }
  } else throw new Error('ไม่รู้จักคำสั่ง');
  return data;
}
