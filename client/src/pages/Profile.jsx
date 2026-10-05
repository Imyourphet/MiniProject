import { useState } from 'react';
import { ActionForm, Card, Field } from '../components/UI';
import { api } from '../lib/api';
import { byId } from '../lib/shuttle';
import Icon from '../components/Icon';

export default function Profile({ me, data, onSaved }) {
  const [notice, setNotice] = useState(''), [revision, setRevision] = useState(0);
  return <div className="narrow-page profile-page">
    <Card><div className="person"><span className="avatar"><Icon name="user" /></span><div><strong>{me.firstName} {me.lastName}</strong><small className="muted">{me.userId} · {byId(data.positions, me.posId).name || me.posId}</small></div></div><p className="muted">แผนก: {byId(data.departments, me.deptId).name || 'ไม่ระบุแผนก'}</p></Card>
    {notice && <p className="notice mint-notice" role="status"><Icon name="check" size={17} />{notice}</p>}
    <Card title="แก้ไขข้อมูลส่วนตัว">
      <ActionForm key={revision} submit="บันทึกข้อมูลของฉัน" onSubmit={async values => {
        setNotice('');
        const result = await api('/auth/profile', { method: 'PUT', body: values });
        onSaved(result.user); setNotice(result.message); setRevision(value => value + 1);
      }}>
        <Field label="ชื่อ" name="firstName" required defaultValue={me.firstName} autoComplete="given-name" />
        <Field label="นามสกุล" name="lastName" required defaultValue={me.lastName} autoComplete="family-name" />
        <div className="wide"><h3>เปลี่ยนรหัสผ่าน</h3><p className="muted">เว้นช่องรหัสผ่านว่าง หากต้องการเปลี่ยนเฉพาะชื่อ</p></div>
        <Field label="รหัสผ่านปัจจุบัน" name="currentPassword" type="password" autoComplete="current-password" maxLength={50} />
        <Field label="รหัสผ่านใหม่ (8–50 ตัวอักษร)" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={50} />
        <Field label="ยืนยันรหัสผ่านใหม่" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={50} />
      </ActionForm>
    </Card>
  </div>;
}
