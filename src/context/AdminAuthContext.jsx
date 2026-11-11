import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { adminAuth, adminDb } from '../lib/firebase'
import { BLOCKED_STATUSES, GUEST_ROLE, STAFF_ROLES, SUSPENDED_ROLE, adminSessionExpired } from '../lib/adminSession'

const AdminAuthContext = createContext(null)


/** ดึงและ sync role จาก Firestore สำหรับ u (หรือ null). คืนค่า role, SUSPENDED_ROLE ถ้าบัญชีถูกระงับ, หรือ null ถ้า sign out */
async function resolveUserRole(u) {
  if (!u) return null
  try {
    let userDoc = await getDoc(doc(adminDb, 'users', u.uid))
    if (userDoc.exists()) {
      const data = userDoc.data()
      if (data.disabled === true || BLOCKED_STATUSES.includes(data.status)) return SUSPENDED_ROLE
      const role = data.role || GUEST_ROLE
      if (role === 'agent') return 'agent'
      return role
    }
    const email = (u.email || '').trim().toLowerCase()
    let role = GUEST_ROLE
    let byEmail = null
    if (email) {
      const q = query(collection(adminDb, 'users'), where('email', '==', email))
      const snap = await getDocs(q)
      byEmail = snap.docs[0] || null
      if (byEmail) {
        if (byEmail.data().disabled === true || BLOCKED_STATUSES.includes(byEmail.data().status)) return SUSPENDED_ROLE
        // ผู้ใช้ตั้งบทบาทให้ตัวเองไม่ได้ (Firestore Rules) ย้ายโปรไฟล์มาเป็น guest แล้วให้ Super Admin กำหนดบทบาท
        await setDoc(doc(adminDb, 'users', u.uid), {
          ...byEmail.data(),
          role: GUEST_ROLE,
          status: 'active',
          email: u.email,
          updatedAt: serverTimestamp(),
        })
        return GUEST_ROLE
      }
    }
    if (role === 'agent') return 'agent'
    if (!byEmail) {
      await setDoc(doc(adminDb, 'users', u.uid), {
        email: u.email,
        role: GUEST_ROLE,
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
      if (u && adminSessionExpired(u)) {
        // ครบ 30 วัน: ออกจากระบบ แล้ว callback นี้จะถูกเรียกอีกครั้งด้วย u = null
        await signOut(adminAuth).catch(() => {})
        return
      }
      if (u) {
        const role = await resolveUserRole(u)
        if (role === SUSPENDED_ROLE || role === GUEST_ROLE) {
          await signOut(adminAuth).catch(() => {})
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

  // แท็บที่เปิดค้างไว้เกิน 30 วันก็ต้องหมดอายุเช่นกัน ตรวจทุกชั่วโมงและตอนกลับมาที่แท็บ
  useEffect(() => {
    if (!user) return undefined
    const check = () => { if (adminSessionExpired(adminAuth.currentUser)) signOut(adminAuth).catch(() => {}) }
    const timer = setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', check)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check) }
  }, [user])

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(adminAuth, email, password)

    const role = await resolveUserRole(cred.user)
    if (role === SUSPENDED_ROLE) {
      await signOut(adminAuth).catch(() => {})
      throw Object.assign(new Error('บัญชีนี้ถูกระงับการใช้งาน'), { code: 'auth/user-disabled' })
    }
    if (!STAFF_ROLES.includes(role)) {
      await signOut(adminAuth).catch(() => {})
      throw Object.assign(new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์'), { code: 'auth/no-role' })
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
