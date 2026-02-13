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
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { writeBatch } from 'firebase/firestore'
import { db, storage } from './firebase'

const PROPERTIES = 'properties'
const LEADS = 'leads'
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

/** Properties - real-time list. Sorts by createdAt if present. */
export function getPropertiesSnapshot(callback) {
  const q = collection(db, PROPERTIES)
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

/** Properties - one-time fetch for public pages (optional: only available) */
export async function getPropertiesOnce(availableOnly = false) {
  const snap = await getDocs(collection(db, PROPERTIES))
  let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  list.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })
  if (availableOnly) list = list.filter((p) => p.status === 'available')
  return list
}

export async function getPropertyByIdOnce(id) {
  const d = await getDoc(doc(db, PROPERTIES, id))
  if (!d.exists()) return null
  return { id: d.id, ...d.data() }
}

export async function createProperty(data) {
  const payload = {
    ...data,
    status: data.status ?? 'available',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, PROPERTIES), payload)
  return ref.id
}

export async function updatePropertyById(id, data) {
  await updateDoc(doc(db, PROPERTIES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePropertyById(id) {
  await deleteDoc(doc(db, PROPERTIES, id))
}

export async function togglePropertyStatus(id, currentStatus) {
  const next = currentStatus === 'available' ? 'sold' : 'available'
  await updatePropertyById(id, { status: next })
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
export function getLeadsSnapshot(callback) {
  const q = collection(db, LEADS)
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

export function getViewingRequestsSnapshot(callback) {
  return onSnapshot(collection(db, VIEWING_REQUESTS), (snap) => {
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

export function getAppointmentsSnapshot(callback) {
  return onSnapshot(collection(db, APPOINTMENTS), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(list)
  })
}

export async function updateAppointmentStatus(id, status) {
  await updateDoc(doc(db, APPOINTMENTS, id), {
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

export function getLoanRequestsSnapshot(callback) {
  const q = query(
    collection(db, LOAN_REQUESTS),
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

export async function updateLoanRequestStatus(id, status, approvedAmount) {
  const payload = { status, updatedAt: serverTimestamp() }
  if (approvedAmount != null) payload.approvedAmount = approvedAmount
  await updateDoc(doc(db, LOAN_REQUESTS, id), payload)
}

export async function deleteLoanRequest(id) {
  await deleteDoc(doc(db, LOAN_REQUESTS, id))
}

/** Hero Slides - สไลด์หน้าแรก */
const HERO_SLIDES = 'hero_slides'

export function getHeroSlidesSnapshot(callback) {
  const q = collection(db, HERO_SLIDES)
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

export async function createHeroSlide(data) {
  await addDoc(collection(db, HERO_SLIDES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateHeroSlideById(id, data) {
  await updateDoc(doc(db, HERO_SLIDES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteHeroSlideById(id, imageUrl) {
  // ลบไฟล์จาก Storage ถ้ามี imageUrl
  if (imageUrl) {
    try {
      // แปลง URL เป็น path reference
      // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token=...
      const urlObj = new URL(imageUrl)
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/)
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1])
        const storageRef = ref(storage, filePath)
        await deleteObject(storageRef)
      }
    } catch (error) {
      console.error('Error deleting image from Storage:', error)
      // ยังคงลบ document แม้ลบไฟล์ไม่สำเร็จ
    }
  }
  // ลบ document จาก Firestore
  await deleteDoc(doc(db, HERO_SLIDES, id))
}

export async function uploadHeroSlideImage(file) {
  const name = `hero_slides/${Date.now()}_${file.name}`
  const storageRef = ref(storage, name)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** Batch update order ของ hero slides */
export async function batchUpdateHeroSlideOrders(updates) {
  // updates = [{ id: '...', order: 0 }, { id: '...', order: 1 }, ...]
  const batch = writeBatch(db)
  updates.forEach(({ id, order }) => {
    const slideRef = doc(db, HERO_SLIDES, id)
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

export function getPendingPropertiesSnapshot(callback) {
  const q = collection(db, PENDING_PROPERTIES)
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

export async function getPendingPropertyByIdOnce(id) {
  const d = await getDoc(doc(db, PENDING_PROPERTIES, id))
  if (!d.exists()) return null
  return { id: d.id, ...d.data() }
}

export async function approvePendingProperty(pendingId) {
  // ดึงข้อมูล pending property
  const pending = await getPendingPropertyByIdOnce(pendingId)
  if (!pending) throw new Error('ไม่พบข้อมูลประกาศ')

  // สร้าง property ใหม่ใน collection properties
  const { id, status, createdAt, updatedAt, ...propertyData } = pending
  const newPropertyId = await createProperty({
    ...propertyData,
    status: 'available',
    createdBy: pending.createdBy || pending.userId || null,
  })

  // อัปโหลดรูปภาพ (ถ้ามี)
  if (pending.images && pending.images.length > 0) {
    // รูปภาพควรจะถูกอัปโหลดไปแล้วในขั้นตอน submit
    // แต่ถ้ายังเป็น base64 หรือ file object ต้องอัปโหลดใหม่
    // สำหรับตอนนี้สมมติว่าเป็น URL แล้ว
    await updatePropertyById(newPropertyId, { images: pending.images })
  }

  // ลบ pending property
  await deleteDoc(doc(db, PENDING_PROPERTIES, pendingId))

  return newPropertyId
}

export async function rejectPendingProperty(id, rejectionReason = '') {
  // ดึงข้อมูล pending property
  const pending = await getPendingPropertyByIdOnce(id)
  if (!pending) throw new Error('ไม่พบข้อมูลประกาศ')

  // สร้าง property ใน properties collection ด้วย status = 'rejected'
  const { id: pendingId, status, createdAt, updatedAt, ...propertyData } = pending
  await createProperty({
    ...propertyData,
    status: 'rejected',
    rejectionReason: rejectionReason || 'ข้อมูลไม่ผ่านเกณฑ์การตรวจสอบ',
    createdBy: pending.createdBy || pending.userId || null,
  })

  // ลบ pending property
  await deleteDoc(doc(db, PENDING_PROPERTIES, id))
}

export async function uploadPendingPropertyImage(file, pendingId) {
  const name = `pending_properties/${pendingId}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, name)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** Popular Locations - ทำเลยอดฮิต */
const POPULAR_LOCATIONS = 'popular_locations'

export function getPopularLocationsSnapshot(callback) {
  const q = collection(db, POPULAR_LOCATIONS)
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    // Sort by order, then by createdAt
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

export async function createPopularLocation(data) {
  const snap = await getDocs(collection(db, POPULAR_LOCATIONS))
  const maxOrder = snap.docs.length > 0 
    ? Math.max(...snap.docs.map((d) => d.data().order ?? 0), -1)
    : -1
  
  await addDoc(collection(db, POPULAR_LOCATIONS), {
    ...data,
    order: maxOrder + 1,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updatePopularLocationById(id, data) {
  await updateDoc(doc(db, POPULAR_LOCATIONS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePopularLocationById(id, imageUrl) {
  // ลบไฟล์จาก Storage ถ้ามี imageUrl
  if (imageUrl) {
    try {
      const urlObj = new URL(imageUrl)
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/)
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1])
        const storageRef = ref(storage, filePath)
        await deleteObject(storageRef)
      }
    } catch (error) {
      console.error('Error deleting image from Storage:', error)
    }
  }
  await deleteDoc(doc(db, POPULAR_LOCATIONS, id))
}

export async function uploadPopularLocationImage(file) {
  const name = `popular_locations/${Date.now()}_${file.name}`
  const storageRef = ref(storage, name)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/** Batch update order ของ popular locations */
export async function batchUpdatePopularLocationOrders(updates) {
  const batch = writeBatch(db)
  updates.forEach(({ id, order }) => {
    const locationRef = doc(db, POPULAR_LOCATIONS, id)
    batch.update(locationRef, { order, updatedAt: serverTimestamp() })
  })
  await batch.commit()
}

/** Get properties by user ID (for member profile) */
export function getUserPropertiesSnapshot(userId, callback) {
  if (!userId) {
    callback([])
    return () => {}
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
export function getActivitiesSnapshot(callback) {
  const q = query(
    collection(db, ACTIVITIES),
    orderBy('timestamp', 'desc')
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

export async function createAuditLog(data) {
  await addDoc(collection(db, AUDIT_LOGS), {
    ...data,
    timestamp: serverTimestamp(),
  })
}

export function getAuditLogsSnapshot(callback, limit = 100) {
  const q = collection(db, AUDIT_LOGS)
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

export async function updateSystemSettings(settings) {
  await setDoc(
    doc(db, SYSTEM_SETTINGS, SETTINGS_DOC_ID),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export function getSystemSettingsSnapshot(callback) {
  return onSnapshot(doc(db, SYSTEM_SETTINGS, SETTINGS_DOC_ID), (docSnap) => {
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

export function getHomepageSectionsSnapshot(callback) {
  const q = collection(db, HOMEPAGE_SECTIONS)
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

export async function createHomepageSection(data) {
  const payload = {
    ...data,
    propertyIds: data.propertyIds || [],
    criteria: data.criteria || {},
    order: data.order ?? 0,
    isActive: data.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, HOMEPAGE_SECTIONS), payload)
  return ref.id
}

export async function updateHomepageSectionById(id, data) {
  await updateDoc(doc(db, HOMEPAGE_SECTIONS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteHomepageSectionById(id) {
  await deleteDoc(doc(db, HOMEPAGE_SECTIONS, id))
}

export async function batchUpdateHomepageSectionOrders(updates) {
  const batch = writeBatch(db)
  updates.forEach(({ id, order }) => {
    const ref = doc(db, HOMEPAGE_SECTIONS, id)
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
      const pt = p?.tags || []
      return tags.some((t) => pt.includes(t))
    })
  }
  return list
}
