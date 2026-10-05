import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

export function useShuttle() {
  const [data, setData] = useState(null), [error, setError] = useState('');
  const requestId = useRef(0), writing = useRef(false), active = useRef(true);
  const reload = useCallback(async () => {
    if (writing.current) return;
    const id = ++requestId.current;
    try {
      const next = await api('/shuttle');
      if (active.current && requestId.current === id) { setData(next); setError(''); }
    } catch (err) { if (active.current && requestId.current === id) setError(err.message); }
  }, []);
  const invalidateRequests = useCallback(() => { requestId.current++; }, []);
  useEffect(() => {
    let disposed = false;
    active.current = true;
    Promise.resolve().then(() => { if (!disposed) reload(); });
    const timer = setInterval(() => { if (!document.hidden) reload(); }, 15000);
    const visible = () => { if (!document.hidden) reload(); };
    document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; active.current = false; invalidateRequests(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [invalidateRequests, reload]);
  const dispatch = useCallback(async (type, payload) => {
    if (writing.current) throw new Error('กำลังบันทึกรายการก่อนหน้า กรุณารอสักครู่');
    writing.current = true;
    const id = ++requestId.current;
    try {
      const next = await api('/shuttle/actions', { method: 'POST', body: { type, payload } });
      if (active.current && requestId.current === id) { setData(next); setError(''); }
      return next;
    } finally { writing.current = false; }
  }, []);
  return { data, error, reload, dispatch };
}
