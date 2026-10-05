import { NavLink, useLocation } from 'react-router-dom';
import { ActionButton } from './UI';
import Icon from './Icon';
import './Sidebar.css';

const icons = { profile: 'user', SC01: 'users', SC02: 'shield', SC03: 'route', SC04: 'calendar', SC05: 'chart', SC06: 'calendar', SC07: 'qr', SC08: 'flag', SC09: 'bus', SC10: 'users', SC11: 'bus' };
export default function Sidebar({ me, positionName, screens, onLogout }) {
  const location = useLocation();
  const role = positionName;
  const links = screens.flatMap(screen => screen.id === 'SC09' ? [{ ...screen, name: 'จองรถ' }, { id: 'history', path: '/user/bookings?view=my', name: 'การจองของฉัน' }] : [screen]).concat({ id: 'profile', path: '/profile', name: 'บัญชีของฉัน' });
  return <aside className="sidebar"><div className="sidebar-brand"><span className="brand-mark"><Icon name="bus" size={25} /></span><div><strong>MUT Shuttle</strong><small>{role}</small></div></div>
    <div className="account"><span className="avatar">{me.firstName?.slice(0, 1)}</span><div><strong>{me.firstName} {me.lastName}</strong><small>{me.userId} · {positionName}</small></div></div>
    <nav aria-label="เมนูหลัก">{links.map(screen => <NavLink key={screen.id} to={screen.path} className={() => ((screen.id === 'SC09' || screen.id === 'history' ? location.pathname + location.search : location.pathname) === screen.path ? 'active' : '')}><Icon name={icons[screen.id] || 'ticket'} /><span>{screen.name}</span></NavLink>)}</nav>
    <div className="sidebar-footer"><div className="sidebar-note"><Icon name="shield" /><strong>เดินทางอย่างมั่นใจ</strong><small>ทุกการเดินทาง เริ่มต้นที่ MUT</small></div><ActionButton action={onLogout}><Icon name="logout" size={16} /> ออกจากระบบ</ActionButton></div>
  </aside>;
}
