import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, GripVertical, Check, AlertCircle, MapPin } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CascadingLocationSelect from '../components/CascadingLocationSelect'
import ImageUploader16x9 from '../components/ImageUploader16x9'
import {
  getPopularLocationsSnapshot,
  createPopularLocation,
  updatePopularLocationById,
  deletePopularLocationById,
  uploadPopularLocationImage,
  batchUpdatePopularLocationOrders,
} from '../lib/firestore'
import { compressImage } from '../lib/imageCompressor'

// Sortable Location Card Component
function SortableLocationCard({ location, index, onEdit, onDelete, onToggleStatus, isDeleting }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all ${
        isDragging
          ? 'border-blue-500 shadow-lg scale-105 z-50'
          : location.isActive
          ? 'border-slate-200 hover:border-blue-300'
          : 'border-slate-200 opacity-60'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-lg cursor-grab active:cursor-grabbing shadow-md hover:bg-white transition"
        title="ลากเพื่อสลับลำดับ"
      >
        <GripVertical className="h-5 w-5 text-slate-600" />
      </div>

      {/* Order Badge */}
      <div className="absolute top-2 right-2 z-20 px-3 py-1 bg-blue-900/90 backdrop-blur-sm text-white text-sm font-bold rounded-lg shadow-md">
        #{index + 1}
      </div>

      {/* Status Badge */}
      <div className="absolute top-2 left-12 z-20">
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-lg shadow-md ${
            location.isActive
              ? 'bg-green-500 text-white'
              : 'bg-slate-400 text-white'
          }`}
        >
          {location.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
        </span>
      </div>

      {/* Image */}
      <div className="aspect-video relative bg-slate-100">
        {location.imageUrl ? (
          <img
            src={location.imageUrl}
            alt={location.displayName || location.province}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <MapPin className="h-12 w-12 text-slate-400" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
      </div>

      {/* Content */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <h3 className="font-semibold text-blue-900 mb-1 line-clamp-1">
          {location.displayName || `${location.district || location.province}`}
        </h3>
        <p className="text-xs text-slate-600 mb-3">
          {location.province}
          {location.district && ` > ${location.district}`}
          {location.subDistrict && ` > ${location.subDistrict}`}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleStatus(location.id, !location.isActive)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                location.isActive
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
              title={location.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            >
              {location.isActive ? 'เปิด' : 'ปิด'}
            </button>
            <button
              type="button"
              onClick={() => onEdit(location)}
              className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
              title="แก้ไข"
            >
              แก้ไข
            </button>
          </div>
          <button
            type="button"
            onClick={() => onDelete(location.id, location.imageUrl)}
            disabled={isDeleting}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="ลบทำเล"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PopularLocationsAdmin() {
  const [locations, setLocations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [form, setForm] = useState({
    displayName: '',
    province: '',
    district: '',
    subDistrict: '',
    imageFile: null,
    isActive: true,
  })
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const unsub = getPopularLocationsSnapshot((newLocations) => {
      setLocations(newLocations)
    })
    return () => unsub()
  }, [])

  // Auto-hide messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = async (event) => {
    setIsDragging(false)
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = locations.findIndex((loc) => loc.id === active.id)
    const newIndex = locations.findIndex((loc) => loc.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Update local state immediately
    const newLocations = arrayMove(locations, oldIndex, newIndex)
    setLocations(newLocations)

    // Batch update order in Firestore
    try {
      const updates = newLocations.map((loc, index) => ({
        id: loc.id,
        order: index,
      }))
      await batchUpdatePopularLocationOrders(updates)
      setSuccessMessage('สลับลำดับทำเลสำเร็จ')
    } catch (error) {
      console.error('Error updating order:', error)
      setLocations(locations)
      setErrorMessage('เกิดข้อผิดพลาดในการอัปเดตลำดับ: ' + error.message)
    }
  }

  const resetForm = () => {
    setForm({
      displayName: '',
      province: '',
      district: '',
      subDistrict: '',
      imageFile: null,
      isActive: true,
    })
    setEditingLocation(null)
    setShowForm(false)
  }

  const handleEdit = (location) => {
    setEditingLocation(location)
    setForm({
      displayName: location.displayName || '',
      province: location.province || '',
      district: location.district || '',
      subDistrict: location.subDistrict || '',
      imageFile: null,
      isActive: location.isActive ?? true,
    })
    setShowForm(true)
  }

  const handleLocationChange = (location) => {
    setForm((prev) => ({
      ...prev,
      province: location.province || '',
      district: location.district || '',
      subDistrict: location.subDistrict || '',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage(null)

    // Validation
    if (!form.province || !form.district) {
      setErrorMessage('กรุณาเลือกจังหวัดและอำเภอ/เขต')
      return
    }

    if (!form.imageFile && !editingLocation?.imageUrl) {
      setErrorMessage('กรุณาอัปโหลดรูปภาพ')
      return
    }

    setUploading(true)

    try {
      let imageUrl = editingLocation?.imageUrl

      // Upload new image if provided
      if (form.imageFile) {
        imageUrl = await uploadPopularLocationImage(form.imageFile)
      }

      const locationData = {
        displayName: form.displayName.trim() || null,
        province: form.province,
        district: form.district,
        subDistrict: form.subDistrict || null,
        imageUrl,
        isActive: form.isActive,
      }

      if (editingLocation) {
        // Update existing
        await updatePopularLocationById(editingLocation.id, locationData)
        setSuccessMessage('อัปเดตทำเลสำเร็จ')
      } else {
        // Create new
        await createPopularLocation(locationData)
        setSuccessMessage('เพิ่มทำเลสำเร็จ')
      }

      resetForm()
    } catch (error) {
      console.error('Error saving location:', error)
      setErrorMessage('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm('ต้องการลบทำเลนี้หรือไม่?')) return

    setDeletingId(id)
    setErrorMessage(null)

    try {
      await deletePopularLocationById(id, imageUrl)
      setSuccessMessage('ลบทำเลสำเร็จ')
    } catch (error) {
      console.error('Error deleting:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการลบ: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (id, newStatus) => {
    try {
      await updatePopularLocationById(id, { isActive: newStatus })
      setSuccessMessage(newStatus ? 'เปิดใช้งานทำเลสำเร็จ' : 'ปิดใช้งานทำเลสำเร็จ')
    } catch (error) {
      console.error('Error toggling status:', error)
      setErrorMessage('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const activeLocations = locations.filter((loc) => loc.isActive)
  const inactiveLocations = locations.filter((loc) => !loc.isActive)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">จัดการทำเลยอดฮิต</h1>
          <p className="text-slate-600">
            จัดการทำเลที่แสดงในหน้าแรก (เปิดใช้งาน: <span className="font-semibold text-blue-900">{activeLocations.length}</span>)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          disabled={showForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5" />
          เพิ่มทำเล
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-red-100 rounded transition"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-blue-900">
                {editingLocation ? 'แก้ไขทำเล' : 'เพิ่มทำเลใหม่'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ชื่อเรียกทำเล (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="เช่น อมตะซิตี้ ชลบุรี, พัทยา, สยาม"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <p className="mt-1 text-xs text-slate-500">
                  หากไม่ระบุ จะใช้ชื่ออำเภอ/เขตแทน
                </p>
              </div>

              {/* Cascading Location Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  เลือกทำเล <span className="text-red-500">*</span>
                </label>
                <CascadingLocationSelect
                  value={{
                    province: form.province,
                    district: form.district,
                    subDistrict: form.subDistrict,
                  }}
                  onChange={handleLocationChange}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  รูปภาพ (สัดส่วน 16:9) <span className="text-red-500">*</span>
                </label>
                {editingLocation?.imageUrl && !form.imageFile && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-600 mb-2">รูปภาพปัจจุบัน:</p>
                    <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-slate-200 max-w-md">
                      <img
                        src={editingLocation.imageUrl}
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <ImageUploader16x9
                  value={editingLocation?.imageUrl}
                  onChange={(file) => setForm((prev) => ({ ...prev, imageFile: file }))}
                  disabled={uploading}
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
                  />
                  <span className="text-sm font-medium text-slate-700">เปิดใช้งานทันที</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={uploading}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      {editingLocation ? 'อัปเดต' : 'บันทึก'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Locations Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">ทำเลทั้งหมด</h2>
        {locations.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">ยังไม่มีทำเล</p>
            <p className="text-sm">เพิ่มทำเลแรกของคุณได้เลย</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={locations.map((l) => l.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((location, index) => (
                  <SortableLocationCard
                    key={location.id}
                    location={location}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    isDeleting={deletingId === location.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Instructions */}
      {locations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 คำแนะนำ:</strong> ลากไอคอน <GripVertical className="inline h-4 w-4" /> เพื่อสลับลำดับทำเล
            ทำเลที่เปิดใช้งานจะแสดงในหน้าแรกเรียงตามลำดับ
          </p>
        </div>
      )}
    </div>
  )
}
