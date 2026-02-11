/**
 * Mapping สำหรับแสดงผล Action ใน Activity Logs
 */
export const ACTION_DISPLAY = {
  CREATE_PROPERTY: 'เพิ่มบ้านใหม่',
  UPDATE_PROPERTY: 'อัปเดตข้อมูล',
  UPDATE_PRICE: 'แก้ไขราคา',
  DELETE_PROPERTY: 'ลบประกาศ',
  UPDATE_STATUS: 'อัปเดตสถานะ',
  ADD_IMAGES: 'เพิ่มรูปภาพ',
  LOGIN: 'เข้าสู่ระบบ',
  UPDATE_ROLE: 'อัปเดตสิทธิ์',
  CHANGE_PASSWORD: 'เปลี่ยนรหัสผ่าน',
}

export const ACTION_CATEGORY = {
  CREATE_PROPERTY: 'operation',
  UPDATE_PROPERTY: 'operation',
  UPDATE_PRICE: 'critical',
  DELETE_PROPERTY: 'critical',
  UPDATE_STATUS: 'operation',
  ADD_IMAGES: 'operation',
  LOGIN: 'system',
  UPDATE_ROLE: 'system',
  CHANGE_PASSWORD: 'system',
}

export function getActionDisplay(action) {
  return ACTION_DISPLAY[action] || action
}

export function getActionCategory(action) {
  return ACTION_CATEGORY[action] || 'system'
}
