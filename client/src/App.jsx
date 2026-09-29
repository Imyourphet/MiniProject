import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Users from './pages/Users';
import { Cars, Departments, Permissions } from './pages/Masters';
import RoutesPage from './pages/Routes';
import Schedules from './pages/Schedules';
import Booking from './pages/Booking';
import { Driver, ScanPage } from './pages/Driver';
import { ActionButton, Card } from './components/UI';
import { api } from './lib/api';
import { permissions } from './lib/shuttle';
import { screens } from './lib/screens';
import { useShuttle } from './lib/useShuttle';
import './App.css';

function Workspace({ me, onLogout }) {
  const { data, error: dataError, reload, dispatch } = useShuttle();
  const [users, setUsers] = useState([]), [directoryError, setDirectoryError] = useState(''), [revision, setRevision] = useState(0);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    api(me.posId === 'P1' ? '/users' : '/directory').then(value => { if (active) { setUsers(value); setDirectoryError(''); } })
      .catch(error => { if (active) setDirectoryError(error.message); });
    return () => { active = false; };
  }, [me.posId, revision]);
  if (!data) return <main className="content"><Card title="กำลังโหลดข้อมูลรถรับส่ง">{dataError ? <><p className="error" role="alert">{dataError}</p><button onClick={reload}>ลองอีกครั้ง</button></> : <p role="status">กำลังอ่านข้อมูลจากฐานข้อมูล…</p>}<ActionButton action={onLogout}>ออกจากระบบ</ActionButton></Card></main>;
  const permitted = permissions(data, me.posId);
  const available = screens.filter(screen => permitted.includes(screen.id) && (!screen.admin || me.posId === 'P1'));
  const home = available[0]?.path || '/no-access';
  const current = screens.find(screen => screen.path === location.pathname);
  const props = { data, users, me, dispatch };
  const pages = {
    SC01: <Users me={me} data={data} onChanged={() => { setRevision(n => n + 1); reload(); }} />,
    SC02: <Permissions {...props} />, SC03: <RoutesPage {...props} />, SC04: <Schedules {...props} />,
    SC05: <Card title="รายงาน"><p>ต้นฉบับ G1 ยังไม่มีรายงานที่ 1–7 ต้องกำหนดรูปแบบรายงานก่อนเปิดใช้งาน</p></Card>,
    SC06: <Driver {...props} canScan={permitted.includes('SC07')} />,
    SC07: <ScanPage {...props} />, SC08: <Driver {...props} closing canScan={permitted.includes('SC07')} />,
    SC09: <Booking {...props} />, SC10: <Departments {...props} />, SC11: <Cars {...props} />,
};
  return (
    <div className="workspace">
      <Sidebar me={me} screens={available} onLogout={onLogout} />
      <main className="content">
        <div className="page-heading">
          <p className="eyebrow">MUT SHUTTLE BUS</p>
          <h1>{current?.name || 'ระบบรถรับส่ง'}</h1>
        </div>
        {current && current.id !== 'SC01' && <div className="data-note sql">ข้อมูลจากฐานข้อมูล · อัปเดตอัตโนมัติทุก 15 วินาที <button className="secondary" onClick={reload}>รีเฟรช</button></div>}
        {dataError && <p className="error" role="alert">อัปเดตข้อมูลไม่สำเร็จ: {dataError}</p>}
        {directoryError && <p className="error" role="alert">โหลดรายชื่อผู้ใช้ไม่สำเร็จ: {directoryError} <button onClick={() => setRevision(n => n + 1)}>ลองอีกครั้ง</button></p>}
        <Routes>
          {screens.map(screen => <Route key={screen.id} path={screen.path} element={available.some(item => item.id === screen.id) ? <div key={screen.id}>{pages[screen.id]}</div> : <Navigate to={home} replace />} />)}
          <Route path="/no-access" element={available.length ? <Navigate to={home} replace /> : <Card>บัญชีนี้ยังไม่มีสิทธิ์หน้าจอ กรุณาติดต่อผู้ดูแลระบบ</Card>} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/auth/me').then(user => { if (active) setMe(user); })
      .catch(err => { if (active && err.status !== 401) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    const expired = () => setMe(null);
    window.addEventListener('session-expired', expired);
    return () => { active = false; window.removeEventListener('session-expired', expired); };
  }, []);
  if (loading) return <main className="login-shell"><p role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</p></main>;
  return <BrowserRouter>{me ? <Workspace key={me.userId} me={me} onLogout={async () => { await api('/auth/logout', { method: 'POST' }); setMe(null); setError(''); }} /> : <Routes>
    <Route path="/login" element={<Login initialError={error} onLogin={user => { setMe(user); setError(''); }} />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>}</BrowserRouter>;
}