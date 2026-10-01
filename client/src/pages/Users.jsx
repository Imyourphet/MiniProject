import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

export default function Users({ me, onChanged, onLogout }) {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    userId: '',
    firstName: '',
    lastName: '',
    phone: '',
    deptId: 'D0002',
    posId: 'P2',
    password: ''
  });

  // รหัสสีธีม Cute Pastel
  const colors = {
    blue: '#7FA7F5',       // ฟ้าพาสเทลหลัก
    blueLight: '#EBF1FF',  // ฟ้าอ่อน
    pink: '#F7A8C4',       // ชมพูพาสเทล
    pinkLight: '#FFF0F5',  // ชมพูอ่อนปุ่มยกเลิก
    redText: '#F2708A',
    bgLight: '#F8F9FD',    // พื้นหลังกล่องข้อความ
    cardBorder: '#E2E8F8', // เส้นขอบนุ่มๆ
  };

  const fetchUsers = () => {
    setLoading(true);
    api('/users')
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        alert('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generatePassword = () => 'MUT@' + Math.floor(1000 + Math.random() * 9000);

  const handleOpenAddModal = () => {
    const nextCode = 'U' + String(users.length + 1).padStart(3, '0');
    setFormData({
      userId: nextCode,
      firstName: '',
      lastName: '',
      phone: '',
      deptId: 'D0002',
      posId: 'P2',
      password: generatePassword()
    });
    setEditing(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditing(user);
    setFormData({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      deptId: user.deptId || '',
      posId: user.posId,
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      fetchUsers();
      if (onChanged) onChanged();
    } catch (err) {
      alert(err.message || 'บันทึกไม่สำเร็จ');
    }
  };

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

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = roleFilter === 'ALL' || u.posId === roleFilter;
      const search = searchTerm.toLowerCase();
      return matchRole && (
        u.userId.toLowerCase().includes(search) || 
        u.firstName.toLowerCase().includes(search) ||
        (u.phone && u.phone.includes(search))
      );
    });
  }, [users, roleFilter, searchTerm]);

  return (
    <div style={{ padding: '10px 20px 40px', minHeight: '100%', fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      
      {/* ส่วนควบคุม: ค้นหา + ตัวกรอง + ปุ่มเพิ่มผู้ใช้ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        
        {/* ช่องค้นหา & ตัวกรอง */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 ค้นหาชื่อ, รหัส, เบอร์โทร..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '260px', padding: '10px 16px', borderRadius: '999px', border: `1px solid ${colors.cardBorder}`, outline: 'none', fontSize: '13px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
          />

           <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setRoleFilter('ALL')} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', background: roleFilter === 'ALL' ? colors.pink : '#fff', color: roleFilter === 'ALL' ? '#fff' : '#64748b', fontSize: '12px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>ทั้งหมด ({users.length})</button>
            <button type="button" onClick={() => setRoleFilter('P1')} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', background: roleFilter === 'P1' ? colors.blue : '#fff', color: roleFilter === 'P1' ? '#fff' : '#64748b', fontSize: '12px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>Admin</button>
            <button type="button" onClick={() => setRoleFilter('P2')} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', background: roleFilter === 'P2' ? colors.pink : '#fff', color: roleFilter === 'P2' ? '#fff' : '#64748b', fontSize: '12px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>คนขับรถ</button>
             <button type="button" onClick={() => setRoleFilter('P3')} style={{ padding: '8px 16px', borderRadius: '999px', border: 'none', background: roleFilter === 'P3' ? colors.pink : '#fff', color: roleFilter === 'P3' ? '#fff' : '#64748b', fontSize: '12px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>ผู้ใช้งานทั่วไป</button>
          </div>
        </div>

        {/* ปุ่มเพิ่มผู้ใช้ใหม่ */}
        <button 
          type="button" 
          onClick={handleOpenAddModal}
          style={{ backgroundColor: colors.blue, color: '#fff', border: 'none', borderRadius: '999px', padding: '10px 22px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 6px 14px rgba(127,167,245,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>+ เพิ่มผู้ใช้งานใหม่</span>
        </button>
      </div>

      {notice && (
        <div style={{ backgroundColor: '#E6F8F3', color: '#2BB996', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {/* Grid แสดงรายชื่อผู้ใช้งาน (สวยงามทั้งบนคอมและมือถือ) */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filteredUsers.map(u => (
            <div key={u.userId} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '16px', border: `1px solid ${colors.cardBorder}`, boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: u.posId === 'P1' ? colors.blueLight : colors.pinkLight, color: u.posId === 'P1' ? colors.blue : colors.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                    {u.firstName ? u.firstName.substring(0, 2) : 'US'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{u.userId}</span>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>{u.firstName} {u.lastName}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {u.deptId || 'ไม่ระบุแผนก'} • {u.phone || 'ไม่มีเบอร์'}
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: '11px', background: u.posId === 'P1' ? colors.blueLight : colors.pinkLight, color: u.posId === 'P1' ? colors.blue : colors.pink, padding: '4px 10px', borderRadius: '999px', fontWeight: '500' }}>
                  {u.posId === 'P1' ? 'Admin' : u.posId === 'P2' ? 'คนขับรถ' : 'ผู้ใช้ทั่วไป'}
                </span>
              </div>

              {/* ปุ่มจัดการ */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #F8FAFC' }}>
                <button type="button" onClick={() => handleOpenEditModal(u)} style={{ background: '#F2F3FF', color: colors.blue, border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>แก้ไข</button>
                <button type="button" onClick={() => handleDelete(u.userId)} style={{ background: colors.pinkLight, color: colors.redText, border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ป๊อปอัปเพิ่ม/แก้ไขผู้ใช้ (Cute Pastel) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', margin: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '17px', margin: 0, color: '#1e293b', fontWeight: '700' }}>
                {editing ? `แก้ไขผู้ใช้ (${editing.userId})` : 'เพิ่มผู้ใช้งานใหม่'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: colors.pinkLight, color: colors.pink, border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#64748b' }}>รหัสผู้ใช้งาน</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: colors.bgLight, borderRadius: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: colors.blue }}>{formData.userId}</span>
                  <span style={{ fontSize: '10px', background: '#fff', color: colors.blue, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${colors.cardBorder}` }}>
                    {editing ? 'รหัสเดิม' : 'ระบบสร้างอัตโนมัติ'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#64748b' }}>ชื่อ <span style={{ color: colors.redText }}>*</span></label>
                  <input type="text" placeholder="ชื่อจริง" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#64748b' }}>นามสกุล <span style={{ color: colors.redText }}>*</span></label>
                  <input type="text" placeholder="นามสกุล" required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#64748b' }}>เบอร์โทรศัพท์</label>
                <input type="tel" placeholder="08XXXXXXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <label style={{ color: '#64748b' }}>{editing ? 'รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)' : 'รหัสผ่านชั่วคราว *'}</label>
                  {!editing && (
                    <span onClick={() => setFormData({ ...formData, password: generatePassword() })} style={{ color: colors.blue, cursor: 'pointer', fontSize: '11px' }}>
                      🔄 สุ่มใหม่
                    </span>
                  )}
                </div>
                <input type="text" required={!editing} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', fontFamily: 'monospace', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#64748b' }}>แผนก / สังกัด</label>
                <select value={formData.deptId} onChange={e => setFormData({ ...formData, deptId: e.target.value })} style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}>
                  <option value="D0001">ฝ่ายอาคารและสถานที่ส่วนกลาง</option>
                  <option value="D0002">ฝ่ายยานพาหนะและขนส่ง</option>
                  <option value="D0003">สำนักเทคโนโลยีสารสนเทศ</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#64748b' }}>ตำแหน่งในระบบ <span style={{ color: colors.redText }}>*</span></label>
                <select value={formData.posId} onChange={e => setFormData({ ...formData, posId: e.target.value })} style={{ width: '100%', padding: '10px', background: colors.bgLight, border: 'none', borderRadius: '12px', boxSizing: 'border-box', outline: 'none' }}>
                  <option value="P2">คนขับรถ (อัปเดตตำแหน่ง GPS และเที่ยวรถ)</option>
                  <option value="P1">Admin (จัดการระบบทั้งหมด)</option>
                  <option value="P3">ผู้ใช้งานทั่วไป</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '999px', border: 'none', background: colors.pinkLight, color: colors.redText, fontWeight: 'bold', cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="submit" style={{ flex: 2, padding: '12px', borderRadius: '999px', border: 'none', background: colors.blue, color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 6px 14px rgba(127,167,245,0.4)' }}>
                  ✓ บันทึก
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}