import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminAuthProvider } from './context/AdminAuthContext'

// Admin Pages
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const Dashboard = lazy(() => import('./admin/Dashboard'))
const PropertyListPage = lazy(() => import('./admin/PropertyListPage'))
const AgentPropertiesPage = lazy(() => import('./features/agent/AgentPropertiesPage'))
const AIPropertyPage = lazy(() => import('./features/ai-property/AIPropertyPage'))
const PropertyForm = lazy(() => import('./admin/PropertyForm'))
const LeadsInbox = lazy(() => import('./admin/LeadsInbox'))
const MessengerInbox = lazy(() => import('./admin/MessengerInbox'))
const HeroSlidesAdmin = lazy(() => import('./admin/HeroSlidesAdmin'))
const HomepageSectionsAdmin = lazy(() => import('./admin/HomepageSectionsAdmin'))
const PopularLocationsAdmin = lazy(() => import('./admin/PopularLocationsAdmin'))
const PendingProperties = lazy(() => import('./admin/PendingProperties'))
const UserManagement = lazy(() => import('./admin/UserManagement'))
const AdminLoanRequests = lazy(() => import('./admin/AdminLoanRequests'))
const MyProperties = lazy(() => import('./admin/MyProperties'))
const Settings = lazy(() => import('./admin/Settings'))
const ActivityLogsPage = lazy(() => import('./admin/ActivityLogsPage'))
const Login = lazy(() => import('./admin/Login'))
const AdminBlogs = lazy(() => import('./admin/AdminBlogs'))
const AdminPortfolio = lazy(() => import('./admin/AdminPortfolio'))
const PrivacyPolicy = lazy(() => import('./features/legal/PrivacyPolicy'))
const DataDeletion = lazy(() => import('./features/legal/DataDeletion'))

// ─── Route Loading Fallback ───────────────────────────────────────────────────
function RouteLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
      </div>
      <p className="text-slate-500 text-sm">กำลังโหลด...</p>
    </div>
  )
}

function App() {
  return (
    <AdminAuthProvider>
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Public legal pages (required by Meta app review). */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />

        {/* Public agent catalogue: browsing and local PDF generation only. */}
        <Route path="/agent" element={<AgentPropertiesPage />} />

        {/* Admin Routes */}
        <Route path="/sps-internal-admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<PropertyListPage />} />
          <Route path="ai-property" element={<AIPropertyPage />} />
          <Route path="properties/new" element={<PropertyForm />} />
          <Route path="properties/:id/edit" element={<PropertyForm />} />
          <Route path="property-form" element={<PropertyForm />} />
          <Route path="leads" element={<LeadsInbox />} />
          <Route path="messenger" element={<MessengerInbox />} />
          <Route path="hero-slides" element={<HeroSlidesAdmin />} />
          <Route path="homepage-sections" element={<HomepageSectionsAdmin />} />
          <Route path="popular-locations" element={<PopularLocationsAdmin />} />
          <Route path="pending-properties" element={<PendingProperties />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="loan-requests" element={<AdminLoanRequests />} />
          <Route path="my-properties" element={<MyProperties />} />
          <Route path="blogs" element={<AdminBlogs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activities" element={<ActivityLogsPage />} />
          <Route path="portfolio" element={<AdminPortfolio />} />
        </Route>

        {/* Fallback → Dashboard */}
        <Route path="*" element={<Navigate to="/sps-internal-admin" replace />} />
      </Routes>
    </Suspense>
    </AdminAuthProvider>
  )
}

export default App
