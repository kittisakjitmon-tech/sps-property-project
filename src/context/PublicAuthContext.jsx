import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { publicAuth, publicDb } from '../lib/firebase'

const PublicAuthContext = createContext(null)

export function PublicAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(publicAuth, async (u) => {
      if (u) {
        // ดึง role จาก Firestore users collection
        try {
          const userDoc = await getDoc(doc(publicDb, 'users', u.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role || 'member')
            setUserProfile(userData)
          } else {
            // ถ้ายังไม่มีข้อมูลใน users collection ให้สร้างใหม่
            const initialProfile = {
              email: u.email,
              role: 'guest', // Super Admin เป็นคนกำหนดบทบาทจริง
              username: u.email?.split('@')[0] || '',
              createdAt: serverTimestamp(),
            }
            await setDoc(doc(publicDb, 'users', u.uid), initialProfile)
            setUserRole('guest')
            setUserProfile(initialProfile)
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          setUserRole('member')
          setUserProfile(null)
        }
      } else {
        setUserRole(null)
        setUserProfile(null)
      }
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(publicAuth, email, password)

    // อนุญาตให้ล็อกอินฝั่งหน้าบ้านเฉพาะ role = 'agent' และ 'member'
    // ห้าม admin, super_admin login หน้าบ้าน
    try {
      const userDoc = await getDoc(doc(publicDb, 'users', cred.user.uid))
      const data = userDoc.exists() ? userDoc.data() : {}
      const role = data.role || 'guest'

      // Block admin และ super_admin จาก login หน้าบ้าน
      if (role === 'admin' || role === 'super_admin') {
        await signOut(publicAuth)
        const error = new Error('บัญชี Admin ไม่สามารถเข้าสู่ระบบหน้าบ้านได้ กรุณาใช้หน้า Admin Login')
        error.code = 'auth/admin-not-allowed'
        throw error
      }

      // อนุญาตเฉพาะ agent และ member ที่ยังใช้งานอยู่
      if (!['agent', 'member'].includes(role) || data.disabled === true || ['disabled', 'suspended', 'inactive', 'pending', 'blocked'].includes(data.status)) {
        await signOut(publicAuth)
        const error = new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์หรือถูกระงับ กรุณาติดต่อผู้ดูแลระบบ')
        error.code = 'auth/role-not-allowed'
        throw error
      }
    } catch (err) {
      // ถ้าดึง role ไม่ได้หรือ error อื่น ๆ
      if (err.code === 'auth/admin-not-allowed' || err.code === 'auth/role-not-allowed') {
        throw err
      }
      await signOut(publicAuth)
      throw err
    }
  }

  const logout = async () => {
    await signOut(publicAuth)
    setUserRole(null)
    setUserProfile(null)
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
  const isAgent = () => userRole === 'agent'

  return (
    <PublicAuthContext.Provider
      value={{
        user,
        userRole,
        userProfile,
        loading,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isAdmin,
        isMember,
        isAgent,
      }}
    >
      {children}
    </PublicAuthContext.Provider>
  )
}

export function usePublicAuth() {
  const ctx = useContext(PublicAuthContext)
  if (!ctx) throw new Error('usePublicAuth must be used within PublicAuthProvider')
  return ctx
}
