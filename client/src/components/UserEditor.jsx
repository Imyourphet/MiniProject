import { useEffect, useState } from 'react';
import { ActionForm, Field, Select } from './UI';
import { api } from '../lib/api';
import { generatePassword } from '../lib/password.mjs';

export default function UserEditor({ editing, me, data, onSaved }) {
  const [nextId, setNextId] = useState(''), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [password, setPassword] = useState(() => editing ? '' : generatePassword());
  const [visible, setVisible] = useState(!editing);
  useEffect(() => {
    if (editing) return;
    let active = true;
    api('/users/next-id').then(value => { if (active) { setNextId(value.userId); setError(''); } })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [editing, retry]);
  return <>
    {error && <p className="error" role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>ลองอีกครั้ง</button></p>}
    <ActionForm submit="บันทึกผู้ใช้งาน" disabled={!editing && !nextId} onSubmit={async values => {
      const result = await api(editing ? `/users/${encodeURIComponent(editing.userId)}` : '/users', {
        method: editing ? 'PUT' : 'POST',
        body: { ...values, posId: editing?.userId === me.userId ? editing.posId : values.posId },
      });
      onSaved(result.message);
    }}>
      <Field label="รหัสผู้ใช้งาน" readOnly value={editing?.userId || nextId} placeholder="กำลังสร้างรหัส…" />
      <Field label="ชื่อ" name="firstName" required defaultValue={editing?.firstName || ''} />
      <Field label="นามสกุล" name="lastName" required defaultValue={editing?.lastName || ''} />
      <Field label="เบอร์โทรศัพท์" name="phone" type="tel" defaultValue={editing?.phone || ''} />
      <Select label="แผนก" name="deptId" options={data.departments} defaultValue={editing?.deptId || ''} />
      <Select label="ตำแหน่ง" name="posId" options={data.positions} required defaultValue={editing?.posId || ''} disabled={editing?.userId === me.userId} />
      <div className="wide password-control">
        <Field label={editing ? 'รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)' : 'รหัสผ่าน'} name="password" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={6} maxLength={6} required={!editing} value={password} onChange={event => setPassword(event.target.value)} />
        <div className="actions"><button type="button" className="secondary" onClick={() => { setPassword(generatePassword()); setVisible(true); }}>สุ่มรหัสผ่าน</button><button type="button" className="secondary" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}</button></div>
        <small className="muted">รหัสผ่าน 6 ตัวอักษรเท่านั้น กรุณาจดรหัสผ่านก่อนบันทึก</small>
      </div>
      {!editing && <small className="muted wide">ระบบกำหนดรหัสผู้ใช้งานให้อัตโนมัติ รหัสสุดท้ายจะแสดงหลังบันทึก</small>}
    </ActionForm>
  </>;
}
