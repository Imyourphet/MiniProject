import { useState } from 'react';
import { ActionButton, ActionForm, Card, Field, Select, Table } from '../components/UI';
import { byId } from '../lib/shuttle';

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
  const [error, setError] = useState('');
  return <><p className="muted">กำหนดเมนูตามตำแหน่ง เมนูจัดการข้อมูลสงวนไว้สำหรับ P1 ส่วนแผนกและรถเป็นเมนูผู้ดูแลแบบคงที่เมื่อยังไม่มีรายการในตารางหน้าจอ</p>
    {error && <p role="alert" className="error">{error}</p>}
    <MasterEditor {...props} collection="positions" title="ตำแหน่ง" fields={[{ name: 'name', label: 'ชื่อตำแหน่ง' }]} inUse={id => users.some(user => user.posId === id)} />
    {data.positions.map(position => <Card key={position.id} title={`${position.id} · ${position.name}`}><div className="permission-grid">{data.screens.map(screen => <label className="check" key={screen.id}><input type="checkbox" disabled={screen.fixed || (position.id === 'P1' && ['SC01', 'SC02'].includes(screen.id)) || (position.id !== 'P1' && ['SC01', 'SC02', 'SC03', 'SC04', 'SC05', 'SC10', 'SC11'].includes(screen.id))} checked={data.perms.some(p => p.posId === position.id && p.screenId === screen.id)} onChange={async event => { setError(''); try { await dispatch('permission', { posId: position.id, screenId: screen.id, on: event.target.checked }); } catch (err) { setError(err.message); } }} />{screen.name}</label>)}</div></Card>)}
  </>;
}
