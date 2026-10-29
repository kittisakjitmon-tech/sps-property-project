const DAY_MS = 24 * 60 * 60 * 1000
const MAX_IMAGE_SIDE = 2048

export function formatTime(timestamp) {
  if (!timestamp?.toDate) return ''
  const date = timestamp.toDate()
  const sameDay = date.toDateString() === new Date().toDateString()
  return new Intl.DateTimeFormat('th-TH', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short' }).format(date)
}

export function formatDateTime(timestamp) {
  if (!timestamp?.toDate) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp.toDate())
}

export function isOutsideMessagingWindow(conversation) {
  const lastInbound = conversation?.lastInboundAt?.toMillis?.()
  return Boolean(lastInbound) && Date.now() - lastInbound > DAY_MS
}

export function customerName(conversation) {
  return conversation?.contact?.name || conversation?.displayName || 'ผู้ใช้ Facebook'
}

// Re-encode to JPEG so Messenger always accepts it and the upload stays small.
export async function imageFileToJpegBase64(file) {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ')
  if (file.type === 'image/gif' && file.size <= 8 * 1024 * 1024) {
    return { base64: await blobToBase64(file), mimeType: 'image/gif' }
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(result => (result ? resolve(result) : reject(new Error('แปลงรูปภาพไม่สำเร็จ'))), 'image/jpeg', 0.85)
  })
  return { base64: await blobToBase64(blob), mimeType: 'image/jpeg' }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'))
    reader.readAsDataURL(blob)
  })
}
