// กติกาการล็อกอินหลังบ้าน แยกไว้ให้ทดสอบได้โดยไม่ต้องใช้ Firebase

// หลังบ้านจำการล็อกอินไว้ 30 วันนับจากการล็อกอินครั้งล่าสุด แล้วให้ล็อกอินใหม่
export const ADMIN_SESSION_DAYS = 30
const SESSION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000

// สถานะบัญชีที่ใช้งานไม่ได้ (ตรงกับ Firestore Rules และ Cloud Functions)
export const BLOCKED_STATUSES = ['disabled', 'suspended', 'inactive', 'pending', 'blocked']
export const SUSPENDED_ROLE = 'suspended'

export function adminSessionExpired(user, now = Date.now()) {
  const signedIn = Date.parse(user?.metadata?.lastSignInTime || '')
  // ไม่มีเวลาล็อกอิน (ไม่ควรเกิด) ถือว่ายังไม่หมดอายุ ไม่เตะผู้ใช้ออกโดยไม่จำเป็น
  if (!Number.isFinite(signedIn)) return false
  return now - signedIn > SESSION_MS
}

// บัญชีที่สมัครเองแต่ Super Admin ยังไม่ได้กำหนดบทบาท ไม่มีสิทธิ์ใด ๆ
export const GUEST_ROLE = 'guest'
export const STAFF_ROLES = ['super_admin', 'admin', 'member', 'agent']
