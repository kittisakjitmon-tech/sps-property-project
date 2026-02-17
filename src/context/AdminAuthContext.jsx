import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { adminAuth, adminDb } from '../lib/firebase'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, async (u) => {
      if (u) {
        // ดึง role จาก Firestore users collection
        try {
          const userDoc = await getDoc(doc(adminDb, 'users', u.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const role = userData.role || 'member'
            // Block agent from admin access
            if (role === 'agent') {
              await signOut(adminAuth)
              setUser(null)
              setUserRole(null)
              setLoading(false)
              return
            }
            setUserRole(role)
          } else {
            // ถ้ายังไม่มีข้อมูลใน users collection ให้สร้างใหม่
            await setDoc(doc(adminDb, 'users', u.uid), {
              email: u.email,
              role: 'member',
              createdAt: serverTimestamp(),
            })
            setUserRole('member')
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          setUserRole('member')
        }
      } else {
        setUserRole(null)
      }
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email, password) => {
    await signInWithEmailAndPassword(adminAuth, email, password)
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
