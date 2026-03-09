import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { writeBatch } from 'firebase/firestore'
import { db, storage } from './firebase'

export { db, writeBatch }

/** เมื่อเรียกจากหลังบ้านให้ส่ง adminDb เพื่อใช้ auth ของ admin */
function firestoreDb(override) {
  return override || db
}

const PROPERTIES = 'properties'
const LEADS = 'leads'
const SHARE_LINKS = 'share_links'
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const CLOUDINARY_ENHANCE_TRANSFORM = 'e_improve:outdoor,a_auto,q_auto,f_auto'

function getCloudinaryUploadEndpoint() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary config missing: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET')
  }
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
}

function buildEnhancedCloudinaryUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${CLOUDINARY_ENHANCE_TRANSFORM}/${publicId}`
}

function uploadImageToCloudinaryWithProgress(file, onProgress) {
  const endpoint = getCloudinaryUploadEndpoint()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const progress = Math.round((event.loaded / event.total) * 100)
      onProgress?.(progress)
    }
    xhr.onerror = () => reject(new Error('Cloudinary upload failed'))
    xhr.onload = () => {
      let parsedResponse = null
      try {
        parsedResponse = JSON.parse(xhr.responseText)
      } catch {
        parsedResponse = null
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const cloudinaryMessage = parsedResponse?.error?.message
        const detail = cloudinaryMessage ? `: ${cloudinaryMessage}` : ''
        reject(new Error(`Cloudinary upload failed (${xhr.status})${detail}`))
        return
      }
      try {
        const response = parsedResponse ?? JSON.parse(xhr.responseText)
        if (!response?.public_id) {
          reject(new Error('Cloudinary upload returned no public_id'))
          return
        }
        onProgress?.(100)
        resolve(buildEnhancedCloudinaryUrl(response.public_id))
      } catch {
        reject(new Error('Cloudinary upload response parse failed'))
      }
    }
    xhr.send(formData)
  })
}

function toMillis(value) {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return 0
}

function generateShareToken(length = 20) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < length; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

/** Properties - real-time list. Sorts by createdAt if present. */
export function getPropertiesSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, PROPERTIES)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list)
  })
}

/**
 * Helper: ตรวจสอบสถานะว่า "ว่าง" หรือไม่ แบบยืดหยุ่น
 */
function isAvailable(p) {
  const s = String(p.status || p.availability || '').toLowerCase()
  return s === 'available' || s === 'ว่าง' || s === '' // ยอมรับค่าว่างด้วยเพื่อความปลอดภัย
}

/**
 * Helper: จัดเรียงข้อมูลตามเวลา (ล่าสุดขึ้นก่อน) แบบรองรับเอกสารที่ไม่มีวันที่
 */
function sortByDate(list) {
  return list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || a.createdAt || 0
    const tb = b.createdAt?.toMillis?.() || b.createdAt || 0
    return tb - ta
  })
}

/** Properties - one-time fetch for public pages (optional: only available) */
export async function getPropertiesOnce(availableOnly = false) {
  // ดึงข้อมูลโดยเรียงตามเวลาที่ Server เพื่อความแม่นยำ
  const q = query(collection(db, PROPERTIES), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  
  if (availableOnly) {
    list = list.filter(isAvailable)
  }
  return list
}

/** Bounded fetch for listing page — ลดโหลดครั้งแรก, pagination ยังทำฝั่ง client */
export async function getPropertiesOnceForListing(availableOnly = false, maxCount = 300) {
  const q = query(
    collection(db, PROPERTIES),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  )
  const snap = await getDocs(q)
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (availableOnly) {
    list = list.filter(isAvailable)
  }
  return list
}

/** ดึงเฉพาะทรัพย์สินแนะนำ (Featured) สำหรับหน้าแรก — จำกัด 10 รายการ */
export async function getFeaturedPropertiesOnce() {
  // ดึงล่าสุด 200 รายการมาคัดเลือก เพื่อให้ได้บ้านใหม่ๆ แน่นอน
  const q = query(collection(db, PROPERTIES), orderBy('createdAt', 'desc'), limit(200))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  
  return list
    .filter((p) => isAvailable(p) && p.featured === true)
    .slice(0, 10)
}

/** ดึงเฉพาะทรัพย์สินล่าสุด สำหรับหน้าแรก — จำกัด 40 รายการ */
export async function getLatestPropertiesOnce() {
  // ดึงล่าสุด 200 รายการมาคัดเลือก
  const q = query(collection(db, PROPERTIES), orderBy('createdAt', 'desc'), limit(200))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  
  return list
    .filter(isAvailable)
    .slice(0, 40)
}

export async function getPropertyByIdOnce(id) {
  const d = await getDoc(doc(db, PROPERTIES, id))
  if (!d.exists()) return null
  return { id: d.id, ...d.data() }
}

/**
 * Share links (expire in 24 hours by default)
 * Reuse existing unexpired link for same property+agent.
 */
export async function createOrReuseShareLink({ propertyId, createdBy, ttlHours = 24 }) {
  if (!propertyId || !createdBy) {
    throw new Error('propertyId and createdBy are required')
  }

  const nowMs = Date.now()
  const q = query(
    collection(db, SHARE_LINKS),
    where('propertyId', '==', propertyId),
    where('createdBy', '==', createdBy),
    limit(10)
  )
  const snap = await getDocs(q)
  const candidates = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

  const reusable = candidates.find((item) => toMillis(item.expiresAt) > nowMs)
  if (reusable) return reusable

  const expiresAt = new Date(nowMs + ttlHours * 60 * 60 * 1000)
  const payload = {
    propertyId,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt,
  }
  const token = generateShareToken()
  await setDoc(doc(db, SHARE_LINKS, token), payload)
  return { id: token, ...payload }
}

export async function getShareLinkByToken(token) {
  if (!token) return null
  const snap = await getDoc(doc(db, SHARE_LINKS, token))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export function isShareLinkExpired(shareLink) {
  const expiresAtMs = toMillis(shareLink?.expiresAt)
  if (!expiresAtMs) return true
  return expiresAtMs <= Date.now()
}

export async function createProperty(data, firestore) {
  const d = firestoreDb(firestore)
  const payload = {
    ...data,
    status: data.status ?? 'available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(d, PROPERTIES), payload)
  return ref.id
}

export async function updatePropertyById(id, data, firestore) {
  const d = firestoreDb(firestore)
  await updateDoc(doc(d, PROPERTIES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Add tag to property's customTags and tags (for homepage section sync)
 */
export async function addTagToProperty(propertyId, tag, firestore) {
  if (!propertyId || !tag || typeof tag !== 'string' || !tag.trim()) return
  const d = firestoreDb(firestore)
  const tagVal = tag.trim()
  const snap = await getDoc(doc(d, PROPERTIES, propertyId))
  if (!snap.exists()) return
  const current = snap.data()
  const existing = Array.isArray(current.customTags) ? current.customTags : Array.isArray(current.tags) ? current.tags : []
  const tags = [...existing]
  if (tags.some((t) => String(t).trim() === tagVal)) return
  tags.push(tagVal)
  await updateDoc(doc(d, PROPERTIES, propertyId), {
    customTags: tags,
    tags: tags,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove tag from property's customTags and tags (for homepage section sync)
 */
export async function removeTagFromProperty(propertyId, tag, firestore) {
  if (!propertyId || !tag || typeof tag !== 'string' || !tag.trim()) return
  const d = firestoreDb(firestore)
  const tagVal = tag.trim()
  const snap = await getDoc(doc(d, PROPERTIES, propertyId))
  if (!snap.exists()) return
  const current = snap.data()
  const existing = Array.isArray(current.customTags) ? current.customTags : Array.isArray(current.tags) ? current.tags : []
  const filtered = existing.filter((t) => String(t).trim() !== tagVal)
  if (filtered.length === existing.length) return
  await updateDoc(doc(d, PROPERTIES, propertyId), {
    customTags: filtered,
    tags: filtered,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePropertyById(id, firestore) {
  const d = firestoreDb(firestore)
  await deleteDoc(doc(d, PROPERTIES, id))
}

export async function togglePropertyStatus(id, currentStatus, firestore) {
  const next = currentStatus === 'available' ? 'sold' : 'available'
  await updatePropertyById(id, { status: next }, firestore)
}

/** Upload property image to Cloudinary and return enhanced URL */
export async function uploadPropertyImage(file, propertyId) {
  void propertyId
  return uploadImageToCloudinaryWithProgress(file, undefined)
}

/** Upload property image with progress to Cloudinary (สำหรับแสดงเปอร์เซ็นต์จริงใน Progress Loader) */
export function uploadPropertyImageWithProgress(file, propertyId, onProgress) {
  void propertyId
  return uploadImageToCloudinaryWithProgress(file, onProgress)
}

/** Leads */
export function getLeadsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, LEADS)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list)
  })
}

export async function createLead(data) {
  await addDoc(collection(db, LEADS), {
    ...data,
    read: false,
    contacted: false,
    createdAt: serverTimestamp(),
  })
}

export async function updateLeadById(id, data) {
  await updateDoc(doc(db, LEADS, id), data)
}

export async function markLeadRead(id) {
  await updateLeadById(id, { read: true })
}

export async function markLeadContacted(id) {
  await updateLeadById(id, { contacted: true })
}

/** Viewing Requests - จองเยี่ยมชม */
const VIEWING_REQUESTS = 'viewing_requests'

export function getViewingRequestsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  return onSnapshot(collection(d, VIEWING_REQUESTS), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'viewing_requests' }))
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list)
  })
}

export async function createViewingRequest(data) {
  await addDoc(collection(db, VIEWING_REQUESTS), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

/** Appointments - นัดหมายเข้าชมโครงการ */
const APPOINTMENTS = 'appointments'

export async function createAppointment(data) {
  await addDoc(collection(db, APPOINTMENTS), {
    ...data,
    status: data.status ?? 'pending',
    createdAt: serverTimestamp(),
  })
}

export function getAppointmentsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  return onSnapshot(collection(d, APPOINTMENTS), (snap) => {
    const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    callback(list)
  })
}

export async function updateAppointmentStatus(id, status, firestore) {
  const d = firestoreDb(firestore)
  await updateDoc(doc(d, APPOINTMENTS, id), {
    status,
    updatedAt: serverTimestamp(),
  })
}

/** Inquiries - คำถามติดต่อจากหน้า Contact */
const INQUIRIES = 'inquiries'

export async function createInquiry(data) {
  await addDoc(collection(db, INQUIRIES), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

/** Loan Requests - คำขอกู้สินเชื่อ/ปิดหนี้ (PDPA - Super Admin only) */
const LOAN_REQUESTS = 'loan_requests'

export async function createLoanRequest(data) {
  await addDoc(collection(db, LOAN_REQUESTS), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export function getLoanRequestsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = query(
    collection(d, LOAN_REQUESTS),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt,
      }
    })
    callback(list)
  })
}

export async function updateLoanRequestStatus(id, status, approvedAmount, firestore) {
  const d = firestoreDb(firestore)
  const payload = { status, updatedAt: serverTimestamp() }
  if (approvedAmount != null) payload.approvedAmount = approvedAmount
  await updateDoc(doc(d, LOAN_REQUESTS, id), payload)
}

export async function deleteLoanRequest(id, firestore) {
  const d = firestoreDb(firestore)
  await deleteDoc(doc(d, LOAN_REQUESTS, id))
}

/** Hero Slides - สไลด์หน้าแรก */
const HERO_SLIDES = 'hero_slides'

function storageRef(override) {
  return override || storage
}

export function getHeroSlidesSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, HERO_SLIDES)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    callback(list)
  })
}

export async function getHeroSlidesOnce() {
  const snap = await getDocs(collection(db, HERO_SLIDES))
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return list
}

export async function createHeroSlide(data, firestore) {
  const d = firestoreDb(firestore)
  await addDoc(collection(d, HERO_SLIDES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateHeroSlideById(id, data, firestore) {
  const d = firestoreDb(firestore)
  await updateDoc(doc(d, HERO_SLIDES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteHeroSlideById(id, imageUrl, firestore, storageOverride) {
  const str = storageRef(storageOverride)
  const d = firestoreDb(firestore)
  if (imageUrl) {
    try {
      const urlObj = new URL(imageUrl)
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/)
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1])
        const fileRef = ref(str, filePath)
        await deleteObject(fileRef)
      }
    } catch (error) {
      console.error('Error deleting image from Storage:', error)
    }
  }
  await deleteDoc(doc(d, HERO_SLIDES, id))
}

export async function uploadHeroSlideImage(file, storageOverride) {
  const str = storageRef(storageOverride)
  const name = `hero_slides/${Date.now()}_${file.name}`
  const fileRef = ref(str, name)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

/** Batch update order ของ hero slides */
export async function batchUpdateHeroSlideOrders(updates, firestore) {
  const d = firestoreDb(firestore)
  const batch = writeBatch(d)
  updates.forEach(({ id, order }) => {
    const slideRef = doc(d, HERO_SLIDES, id)
    batch.update(slideRef, { order, updatedAt: serverTimestamp() })
  })
  await batch.commit()
}

/** Pending Properties - ประกาศที่รออนุมัติ */
const PENDING_PROPERTIES = 'pending_properties'

export async function createPendingProperty(data) {
  await addDoc(collection(db, PENDING_PROPERTIES), {
    ...data,
    status: 'pending',
    userId: data.userId || data.createdBy || null,
    createdBy: data.createdBy || data.userId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function getPendingPropertiesSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, PENDING_PROPERTIES)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list)
  })
}

export async function getPendingPropertyByIdOnce(id, firestore) {
  const d = firestoreDb(firestore)
  const snap = await getDoc(doc(d, PENDING_PROPERTIES, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function approvePendingProperty(pendingId, firestore) {
  const d = firestoreDb(firestore)
  const pending = await getPendingPropertyByIdOnce(pendingId, firestore)
  if (!pending) throw new Error('ไม่พบข้อมูลประกาศ')

  const { id, status, createdAt, updatedAt, ...propertyData } = pending
  const newPropertyId = await createProperty({
    ...propertyData,
    status: 'available',
    createdBy: pending.createdBy || pending.userId || null,
  }, firestore)

  if (pending.images && pending.images.length > 0) {
    await updatePropertyById(newPropertyId, { images: pending.images }, firestore)
  }

  await deleteDoc(doc(d, PENDING_PROPERTIES, pendingId))
  return newPropertyId
}

export async function rejectPendingProperty(id, rejectionReason = '', firestore) {
  const d = firestoreDb(firestore)
  const pending = await getPendingPropertyByIdOnce(id, firestore)
  if (!pending) throw new Error('ไม่พบข้อมูลประกาศ')

  const { id: pendingId, status, createdAt, updatedAt, ...propertyData } = pending
  await createProperty({
    ...propertyData,
    status: 'rejected',
    rejectionReason: rejectionReason || 'ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ',
    createdBy: pending.createdBy || pending.userId || null,
  }, firestore)

  await deleteDoc(doc(d, PENDING_PROPERTIES, id))
}

export async function uploadPendingPropertyImage(file, pendingId) {
  const name = `pending_properties/${pendingId}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, name)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** Popular Locations - ทำเลยอดฮิต */
