import { NavLink } from 'react-router-dom';
import { ActionButton } from './UI';
import './Sidebar.css';

export default function Sidebar({ me, screens, onLogout }) {
  const role = { P1: 'ผู้ดูแลระบบ', P2: 'คนขับรถ', P3: 'ผู้ใช้งานทั่วไป' }[me.posId] || me.posId;
  return <aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark">M</span><div><strong>MUT Shuttle</strong><small>ระบบรถรับส่งมหาวิทยาลัย</small></div></div>
    <div className="account"><strong>{me.firstName} {me.lastName}</strong><small>{me.userId} · {role}</small></div>
    <nav aria-label="เมนูหลัก">{screens.map((screen, index) => <NavLink key={screen.id} to={screen.path}><span className="nav-number">{String(index + 1).padStart(2, '0')}</span>{screen.name}</NavLink>)}</nav>
    <div className="sidebar-footer"><ActionButton action={onLogout}>ออกจากระบบ</ActionButton></div>
  </aside>;
}
