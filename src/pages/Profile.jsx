import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserPropertiesSnapshot, getPendingPropertiesSnapshot } from '../lib/firestore'
import { getUserById, updateUser } from '../lib/users'
import PropertyCard from '../components/PropertyCard'
import PageLayout from '../components/PageLayout'
import {
  User,
  Edit,
  Plus,
  FileText,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react'

const STATUS_CONFIG = {
  pending: {
    label: 'รออนุมัติ',
    color: 'bg-orange-100 text-orange-900 border-orange-300',
    icon: Clock,
  },
  active: {
    label: 'อนุมัติแล้ว',
    color: 'bg-green-100 text-green-900 border-green-300',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'ไม่อนุมัติ',
    color: 'bg-red-100 text-red-900 border-red-300',
    icon: XCircle,
  },
  available: {
    label: 'ว่าง',
    color: 'bg-blue-100 text-blue-900 border-blue-300',
    icon: CheckCircle2,
  },
}

function StatusBadge({ status, rejectionReason }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${config.color} text-sm font-semibold`}>
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
      {status === 'rejected' && rejectionReason && (
        <p className="text-xs text-red-600 max-w-[200px] text-right">
          {rejectionReason}
        </p>
      )}
    </div>
  )
}

export default function Profile() {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [properties, setProperties] = useState([])
  const [pendingProperties, setPendingProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '095 552 0801',
    lineId: '',
  })

  useEffect(() => {
    if (!user) {
      // Redirect to login but preserve intended destination
      navigate('/admin/login', { state: { from: { pathname: '/profile' } } })
      return
    }

    // Load user data from users collection
    const loadUserData = async () => {
      try {
        const data = await getUserById(user.uid)
        if (data) {
          setUserData(data)
          setProfileForm({
            name: data.name || user.email?.split('@')[0] || '',
            phone: data.phone || '095 552 0801',
            lineId: data.lineId || '',
          })
        } else {
          // Fallback to email
          setProfileForm({
            name: user.email?.split('@')[0] || '',
            phone: '095 552 0801',
            lineId: '',
          })
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }

    loadUserData()

    // Load user properties (approved)
    const unsub1 = getUserPropertiesSnapshot(user.uid, (userProperties) => {
      setProperties(userProperties)
      setLoading(false)
    })

    // Load pending properties
    const unsub2 = getPendingPropertiesSnapshot((allPending) => {
      const myPending = allPending.filter((p) => p.userId === user.uid || p.createdBy === user.uid)
      setPendingProperties(myPending)
    })

    return () => {
      unsub1()
      unsub2()
    }
  }, [user, navigate])

  const handleSaveProfile = async () => {
    try {
      await updateUser(user.uid, {
        name: profileForm.name,
        phone: profileForm.phone,
        lineId: profileForm.lineId,
      })
      setEditingProfile(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  // Combine properties and pending properties for display
  const allMyProperties = [
    ...pendingProperties.map((p) => ({ ...p, isPending: true })),
    ...properties,
  ].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })

  const pendingCount = pendingProperties.length
  const activeCount = properties.filter((p) => p.status === 'available' || p.status === 'active').length
  const rejectedCount = properties.filter((p) => p.status === 'rejected').length
  const totalCount = allMyProperties.length

  if (authLoading || loading) {
    return (
      <PageLayout heroTitle="โปรไฟล์สมาชิก" heroSubtitle="" showHero={false}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-600">กำลังโหลด...</p>
        </div>
      </PageLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <PageLayout heroTitle="โปรไฟล์สมาชิก" heroSubtitle="จัดการประกาศและข้อมูลส่วนตัว" showHero={false}>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Profile Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden sticky top-24">
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center border-4 border-white shadow-lg">
                      <User className="h-10 w-10 text-blue-900" />
                    </div>
                    {!editingProfile && (
                      <button
                        type="button"
                        onClick={() => setEditingProfile(true)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                        title="แก้ไขโปรไฟล์"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-1">
                    {profileForm.name || user.email?.split('@')[0] || 'สมาชิก'}
                  </h2>
                  <p className="text-blue-200 text-sm">{user.email}</p>
                </div>

                {/* Profile Details */}
                <div className="p-6 space-y-4">
                  {editingProfile ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อ</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">เบอร์โทร</label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">LINE ID</label>
                        <input
                          type="text"
                          value={profileForm.lineId}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, lineId: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          className="flex-1 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProfile(false)}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <Phone className="h-5 w-5 text-blue-900 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-600">เบอร์โทร</p>
                          <a
                            href={`tel:${profileForm.phone.replace(/\s/g, '')}`}
                            className="text-sm font-medium text-blue-900 hover:underline"
                          >
                            {profileForm.phone}
                          </a>
                        </div>
                      </div>
                      {profileForm.lineId && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                          <MessageCircle className="h-5 w-5 text-green-600 shrink-0" />
                          <div>
                            <p className="text-xs text-slate-600">LINE ID</p>
                            <p className="text-sm font-medium text-slate-900">{profileForm.lineId}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Stats */}
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-3">สถิติประกาศ</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">รออนุมัติ</span>
                        <span className="text-sm font-bold text-orange-600">{pendingCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">อนุมัติแล้ว</span>
                        <span className="text-sm font-bold text-green-600">{activeCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">ไม่อนุมัติ</span>
                        <span className="text-sm font-bold text-red-600">{rejectedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: My Properties */}
            <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">ประกาศของฉัน</h1>
                  <p className="text-slate-600">
                    จัดการประกาศทั้งหมด ({totalCount} รายการ)
                  </p>
                </div>
                <Link
                  to="/post"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-blue-900 font-semibold rounded-lg hover:bg-yellow-500 transition shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline">ลงประกาศใหม่</span>
                  <span className="sm:hidden">เพิ่ม</span>
                </Link>
              </div>

              {/* Properties List */}
              {allMyProperties.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-md">
                  <FileText className="h-20 w-20 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-bold text-slate-700 mb-2">ยังไม่มีประกาศ</h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    เริ่มต้นด้วยการเพิ่มประกาศแรกของคุณเพื่อให้ผู้ซื้อพบเห็นทรัพย์สินของคุณ
                  </p>
                  <Link
                    to="/post"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-blue-900 font-semibold rounded-lg hover:bg-yellow-500 transition shadow-md"
                  >
                    <Plus className="h-5 w-5" />
                    ลงประกาศใหม่
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {allMyProperties.map((property) => {
                    const isPending = property.isPending || property.status === 'pending'
                    const displayStatus = isPending ? 'pending' : (property.status || 'available')
                    
                    return (
                      <div
                        key={property.id}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition"
                      >
                        <div className="flex flex-col sm:flex-row">
                          {/* Image */}
                          <div className="sm:w-48 h-48 sm:h-auto shrink-0">
                            {property.images && property.images.length > 0 ? (
                              <img
                                src={property.images[0]}
                                alt={property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                <FileText className="h-12 w-12 text-slate-400" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-blue-900 mb-2 line-clamp-2">
                                  {property.title}
                                </h3>
                                <p className="text-yellow-900 font-semibold mb-2">
                                  {property.isRental
                                    ? `${Number(property.price).toLocaleString('th-TH')} บาท/เดือน`
                                    : `${Number(property.price).toLocaleString('th-TH')} บาท`}
                                </p>
                              </div>
                              <StatusBadge
                                status={displayStatus}
                                rejectionReason={property.rejectionReason}
                              />
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                              <span>{property.locationDisplay || '-'}</span>
                              {property.bedrooms > 0 && <span>{property.bedrooms} ห้องนอน</span>}
                              {property.bathrooms > 0 && <span>{property.bathrooms} ห้องน้ำ</span>}
                              {property.area > 0 && <span>{(Number(property.area) / 4).toFixed(1)} ตร.ว.</span>}
                            </div>

                            <div className="flex items-center gap-3">
                              {!isPending && (
                                <Link
                                  to={`/properties/${property.id}`}
                                  className="px-4 py-2 text-sm font-medium text-blue-900 hover:text-blue-700 transition"
                                >
                                  ดูรายละเอียด →
                                </Link>
                              )}
                              {displayStatus !== 'rejected' && !isPending && (
                                <Link
                                  to={`/admin/properties/edit/${property.id}`}
                                  className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-900 rounded-lg hover:bg-blue-100 transition"
                                >
                                  แก้ไข
                                </Link>
                              )}
                              {isPending && (
                                <span className="px-4 py-2 text-sm font-medium text-slate-500">
                                  กำลังรอการอนุมัติจากแอดมิน
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