const POPULAR_LOCATIONS = 'popular_locations'

export function getPopularLocationsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, POPULAR_LOCATIONS)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const orderA = a.order ?? 999
      const orderB = b.order ?? 999
      if (orderA !== orderB) return orderA - orderB
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list)
  })
}

export async function getPopularLocationsOnce() {
  const snap = await getDocs(collection(db, POPULAR_LOCATIONS))
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => {
    const orderA = a.order ?? 999
    const orderB = b.order ?? 999
    if (orderA !== orderB) return orderA - orderB
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })
  return list
}

export async function createPopularLocation(data, firestore) {
  const d = firestoreDb(firestore)
  const snap = await getDocs(collection(d, POPULAR_LOCATIONS))
  const maxOrder = snap.docs.length > 0
    ? Math.max(...snap.docs.map((doc) => doc.data().order ?? 0), -1)
    : -1

  await addDoc(collection(d, POPULAR_LOCATIONS), {
    ...data,
    order: maxOrder + 1,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updatePopularLocationById(id, data, firestore) {
  const d = firestoreDb(firestore)
  await updateDoc(doc(d, POPULAR_LOCATIONS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePopularLocationById(id, imageUrl, firestore, storageOverride) {
  const str = storageRef(storageOverride)
  const d = firestoreDb(firestore)
  if (imageUrl) {
    try {
      const urlObj = new URL(imageUrl)
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/)
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1])
        const fileRef = ref(str, filePath)
        await deleteObject(fileRef)
      }
    } catch (error) {
      console.error('Error deleting image from Storage:', error)
    }
  }
  await deleteDoc(doc(d, POPULAR_LOCATIONS, id))
}

export async function uploadPopularLocationImage(file, storageOverride) {
  const str = storageRef(storageOverride)
  const name = `popular_locations/${Date.now()}_${file.name}`
  const fileRef = ref(str, name)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}

/** Batch update order ของ popular locations */
export async function batchUpdatePopularLocationOrders(updates, firestore) {
  const d = firestoreDb(firestore)
  const batch = writeBatch(d)
  updates.forEach(({ id, order }) => {
    const locationRef = doc(d, POPULAR_LOCATIONS, id)
    batch.update(locationRef, { order, updatedAt: serverTimestamp() })
  })
  await batch.commit()
}

/** Get properties by user ID (for member profile) */
export function getUserPropertiesSnapshot(userId, callback) {
  if (!userId) {
    callback([])
    return () => { }
  }
  const q = query(collection(db, PROPERTIES), where('createdBy', '==', userId))
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0
      const tb = b.createdAt?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list)
  })
}

