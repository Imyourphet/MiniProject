import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function BookingQR({ value }) {
  const canvas = useRef(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toCanvas(canvas.current, value, { width: 180, margin: 2 }).catch(() => { if (active) setError('แสดง QR ไม่สำเร็จ ใช้รหัสด้านล่างแทนได้'); });
    return () => { active = false; };
  }, [value]);
  return <div className="qr"><canvas ref={canvas} aria-label={`QR ${value}`} />{error && <p className="error">{error}</p>}<code>{value}</code><button className="text-button" disabled={!!error} onClick={() => {
    const link = document.createElement('a');
    link.download = `${value}.png`; link.href = canvas.current.toDataURL('image/png'); link.click();
  }}>บันทึก QR เป็นรูปภาพ</button></div>;
}
