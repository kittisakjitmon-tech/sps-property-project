import { initializeApp, getApps } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { initializeAuth, getAuth, browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence } from 'firebase/auth'
// Helper to get env variable safely across SSR (Node), Vite (import.meta), and Client (window.ENV)
const getEnvVar = (key, viteKey) => {
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) return window.ENV[key];
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  return viteKey;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', import.meta.env.VITE_FIREBASE_APP_ID),
}

const isServer = typeof window === 'undefined'

// --- Initialize 2 Firebase App Instances เพื่อแยก Auth Session ---
let publicApp, adminApp

const existingApps = getApps()

// Helper to get or init app
const getOrInitApp = (name, config) => {
  const existing = existingApps.find(a => a.name === name)
  if (existing) return existing
  return initializeApp(config, name)
}

publicApp = getOrInitApp('public', firebaseConfig)
adminApp = getOrInitApp('admin', firebaseConfig)

// --- Auth Instances (Initialize only on client to avoid persistence errors on server) ---
let publicAuth, adminAuth

if (!isServer) {
  publicAuth = initializeAuth(publicApp, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  })

  adminAuth = initializeAuth(adminApp, {
    persistence: browserSessionPersistence,
  })
} else {
  // On Server, we use basic getAuth (no persistence needed for SSR pass usually)
  publicAuth = getAuth(publicApp)
  adminAuth = getAuth(adminApp)
}

// Firestore: แยก instance ตาม app
// Note: initializeFirestore persistence might also need a check if it's running on server
export const db = !isServer ? initializeFirestore(publicApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}) : initializeFirestore(publicApp, {})

export const adminDb = initializeFirestore(adminApp, {})

export const storage = getStorage(publicApp)
export const adminStorage = getStorage(adminApp)

// --- Backward Compatibility Exports ---
export const auth = publicAuth
export const publicDb = db
export const publicStorage = storage

export { publicApp, adminApp, publicAuth, adminAuth }
export default publicApp
