// Shuttle preview data adapted from G1; never used for authentication.
// รหัสของตารางสถานะ (lookup table ตาม ER)
const BS = { WAIT: 'BS1', BOARD: 'BS2', DONE: 'BS3', NOSHOW: 'BS4', CANCEL: 'BS5' }; // สถานะการจอง
const RS = { WAIT: 'RS1', RUN: 'RS2', CLOSED: 'RS3' };                                 // สถานะรอบเดินรถ
const CS = { FREE: 'CS1', REPAIR: 'CS2' };                                             // สถานะรถ

// วันที่เก็บเป็น 'YYYY-MM-DD' แสดงเป็น dd/mm/พ.ศ.
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayISO = () => isoOf(new Date());
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)); };
const fmtDate = iso => { if (!iso) return '-'; const [y, m, d] = iso.split('-'); return d + '/' + m + '/' + (+y + 543); };

export function createDemoData() {
  const today = todayISO();

  const carTypes = [
    { id: 'T01', name: 'รถตู้ 9 ที่นั่ง', seats: 9 },
    { id: 'T02', name: 'รถบัส 20 ที่นั่ง', seats: 20 },
    { id: 'T03', name: 'รถตู้ 12 ที่นั่ง', seats: 12 }
  ];
  const cars = [
    { id: '01', plate: 'สย 2599', statusId: CS.FREE, typeId: 'T01' },
    { id: '02', plate: 'บก 1130', statusId: CS.FREE, typeId: 'T02' },
    { id: '03', plate: 'สย 2591', statusId: CS.FREE, typeId: 'T03' }
  ];
  const schedules = [
    { id: '001', time: '09:30', routeId: '0001', carId: '03', empId: 'U002' },
    { id: '002', time: '11:00', routeId: '0001', carId: '03', empId: 'U003' },
    { id: '003', time: '13:00', routeId: '0001', carId: '02', empId: 'U002' },
    { id: '004', time: '15:00', routeId: '0001', carId: '02', empId: 'U002' },
    { id: '005', time: '09:30', routeId: '0002', carId: '01', empId: 'U004' },
    { id: '006', time: '11:00', routeId: '0002', carId: '01', empId: 'U004' },
    { id: '007', time: '13:00', routeId: '0002', carId: '01', empId: 'U003' },
    { id: '008', time: '15:00', routeId: '0002', carId: '01', empId: 'U003' }
  ];

  // รอบเดินรถ: เปิดจากตารางเดินรถ วันนี้ + อีก 2 วัน (ที่นั่ง = ที่นั่งของประเภทรถ)
  const rounds = [], rid = {};
  for (let day = 0; day < 3; day++) {
    schedules.forEach(s => {
      const date = addDays(today, day);
      const id = 'RD' + String(rounds.length + 1).padStart(3, '0');
      const seats = carTypes.find(t => t.id == cars.find(c => c.id == s.carId).typeId).seats;
      rid[s.id + '|' + date] = id;
      rounds.push({ id, scheduleId: s.id, date, seats, statusId: RS.WAIT });
    });
  }

  // สิทธิ์ (ตำแหน่ง <-> หน้าจอ) seq = ลำดับเมนู
  const permMap = {
    P1: ['SC01', 'SC02', 'SC03', 'SC04', 'SC05', 'SC10', 'SC11'],
    P2: ['SC06', 'SC07', 'SC08'],
    P3: ['SC09']
  };
  const perms = [];
  Object.keys(permMap).forEach(p => permMap[p].forEach((s, i) => perms.push({ posId: p, screenId: s, seq: i + 1 })));

  return {
    // แผนก
    departments: [
      { id: 'D0001', name: 'ฝ่ายบุคคล' },
      { id: 'D0002', name: 'ฝ่ายยานพาหนะ' }
    ],

    // ตำแหน่ง
    positions: [
      { id: 'P1', name: 'Admin' },
      { id: 'P2', name: 'คนขับรถ' },
      { id: 'P3', name: 'ผู้ใช้งานทั่วไป' }
    ],

    // User identities come exclusively from the USERS API.
    // หน้าจอ
    screens: [
      { id: 'SC01', name: 'จัดการพนักงาน' },
      { id: 'SC02', name: 'กำหนดสิทธิ์' },
      { id: 'SC03', name: 'จัดเส้นทาง' },
      { id: 'SC04', name: 'จัดรอบเดินรถ' },
      { id: 'SC05', name: 'รายงาน' },
      { id: 'SC06', name: 'ตารางงานคนขับ' },
      { id: 'SC07', name: 'สแกน QR' },
      { id: 'SC08', name: 'ปิดรอบการเดินทาง' },
      { id: 'SC09', name: 'จองรถ' },
      { id: 'SC10', name: 'จัดการแผนก' },
      { id: 'SC11', name: 'จัดการรถ' }
    ],
    perms,

    // เส้นทางรถ
    routes: [
      { id: '0001', name: 'วนหน้าม.-โลตัส' },
      { id: '0002', name: 'มหาวิทยาลัยเทคโนโลยีมหานคร - ร้านส้มตำป้านาง' },
      { id: '0003', name: 'Big C หนองจอก - มหาวิทยาลัยเทคโนโลยีมหานคร' }
    ],

    // จุดขึ้น-ลงรถ
    stops: [
      { id: 'S001', name: 'ม.มหานคร' },
      { id: 'S002', name: 'โลตัสหนองจอก' },
      { id: 'S003', name: 'โรงพยาบาลหนองจอก' },
      { id: 'S004', name: 'Big C หนองจอก' },
      { id: 'S005', name: 'สวนสาธารณะหนองจอก' },
      { id: 'S006', name: 'ร้านส้มตำป้านาง' }
    ],

    // จุดจอดแต่ละเส้นทาง
    routeStops: [
      { routeId: '0001', seq: 1, stopId: 'S001', travelTime: 0 },
      { routeId: '0001', seq: 2, stopId: 'S002', travelTime: 5 },
      { routeId: '0001', seq: 3, stopId: 'S003', travelTime: 3 },
      { routeId: '0001', seq: 4, stopId: 'S004', travelTime: 6 },
      { routeId: '0001', seq: 5, stopId: 'S003', travelTime: 3 },
      { routeId: '0001', seq: 6, stopId: 'S002', travelTime: 3 },
      { routeId: '0001', seq: 7, stopId: 'S001', travelTime: 10 },

      { routeId: '0002', seq: 1, stopId: 'S001', travelTime: 0 },
      { routeId: '0002', seq: 2, stopId: 'S002', travelTime: 5 },
      { routeId: '0002', seq: 3, stopId: 'S005', travelTime: 3 },
      { routeId: '0002', seq: 4, stopId: 'S006', travelTime: 5 },

      { routeId: '0003', seq: 1, stopId: 'S004', travelTime: 0 },
      { routeId: '0003', seq: 2, stopId: 'S002', travelTime: 5 },
      { routeId: '0003', seq: 3, stopId: 'S005', travelTime: 3 },
      { routeId: '0003', seq: 4, stopId: 'S006', travelTime: 5 },
      { routeId: '0003', seq: 5, stopId: 'S001', travelTime: 2 }
    ],

    // ประเภทรถ / สถานะรถ / รถ
    carTypes,
    carStatuses: [
      { id: CS.FREE, name: 'ว่าง' },
      { id: CS.REPAIR, name: 'ซ่อมบำรุง' }
    ],
    cars,

    // ตารางเดินรถ (เวลาออก + เส้นทาง + รถ + คนขับ — ใช้ซ้ำทุกวัน)
    schedules,

    // สถานะรอบเดินรถ / รอบเดินรถ (ตารางเดินรถ 1 : N รอบเดินรถ)
    roundStatuses: [
      { id: RS.WAIT, name: 'ยังไม่เริ่ม' },
      { id: RS.RUN, name: 'กำลังเดินทาง' },
      { id: RS.CLOSED, name: 'ปิดรอบแล้ว' }
    ],
    rounds,

    // สถานะการจอง / การจอง / รายละเอียดการจอง
    bookingStatuses: [
      { id: BS.WAIT, name: 'รอเดินทาง' },
      { id: BS.BOARD, name: 'ขึ้นรถแล้ว' },
      { id: BS.DONE, name: 'เดินทางแล้ว' },
      { id: BS.NOSHOW, name: 'No Show' },
      { id: BS.CANCEL, name: 'ยกเลิก' }
    ],
    bookings: [
      { id: 'B00001', bookDate: today, userId: 'U005' },
      { id: 'B00002', bookDate: today, userId: 'U006' }
    ],
    bookingDetails: [
      { bookingId: 'B00001', seq: 1, roundId: rid['001|' + today], originStopId: 'S001', destStopId: 'S002', seats: 2, qrcode: 'QR-B00001-1', statusId: BS.WAIT },
      { bookingId: 'B00001', seq: 2, roundId: rid['001|' + addDays(today, 1)], originStopId: 'S002', destStopId: 'S001', seats: 2, qrcode: 'QR-B00001-2', statusId: BS.WAIT },
      { bookingId: 'B00002', seq: 1, roundId: rid['006|' + today], originStopId: 'S002', destStopId: 'S006', seats: 1, qrcode: 'QR-B00002-1', statusId: BS.WAIT }
    ],

    seq: 100
  };
}


export { BS, RS, CS, todayISO, addDays, fmtDate };
