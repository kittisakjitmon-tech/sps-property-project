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
              role: 'member',
              username: u.email?.split('@')[0] || '',
              createdAt: serverTimestamp(),
            }
            await setDoc(doc(publicDb, 'users', u.uid), initialProfile)
            setUserRole('member')
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

    // อนุญาตให้ล็อกอินฝั่งหน้าบ้านเฉพาะ role = 'agent'
    try {
      const userDoc = await getDoc(doc(publicDb, 'users', cred.user.uid))
      const role = userDoc.exists() ? (userDoc.data().role || 'member') : 'member'
      if (role !== 'agent') {
        await signOut(publicAuth)
        const error = new Error('อนุญาตให้เข้าสู่ระบบเฉพาะ Agent เท่านั้น')
        error.code = 'auth/not-agent'
        throw error
      }
    } catch (err) {
      // ถ้าดึง role ไม่ได้ ให้ปิด session ทิ้งและแจ้งว่าไม่อนุญาต
      await signOut(publicAuth)
      if (!err.code) {
        err.code = 'auth/not-agent'
      }
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
