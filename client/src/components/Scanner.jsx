import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function Scanner({ onScan, paused = false }) {
  const video = useRef(null), handler = useRef(onScan);
  const [enabled, setEnabled] = useState(false), [facing, setFacing] = useState('environment'), [error, setError] = useState('');
  useEffect(() => { handler.current = onScan; }, [onScan]);
  useEffect(() => {
    if (!enabled || paused) return;
    let disposed = false, stream, frame, lastCode = '', lastAt = 0, lastTry = 0;
    const element = video.current, canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
    const stop = () => { if (frame) cancelAnimationFrame(frame); stream?.getTracks().forEach(track => track.stop()); if (element) element.srcObject = null; };
    const hidden = () => { if (document.hidden) setEnabled(false); };
    document.addEventListener('visibilitychange', hidden);
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('เปิดกล้องได้เมื่อใช้ HTTPS หรือ localhost เท่านั้น');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        if (disposed) { stop(); return; }
        element.srcObject = stream;
        await element.play();
        if (disposed) { stop(); return; }
        const tick = now => {
          if (disposed) return;
          if (element.readyState >= 2 && now - lastTry > 180) {
            lastTry = now;
            const scale = Math.min(1, 640 / element.videoWidth);
            canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
            context.drawImage(element, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(pixels.data, pixels.width, pixels.height)?.data;
            if (code && (code !== lastCode || now - lastAt > 2500)) { lastCode = code; lastAt = now; handler.current(code); }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        stop();
        if (!disposed) { setEnabled(false); setError(err.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง สามารถกรอกรหัสด้านล่างได้' : err.message); }
      }
    }
    start();
    return () => { disposed = true; stop(); document.removeEventListener('visibilitychange', hidden); };
  }, [enabled, facing, paused]);
  return <div className="scanner"><div className="scanner-title">Camera Scanner <small>วาง QR Code ให้อยู่ในกรอบ</small></div><div className="camera-frame"><video ref={video} muted playsInline aria-label="กล้องสแกน QR" /><div className="scan-guide" />{(!enabled || paused) && <span>{paused ? 'ตรวจสอบและยืนยันผู้โดยสารด้านล่าง' : 'เปิดกล้องเพื่อสแกน QR ผู้โดยสาร'}</span>}</div>
    <div className="actions"><button onClick={() => { setError(''); setEnabled(value => !value); }}>{enabled ? 'ปิดกล้อง' : 'เปิดกล้อง'}</button><button className="secondary" onClick={() => setFacing(value => value === 'environment' ? 'user' : 'environment')}>สลับกล้อง</button></div>
    {error && <p role="alert" className="error">{error}</p>}
  </div>;
}
