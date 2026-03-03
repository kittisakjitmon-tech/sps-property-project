import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SearchProvider } from './context/SearchContext'
import { PublicAuthProvider } from './context/PublicAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import PublicProtectedRoute from './components/PublicProtectedRoute'
import MaintenancePage from './components/MaintenancePage'
import { useSystemSettings } from './hooks/useSystemSettings'

// ─── Public Pages ────────────────────────────────────────────────────────────
const Home = lazy(() => import('./pages/Home'))
const Properties = lazy(() => import('./pages/Properties'))
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'))
const SharePage = lazy(() => import('./pages/SharePage'))
const Contact = lazy(() => import('./pages/Contact'))
const LoanService = lazy(() => import('./pages/LoanService'))
const PostProperty = lazy(() => import('./pages/PostProperty'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Profile = lazy(() => import('./pages/Profile'))
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'))
const PublicLogin = lazy(() => import('./pages/PublicLogin'))
const Blogs = lazy(() => import('./pages/Blogs'))
const BlogDetail = lazy(() => import('./pages/BlogDetail'))

// ─── Admin Pages ─────────────────────────────────────────────────────────────
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const Dashboard = lazy(() => import('./admin/Dashboard'))
const PropertyForm = lazy(() => import('./admin/PropertyForm'))
const LeadsInbox = lazy(() => import('./admin/LeadsInbox'))
const HeroSlidesAdmin = lazy(() => import('./admin/HeroSlidesAdmin'))
const HomepageSectionsAdmin = lazy(() => import('./admin/HomepageSectionsAdmin'))
const PopularLocationsAdmin = lazy(() => import('./admin/PopularLocationsAdmin'))
const PendingProperties = lazy(() => import('./admin/PendingProperties'))
const UserManagement = lazy(() => import('./admin/UserManagement'))
const PropertyListPage = lazy(() => import('./admin/PropertyListPage'))
const AdminLoanRequests = lazy(() => import('./admin/AdminLoanRequests'))
const MyProperties = lazy(() => import('./admin/MyProperties'))
const Settings = lazy(() => import('./admin/Settings'))
const ActivityLogsPage = lazy(() => import('./admin/ActivityLogsPage'))
const Login = lazy(() => import('./admin/Login'))
const AdminBlogs = lazy(() => import('./admin/AdminBlogs'))

// ─── Route Loading Fallback ───────────────────────────────────────────────────
function RouteLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-900 border-t-transparent animate-spin" />
      </div>
      <p className="text-slate-500 text-sm font-medium">กำลังโหลด…</p>
    </div>
  )
}

// ─── Public Routes Wrapper (Maintenance Mode Guard) ───────────────────────────
function PublicRoutesWrapper() {
  const { settings, loading } = useSystemSettings()

  if (loading) return <RouteLoading />

  // Maintenance Mode เปิดอยู่ → แสดงหน้าปิดปรับปรุง (admin /sps-internal-admin/* ไม่ถูกบล็อก)
  if (settings.maintenanceMode) {
    return <MaintenancePage siteName={settings.siteName} />
  }

  return (
    <PublicAuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/loan-services" element={<LoanService />} />
        <Route path="/post" element={<PostProperty />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/:id" element={<BlogDetail />} />
        <Route path="/login" element={<PublicLogin />} />
        <Route
          path="/profile"
          element={
            <PublicProtectedRoute>
              <Profile />
            </PublicProtectedRoute>
          }
        />
        <Route
          path="/profile-settings"
          element={
            <PublicProtectedRoute>
              <ProfileSettings />
            </PublicProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PublicAuthProvider>
  )
}

// ─── Global handler สำหรับ query share=token จาก Cloud Functions ──────────────
function ShareRedirectHandler({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const shareToken = params.get('share')
    if (shareToken) {
      navigate(`/share/${encodeURIComponent(shareToken)}`, { replace: true })
    }
  }, [location.search, navigate])

  return children
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HelmetProvider>
      <SearchProvider>
        <ShareRedirectHandler>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              {/* ── Admin routes (ไม่ถูก maintenanceMode บล็อก) ── */}
              <Route
                path="/sps-internal-admin/*"
                element={
                  <AdminAuthProvider>
                    <Routes>
                      <Route path="login" element={<Login />} />
                      <Route
                        path="*"
                        element={
                          <AdminProtectedRoute>
                            <AdminLayout />
                          </AdminProtectedRoute>
                        }
                      >
                        <Route index element={<Dashboard />} />
                        <Route path="properties" element={<PropertyListPage />} />
                        <Route path="properties/new" element={<PropertyForm />} />
                        <Route path="properties/edit/:id" element={<PropertyForm />} />
                        <Route path="hero-slides" element={<HeroSlidesAdmin />} />
                        <Route path="homepage-sections" element={<HomepageSectionsAdmin />} />
                        <Route path="popular-locations" element={<PopularLocationsAdmin />} />
                        <Route path="pending-properties" element={<PendingProperties />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="my-properties" element={<MyProperties />} />
                        <Route path="leads" element={<LeadsInbox />} />
                        <Route path="loan-requests" element={<AdminLoanRequests />} />
                        <Route path="activities" element={<ActivityLogsPage />} />
                        <Route path="blogs" element={<AdminBlogs />} />
                      </Route>
                    </Routes>
                  </AdminAuthProvider>
                }
              />

              {/* ── Public routes (ครอบด้วย maintenance guard) ── */}
              <Route path="/*" element={<PublicRoutesWrapper />} />
            </Routes>
          </Suspense>
        </ShareRedirectHandler>
      </SearchProvider>
    </HelmetProvider>
  )
}
