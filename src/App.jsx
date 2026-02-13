import { Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { SearchProvider } from './context/SearchContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PageLayout from './components/PageLayout'
import Home from './pages/Home'
import Properties from './pages/Properties'
import PropertyDetail from './pages/PropertyDetail'
import SharePage from './pages/SharePage'
import AdminLayout from './admin/AdminLayout'
import Dashboard from './admin/Dashboard'
import PropertyForm from './admin/PropertyForm'
import LeadsInbox from './admin/LeadsInbox'
import HeroSlidesAdmin from './admin/HeroSlidesAdmin'
import HomepageSectionsAdmin from './admin/HomepageSectionsAdmin'
import PopularLocationsAdmin from './admin/PopularLocationsAdmin'
import PendingProperties from './admin/PendingProperties'
import UserManagement from './admin/UserManagement'
import PropertyListPage from './admin/PropertyListPage'
import AdminLoanRequests from './admin/AdminLoanRequests'
import MyProperties from './admin/MyProperties'
import Settings from './admin/Settings'
import ActivityLogsPage from './admin/ActivityLogsPage'
import Login from './admin/Login'
import Contact from './pages/Contact'
import LoanService from './pages/LoanService'
import PostProperty from './pages/PostProperty'
import Favorites from './pages/Favorites'
import Profile from './pages/Profile'

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SearchProvider>
          <Routes>
              {/* Public: no navbar for admin login */}
              <Route path="/admin/login" element={<Login />} />
              {/* Admin protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
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
              </Route>
              {/* Public site */}
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/share/:id" element={<SharePage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/loan-services" element={<LoanService />} />
              <Route path="/post" element={<PostProperty />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              {/* Catch-all: หน้าที่ไม่พบ -> กลับหน้าแรก */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </SearchProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}
