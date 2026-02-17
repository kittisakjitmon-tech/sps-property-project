import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut, deleteUser as deleteAuthUser } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { db } from './firebase'
import app from './firebase'

const USERS = 'users'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  const userDoc = await getDoc(doc(db, USERS, userId))
  if (!userDoc.exists()) return null
  return { id: userDoc.id, ...userDoc.data() }
}

/**
 * Get all users snapshot (real-time)
 */
export function getUsersSnapshot(callback) {
  const q = collection(db, USERS)
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
 * Get users by role
 */
export async function getUsersByRole(role) {
  const q = query(collection(db, USERS), where('role', '==', role))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Create user
 */
export async function createUser(userId, data) {
  await setDoc(doc(db, USERS, userId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Create user by email (doc id = normalized email)
 * ใช้สำหรับเพิ่มสมาชิกจากหน้าแอดมินโดยยังไม่ผูก Firebase Auth
 */
export async function createUserByEmail({ email, role = 'member', status = 'active' }) {
  const normalized = normalizeEmail(email)
  if (!normalized) throw new Error('Email is required')

  const userRef = doc(db, USERS, normalized)
  const existing = await getDoc(userRef)
  if (existing.exists()) {
    throw new Error('อีเมลนี้มีอยู่ในระบบแล้ว')
  }

  await setDoc(userRef, {
    email: normalized,
    role,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return normalized
}

/**
 * Create user with email/password in Firebase Auth
 * then create profile in Firestore users/{uid}
 *
 * ใช้ secondary app เพื่อไม่ให้ session แอดมินเด้งออก
 */
export async function createUserWithPassword({
  email,
  password,
  role = 'member',
  status = 'active',
}) {
  const normalized = normalizeEmail(email)
  const pass = String(password || '')

  if (!normalized) throw new Error('กรุณากรอกอีเมล')
  if (pass.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')

  const config = app.options
  const tempAppName = `member-create-${Date.now()}`
  const tempApp = initializeApp(config, tempAppName)
  const tempAuth = getAuth(tempApp)
  const tempDb = getFirestore(tempApp)

  let createdUid = null
  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, normalized, pass)
    createdUid = cred.user.uid

    // สร้าง username จาก email (ส่วนหน้า @)
    const emailUsername = normalized.split('@')[0] || normalized.replace(/[^a-zA-Z0-9]/g, '')
    
    // เขียน users/{uid} ด้วย token ของ user ที่เพิ่งสร้าง
    await setDoc(doc(tempDb, USERS, createdUid), {
      email: normalized,
      role,
      status,
      username: emailUsername,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await signOut(tempAuth)
    await deleteApp(tempApp)
    return createdUid
  } catch (error) {
    // ถ้าสร้าง Auth สำเร็จแต่เขียน Firestore ไม่ได้ ให้ลบ Auth ที่เพิ่งสร้างทิ้ง
    if (createdUid && tempAuth.currentUser) {
      try {
        await deleteAuthUser(tempAuth.currentUser)
      } catch (_) {
        // best-effort cleanup
      }
    }
    try {
      await signOut(tempAuth)
    } catch (_) {
      // ignore
    }
    try {
      await deleteApp(tempApp)
    } catch (_) {
      // ignore
    }
    throw error
  }
}

/**
 * Update user
 */
export async function updateUser(userId, data) {
  await updateDoc(doc(db, USERS, userId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Update user role
 */
export async function updateUserRole(userId, role) {
  await updateDoc(doc(db, USERS, userId), {
    role,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete user
 */
export async function deleteUser(userId) {
  await deleteDoc(doc(db, USERS, userId))
}

/**
 * Suspend user (set status to 'suspended')
 */
export async function suspendUser(userId) {
  await updateDoc(doc(db, USERS, userId), {
    status: 'suspended',
    updatedAt: serverTimestamp(),
  })
}

/**
 * Unsuspend user (remove suspended status)
 */
export async function unsuspendUser(userId) {
  await updateDoc(doc(db, USERS, userId), {
    status: 'active',
    updatedAt: serverTimestamp(),
  })
}
