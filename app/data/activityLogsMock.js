/**
 * Mock Activity Logs - ใช้ร่วมกันระหว่าง Dashboard และ ActivityLogsPage
 * Categories: critical (แดง/ส้ม), operation (น้ำเงิน/เขียว), system (เทา)
 * User format: { email, role } -> แสดงเป็น Username (Role)
 */

/** ดึง Username จากอีเมล (ส่วนก่อน @) */
export const getUsernameFromEmail = (email) => {
  if (!email || typeof email !== 'string') return 'unknown'
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : email
}

/** จัดรูปแบบ Role ให้อ่านง่าย */
export const formatRoleDisplay = (role) => {
  if (!role) return 'User'
  const map = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    editor: 'Editor',
    member: 'Member',
  }
  return map[role] || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const mockActivityLogs = [
  {
    id: '1',
    user: { email: 'kittisakjitmon@gmail.com', role: 'super_admin' },
    action: 'แก้ไขราคา',
    actionType: 'update',
    category: 'critical',
    target: 'บ้านพูลวิลล่า 01',
    timestamp: '10/02/2025 14:35',
    details: 'เปลี่ยนจาก 5.0M -> 4.5M',
  },
  {
    id: '2',
    user: { email: 'sales_team01@sps.com', role: 'admin' },
    action: 'ลบประกาศ',
    actionType: 'delete',
    category: 'critical',
    target: 'คอนโดเก่าไม่ใช้แล้ว',
    timestamp: '10/02/2025 14:20',
    details: 'ลบประกาศและรูปภาพทั้งหมด',
  },
  {
    id: '3',
    user: { email: 'support@sps.com', role: 'editor' },
    action: 'เพิ่มบ้านใหม่',
    actionType: 'create',
    category: 'operation',
    target: 'ทาวน์โฮมใกล้ BTS ลาดพร้าว',
    timestamp: '10/02/2025 13:45',
    details: 'สร้างประกาศใหม่ ราคา 3.2 ล้าน',
  },
  {
    id: '4',
    user: { email: 'kittisakjitmon@gmail.com', role: 'super_admin' },
    action: 'อัปเดตสถานะ',
    actionType: 'update',
    category: 'operation',
    target: 'บ้าน Sea View',
    timestamp: '10/02/2025 12:30',
    details: 'เปลี่ยนสถานะเป็น "จองแล้ว"',
  },
  {
    id: '5',
    user: { email: 'admin@sps.com', role: 'admin' },
    action: 'เปลี่ยนรหัสผ่าน',
    actionType: 'update',
    category: 'system',
    target: '-',
    timestamp: '10/02/2025 11:15',
    details: 'ผู้ใช้ admin@sps.com เปลี่ยนรหัสผ่าน',
  },
  {
    id: '6',
    user: { email: 'support@sps.com', role: 'editor' },
    action: 'เข้าสู่ระบบ',
    actionType: 'login',
    category: 'system',
    target: '-',
    timestamp: '10/02/2025 10:55',
    details: 'Login สำเร็จ',
  },
  {
    id: '7',
    user: { email: 'kittisakjitmon@gmail.com', role: 'super_admin' },
    action: 'อัปเดตสิทธิ์',
    actionType: 'update',
    category: 'system',
    target: 'sales_team01@sps.com',
    timestamp: '10/02/2025 09:40',
    details: 'เปลี่ยน role จาก member -> admin',
  },
  {
    id: '8',
    user: { email: 'sales_team01@sps.com', role: 'admin' },
    action: 'เพิ่มรูปภาพ',
    actionType: 'update',
    category: 'operation',
    target: 'คอนโด Sea View',
    timestamp: '10/02/2025 09:10',
    details: 'อัปโหลดรูปภาพ 3 รูป',
  },
  {
    id: '9',
    user: { email: 'member_test@gmail.com', role: 'member' },
    action: 'ลบประกาศ',
    actionType: 'delete',
    category: 'critical',
    target: 'ที่ดินทดสอบ',
    timestamp: '09/02/2025 16:00',
    details: 'ผู้ใช้ลบประกาศของตนเอง',
  },
  {
    id: '10',
    user: { email: 'support@sps.com', role: 'editor' },
    action: 'แก้ไขราคา',
    actionType: 'update',
    category: 'critical',
    target: 'บ้านเดี่ยวอมตะซิตี้',
    timestamp: '09/02/2025 15:22',
    details: 'เปลี่ยนจาก 4.2M -> 3.9M',
  },
]

export const getActivityBadgeClass = (category) => {
  switch (category) {
    case 'critical':
      return 'bg-red-100 text-red-800'
    case 'operation':
      return 'bg-blue-100 text-blue-800'
    case 'system':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}
