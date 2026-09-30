import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

export default function Users({ me, onChanged, onLogout }) {
  // --- จุดที่อาจารย์ชอบถาม 1: ตัวแปรเก็บข้อมูล (States) ---
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null); // เก็บ user ที่กำลังแก้ไข (null = เพิ่มใหม่)
  const [isModalOpen, setIsModalOpen] = useState(false); // ควบคุมเปิด/ปิด Bottom Sheet
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // ข้อมูลในฟอร์ม
  const [formData, setFormData] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    phone: '',
    deptId: 'D0002',
    posId: 'P2',
    password: ''
  });

  // --- จุดที่อาจารย์ชอบถาม 2: รหัสสีพาสเทล (Cute Pastel Theme) ---
  const colors = {
    blue: '#7FA7F5',       // ฟ้าพาสเทลหลัก (Header / ปุ่มบันทึก)
    pink: '#F7A8C4',       // ชมพูพาสเทล (Filter / หัวข้อ)
    pinkLight: '#FFF0F5',  // ชมพูอ่อน (ปุ่มยกเลิก / ไอคอน)
    redText: '#F2708A',    // สีตัวหนังสือดอกจัน/ปุ่มยกเลิก
    bgLight: '#F3F4FD',    // สีพื้นหลังกล่อง input
    cardBorder: '#E3ECFF', // สีเส้นขอบ
  };

  // 1. ดึงข้อมูลจากเซิร์ฟเวอร์
  const fetchUsers = () => {
    setLoading(true);
    api('/users')
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        alert('โหลดข้อมูลผิดพลาด: ' + err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- เงื่อนไข SC01: สุ่มรหัสผ่านที่ระบบตั้งให้ ---
  const generatePassword = () => {
    return 'MUT@' + Math.floor(1000 + Math.random() * 9000);
  };

  // --- เงื่อนไข SC01: ระบบสร้างรหัสผู้ใช้ให้อัตโนมัติ (U001, U002...) ---
  const handleOpenAddModal = () => {
    const nextCode = 'U' + String(users.length + 1).padStart(3, '0');
    setFormData({
      userId: nextCode,
      firstName: '',
      lastName: '',
      phone: '',
      deptId: 'D0002',
      posId: 'P2',
      password: generatePassword() // รหัสผ่านระบบตั้งให้
    });
    setEditing(null);
    setIsModalOpen(true);
  };

  // เปิดแก้ไขผู้ใช้เดิม
  const handleOpenEditModal = (user) => {
    setEditing(user);
    setFormData({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      deptId: user.deptId || '',
      posId: user.posId,
      password: '' // แก้ไข: ว่างไว้ถ้าไม่เปลี่ยน
    });
    setIsModalOpen(true);
  };

  // --- เงื่อนไข SC01: บันทึกข้อมูล & ห้ามช่องว่าง ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // เช็คช่องว่างห้ามบันทึก
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('กรุณากรอกชื่อและนามสกุล ห้ามเว้นวรรคว่าง!');
      return;
    }

    try {
      const url = editing ? `/users/${encodeURIComponent(editing.userId)}` : '/users';
      const method = editing ? 'PUT' : 'POST';

      const result = await api(url, { method, body: formData });
      setNotice(result.message || 'บันทึกสำเร็จ');
      setIsModalOpen(false);
      fetchUsers(); // รีโหลดข้อมูลใหม่
      if (onChanged) onChanged();
    } catch (err) {
      alert(err.message || 'บันทึกไม่สำเร็จ');
    }
  };

  // --- เงื่อนไข SC01: ลบผู้ใช้ (เซิร์ฟเวอร์จะบล็อกหากคนขับยังมีรอบรถ) ---
  const handleDelete = async (userId) => {
    if (!window.confirm(`ยืนยันการลบผู้ใช้ ${userId}?`)) return;

    try {
      const result = await api(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setNotice(result.message || 'ลบข้อมูลสำเร็จ');
      fetchUsers();
      if (onChanged) onChanged();
    } catch (err) {
      alert(err.message || 'ไม่สามารถลบได้');
    }
  };

  // ค้นหาและกรอง
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = roleFilter === 'ALL' || u.posId === roleFilter;
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        u.userId.toLowerCase().includes(search) || 
        u.firstName.toLowerCase().includes(search) ||
        (u.phone && u.phone.includes(search));
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchTerm]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1e293b' }}>
      
      {/* กรอบมือถือ Mobile 390px x 844px */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '390px', height: '844px', backgroundColor: '#F8F9FD', borderRadius: '36px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'sans-serif' }}>
        
        {/* Header App Bar */}
        <div style={{ backgroundColor: colors.blue, padding: '20px 16px 14px', color: '#fff', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', cursor: 'pointer' }}>←</span>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>ระบบแอดมิน</span>
              <h1 style={{ fontSize: '17px', margin: 0 }}>จัดการพนักงาน (SC01)</h1>
            </div>
            <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: '#fff', width: '32px', height: '32px', cursor: 'pointer' }}>🚪</button>
          </div>
          <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>● ADMIN: {me?.firstName || 'สมเกียรติ มุ่งมั่น'}</span>
            <span>Admin Mode</span>
          </div>
        </div>

        {/* ส่วนแสดงรายชื่อพนักงาน */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', filter: isModalOpen ? 'blur(2px)' : 'none' }}>
          
          {notice && <div style={{ background: '#E6F8F3', color: '#2BB996', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', marginBottom: '10px' }}>{notice}</div>}

          {/* ช่องค้นหา */}
          <input 
            type="text" 
            placeholder="🔍 ค้นหาชื่อ, รหัส, เบอร์โทร..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '999px', border: `1px solid ${colors.cardBorder}`, outline: 'none', fontSize: '12px', marginBottom: '12px', boxSizing: 'border-box' }}
          />

          {/* ฟิลเตอร์บทบาท */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', overflowX: 'auto' }}>
            <button onClick={() => setRoleFilter('ALL')} style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: roleFilter === 'ALL' ? colors.pink : '#fff', color: roleFilter === 'ALL' ? '#fff' : '#64748b', fontSize: '12px', cursor: 'pointer' }}>ทั้งหมด ({users.length})</button>
            <button onClick={() => setRoleFilter('P1')} style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: roleFilter === 'P1' ? colors.blue : '#fff', color: roleFilter === 'P1' ? '#fff' : '#64748b', fontSize: '12px', cursor: 'pointer' }}>Admin</button>
            <button onClick={() => setRoleFilter('P2')} style={{ padding: '6px 14px', borderRadius: '999px', border: 'none', background: roleFilter === 'P2' ? colors.pink : '#fff', color: roleFilter === 'P2' ? '#fff' : '#64748b', fontSize: '12px', cursor: 'pointer' }}>คนขับรถ</button>
          </div>

          {/* การ์ดรายชื่อ */}
          {loading ? <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>กำลังโหลด...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredUsers.map(u => (
                <div key={u.userId} style={{ backgroundColor: '#fff', borderRadius: '18px', padding: '12px 14px', border: `1px solid ${colors.cardBorder}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{u.userId}</span>
                        <strong style={{ fontSize: '13px', color: '#334155' }}>{u.firstName} {u.lastName}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{u.deptId || 'ส่วนกลาง'} • {u.phone || '-'}</div>
                    </div>
                    <span style={{ fontSize: '10px', background: u.posId === 'P1' ? '#E8EFFF' : '#FFE7EE', color: u.posId === 'P1' ? colors.blue : colors.pink, padding: '3px 8px', borderRadius: '999px' }}>
                      {u.posId === 'P1' ? 'Admin' : u.posId === 'P2' ? 'คนขับรถ' : 'ผู้ใช้ทั่วไป'}
                    </span>
                  </div>
                  {/* ปุ่มแก้ไข / ลบ */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button onClick={() => handleOpenEditModal(u)} style={{ background: '#F2F3FF', color: colors.blue, border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>แก้ไข</button>
                    <button onClick={() => handleDelete(u.userId)} style={{ background: colors.pinkLight, color: colors.redText, border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ปุ่มลอย "เพิ่มผู้ใช้งานใหม่" */}
        {!isModalOpen && (
          <button 
            onClick={handleOpenAddModal}
            style={{ position: 'absolute', bottom: '20px', right: '20px', backgroundColor: colors.blue, color: '#fff', border: 'none', borderRadius: '999px', padding: '12px 20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 16px rgba(127,167,245,0.4)' }}
          >
            + เพิ่มผู้ใช้ใหม่
          </button>
        )}

        {/* Bottom Sheet Modal ฟอร์ม SC01 */}
        {isModalOpen && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 50 }}>
            <div style={{ backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px', maxHeight: '88%', overflowY: 'auto' }}>
              
              <div style={{ width: '40px', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '999px', margin: '0 auto 14px' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '16px', margin: 0, color: '#1e293b' }}>{editing ? `แก้ไขผู้ใช้ (${editing.userId})` : 'เพิ่มผู้ใช้งานใหม่'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: colors.pinkLight, color: colors.pink, border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>✕</button>
              </div>

              {/* ฟอร์มกรอกข้อมูล */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                
                {/* 1. รหัสผู้ใช้งาน (ระบบสร้างอัตโนมัติ - ห้ามแก้ไข) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#64748b' }}>รหัสผู้ใช้งาน</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: colors.bgLight, borderRadius: '12px' }}>
                    <span style={{ fontWeight: 'bold', color: colors.blue }}>{formData.userId}</span>
                    <span style={{ fontSize: '10px', background: '#fff', color: colors.blue, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${colors.cardBorder}` }}>
                      {editing ? 'รหัสคงที่' : 'ระบบสร้างอัตโนมัติ'}
                    </span>
                  </div>
                </div>

                {/* 2. ชื่อ & นามสกุล (ห้ามว่าง) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#64748b' }}>ชื่อ <span style={{ color: colors.redText }}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="ระบุชื่อจริง" 
                      required
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#64748b' }}>นามสกุล <span style={{ color: colors.redText }}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="ระบุนามสกุล" 
                      required
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* 3. เบอร์โทรศัพท์ */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#64748b' }}>เบอร์โทรศัพท์</label>
                  <input 
                    type="tel" 
                    placeholder="เช่น 0812345678" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* 4. รหัสผ่านชั่วคราว (ระบบตั้งให้ / สุ่มใหม่ได้) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ color: '#64748b' }}>{editing ? 'รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)' : 'รหัสผ่านชั่วคราว *'}</label>
                    {!editing && (
                      <span onClick={() => setFormData({ ...formData, password: generatePassword() })} style={{ color: colors.blue, cursor: 'pointer', fontSize: '11px' }}>
                        🔄 สุ่มรหัสใหม่
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    required={!editing}
                    value={formData.password}
                    placeholder={editing ? "เว้นว่างไว้เพื่อใช้รหัสเดิม" : "รหัสผ่าน"}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* 5. แผนก / สังกัด */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#64748b' }}>แผนก / สังกัด</label>
                  <select 
                    value={formData.deptId} 
                    onChange={e => setFormData({ ...formData, deptId: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}
                  >
                    <option value="D0001">ฝ่ายอาคารและสถานที่ส่วนกลาง</option>
                    <option value="D0002">ฝ่ายยานพาหนะและขนส่ง</option>
                    <option value="D0003">สำนักเทคโนโลยีสารสนเทศ</option>
                  </select>
                </div>

                {/* 6. ตำแหน่งในระบบ */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#64748b' }}>ตำแหน่งในระบบ <span style={{ color: colors.redText }}>*</span></label>
                  <select 
                    value={formData.posId} 
                    onChange={e => setFormData({ ...formData, posId: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}
                  >
                    <option value="P2">คนขับรถ (อัปเดตตำแหน่ง GPS และเที่ยวรถ)</option>
                    <option value="P1">Admin (จัดการระบบทั้งหมด)</option>
                    <option value="P3">ผู้ใช้งานทั่วไป</option>
                  </select>
                </div>

                {/* ปุ่มยกเลิก และ บันทึก */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: 'none', background: colors.pinkLight, color: colors.redText, fontWeight: 'bold', cursor: 'pointer' }}>
                    ยกเลิก
                  </button>
                  <button type="submit" style={{ flex: 2, padding: '12px', borderRadius: '999px', border: 'none', background: colors.blue, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✓ บันทึก
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}