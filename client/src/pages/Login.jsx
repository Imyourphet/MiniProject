import { useState } from 'react';
import { api } from '../lib/api';
import './Login.css';

function LoginIcon({ name, ...props }) {
  const paths = {
    bus: <><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M5 11h14M8 6h8M8 19v2m8-2v2" /><circle cx="8.5" cy="15" r=".75" /><circle cx="15.5" cy="15" r=".75" /></>,
    user: <><circle cx="12" cy="7" r="3" /><path d="M5 20v-2a7 5 0 0 1 14 0v2Z" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    hidden: <><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.2-1.3M10 10a3 3 0 0 0 4 4" /></>,
    arrow: <path d="M4 12h16m-7-7 7 7-7 7" />,
    alert: <><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" /><path d="M12 7v6m0 3v.1" stroke="white" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function Login({ onLogin, initialError }) {
    const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const message = submitted ? error : initialError;

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setSubmitted(true);
    setError('');
    setBusy(true);
    try {
      await onLogin(await api('/auth/login', { method: 'POST', body: values }));
    } catch (err) {
      setError(err.status === 401 ? 'รหัสผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-shell shuttle-login">
    <div className="login-layout">
      <header className="login-brand">
        <div className="login-logo" aria-label="MUT Shuttle Bus Service">
          <span className="login-logo-icon"><LoginIcon name="bus" /></span>
          <span className="login-logo-text">MUT SHUTTLE<small>BUS SERVICE</small></span>
        </div>
        <p className="login-brand-name">MUT SHUTTLE BUS</p>
        <p className="login-description">ระบบจองและจัดการรถรับ-ส่งมหาวิทยาลัยเทคโนโลยีมหานคร</p>
      </header>
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">เข้าสู่ระบบ</h1>
        <form className="login-form" onSubmit={handleSubmit} aria-busy={busy}>
          <fieldset disabled={busy}>
            <div className="login-field">
              <label htmlFor="login-user-id">รหัสผู้ใช้งาน</label>
              <div className="login-input-wrap">
                <LoginIcon name="user" />
                <input id="login-user-id" name="userId" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="เช่น U001" required />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="login-password">รหัสผ่าน</label>
              <div className="login-input-wrap">
                <LoginIcon name="lock" />
                <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" required />
                <button className="login-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={showPassword} aria-controls="login-password">
                  <LoginIcon name={showPassword ? 'hidden' : 'eye'} />
                </button>
              </div>
            </div>
            {message && <p className="login-error" role="alert"><LoginIcon name="alert" /><span>{message}</span></p>}
            <button className="login-submit" type="submit">
              <span>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</span>
              {!busy && <LoginIcon name="arrow" />}
            </button>
          </fieldset>
        </form>
      </section>
      <footer className="login-footer"><LoginIcon name="bus" /><span>ฝ่ายบริการยานพาหนะ มหาวิทยาลัยเทคโนโลยีมหานคร</span></footer>
    </div>
  </main>;
}