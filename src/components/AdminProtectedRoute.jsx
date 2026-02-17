import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function AdminProtectedRoute({ children, requiredRoles }) {
  const { user, userRole, loading, hasRole } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">กำลังโหลด...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Block agent from accessing /admin routes
  if (userRole === 'agent') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-slate-600 text-sm">Agent ไม่สามารถเข้าถึงระบบหลังบ้านได้</p>
        </div>
      </div>
    )
  }

  // Check role if requiredRoles is specified
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
          <p className="text-slate-600 text-sm">กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
      </div>
    )
  }

  return children
}
