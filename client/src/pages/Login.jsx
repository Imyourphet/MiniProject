import { ActionForm, Field } from '../components/UI';
import { api } from '../lib/api';

export default function Login({ onLogin, initialError }) {
  return <main className="login-shell"><section className="login-card"><div className="brand-mark">M</div><p className="eyebrow">MAHANAKORN UNIVERSITY</p><h1>MUT Shuttle Bus</h1><p className="muted">เข้าสู่ระบบรถรับส่งมหาวิทยาลัย</p>
    {initialError && <p role="alert" className="error">{initialError}</p>}
    <ActionForm submit="เข้าสู่ระบบ" onSubmit={async values => onLogin(await api('/auth/login', { method: 'POST', body: values }))}>
      <Field label="รหัสผู้ใช้งาน" name="userId" autoComplete="username" placeholder="เช่น U001" required />
      <Field label="รหัสผ่าน" name="password" type="password" autoComplete="current-password" required />
    </ActionForm><p className="muted small">ใช้บัญชีจากฐานข้อมูลของมหาวิทยาลัย</p>
  </section></main>;
}
