import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { adminAuth, adminDb } from '../lib/firebase'

const AdminAuthContext = createContext(null)

/** ดึงและ sync role จาก Firestore สำหรับ u (หรือ null). คืนค่า role หรือ null ถ้า sign out */
async function resolveUserRole(u) {
  if (!u) return null
  try {
    let userDoc = await getDoc(doc(adminDb, 'users', u.uid))
    if (userDoc.exists()) {
      const role = userDoc.data().role || 'member'
      if (role === 'agent') return 'agent'
      return role
    }
    const email = (u.email || '').trim().toLowerCase()
    let role = 'member'
    let byEmail = null
    if (email) {
      const q = query(collection(adminDb, 'users'), where('email', '==', email))
      const snap = await getDocs(q)
      byEmail = snap.docs[0] || null
      if (byEmail) {
        role = byEmail.data().role || 'member'
        await setDoc(doc(adminDb, 'users', u.uid), {
          ...byEmail.data(),
          email: u.email,
          updatedAt: serverTimestamp(),
        })
      }
    }
    if (role === 'agent') return 'agent'
    if (!byEmail) {
      await setDoc(doc(adminDb, 'users', u.uid), {
        email: u.email,
        role: 'member',
        createdAt: serverTimestamp(),
      })
    }
    return role
  } catch (err) {
    console.error('Error fetching user role:', err)
    return 'member'
  }
}

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, async (u) => {
      if (u) {
        const role = await resolveUserRole(u)
        if (role === 'agent') {
          await signOut(adminAuth)
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }
        setUserRole(role)
      } else {
        setUserRole(null)
      }
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(adminAuth, email, password)

    const role = await resolveUserRole(cred.user)
    if (role === 'agent') {
      await signOut(adminAuth)
      const error = new Error('บัญชี Agent ไม่สามารถเข้าสู่ระบบหลังบ้านได้ กรุณาใช้หน้า Login ปกติ')
      error.code = 'auth/agent-not-allowed'
      throw error
    }

    setUser(cred.user)
    setUserRole(role)
    setLoading(false)
  }

  const logout = async () => {
    await signOut(adminAuth)
    setUserRole(null)
  }

  const hasRole = (requiredRoles) => {
    if (!userRole) return false
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(userRole)
    }
    return userRole === requiredRoles
  }

  const isSuperAdmin = () => userRole === 'super_admin'
  const isAdmin = () => userRole === 'admin' || userRole === 'super_admin'
  const isMember = () => userRole === 'member'

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        userRole,
        loading,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isMember,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
