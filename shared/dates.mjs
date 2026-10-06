const BS = { WAIT: 'BS1', BOARD: 'BS2', DONE: 'BS3', NOSHOW: 'BS4', CANCEL: 'BS5' }; // สถานะการจอง
const RS = { WAIT: 'RS1', RUN: 'RS2', CLOSED: 'RS3' };                                 // สถานะรอบเดินรถ
const CS = { FREE: 'CS1', REPAIR: 'CS2' };                                             // สถานะรถ

// วันที่เก็บเป็น 'YYYY-MM-DD' แสดงเป็น dd/mm/พ.ศ.
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayISO = () => isoOf(new Date());
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)); };
const fmtDate = iso => { if (!iso) return '-'; const [y, m, d] = iso.split('-'); return d + '/' + m + '/' + (+y + 543); };


export { BS, RS, CS, todayISO, addDays, fmtDate };
