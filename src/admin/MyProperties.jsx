import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPropertiesSnapshot } from '../lib/firestore'
import PropertyCard from '../components/PropertyCard'
import { FileText, Plus } from 'lucide-react'

export default function MyProperties() {
  const { user, isMember } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !isMember()) return

    const unsub = getPropertiesSnapshot((allProperties) => {
      // Filter only properties created by current user
      const myProperties = allProperties.filter((p) => {
        return p.createdBy === user.uid
      })
      setProperties(myProperties)
      setLoading(false)
    })
    return () => unsub()
  }, [user, isMember])

  if (!isMember()) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">เฉพาะสมาชิกเท่านั้นที่สามารถเข้าถึงหน้านี้ได้</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-slate-600">กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  const available = properties.filter((p) => p.status === 'available')
  const pending = properties.filter((p) => p.status === 'pending')
  const sold = properties.filter((p) => p.status === 'sold')
  const reserved = properties.filter((p) => p.status === 'reserved')

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">ประกาศของฉัน</h1>
          <p className="text-slate-600">
            จัดการประกาศทั้งหมด ({properties.length} รายการ)
          </p>
        </div>
        <Link
          to="/admin/properties/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
        >
          <Plus className="h-5 w-5" />
          เพิ่มประกาศใหม่
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">ว่าง</p>
          <p className="text-2xl font-bold text-green-600">{available.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">ติดจอง</p>
          <p className="text-2xl font-bold text-yellow-600">{reserved.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">ขายแล้ว</p>
          <p className="text-2xl font-bold text-blue-600">{sold.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">รออนุมัติ</p>
          <p className="text-2xl font-bold text-orange-600">{pending.length}</p>
        </div>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <p className="text-lg font-medium text-slate-700 mb-2">ยังไม่มีประกาศ</p>
          <p className="text-slate-600 mb-6">เริ่มต้นด้วยการเพิ่มประกาศแรกของคุณ</p>
          <Link
            to="/admin/properties/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
          >
            <Plus className="h-5 w-5" />
            เพิ่มประกาศใหม่
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="relative">
              <PropertyCard property={property} />
              <Link
                to={`/admin/properties/edit/${property.id}`}
                className="absolute inset-0"
                aria-label={`แก้ไข ${property.title}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
