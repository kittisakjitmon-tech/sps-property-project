import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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

// Initialize only once to avoid duplicate app errors (e.g. HMR or double import)
function getOrCreateApp(name, config) {
  const existing = getApps().find((app) => app.name === name)
  return existing || initializeApp(config, name)
}

export const publicApp = getOrCreateApp('publicApp', firebaseConfig)
export const publicAuth = getAuth(publicApp)
export const publicDb = getFirestore(publicApp)
export const publicStorage = getStorage(publicApp)

export const adminApp = getOrCreateApp('adminApp', firebaseConfig)
export const adminAuth = getAuth(adminApp)
export const adminDb = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)

function isAdminPath() {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/sps-internal-admin')
}

// Keep legacy exports for existing imports.
// They now resolve to the correct app based on current route.
export const db = isAdminPath() ? adminDb : publicDb
export const storage = isAdminPath() ? adminStorage : publicStorage

export const auth = publicAuth
export default publicApp