/** Audit Logs - บันทึกประวัติการจัดการสมาชิก */
const AUDIT_LOGS = 'audit_logs'
const ACTIVITIES = 'activities'

/** Activities - Realtime snapshot สำหรับบันทึกกิจกรรม */
export function getActivitiesSnapshot(callback, limitCount = 20, firestore) {
  const d = firestoreDb(firestore)
  const q = query(
    collection(d, ACTIVITIES),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        user: data.performedBy, // normalized for display
      }
    })
    callback(list)
  })
}

/** Property Views - บันทึกการเข้าชมหน้ารายละเอียดทรัพย์ (แบบ A: 1 doc ต่อ 1 view) */
const PROPERTY_VIEWS = 'property_views'
const VIEWS_DAYS_LIMIT = 365

export async function recordPropertyView({ propertyId, type }) {
  if (!propertyId) return
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  await addDoc(collection(db, PROPERTY_VIEWS), {
    propertyId,
    type: type || 'อื่นๆ',
    date,
    timestamp: serverTimestamp(),
  })
}

/** ดึง property_views ย้อนหลัง VIEWS_DAYS_LIMIT วัน สำหรับ Dashboard (realtime) */
export function getPropertyViewsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = query(
    collection(d, PROPERTY_VIEWS),
    orderBy('timestamp', 'desc'),
    limit(5000)
  )
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - VIEWS_DAYS_LIMIT)
    const filtered = list.filter((v) => {
      const ts = v.timestamp?.toMillis?.()
      return ts && ts >= cutoff.getTime()
    })
    callback(filtered)
  })
}

