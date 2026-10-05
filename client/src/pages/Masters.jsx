import { useState } from 'react';
import { ActionButton, ActionForm, Card, Field, Select, Table } from '../components/UI';
import { byId } from '../lib/shuttle';
import Icon from '../components/Icon';

export function MasterEditor({ data, dispatch, collection, title, fields, inUse = () => false }) {
  const [editing, setEditing] = useState(null), [revision, setRevision] = useState(0);
  return <Card title={title}><ActionForm key={`${editing?.id || 'new'}-${revision}`} submit={editing ? 'บันทึก' : 'เพิ่ม'} onSubmit={async values => {
    const item = { ...values, id: (editing?.id || values.id).trim() };
    for (const field of fields) if (field.type === 'number') item[field.name] = Number(values[field.name]);
    await dispatch('saveMaster', { collection, item, editing: !!editing }); setEditing(null); setRevision(n => n + 1);
  }}><Field label="รหัส" name="id" required disabled={!!editing} defaultValue={editing?.id} />
    {fields.map(field => field.options ? <Select key={field.name} label={field.label} name={field.name} options={field.options} required defaultValue={editing?.[field.name] || field.defaultValue || ''} /> : <Field key={field.name} label={field.label} name={field.name} type={field.type || 'text'} min={field.min} required defaultValue={editing?.[field.name] ?? field.defaultValue ?? ''} />)}
    {editing && <button type="button" className="secondary" onClick={() => setEditing(null)}>ยกเลิก</button>}
  </ActionForm><Table heads={['รหัส', ...fields.map(f => f.label), 'จัดการ']} empty={!data[collection].length}>{data[collection].map(item => <tr key={item.id}><td>{item.id}</td>{fields.map(field => <td key={field.name}>{field.options ? byId(field.options, item[field.name]).name || item[field.name] : item[field.name]}</td>)}<td className="actions"><button className="secondary" onClick={() => setEditing(item)}>แก้ไข</button><ActionButton className="danger" confirm={`ลบ ${item.id}?`} action={async () => { await dispatch('deleteMaster', { collection, id: item.id, inUse: inUse(item.id) }); if (editing?.id === item.id) setEditing(null); }}>ลบ</ActionButton></td></tr>)}</Table></Card>;
}

export function Departments(props) {
  return <MasterEditor {...props} collection="departments" title="จัดการแผนก" fields={[{ name: 'name', label: 'ชื่อแผนก' }]} inUse={id => props.users.some(user => user.deptId === id)} />;
}
export function Cars(props) {
  const { data } = props;
  return <><MasterEditor {...props} collection="cars" title="รถ" fields={[{ name: 'plate', label: 'ทะเบียนรถ' }, { name: 'typeId', label: 'ประเภทรถ', options: data.carTypes }, { name: 'statusId', label: 'สถานะ', options: data.carStatuses, defaultValue: 'CS1' }]} />
    <MasterEditor {...props} collection="carTypes" title="ประเภทรถ" fields={[{ name: 'name', label: 'ชื่อประเภท' }, { name: 'seats', label: 'จำนวนที่นั่ง', type: 'number', min: 1, defaultValue: 9 }]} /></>;
}
export function Permissions(props) {
  const { data, dispatch, users } = props;
  const [selected, setSelected] = useState(data.positions[0]?.id || ''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState('');
  const position = byId(data.positions, selected).id ? byId(data.positions, selected) : data.positions[0] || {};
  const positionId = position.id;
  const icon = { SC01: 'users', SC02: 'shield', SC03: 'route', SC04: 'bus', SC05: 'chart', SC06: 'calendar', SC07: 'qr', SC08: 'flag', SC09: 'ticket', SC10: 'users', SC11: 'bus' };
  return <div className="permissions-page"><div className="tabs role-tabs">{data.positions.map(p => <button key={p.id} className={positionId === p.id ? '' : 'secondary'} onClick={() => { setSelected(p.id); setSaved(''); }}><Icon name={positionId === p.id ? 'check' : 'user'} size={15} /> {p.name}</button>)}</div><Card><div className="person"><span className="round-icon"><Icon name="shield" /></span><div><small className="muted">กำหนดการเข้าถึงระบบ</small><h2>ตำแหน่ง: {position.name || 'เลือกตำแหน่ง'}</h2></div></div></Card><div className="notice"><Icon name="info" /><span>เปิดสวิตช์เพื่อให้ตำแหน่งนี้เข้าถึงเมนูที่เลือก บันทึกลงฐานข้อมูลทันที หากปิดเมนูของตำแหน่งที่กำลังใช้ เมนูนั้นจะถูกนำออกทันที</span></div><div className="info-grid permission-metrics"><div><Icon name="users" /><span><small>สมาชิกในตำแหน่ง</small><strong>{users.filter(u => u.posId === positionId).length} คน</strong></span></div><div><Icon name="shield" /><span><small>เมนูที่เข้าถึงได้</small><strong>{data.perms.filter(p => p.posId === positionId).length} เมนู</strong></span></div></div><div className="section-heading"><h2>สิทธิ์การเข้าถึงแต่ละระบบ</h2><small className="muted">เปิด / ปิด</small></div>{error && <p role="alert" className="error">{error}</p>}<div className="permission-list">{data.screens.map(screen => {

    return <label className="permission-row" key={screen.id}><span className="permission-icon"><Icon name={icon[screen.id]} size={19} /></span><span className="permission-label"><strong>{screen.name}</strong><small>{`จัดการการเข้าถึง${screen.name}`}</small></span><input type="checkbox" role="switch" disabled={busy || !position.id} checked={data.perms.some(p => p.posId === position.id && p.screenId === screen.id)} onChange={async event => { setError(''); setSaved(''); setBusy(true); try { await dispatch('permission', { posId: position.id, screenId: screen.id, on: event.target.checked }); setSaved('บันทึกสิทธิ์เรียบร้อยแล้ว'); } catch (err) { setError(err.message); } finally { setBusy(false); } }} /><span className="switch-track" /></label>;
  })}</div><div className="permission-footer"><Icon name="shield" size={44} /><small>MUT SMART TRANSIT</small><h2>ปลอดภัยทุกเส้นทาง</h2><p>จัดการสิทธิ์ให้เหมาะสมกับหน้าที่ เพื่อการเดินทางที่ราบรื่นของทุกคน</p></div><p role="status" className="save-status"><Icon name="check" size={17} />{busy ? 'กำลังบันทึก…' : saved || 'สิทธิ์ปัจจุบันบันทึกไว้แล้ว'}</p><details className="management-details"><summary><Icon name="plus" size={16} /> เพิ่ม / แก้ไขตำแหน่ง</summary><MasterEditor {...props} collection="positions" title="ตำแหน่ง" fields={[{ name: 'name', label: 'ชื่อตำแหน่ง' }]} inUse={id => users.some(user => user.posId === id)} /></details></div>;
}
