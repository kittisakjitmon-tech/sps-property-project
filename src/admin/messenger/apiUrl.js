const DEFAULT_API_URL = '/api/admin/messenger'
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/i

function hostOf(url) {
  try {
    return new URL(url, 'https://placeholder.invalid').hostname
  } catch {
    return ''
  }
}

// Where the admin page sends its requests. Normally the same-origin path that Firebase Hosting
// forwards to the function. A URL from the build environment is honoured, except one that points
// at this machine (localhost) when the page itself is not running on localhost: that is a
// leftover from local development baked into a production build, and it can never work.
export function resolveApiUrl(envUrl, pageHostname) {
  const configured = typeof envUrl === 'string' ? envUrl.trim() : ''
  if (!configured) return DEFAULT_API_URL
  const pointsAtLocal = LOCAL_HOST.test(hostOf(configured))
  const pageIsLocal = LOCAL_HOST.test(pageHostname || '')
  if (pointsAtLocal && !pageIsLocal) return DEFAULT_API_URL
  return configured
}

// A readable reason for a request that never got an answer (the browser only says "Failed to fetch").
export function describeNetworkFailure(url, pageHostname) {
  const local = LOCAL_HOST.test(pageHostname || '')
  return local
    ? `เชื่อมต่อหลังบ้านไม่สำเร็จ (${url}) หน้านี้เปิดจากเครื่องตัวเอง (localhost) ซึ่งไม่มีฟังก์ชันหลังบ้านให้เรียก กรุณาใช้หน้าจริงที่ https://sps-property.web.app`
    : `เชื่อมต่อหลังบ้านไม่สำเร็จ (${url}) ตรวจว่า deploy ฟังก์ชัน facebookMessengerAdmin แล้ว และอินเทอร์เน็ตปกติ ถ้ายังไม่หาย เปิด F12 > Network ดูสถานะคำขอ`
}
