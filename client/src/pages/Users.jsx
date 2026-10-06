import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { byId } from '../lib/shuttle';
import { ActionButton, Card, Field } from '../components/UI';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import UserEditor from '../components/UserEditor';

export default function Users({ me, data, onChanged }) {
  const [users, setUsers] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null), [open, setOpen] = useState(false), [search, setSearch] = useState(''), [role, setRole] = useState('ALL'), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api('/users').then(value => { if (active) { setUsers(value); setError(''); } }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const refresh = () => { setRevision(n => n + 1); onChanged?.(); };
  const filtered = users.filter(u => (role === 'ALL' || u.posId === role) && `${u.userId} ${u.firstName} ${u.lastName} ${u.phone || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="section-heading"><div><h2>ผู้ใช้งานในระบบ</h2><small className="muted">จัดการข้อมูลและตำแหน่งของสมาชิก</small></div><button onClick={() => { setEditing(null); setOpen(true); }}><Icon name="plus" size={16} /> เพิ่มผู้ใช้</button></div><Card><Field label="ค้นหาผู้ใช้งาน" placeholder="ชื่อ รหัสผู้ใช้ หรือเบอร์โทรศัพท์" value={search} onChange={e => setSearch(e.target.value)} /><div className="tabs" style={{ marginTop: 16, marginBottom: 0 }}>{[{ id: 'ALL', name: 'ทั้งหมด' }, ...data.positions].map(p => <button key={p.id} className={role === p.id ? '' : 'secondary'} onClick={() => setRole(p.id)}>{p.name}</button>)}</div></Card>{error && <p className="error" role="alert">{error} <button onClick={() => setRevision(n => n + 1)}>ลองอีกครั้ง</button></p>}{notice && <p className="notice mint-notice" role="status"><Icon name="check" size={17} />{notice}</p>}{loading ? <Card><p role="status">กำลังโหลดผู้ใช้งาน…</p></Card> : <div className="history-grid">{filtered.map(user => <Card key={user.userId}><div className="person"><span className={`avatar ${user.posId === 'P2' ? 'pink-soft' : ''}`}>{user.firstName?.slice(0, 1)}</span><div><strong>{user.firstName} {user.lastName}</strong><small className="muted">{user.userId} · {byId(data.positions, user.posId).name || user.posId}</small></div></div><div className="route-panel"><small>{byId(data.departments, user.deptId).name || 'ไม่ระบุแผนก'}</small><small>{user.phone || 'ไม่ระบุเบอร์โทรศัพท์'}</small></div><div className="actions"><button className="secondary" onClick={() => { setEditing(user); setOpen(true); }}>แก้ไข</button><ActionButton className="danger" disabled={user.userId === me.userId} confirm={`ยืนยันลบผู้ใช้ ${user.userId}?`} action={async () => { await api(`/users/${encodeURIComponent(user.userId)}`, { method: 'DELETE' }); setNotice('ลบผู้ใช้เรียบร้อยแล้ว'); refresh(); }}><Icon name="trash" size={15} /> ลบ</ActionButton></div></Card>)}</div>}{!loading && !error && !filtered.length && <Card><p className="empty-state">ไม่พบผู้ใช้ที่ตรงกับการค้นหา</p></Card>}
    {open && <Modal title={editing ? `แก้ไขผู้ใช้ ${editing.userId}` : 'เพิ่มผู้ใช้งานใหม่'} onClose={() => setOpen(false)}><UserEditor editing={editing} me={me} data={data} onSaved={message => { setOpen(false); setNotice(message); refresh(); }} /></Modal>}
  </>;
}
