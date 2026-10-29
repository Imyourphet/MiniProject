import { useState } from 'react';
import { ActionButton, ActionForm, Card, Field, Select, Table } from '../components/UI';
import { byId } from '../lib/shuttle';
import Icon from '../components/Icon';
import './Permissions.css';
// ฟอร์มกลาง ใช้ร่วมกันหลายหน้า (ตำแหน่ง แผนก รถ) ใช้ได้ทั้งเพิ่มและแก้ไข
export function MasterEditor({ data, dispatch, collection, title, fields, inUse = () => false, nextId, validate }) {
  // editing = รายการที่กำลังแก้ (null = กำลังเพิ่มใหม่)
  const [editing, setEditing] = useState(null);
  // revision = นับครั้งที่บันทึก ใช้ล้างฟอร์มหลังบันทึก
  const [revision, setRevision] = useState(0);

  // กดเพิ่ม / บันทึก
  async function save(values) {
    // เลือกรหัส: แก้ไขใช้รหัสเดิม / เพิ่มใหม่ใช้รหัสอัตโนมัติ / หน้าที่ไม่มีรหัสอัตโนมัติใช้ที่พิมพ์
    const item = { ...values, id: (editing?.id || nextId || values.id).trim() };
    // เช็คก่อนบันทึก เช่น ชื่อซ้ำ (ถ้าไม่ผ่านจะหยุดตรงนี้)
    if (validate) validate(item);
    for (const field of fields) {
      if (field.type === 'number') item[field.name] = Number(values[field.name]);
    }
    await dispatch('saveMaster', { collection, item, editing: !!editing });
    setEditing(null);
    setRevision(n => n + 1);
  }

  // กดลบ (ถามยืนยันที่ปุ่มก่อน)
  async function remove(item) {
    await dispatch('deleteMaster', { collection, id: item.id, inUse: inUse(item.id) });
    if (editing?.id === item.id) setEditing(null);
  }

  return (
    <Card title={title}>
      {/* key เปลี่ยน = สร้างฟอร์มใหม่ (หลังบันทึก / เปลี่ยนเพิ่มกับแก้ไข / รหัสถัดไปเปลี่ยน) */}
      <ActionForm key={`${editing?.id || 'new'}-${revision}-${nextId}`} submit={editing ? 'บันทึก' : 'เพิ่ม'} onSubmit={save}>
        {/* ช่องรหัส: ตอนแก้ไขเปลี่ยนไม่ได้ / ถ้ามีรหัสอัตโนมัติก็พิมพ์ไม่ได้ */}
        <Field label="รหัส" name="id" required disabled={!!editing} readOnly={!!nextId} defaultValue={editing?.id || nextId} />

        {/* ช่องอื่นตาม fields (มีตัวเลือก = dropdown / ไม่มี = ช่องพิมพ์) */}
        {fields.map(field => field.options
          ? <Select key={field.name} label={field.label} name={field.name} options={field.options} required defaultValue={editing?.[field.name] || field.defaultValue || ''} />
          : <Field key={field.name} label={field.label} name={field.name} type={field.type || 'text'} min={field.min} required defaultValue={editing?.[field.name] ?? field.defaultValue ?? ''} />
        )}

        {editing && <button type="button" className="secondary" onClick={() => setEditing(null)}>ยกเลิก</button>}
      </ActionForm>

      {/* ตารางรายการ + ปุ่มแก้ไข / ลบ */}
      <Table heads={['รหัส', ...fields.map(f => f.label), 'จัดการ']} empty={!data[collection].length}>
        {data[collection].map(item => (
          <tr key={item.id}>
            <td>{item.id}</td>
            {fields.map(field => (
              <td key={field.name}>{field.options ? byId(field.options, item[field.name]).name || item[field.name] : item[field.name]}</td>
            ))}
            <td className="actions">
              <button className="secondary" onClick={() => setEditing(item)}>แก้ไข</button>
              <ActionButton className="danger" confirm={`ลบ ${item.id}?`} action={() => remove(item)}>ลบ</ActionButton>
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

export function Departments(props) {
  return <MasterEditor {...props} collection="departments" title="จัดการแผนก" fields={[{ name: 'name', label: 'ชื่อแผนก' }]} inUse={id => props.users.some(user => user.deptId === id)} />;
}
export function Cars(props) {
  const { data } = props;
  return <><MasterEditor {...props} collection="cars" title="รถ" fields={[{ name: 'plate', label: 'ทะเบียนรถ' }, { name: 'typeId', label: 'ประเภทรถ', options: data.carTypes }, { name: 'statusId', label: 'สถานะ', options: data.carStatuses, defaultValue: 'CS1' }]} />
    <MasterEditor {...props} collection="carTypes" title="ประเภทรถ" fields={[{ name: 'name', label: 'ชื่อประเภท' }, { name: 'seats', label: 'จำนวนที่นั่ง', type: 'number', min: 1, defaultValue: 9 }]} /></>;
}
// SC02 กำหนดสิทธิ์
export function Permissions(props) {
  const { data, dispatch, users, me } = props;
  const [selected, setSelected] = useState(me.posId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [search, setSearch] = useState('');

  // ตำแหน่งที่ผ่านการค้นหา (ไม่สนตัวพิมพ์ใหญ่เล็ก)
  const keyword = search.toLowerCase();
  const shown = data.positions.filter(p => p.name.toLowerCase().includes(keyword) || p.id.toLowerCase().includes(keyword));
  // ตำแหน่งที่กำลังเลือกดูอยู่ (ถ้าไม่อยู่ในผลค้นหา ถือว่ายังไม่ได้เลือก)
  const position = byId(shown, selected).id ? byId(shown, selected) : {};

  // รหัสตำแหน่งถัดไป เช่น มี P1-P4 อยู่แล้ว จะได้ P5
  const nextPositionId = 'P' + (Math.max(0, ...data.positions.map(p => Number(p.id.slice(1)) || 0)) + 1);

  // กันชื่อตำแหน่งซ้ำ (ไม่สนช่องว่างหัวท้าย และตัวพิมพ์ใหญ่เล็ก)
  function checkName(item) {
    const name = item.name.trim().toLowerCase();
    const same = data.positions.some(p => p.id !== item.id && p.name.trim().toLowerCase() === name);
    if (same) throw new Error('ชื่อตำแหน่งนี้มีอยู่แล้ว');
  }

  const icon = { SC01: 'users', SC02: 'shield', SC03: 'route', SC04: 'bus', SC05: 'chart', SC06: 'calendar', SC07: 'qr', SC08: 'flag', SC09: 'ticket', SC10: 'users', SC11: 'bus' };

  // เปิด/ปิดสิทธิ์ 1 หน้าจอ แล้วส่งไปบันทึกที่ server
  async function toggle(screenId, on) {
    setError('');
    setSaved('');
    setBusy(true);
    try {
      await dispatch('permission', { posId: position.id, screenId, on });
      setSaved('บันทึกสิทธิ์เรียบร้อยแล้ว');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="permissions-page">
      {/* ช่องค้นหาตำแหน่ง */}
      <label className="permission-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          placeholder="ค้นหาตำแหน่ง"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        {search && (
          <button type="button" className="clear-search" onClick={() => setSearch('')}>
            <Icon name="close" size={14} />
          </button>
        )}
      </label>

      {/* แท็บเลือกตำแหน่ง */}
      <div className="tabs role-tabs">
        {shown.map(p => (
          <button key={p.id} className={position.id === p.id ? '' : 'secondary'} onClick={() => { setSelected(p.id); setSaved(''); }}>
            <Icon name={position.id === p.id ? 'check' : 'user'} size={15} /> {p.id} · {p.name}          </button>
        ))}
      </div>

      {position.id ? (<>
        <Card>
          <div className="person">
            <span className="round-icon"><Icon name="shield" /></span>
            <div>
              <small className="muted">กำหนดการเข้าถึงระบบ</small>
              <h2>ตำแหน่ง: {position.name || 'เลือกตำแหน่ง'}</h2>
            </div>
          </div>
        </Card>

        <div className="notice">
          <Icon name="info" />
          <span>เปิดสวิตช์เพื่อให้ตำแหน่งนี้เข้าถึงเมนูที่เลือก บันทึกลงฐานข้อมูลทันที · สิทธิ์ "กำหนดสิทธิ์" ของตำแหน่งที่กำลังใช้งานอยู่จะปิดไม่ได้ เพื่อไม่ให้ไม่มีใครเข้ามาแก้สิทธิ์ได้อีก</span>
        </div>

        <div className="info-grid permission-metrics">
          <div><Icon name="users" /><span><small>สมาชิกในตำแหน่ง</small><strong>{users.filter(u => u.posId === position.id).length} คน</strong></span></div>
          <div><Icon name="shield" /><span><small>เมนูที่เข้าถึงได้</small><strong>{data.perms.filter(p => p.posId === position.id).length} เมนู</strong></span></div>
        </div>

        <div className="section-heading">
          <h2>สิทธิ์การเข้าถึงแต่ละระบบ</h2>
          <small className="muted">เปิด / ปิด</small>
        </div>

        {error && <p role="alert" className="error">{error}</p>}

        {/* รายการหน้าจอ 1 แถว = 1 หน้าจอ */}
        <div className="permission-list">
          {data.screens.map(screen => {
            const checked = data.perms.some(p => p.posId === position.id && p.screenId === screen.id);
            // ห้ามปิดสิทธิ์กำหนดสิทธิ์ของตำแหน่งตัวเอง (กันล็อกตัวเองออกจากระบบ)
            const locked = position.id === me.posId && screen.id === 'SC02';

            return (
              <label className="permission-row" key={screen.id}>
                <span className="permission-icon"><Icon name={icon[screen.id]} size={19} /></span>
                <span className="permission-label">
                  <strong>{screen.name}{locked ? ' 🔒' : ''}</strong>
                  <small>{locked ? 'สิทธิ์ของตำแหน่งที่คุณใช้อยู่ ปิดไม่ได้' : `จัดการการเข้าถึง${screen.name}`}</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={checked}
                  disabled={busy || !position.id || locked}
                  onChange={event => toggle(screen.id, event.target.checked)}
                />
                <span className="switch-track" />
              </label>
            );
          })}
        </div>

        <p role="status" className="save-status">
          <Icon name="check" size={17} />{busy ? 'กำลังบันทึก…' : saved || 'สิทธิ์ปัจจุบันบันทึกไว้แล้ว'}
        </p>
      </>) : (
        <p className="notice">
          {shown.length === 0 ? `ไม่พบตำแหน่ง "${search}"` : 'เลือกตำแหน่งด้านบนเพื่อดูและแก้ไขสิทธิ์'}
        </p>
      )}

      <div className="permission-footer">
        <Icon name="shield" size={44} />
        <small>MUT SMART TRANSIT</small>
        <h2>ปลอดภัยทุกเส้นทาง</h2>
        <p>จัดการสิทธิ์ให้เหมาะสมกับหน้าที่ เพื่อการเดินทางที่ราบรื่นของทุกคน</p>
      </div>

      {/* เพิ่ม / แก้ไข / ลบ ตำแหน่ง */}
      <details className="management-details">
        <summary><Icon name="plus" size={16} /> เพิ่ม / แก้ไขตำแหน่ง</summary>
        <MasterEditor {...props} collection="positions" title="ตำแหน่ง" fields={[{ name: 'name', label: 'ชื่อตำแหน่ง' }]} inUse={id => users.some(user => user.posId === id)} nextId={nextPositionId} validate={checkName} />
      </details>
    </div>
  );
}