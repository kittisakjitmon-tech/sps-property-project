import { initializeApp, getApps } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { initializeAuth, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// --- Initialize 2 Firebase App Instances เพื่อแยก Auth Session ---
// ใช้ named apps เพื่อให้ publicAuth และ adminAuth แยกกันโดยสิ้นเชิง

let publicApp, adminApp

const existingApps = getApps()

// Public App (Frontend) - สำหรับ agent และ member
if (existingApps.find(app => app.name === 'public')) {
  publicApp = existingApps.find(app => app.name === 'public')
} else {
  publicApp = initializeApp(firebaseConfig, 'public')
}

// Admin App (Backend) - สำหรับ admin และ super_admin
if (existingApps.find(app => app.name === 'admin')) {
  adminApp = existingApps.find(app => app.name === 'admin')
} else {
  adminApp = initializeApp(firebaseConfig, 'admin')
}

// Initialize Auth Instances (แยกกันตาม app)
export const publicAuth = initializeAuth(publicApp, {
  persistence: browserLocalPersistence, // localStorage สำหรับหน้าบ้าน
})

export const adminAuth = initializeAuth(adminApp, {
  persistence: browserSessionPersistence, // sessionStorage สำหรับหลังบ้าน (ปิด tab หาย)
})

// Initialize Shared Services (ใช้ publicApp เป็น default)
export const db = initializeFirestore(publicApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
export const storage = getStorage(publicApp)

// --- Backward Compatibility Exports ---
export const auth = publicAuth // default เป็น publicAuth
export const publicDb = db
export const publicStorage = storage
export const adminDb = db
export const adminStorage = storage

export default publicApp
export { publicApp, adminApp }

