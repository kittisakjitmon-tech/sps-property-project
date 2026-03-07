import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Single Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Services
export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})
export const storage = getStorage(app)

// --- Backward Compatibility Exports ---
// ชี้ไปที่ instance เดียวกันทั้งหมดเพื่อให้ไฟล์เก่าที่ import ชื่อเหล่านี้ยังทำงานได้
export const publicApp = app
export const publicAuth = auth
export const publicDb = db
export const publicStorage = storage

export const adminApp = app
export const adminAuth = auth
export const adminDb = db
export const adminStorage = storage

export default app