export async function createAuditLog(data, firestore) {
  const d = firestoreDb(firestore)
  await addDoc(collection(d, AUDIT_LOGS), {
    ...data,
    timestamp: serverTimestamp(),
  })
}

export function getAuditLogsSnapshot(callback, limit = 100, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, AUDIT_LOGS)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => {
      const ta = a.timestamp?.toMillis?.() ?? 0
      const tb = b.timestamp?.toMillis?.() ?? 0
      return tb - ta
    })
    callback(list.slice(0, limit))
  })
}

/** System Settings - การตั้งค่าระบบ */
const SYSTEM_SETTINGS = 'system_settings'
const SETTINGS_DOC_ID = 'main'

export async function getSystemSettings() {
  const settingsDoc = await getDoc(doc(db, SYSTEM_SETTINGS, SETTINGS_DOC_ID))
  if (!settingsDoc.exists()) {
    // Return default settings if not exists
    return {
      siteName: 'SPS Property Solution',
      siteDescription: 'ระบบค้นหาและจัดการอสังหาริมทรัพย์',
      contactEmail: '',
      contactPhone: '',
      maintenanceMode: false,
      allowPublicRegistration: true,
      maxPropertiesPerUser: 10,
      autoApproveProperties: false,
      updatedAt: null,
    }
  }
  return { id: settingsDoc.id, ...settingsDoc.data() }
}

