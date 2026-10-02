import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';

const Booking = () => {
  // ข้อมูลจำลอง Master Data
  const routesData = [
    { id: 1, name: 'เส้นทางที่ 1: มหาวิทยาลัย - โลตัส - รพ.หนองจอก - Big C' },
    { id: 2, name: 'เส้นทางที่ 2: มหาวิทยาลัย - โลตัส - สวนสาธารณะ - ร้านส้มตำป้านาง' },
    { id: 3, name: 'เส้นทางที่ 3: Big C - โลตัส - สวนสาธารณะ - มหาวิทยาลัย' }
  ];

  const stopPointsData = [
    'มหาวิทยาลัยเทคโนโลยีมหานคร',
    'โลตัสหนองจอก',
    'โรงพยาบาลหนองจอก',
    'Big C หนองจอก',
    'สวนสาธารณะหนองจอก',
    'ร้านส้มตำป้านาง'
  ];

  // รอบเดินรถ (ตัวอย่างข้อมูล capacity และเวลาออก)
  const [schedules, setSchedules] = useState([
    { id: 101, routeId: 1, time: '09:30', maxSeats: 9, bookedSeats: 8, departureTime: new Date(Date.now() + 60 * 60 * 1000) }, // อีก 1 ชม.
    { id: 102, routeId: 1, time: '11:00', maxSeats: 20, bookedSeats: 5, departureTime: new Date(Date.now() + 180 * 60 * 1000) },
    { id: 103, routeId: 1, time: '13:00', maxSeats: 20, bookedSeats: 20, departureTime: new Date(Date.now() + 300 * 60 * 1000) },
    { id: 104, routeId: 2, time: '09:30', maxSeats: 9, bookedSeats: 2, departureTime: new Date(Date.now() + 10 * 60 * 1000) } // อีก 10 นาที (จะไม่แสดงเพราะ < 20 นาที)
  ]);

  // Form State
  const [selectedRoute, setSelectedRoute] = useState('');
  const [pickupStop, setPickupStop] = useState('');
  const [dropoffStop, setDropoffStop] = useState('');
  const [seatsCount, setSeatsCount] = useState(1);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [availableSchedules, setAvailableSchedules] = useState([]);

  // Filter & History State
  const [bookingsHistory, setBookingsHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState('upcoming'); // upcoming, completed, cancelled
  const [errorMessage, setErrorMessage] = useState('');

  // กรองรอบรถตามเงื่อนไข 20 นาที และที่นั่งว่าง
  useEffect(() => {
    if (selectedRoute) {
      const now = new Date();
      const filtered = schedules.filter(s => {
        if (s.routeId !== parseInt(selectedRoute)) return false;
        
        // เช็กเวลาล่วงหน้า >= 20 นาที
        const diffMinutes = (new Date(s.departureTime) - now) / (1000 * 60);
        if (diffMinutes < 20) return false;

        return true;
      });
      setAvailableSchedules(filtered);
    } else {
      setAvailableSchedules([]);
    }
  }, [selectedRoute, schedules]);

  // จัดการการจองรถ
  const handleBooking = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!pickupStop || !dropoffStop || pickupStop === dropoffStop) {
      setErrorMessage('กรุณาเลือกจุดขึ้นและจุดลงให้ถูกต้อง (ห้ามเป็นจุดเดียวกัน)');
      return;
    }

    if (!selectedSchedule) {
      setErrorMessage('กรุณาเลือกรอบเวลาเดินรถ');
      return;
    }

    // เงื่อนไข: จองได้ไม่เกิน 4 ที่นั่ง
    if (seatsCount < 1 || seatsCount > 4) {
      setErrorMessage('จำกัดการจองสูงสุดไม่เกิน 4 ที่นั่งต่อครั้ง');
      return;
    }

    const scheduleObj = schedules.find(s => s.id === parseInt(selectedSchedule));
    const seatsLeft = scheduleObj.maxSeats - scheduleObj.bookedSeats;

    // เงื่อนไข: ตรวจสอบที่นั่งว่างเพียงพอ
    if (seatsCount > seatsLeft) {
      setErrorMessage(`ที่นั่งคงเหลือไม่พอ (ว่างเพียง ${seatsLeft} ที่นั่ง)`);
      return;
    }

    // ทำรายการจองสำเร็จ
    const newBooking = {
      bookingId: `BK-${Date.now()}`,
      routeId: selectedRoute,
      pickupStop,
      dropoffStop,
      time: scheduleObj.time,
      seats: seatsCount,
      scheduleId: scheduleObj.id,
      status: 'upcoming', // upcoming, completed, cancelled
      createdAt: new Date().toLocaleString('th-TH')
    };

    // อัปเดตจำนวนที่นั่งที่ถูกจองในรอบนั้น
    setSchedules(prev => prev.map(s => {
      if (s.id === scheduleObj.id) {
        return { ...s, bookedSeats: s.bookedSeats + parseInt(seatsCount) };
      }
      return s;
    }));

    setBookingsHistory([newBooking, ...bookingsHistory]);
    alert('จองรถสำเร็จเรียบร้อย!');
    
    // Reset Form
    setSelectedSchedule('');
    setSeatsCount(1);
  };

  // ยกเลิกการจองและคืนจำนวนที่นั่ง
  const handleCancelBooking = (bookingId, scheduleId, seats) => {
    if (window.confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) {
      // คืนที่นั่งเข้าสู่ระบบ
      setSchedules(prev => prev.map(s => {
        if (s.id === scheduleId) {
          return { ...s, bookedSeats: Math.max(0, s.bookedSeats - seats) };
        }
        return s;
      }));

      // อัปเดตสถานะการจอง
      setBookingsHistory(prev => prev.map(b => {
        if (b.bookingId === bookingId) {
          return { ...b, status: 'cancelled' };
        }
        return b;
      }));
    }
  };

  const filteredHistory = bookingsHistory.filter(b => b.status === filterStatus);

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>🚌 ระบบจองรถรับส่ง (MUT Shuttle Bus)</h2>

      {/* ฟอร์มการจอง */}
      <form onSubmit={handleBooking} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>ระบุรายละเอียดการเดินทาง</h3>
        
        {errorMessage && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMessage}</p>}

        <div style={{ marginBottom: '10px' }}>
          <label>เลือกเส้นทาง: </label>
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} required style={{ padding: '8px', width: '100%' }}>
            <option value="">-- กรุณาเลือกเส้นทาง --</option>
            {routesData.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <label>จุดขึ้นรถ: </label>
            <select value={pickupStop} onChange={(e) => setPickupStop(e.target.value)} required style={{ padding: '8px', width: '100%' }}>
              <option value="">-- เลือกจุดขึ้น --</option>
              {stopPointsData.map((stop, idx) => (
                <option key={idx} value={stop}>{stop}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label>จุดลงรถ: </label>
            <select value={dropoffStop} onChange={(e) => setDropoffStop(e.target.value)} required style={{ padding: '8px', width: '100%' }}>
              <option value="">-- เลือกจุดลง --</option>
              {stopPointsData.map((stop, idx) => (
                <option key={idx} value={stop}>{stop}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>รอบเวลาเดินรถ (ต้องจองก่อนอย่างน้อย 20 นาที): </label>
          <select value={selectedSchedule} onChange={(e) => setSelectedSchedule(e.target.value)} required style={{ padding: '8px', width: '100%' }}>
            <option value="">-- เลือกรอบเวลา --</option>
            {availableSchedules.map(s => {
              const seatsLeft = s.maxSeats - s.bookedSeats;
              return (
                <option key={s.id} value={s.id} disabled={seatsLeft <= 0}>
                  รอบ {s.time} น. {seatsLeft <= 0 ? '(เต็มแล้ว)' : `(ว่าง ${seatsLeft}/${s.maxSeats} ที่นั่ง)`}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>จำนวนที่นั่ง (สูงสุด 4 คน): </label>
          <input 
            type="number" 
            min="1" 
            max="4" 
            value={seatsCount} 
            onChange={(e) => setSeatsCount(parseInt(e.target.value) || 1)} 
            style={{ padding: '8px', width: '100px', marginLeft: '10px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px 20px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ยืนยันการจองรถ
        </button>
      </form>

      {/* ประวัติการจองและ QR Code */}
      <div>
        <h3>รายการจองของคุณ</h3>
        <div style={{ marginBottom: '15px' }}>
          <button onClick={() => setFilterStatus('upcoming')} style={{ fontWeight: filterStatus === 'upcoming' ? 'bold' : 'normal', marginRight: '10px' }}>
            กำลังจะถึง
          </button>
          <button onClick={() => setFilterStatus('completed')} style={{ fontWeight: filterStatus === 'completed' ? 'bold' : 'normal', marginRight: '10px' }}>
            เดินทางแล้ว
          </button>
          <button onClick={() => setFilterStatus('cancelled')} style={{ fontWeight: filterStatus === 'cancelled' ? 'bold' : 'normal' }}>
            ยกเลิกแล้ว
          </button>
        </div>

        {filteredHistory.length === 0 ? (
          <p>ไม่มีรายการในหมวดหมู่นี้</p>
        ) : (
          filteredHistory.map(item => (
            <div key={item.bookingId} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-[#12]between', alignItems: 'center' }}>
              <div>
                <p><strong>รหัสจอง:</strong> {item.bookingId}</p>
                <p><strong>ขึ้นที่:</strong> {item.pickupStop} ➡️ <strong>ลงที่:</strong> {item.dropoffStop}</p>
                <p><strong>เวลารถออก:</strong> {item.time} น. ({item.seats} ที่นั่ง)</p>
                <p><small>ทำรายการเมื่อ: {item.createdAt}</small></p>

                {item.status === 'upcoming' && (
                  <button 
                    onClick={() => handleCancelBooking(item.bookingId, item.scheduleId, item.seats)}
                    style={{ background: '#d9534f', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' }}
                  >
                    ยกเลิกการจอง
                  </button>
                )}
              </div>

              {item.status === 'upcoming' && (
                <div style={{ textAlign: 'center' }}>
                  <QRCode value={JSON.stringify({ bookingId: item.bookingId, seats: item.seats })} size={100} />
                  <p style={{ fontSize: '12px', marginTop: '5px' }}>สแกนเพื่อขึ้นรถ</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Booking;