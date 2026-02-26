import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
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
  CreditCard,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

const allNavItems = [
  { to: '/sps-internal-admin', end: true, label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'member'] },
  { to: '/sps-internal-admin/properties', end: false, label: 'จัดการทรัพย์', icon: Building2, roles: ['super_admin', 'admin'] },
  { to: '/sps-internal-admin/my-properties', end: false, label: 'ประกาศของฉัน', icon: FileText, roles: ['member'] },
  { to: '/sps-internal-admin/properties/new', end: true, label: 'เพิ่มประกาศใหม่', icon: Building2, roles: ['member'] },
  { to: '/sps-internal-admin/pending-properties', end: false, label: 'ตรวจสอบประกาศ', icon: FileCheck, roles: ['super_admin', 'admin'] },
  { to: '/sps-internal-admin/hero-slides', end: false, label: 'จัดการสไลด์หน้าแรก', icon: Images, roles: ['super_admin', 'admin'] },
  { to: '/sps-internal-admin/homepage-sections', end: false, label: 'จัดการหน้าแรก', icon: LayoutList, roles: ['super_admin', 'admin'] },
  { to: '/sps-internal-admin/popular-locations', end: false, label: 'จัดการทำเลยอดฮิต', icon: MapPin, roles: ['super_admin', 'admin'] },
  { to: '/sps-internal-admin/blogs', end: false, label: 'จัดการบทความ', icon: BookOpen, roles: ['super_admin', 'admin'] },
  { to: '/sps-internal-admin/users', end: false, label: 'จัดการสมาชิก', icon: Users, roles: ['super_admin'] },
  { to: '/sps-internal-admin/settings', end: false, label: 'การตั้งค่าระบบ', icon: Settings, roles: ['super_admin'] },
  { to: '/sps-internal-admin/leads', end: false, label: 'จัดการนัดหมาย', icon: Inbox, roles: ['super_admin', 'admin', 'member'] },
  { to: '/sps-internal-admin/loan-requests', end: false, label: 'จัดการสินเชื่อ', icon: CreditCard, roles: ['super_admin'] },
  { to: '/sps-internal-admin/activities', end: false, label: 'บันทึกกิจกรรม', icon: Activity, roles: ['super_admin', 'admin'] },
]

// ─── Sidebar content (shared between desktop & mobile drawer) ───────────────
function SidebarContent({ navItems, userRole, getRoleDisplayName, handleLogout, onNavClick = () => { } }) {
  return (
    <>
      <div className="p-6 border-b border-blue-800">
        <h1 className="font-bold text-lg">SPS Admin</h1>
        <p className="text-blue-200 text-sm">จัดการระบบ</p>
        {userRole && (
          <p className="text-yellow-400 text-xs mt-1 font-medium">{getRoleDisplayName()}</p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto admin-scrollbar">
        {navItems.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${isActive ? 'bg-yellow-400 text-yellow-900 font-semibold' : 'text-blue-100 hover:bg-blue-800'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-800 space-y-1">
        <NavLink
          to="/"
          onClick={onNavClick}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 text-sm transition"
        >
          <Home className="h-5 w-5 shrink-0" />
          <span>กลับเว็บหลัก</span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-800 text-sm transition"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  )
}

export default function AdminLayout() {
  const { logout, userRole, hasRole } = useAdminAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/sps-internal-admin/login', { replace: true })
  }

  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true
    return hasRole(item.roles)
  })

  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'member': return 'สมาชิก'
      default: return 'ผู้ใช้'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ─── Desktop Sidebar (always in document flow, never fixed) ─── */}
      <aside className="hidden lg:flex w-64 bg-blue-900 text-white shrink-0 flex-col min-h-screen sticky top-0 self-start h-screen">
        <SidebarContent
          navItems={navItems}
          userRole={userRole}
          getRoleDisplayName={getRoleDisplayName}
          handleLogout={handleLogout}
        />
      </aside>

      {/* ─── Right side: Mobile top bar + Main content ─── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile Top Bar */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-blue-900 text-white sticky top-0 z-30 shadow-md shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-blue-800 transition"
            aria-label="เปิดเมนู"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg tracking-tight">SPS Admin</h1>
          {userRole && (
            <span className="ml-auto text-xs font-medium text-yellow-400 uppercase tracking-wide">
              {getRoleDisplayName()}
            </span>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* ─── Mobile Drawer Sidebar (fixed overlay, mobile only) ─── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 bg-blue-900 text-white z-50 flex flex-col
          transition-transform duration-300 ease-in-out lg:hidden
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="font-bold text-lg">SPS Admin</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg hover:bg-blue-800 transition text-blue-200"
            aria-label="ปิดเมนู"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent
          navItems={navItems}
          userRole={userRole}
          getRoleDisplayName={getRoleDisplayName}
          handleLogout={handleLogout}
          onNavClick={() => setDrawerOpen(false)}
        />
      </aside>
    </div>
  )
}
