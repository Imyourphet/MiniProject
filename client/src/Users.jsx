import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ActionButton, ActionForm, Card, Field, Select, Table } from '../components/UI';

export default function Users({ me, onChanged }) {
  const [users, setUsers] = useState([]), [editing, setEditing] = useState(null), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    api('/users').then(rows => { if (active) { setUsers(rows); setLoading(false); setError(''); } })
      .catch(err => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; };
  }, [revision]);
  const changed = () => { setRevision(n => n + 1); onChanged(); };
  const user = editing || {};
  return <><p className="data-note sql">ข้อมูลผู้ใช้ในหน้านี้อ่านและบันทึกลง Oracle จริง</p>
    <Card title={editing ? `แก้ไขผู้ใช้ ${user.userId}` : 'เพิ่มผู้ใช้งาน'}>
      <ActionForm key={`${user.userId || 'new'}-${revision}`} submit={editing ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้'} onSubmit={async values => {
        const body = { ...values, userId: (editing ? user.userId : values.userId).trim().toUpperCase(), phone: values.phone || null, deptId: values.deptId || null };
        const result = await api(editing ? `/users/${encodeURIComponent(user.userId)}` : '/users', { method: editing ? 'PUT' : 'POST', body });
        setEditing(null); setNotice(result.message); changed();
        if (editing?.userId === me.userId) await api('/auth/me');
      }}>
        <Field label="รหัสผู้ใช้" name="userId" defaultValue={user.userId} disabled={!!editing} required maxLength={10} />
        <Field label="ชื่อ" name="firstName" defaultValue={user.firstName} required />
        <Field label="นามสกุล" name="lastName" defaultValue={user.lastName} required />
        <Field label="เบอร์โทร" name="phone" type="tel" defaultValue={user.phone} maxLength={20} />
        <Field label="รหัสแผนกในฐานข้อมูล (เว้นว่างได้)" name="deptId" defaultValue={user.deptId} maxLength={10} />
        <Select label="ตำแหน่ง" name="posId" defaultValue={user.posId || 'P3'} empty={false} options={[{ id: 'P1', name: 'Admin' }, { id: 'P2', name: 'คนขับรถ' }, { id: 'P3', name: 'ผู้ใช้งานทั่วไป' }, ...(!['P1', 'P2', 'P3', undefined].includes(user.posId) ? [{ id: user.posId, name: user.posId }] : [])]} />
        <Field label={editing ? 'รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)' : 'รหัสผ่าน'} name="password" type="password" autoComplete="new-password" required={!editing} maxLength={50} />
        {editing && <button type="button" className="secondary" onClick={() => setEditing(null)}>ยกเลิกแก้ไข</button>}
      </ActionForm>
    </Card>{notice && <p role="status" className="success">{notice}</p>}
    <Card title="ผู้ใช้งานทั้งหมด">{loading ? <p>กำลังโหลด…</p> : error ? <p role="alert" className="error">{error} <button onClick={changed}>ลองอีกครั้ง</button></p> : <Table heads={['รหัส', 'ชื่อ–นามสกุล', 'เบอร์โทร', 'แผนก', 'ตำแหน่ง', 'จัดการ']} empty={!users.length}>
      {users.map(row => <tr key={row.userId}><td>{row.userId}</td><td>{row.firstName} {row.lastName}</td><td>{row.phone || '-'}</td><td>{row.deptId || '-'}</td><td>{row.posId}</td><td className="actions"><button className="secondary" onClick={() => { setEditing(row); setNotice(''); }}>แก้ไข</button><ActionButton disabled={row.userId === me.userId} className="danger" confirm={`ลบผู้ใช้ ${row.userId} จากฐานข้อมูล?`} action={async () => { await api(`/users/${encodeURIComponent(row.userId)}`, { method: 'DELETE' }); if (editing?.userId === row.userId) setEditing(null); changed(); }}>ลบ</ActionButton></td></tr>)}
    </Table>}</Card></>;
}