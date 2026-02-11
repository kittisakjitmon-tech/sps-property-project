import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Home,
  Inbox,
  LogOut,
  Building2,
  Images,
  FileCheck,
  MapPin,
  Users,
  Settings,
  FileText,
  LayoutList,
  Activity,
} from 'lucide-react'

// Menu items with role requirements
const allNavItems = [
  { to: '/admin', end: true, label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'member'] },
  { to: '/admin/properties', end: false, label: 'จัดการทรัพย์', icon: Building2, roles: ['super_admin', 'admin'] },
  { to: '/admin/my-properties', end: false, label: 'ประกาศของฉัน', icon: FileText, roles: ['member'] },
  { to: '/admin/properties/new', end: true, label: 'เพิ่มประกาศใหม่', icon: Building2, roles: ['member'] },
  { to: '/admin/pending-properties', end: false, label: 'ตรวจสอบประกาศใหม่', icon: FileCheck, roles: ['super_admin', 'admin'] },
  { to: '/admin/hero-slides', end: false, label: 'จัดการสไลด์หน้าแรก', icon: Images, roles: ['super_admin', 'admin'] },
  { to: '/admin/homepage-sections', end: false, label: 'จัดการหน้าแรก', icon: LayoutList, roles: ['super_admin', 'admin'] },
  { to: '/admin/popular-locations', end: false, label: 'จัดการทำเลยอดฮิต', icon: MapPin, roles: ['super_admin', 'admin'] },
  { to: '/admin/users', end: false, label: 'จัดการสมาชิก', icon: Users, roles: ['super_admin'] },
  { to: '/admin/settings', end: false, label: 'การตั้งค่าระบบ', icon: Settings, roles: ['super_admin'] },
  { to: '/admin/leads', end: false, label: 'กล่องข้อความ', icon: Inbox, roles: ['super_admin', 'admin', 'member'] },
  { to: '/admin/activities', end: false, label: 'บันทึกกิจกรรม', icon: Activity, roles: ['super_admin', 'admin'] },
]

export default function AdminLayout() {
  const { logout, userRole, hasRole } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  // Filter menu items based on user role
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true
    return hasRole(item.roles)
  })

  // Get role display name
  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'member':
        return 'สมาชิก'
      default:
        return 'ผู้ใช้'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-blue-900 text-white shrink-0 flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <h1 className="font-bold text-lg">SPS Admin</h1>
          <p className="text-blue-200 text-sm">จัดการระบบ</p>
          {userRole && (
            <p className="text-yellow-400 text-xs mt-1 font-medium">{getRoleDisplayName()}</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? 'bg-yellow-400 text-yellow-900' : 'text-blue-100 hover:bg-blue-800'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-800">
          <NavLink
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800"
          >
            <Home className="h-5 w-5 shrink-0" />
            กลับเว็บหลัก
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 mt-1"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
