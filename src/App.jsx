import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SearchProvider } from './context/SearchContext'
import { PublicAuthProvider } from './context/PublicAuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import PublicProtectedRoute from './components/PublicProtectedRoute'

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

function RouteLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-600">กำลังโหลด...</p>
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <SearchProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
          {/* Admin routes with AdminAuthProvider */}
          <Route
            path="/admin/*"
            element={
              <AdminAuthProvider>
                <Routes>
                  {/* Public: no navbar for admin login */}
                  <Route path="login" element={<Login />} />
                  {/* Admin protected */}
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

          {/* Public routes with PublicAuthProvider */}
          <Route
            path="/*"
            element={
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
                  {/* Catch-all: หน้าที่ไม่พบ -> กลับหน้าแรก */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </PublicAuthProvider>
            }
          />
        </Routes>
        </Suspense>
      </SearchProvider>
    </HelmetProvider>
  )
}