export async function updateSystemSettings(settings, firestore) {
  const d = firestoreDb(firestore)
  await setDoc(
    doc(d, SYSTEM_SETTINGS, SETTINGS_DOC_ID),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export function getSystemSettingsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  return onSnapshot(doc(d, SYSTEM_SETTINGS, SETTINGS_DOC_ID), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() })
    } else {
      // Return default settings
      callback({
        siteName: 'SPS Property Solution',
        siteDescription: 'ระบบค้นหาและจัดการอสังหาริมทรัพย์',
        contactEmail: '',
        contactPhone: '',
        maintenanceMode: false,
        allowPublicRegistration: true,
        maxPropertiesPerUser: 10,
        autoApproveProperties: false,
      })
    }
  })
}

/** Homepage Sections - หัวข้อหน้าแรก (ทรัพย์เด่น ฯลฯ) */
const HOMEPAGE_SECTIONS = 'homepage_sections'

export function getHomepageSectionsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = collection(d, HOMEPAGE_SECTIONS)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    callback(list)
  })
}

export async function getHomepageSectionsOnce() {
  const snap = await getDocs(collection(db, HOMEPAGE_SECTIONS))
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return list
}

export async function createHomepageSection(data, firestore) {
  const d = firestoreDb(firestore)
  const payload = {
    ...data,
    propertyIds: data.propertyIds || [],
    criteria: data.criteria || {},
    order: data.order ?? 0,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(d, HOMEPAGE_SECTIONS), payload)
  return ref.id
}

