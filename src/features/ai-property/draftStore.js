const DB_NAME = 'sps-ai-property-drafts'
function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('เบราว์เซอร์ไม่อนุญาตให้เก็บร่าง กรุณาตรวจการตั้งค่าพื้นที่จัดเก็บ'))
  })
}
export async function readDraft(key) {
  const db = await openStore()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new Error('อ่านข้อมูลร่างไม่สำเร็จ'))
    })
  } finally { db.close() }
}
export async function writeDraft(key, value) {
  const db = await openStore()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite')
      tx.objectStore('drafts').put(value, key)
      tx.oncomplete = resolve
      tx.onerror = () => reject(new Error('เก็บร่างไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม กรุณาอย่าเพิ่งปิดหน้านี้'))
      tx.onabort = tx.onerror
    })
  } finally { db.close() }
}
