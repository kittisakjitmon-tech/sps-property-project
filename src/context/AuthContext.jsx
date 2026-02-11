import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // ดึง role จาก Firestore users collection
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role || 'member')
          } else {
            // ถ้ายังไม่มีข้อมูลใน users collection ให้สร้างใหม่
            await setDoc(doc(db, 'users', u.uid), {
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
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
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
    <AuthContext.Provider
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
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
