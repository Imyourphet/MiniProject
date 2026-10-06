import { useState } from 'react';

export function Field({ label, children, ...props }) {
  return <label className="field"><span>{label}</span>{children || <input {...props} />}</label>;
}
export function Select({ label, options, empty = 'เลือก…', ...props }) {
  return <Field label={label}><select {...props}>{empty !== false && <option value="">{empty}</option>}{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>;
}
export function ActionForm({ onSubmit, children, submit = 'บันทึก', reset = false, className = '', disabled = false }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <form className={`form-grid ${className}`} onSubmit={async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setError(''); setBusy(true);
    try { await onSubmit(Object.fromEntries(new FormData(form))); if (reset) form.reset(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }}><fieldset disabled={busy || disabled}>{children}<div className="form-actions"><button type="submit">{busy ? 'กำลังบันทึก…' : submit}</button></div></fieldset>{error && <p className="error" role="alert">{error}</p>}</form>;
}
export function Table({ heads, children, empty }) {
  return <div className="table-wrap"><table><thead><tr>{heads.map((head, i) => <th key={i}>{head}</th>)}</tr></thead><tbody>{empty ? <tr><td colSpan={heads.length}>ยังไม่มีข้อมูล</td></tr> : children}</tbody></table></div>;
}
export function ActionButton({ action, confirm, children, className = 'secondary', disabled = false }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <><button type="button" disabled={disabled || busy} className={className} onClick={async () => {
    if (confirm && !window.confirm(confirm)) return;
    setError(''); setBusy(true);
    try { await action(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }}>{busy ? 'กำลังทำรายการ…' : children}</button>{error && <span role="alert" className="error">{error}</span>}</>;
}
export function Card({ title, children }) { return <section className="card">{title && <h2>{title}</h2>}{children}</section>; }
export function Badge({ children }) { return <span className="badge">{children}</span>; }
