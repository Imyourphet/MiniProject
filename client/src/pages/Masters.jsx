import { useState } from 'react';
import { byId } from '../lib/shuttle';

// ชุดสีเดียวกับหน้าจัดการผู้ใช้
const colors = {
  blue: '#7FA7F5',
  blueLight: '#EBF1FF',
  pink: '#F7A8C4',
  pinkLight: '#FFF0F5',
  redText: '#F2708A',
  bgLight: '#F8F9FD',
  cardBorder: '#E2E8F8',
};

const cardStyle = { background: '#fff', borderRadius: '20px', padding: '18px', border: `1px solid ${colors.cardBorder}`, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${colors.cardBorder}`, background: colors.bgLight, fontSize: '14px', outline: 'none', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: '500' };
const errorStyle = { background: colors.pinkLight, color: colors.redText, padding: '10px 16px', borderRadius: '12px', fontSize: '13px' };

// กล่องเพิ่ม/แก้ไข/ลบ ข้อมูลหลัก ใช้ร่วมกันทั้งหน้า ตำแหน่ง แผนก รถ
export function MasterEditor({ data, dispatch, collection, title, fields, inUse = () => false }) {
  const emptyForm = () => {
    const form = { id: '' };
    fields.forEach(field => { form[field.name] = field.defaultValue ?? ''; });
    return form;
  };

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const startEdit = item => {
    const next = { id: item.id };
    fields.forEach(field => { next[field.name] = item[field.name] ?? ''; });
    setForm(next);
    setEditing(item);
    setError('');
  };

  const cancel = () => {
    setForm(emptyForm());
    setEditing(null);
    setError('');
  };

  const save = async event => {
    event.preventDefault();
    const item = { ...form, id: String(editing ? editing.id : form.id).trim() };
    if (!item.id) return setError('กรุณากรอกรหัส');
    for (const field of fields) {
      if (String(item[field.name]).trim() === '') return setError(`กรุณากรอก${field.label}`);
      if (field.type === 'number') item[field.name] = Number(item[field.name]);
    }
    try {
      await dispatch('saveMaster', { collection, item, editing: !!editing });
      cancel();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async item => {
    if (!window.confirm(`ลบ ${item.id}?`)) return;
    try {
      await dispatch('deleteMaster', { collection, id: item.id, inUse: inUse(item.id) });
      if (editing?.id === item.id) cancel();
    } catch (err) {
      setError(err.message);
    }
  };

  // ถ้าเป็นช่องที่เลือกจากรายการ (เช่นประเภทรถ) ให้โชว์ชื่อแทนรหัส
  const showValue = (field, value) => field.options ? (byId(field.options, value).name || value) : value;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <strong style={{ fontSize: '16px', color: '#1e293b' }}>{title}</strong>
        <span style={{ fontSize: '11px', background: colors.blueLight, color: colors.blue, padding: '4px 10px', borderRadius: '999px', fontWeight: '500' }}>
          ทั้งหมด {data[collection].length} รายการ
        </span>
      </div>

      {/* ฟอร์มเพิ่ม / แก้ไข */}
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '14px' }}>
        <div>
          <label style={labelStyle}>รหัส</label>
          <input style={{ ...inputStyle, opacity: editing ? 0.6 : 1 }} value={form.id} disabled={!!editing} onChange={e => setForm({ ...form, id: e.target.value })} />
        </div>
        {fields.map(field => (
          <div key={field.name}>
            <label style={labelStyle}>{field.label}</label>
            {field.options ? (
              <select style={inputStyle} value={form[field.name]} onChange={e => setForm({ ...form, [field.name]: e.target.value })}>
                <option value="">เลือก{field.label}</option>
                {field.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            ) : (
              <input style={inputStyle} type={field.type || 'text'} min={field.min} value={form[field.name]} onChange={e => setForm({ ...form, [field.name]: e.target.value })} />
            )}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: '999px', padding: '10px 22px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 6px 14px rgba(127,167,245,0.3)' }}>
            {editing ? 'บันทึก' : '+ เพิ่ม'}
          </button>
          {editing && (
            <button type="button" onClick={cancel} style={{ background: colors.pinkLight, color: colors.pink, border: 'none', borderRadius: '999px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}>
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      {error && <div style={{ ...errorStyle, marginBottom: '14px' }}>{error}</div>}

      {/* รายการข้อมูล */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data[collection].map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '14px', background: editing?.id === item.id ? colors.blueLight : colors.bgLight }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', minWidth: '44px' }}>{item.id}</span>
            <span style={{ flex: 1, fontSize: '14px', color: '#1e293b' }}>
              {fields.map(field => showValue(field, item[field.name])).join(' · ')}
            </span>
            <button type="button" onClick={() => startEdit(item)} style={{ background: '#F2F3FF', color: colors.blue, border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>แก้ไข</button>
            <button type="button" onClick={() => remove(item)} style={{ background: colors.pinkLight, color: colors.redText, border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>ลบ</button>
          </div>
        ))}
        {data[collection].length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>ยังไม่มีข้อมูล</p>}
      </div>
    </div>
  );
}

// SC10 จัดการแผนก
export function Departments(props) {
  return <MasterEditor {...props} collection="departments" title="จัดการแผนก" fields={[{ name: 'name', label: 'ชื่อแผนก' }]} inUse={id => props.users.some(user => user.deptId === id)} />;
}

// SC11 จัดการรถ
export function Cars(props) {
  const { data } = props;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <MasterEditor {...props} collection="cars" title="รถ" fields={[{ name: 'plate', label: 'ทะเบียนรถ' }, { name: 'typeId', label: 'ประเภทรถ', options: data.carTypes }, { name: 'statusId', label: 'สถานะ', options: data.carStatuses, defaultValue: 'CS1' }]} />
      <MasterEditor {...props} collection="carTypes" title="ประเภทรถ" fields={[{ name: 'name', label: 'ชื่อประเภท' }, { name: 'seats', label: 'จำนวนที่นั่ง', type: 'number', min: 1, defaultValue: 9 }]} />
    </div>
  );
}

// SC02 กำหนดสิทธิ์
export function Permissions(props) {
  const { data, dispatch, users, me } = props;
  const [error, setError] = useState('');

  // กดติ๊ก/เอาติ๊กออก แล้วส่งไปบันทึกที่ server
  const toggle = async (posId, screenId, on) => {
    setError('');
    try {
      await dispatch('permission', { posId, screenId, on });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
        เลือกหน้าจอที่แต่ละตำแหน่งเข้าใช้งานได้ ติ๊กแล้วบันทึกทันที · ช่องที่มี 🔒 คือสิทธิ์กำหนดสิทธิ์ของตำแหน่งตัวเอง ซึ่งเอาออกไม่ได้
      </p>

      {error && <div style={errorStyle}>{error}</div>}

      <MasterEditor {...props} collection="positions" title="ตำแหน่ง" fields={[{ name: 'name', label: 'ชื่อตำแหน่ง' }]} inUse={id => users.some(user => user.posId === id)} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
        {data.positions.map((position, index) => {
          // สลับสีฟ้า-ชมพูตามลำดับการ์ด
          const main = index % 2 === 0 ? colors.blue : colors.pink;
          const light = index % 2 === 0 ? colors.blueLight : colors.pinkLight;
          const count = data.perms.filter(p => p.posId === position.id).length;

          return (
            <div key={position.id} style={cardStyle}>
              {/* หัวการ์ด: รหัส ชื่อตำแหน่ง จำนวนหน้าที่เข้าได้ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: light, color: main, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                  {position.id}
                </div>
                <strong style={{ flex: 1, fontSize: '15px', color: '#1e293b' }}>{position.name}</strong>
                <span style={{ fontSize: '11px', background: light, color: main, padding: '4px 10px', borderRadius: '999px', fontWeight: '500' }}>
                  เข้าได้ {count} หน้า
                </span>
              </div>

              {/* ปุ่มหน้าจอแต่ละหน้า */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.screens.map(screen => {
                  const checked = data.perms.some(p => p.posId === position.id && p.screenId === screen.id);
                  const locked = position.id === me.posId && screen.id === 'SC02';

                  return (
                    <label key={screen.id} style={{
                      position: 'relative',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '12.5px',
                      fontWeight: '500',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      background: checked ? main : colors.bgLight,
                      color: checked ? '#fff' : '#64748b',
                      border: `1px solid ${checked ? main : colors.cardBorder}`,
                      opacity: locked ? 0.75 : 1,
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={event => toggle(position.id, screen.id, event.target.checked)}
                        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                      />
                      {checked ? '✓ ' : ''}{screen.name}{locked ? ' 🔒' : ''}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}