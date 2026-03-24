/**
 * แปลง Firebase Auth error เป็นข้อความภาษาไทยสำหรับแสดงในฟอร์ม Login
 */
export function getAuthErrorMessage(err) {
  if (!err) return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  const code = err?.code || ''
  const messageMap = {
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/user-disabled': 'บัญชีนี้ถูกปิดใช้งาน',
    'auth/user-not-found': 'ไม่พบผู้ใช้กับอีเมลนี้',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/not-agent': 'บัญชีนี้ไม่ใช่ Agent ไม่สามารถเข้าสู่ระบบฝั่งหน้าบ้านได้',
    'auth/operation-not-allowed':
      'ระบบยังไม่เปิดใช้การเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน กรุณาติดต่อผู้ดูแลระบบหรือเปิดใน Firebase Console',
    'auth/too-many-requests': 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    'auth/network-request-failed': 'เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต',
  }
  if (messageMap[code]) return messageMap[code]
  if (typeof err?.message === 'string' && err.message.includes('auth/')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}
