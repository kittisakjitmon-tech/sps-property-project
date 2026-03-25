import { AdminAuthProvider } from '../context/AdminAuthContext'
import { lazy, Suspense } from 'react'
const Login = lazy(() => import('../admin/Login'))
export default function AdminLoginRoute() {
  return <AdminAuthProvider><Suspense fallback={null}><Login /></Suspense></AdminAuthProvider>
}