export async function updateHomepageSectionById(id, data, firestore) {
  const d = firestoreDb(firestore)
  await updateDoc(doc(d, HOMEPAGE_SECTIONS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteHomepageSectionById(id, firestore) {
  const d = firestoreDb(firestore)
  await deleteDoc(doc(d, HOMEPAGE_SECTIONS, id))
}

export async function batchUpdateHomepageSectionOrders(updates, firestore) {
  const d = firestoreDb(firestore)
  const batch = writeBatch(d)
  updates.forEach(({ id, order }) => {
    const ref = doc(d, HOMEPAGE_SECTIONS, id)
    batch.update(ref, { order, updatedAt: serverTimestamp() })
  })
  await batch.commit()
}

/**
 * Filter properties by criteria (for query-type sections)
 * Used in both admin preview and frontend Home page
 */
export function filterPropertiesByCriteria(properties, criteria) {
  if (!criteria || Object.keys(criteria).length === 0) {
    return properties.filter((p) => p.status === 'available')
  }
  const toStr = (v) => (v != null && typeof v === 'string' ? v : String(v ?? '')).trim()
  let list = properties.filter((p) => p.status === 'available')

  const { maxPrice, minPrice, location, type, tags } = criteria
  if (minPrice != null && Number(minPrice) > 0) {
    const v = Number(minPrice)
    list = list.filter((p) => (Number(p?.price) || 0) >= v)
  }
  if (maxPrice != null && Number(maxPrice) > 0) {
    const v = Number(maxPrice)
    list = list.filter((p) => (Number(p?.price) || 0) <= v)
  }
  if (location && toStr(location).length > 0) {
    const loc = toStr(location).toLowerCase()
    list = list.filter((p) => {
      const prov = toStr(p?.location?.province).toLowerCase()
      const dist = toStr(p?.location?.district).toLowerCase()
      return prov.includes(loc) || dist.includes(loc)
    })
  }
  if (type && toStr(type).length > 0) {
    list = list.filter((p) => p?.type === type)
  }
  if (tags && Array.isArray(tags) && tags.length > 0) {
    list = list.filter((p) => {
      const pt = p?.customTags || p?.tags || []
      return tags.some((t) => pt.includes(t))
    })
  }
  return list
}

// ==================== BLOG FUNCTIONS ====================
const BLOGS = 'blogs'
const MAX_FEATURED_BLOGS = 4

/**
 * Get all blogs snapshot (for admin)
 * @param {FirebaseFirestore.Firestore} [firestore] - เมื่อเรียกจากหลังบ้านให้ส่ง adminDb
 */
export function getBlogsSnapshot(callback, firestore) {
  const d = firestoreDb(firestore)
  const q = query(collection(d, BLOGS), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const blogs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(blogs)
  })
}

/**
 * Get published blogs with pagination
 * @param {number} pageSize - Number of blogs per page
 * @param {object} lastDoc - Last document from previous page (for pagination)
 * @returns {Promise<{blogs: Array, lastDoc: object|null, hasMore: boolean}>}
 */
export async function getPublishedBlogs(pageSize = 9, lastDoc = null) {
  let q = query(
    collection(db, BLOGS),
    where('published', '==', true),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )

  if (lastDoc) {
    q = query(
      collection(db, BLOGS),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    )
  }

  const snapshot = await getDocs(q)
  const blogs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null
  const hasMore = snapshot.docs.length === pageSize

  return {
    blogs,
    lastDoc: lastVisible,
    hasMore,
  }
}

/**
 * Get featured blogs (max 4)
 */
export async function getFeaturedBlogs() {
  const q = query(
    collection(db, BLOGS),
    where('published', '==', true),
    where('isFeatured', '==', true),
    orderBy('createdAt', 'desc'),
    limit(MAX_FEATURED_BLOGS)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

/**
 * Get blog by ID
 */
export async function getBlogByIdOnce(id) {
  const snap = await getDoc(doc(db, BLOGS, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Create a new blog
 * @param {FirebaseFirestore.Firestore} [firestore] - เมื่อเรียกจากหลังบ้านให้ส่ง adminDb
 */
export async function createBlog(data, firestore) {
  const d = firestoreDb(firestore)
  const payload = {
    title: data.title || '',
    content: data.content || '',
    youtubeUrl: data.youtubeUrl || '',
    images: data.images || [],
    published: data.published ?? false,
    isFeatured: data.isFeatured ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(d, BLOGS), payload)
  return ref.id
}

/**
 * Update blog by ID
 * @param {FirebaseFirestore.Firestore} [firestore] - เมื่อเรียกจากหลังบ้านให้ส่ง adminDb
 */
export async function updateBlogById(id, data, firestore) {
  const d = firestoreDb(firestore)
  await updateDoc(doc(d, BLOGS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete blog by ID
 * @param {FirebaseFirestore.Firestore} [firestore] - เมื่อเรียกจากหลังบ้านให้ส่ง adminDb
 */
export async function deleteBlogById(id, firestore) {
  const d = firestoreDb(firestore)
  await deleteDoc(doc(d, BLOGS, id))
}

/**
 * Upload blog image to Firebase Storage
 * @param {FirebaseStorage.Storage} [storageInstance] - เมื่อเรียกจากหลังบ้านให้ส่ง adminStorage เพื่อใช้ auth ของ admin
 */
export async function uploadBlogImage(file, onProgress, storageInstance) {
  const s = storageInstance || storage
  const storageRef = ref(s, `blogs/${Date.now()}_${file.name}`)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return url
}
