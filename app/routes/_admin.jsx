/**
 * Admin Layout Route — ครอบ Admin pages ทั้งหมด
 * แทนที่ AdminLayout + AdminProtectedRoute ใน App.jsx เดิม
 */
import { Outlet } from 'react-router'
import { AdminAuthProvider } from '../context/AdminAuthContext'
import AdminProtectedRoute from '../components/AdminProtectedRoute'
import { lazy, Suspense } from 'react'

const AdminLayout = lazy(() => import('../admin/AdminLayout'))

export default function AdminLayoutRoute() {
  return (
    <AdminAuthProvider>
      <AdminProtectedRoute>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div></div>}>
          <AdminLayout>
            <Outlet />
          </AdminLayout>
        </Suspense>
      </AdminProtectedRoute>
    </AdminAuthProvider>
  )
}
