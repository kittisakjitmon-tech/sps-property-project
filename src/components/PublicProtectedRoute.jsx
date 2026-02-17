import { Navigate, useLocation } from 'react-router-dom'
import { usePublicAuth } from '../context/PublicAuthContext'

export default function PublicProtectedRoute({ children, requiredRoles }) {
  const { user, userRole, loading, hasRole } = usePublicAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">กำลังโหลด...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
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
