import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import {
  getPropertiesSnapshot,
  deletePropertyById,
  togglePropertyStatus,
} from '../lib/firestore'
import { logActivity } from '../services/activityLogger'
import ModernConfirmationModal from '../components/ModernConfirmationModal'
import { useAuth } from '../context/AuthContext'

export default function PropertyListPage() {
  const { user, userRole } = useAuth()
  const currentUser = user ? { email: user.email, role: userRole } : null
  const [properties, setProperties] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  useEffect(() => {
    const unsub = getPropertiesSnapshot(setProperties)
    return () => unsub()
  }, [])

  const handleDeleteClick = (id, title) => {
    setItemToDelete({ id, title })
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeletingId(itemToDelete.id)
    try {
      await deletePropertyById(itemToDelete.id)
      // Activity Log: ลบทรัพย์
      if (currentUser) {
        logActivity({
          action: 'DELETE_PROPERTY',
          target: itemToDelete.title,
          details: 'ลบประกาศและข้อมูลที่เกี่ยวข้อง',
          currentUser,
        })
      }
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('เกิดข้อผิดพลาดในการลบทรัพย์สิน')
    } finally {
      setDeletingId(null)
      setItemToDelete(null)
    }
  }

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setItemToDelete(null)
  }

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await togglePropertyStatus(id, currentStatus)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight">
          จัดการทรัพย์สิน
        </h1>
        <Link
          to="/admin/properties/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          เพิ่มทรัพย์
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-6 py-3 font-medium">รูป</th>
                <th className="px-6 py-3 font-medium">ชื่อประกาศ</th>
                <th className="px-6 py-3 font-medium">ราคา</th>
                <th className="px-6 py-3 font-medium">สถานะ</th>
                <th className="px-6 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const imgs = p.images && p.images.length > 0 ? p.images : []
                const cover = imgs[0]
                const isAvailable = p.status === 'available'
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="w-14 h-14 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                        {cover ? (
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Building2 className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800 line-clamp-2">{p.title}</p>
                      <p className="text-slate-500 text-sm">
                        {p.location?.district}, {p.location?.province}
                      </p>
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {p.isRental
                        ? `${(p.price / 1000).toFixed(0)}K บาท/เดือน`
                        : `${(p.price / 1_000_000)?.toFixed(1) ?? '-'} ล้าน`}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isAvailable ? 'ว่าง' : 'ขายแล้ว/จองแล้ว'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p.id, p.status)}
                          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                          title="เปลี่ยนสถานะ"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <Link
                          to={`/admin/properties/edit/${p.id}`}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="แก้ไข"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(p.id, p.title)}
                          disabled={deletingId === p.id}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {properties.length === 0 && (
          <div className="px-6 py-12 text-center text-slate-500">
            ยังไม่มีรายการทรัพย์สิน
            <div className="mt-4">
              <Link
                to="/admin/properties/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-yellow-900 font-medium hover:bg-yellow-500"
              >
                <Plus className="h-4 w-4" />
                เพิ่มทรัพย์ครั้งแรก
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ModernConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบทรัพย์สิน"
        message={
          itemToDelete ? (
            <>
              คุณต้องการลบ <span className="font-semibold text-gray-900">"{itemToDelete.title}"</span> ใช่หรือไม่?
              <br />
              <span className="text-sm text-red-600 mt-2 block">การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>
            </>
          ) : (
            'คุณแน่ใจหรือไม่?'
          )
        }
        confirmText="ลบทรัพย์สิน"
        cancelText="ยกเลิก"
        isDanger={true}
        variant="delete"
      />
    </div>
  )
}
