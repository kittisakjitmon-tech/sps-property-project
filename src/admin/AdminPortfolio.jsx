import { useState, useEffect, useCallback } from 'react'
import { X, Upload, Trash2, Image as ImageIcon, GripVertical, Check, AlertCircle, Edit2, Camera, Square, CheckSquare } from 'lucide-react'
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
import {
  getPortfolioSnapshot,
  addPortfolioItem,
  deletePortfolioById,
  updatePortfolioById,
  uploadPortfolioImage,
  batchUpdatePortfolioOrders,
} from '../lib/firestore'
import { adminStorage, adminDb } from '../lib/firebase'
import { compressImages } from '../lib/imageCompressor'

const MAX_FILE_SIZE_MB = 5

// Sortable Portfolio Item Component with Selection
function SortablePortfolioItem({ item, index, onDelete, onEdit, isDeleting, isSelected, onSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group border-2 rounded-xl overflow-hidden bg-white shadow-sm transition-all ${
        isDragging ? 'border-blue-500 shadow-lg scale-105' : 'border-slate-200 hover:border-blue-300'
      } ${isSelected ? 'border-red-500 ring-2 ring-red-200' : ''}`}
    >
      {/* Selection Checkbox */}
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className={`absolute top-2 left-2 z-30 p-1.5 rounded-lg transition-all ${
          isSelected 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-white/90 hover:bg-white text-slate-600'
        }`}
        title={isSelected ? 'ยกเลิกเลือก' : 'เลือก'}
      >
        {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
      </button>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-20 p-2 bg-white rounded-lg cursor-grab active:cursor-grabbing shadow-md hover:bg-slate-50 transition"
        title="ลากเพื่อสลับลำดับ"
      >
        <GripVertical className="h-5 w-5 text-slate-600" />
      </div>

      {/* Order Badge */}
      <div className="absolute bottom-14 right-2 z-20 px-2 py-1 bg-blue-900 text-white text-xs font-bold rounded-lg shadow-md">
        #{index + 1}
      </div>

      {/* Image */}
      <div className="aspect-[4/3] relative bg-slate-100">
        <img
          src={item.imageUrl}
          alt={item.title || `Portfolio ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-2 bg-white rounded-lg mx-1 hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
            title="แก้ไข"
          >
            <Edit2 className="h-5 w-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800 truncate text-sm">
              {item.title || `ผลงาน ${index + 1}`}
            </p>
            {item.category && (
              <p className="text-xs text-slate-500">{item.category}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ml-2"
            title="ลบ"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Modal Component
function EditModal({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || '')
  const [category, setCategory] = useState(item?.category || '')
  const [description, setDescription] = useState(item?.description || '')
  const [location, setLocation] = useState(item?.location || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      title,
      category,
      description,
      location,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">แก้ไขข้อมูล</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="เช่น โอนบ้านเดี่ยว ชลบุรี"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">เลือกหมวดหมู่</option>
              <option value="บ้านเดี่ยว">บ้านเดี่ยว</option>
              <option value="คอนโด">คอนโด</option>
              <option value="ทาวน์เฮ้าส์">ทาวน์เฮ้าส์</option>
              <option value="ที่ดิน">ที่ดิน</option>
              <option value="อพาร์ตเมนต์">อพาร์ตเมนต์</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">สถานที่</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="เช่น ชลบุรี, พัทยา"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="คำอธิบายเพิ่มเติม"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Component
export default function AdminPortfolio() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingIds, setDeletingIds] = useState(new Set())
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editItem, setEditItem] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [dragItems, setDragItems] = useState([])
  const [selectMode, setSelectMode] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load portfolio items
  useEffect(() => {
    const unsubscribe = getPortfolioSnapshot((portfolioItems) => {
      setItems(portfolioItems)
      setDragItems(portfolioItems)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validate file types
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setUploadError('กรุณาเลือกรูปภาพเท่านั้น (JPG, PNG, etc.)')
        return
      }
    }

    // Check file sizes before compression
    for (const file of files) {
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > MAX_FILE_SIZE_MB * 2) {
        setUploadError(`ไฟล์ ${file.name} มีขนาดใหญ่เกิน ${MAX_FILE_SIZE_MB * 2}MB`)
        return
      }
    }

    setUploading(true)
    setUploadError('')

    try {
      // Compress all images first
      const compressed = await compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9,
        maxSizeMB: MAX_FILE_SIZE_MB,
      })

      // Upload each compressed image
      for (const file of compressed) {
        const imageUrl = await uploadPortfolioImage(file, adminStorage)
        await addPortfolioItem({
          imageUrl,
          title: '',
          category: '',
          description: '',
          location: '',
        }, adminDb)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadError('อัปโหลดไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [])

  // Handle single delete
  const handleDelete = useCallback(async (id) => {
    if (!confirm('ยืนยันการลบ?')) return
    setDeletingIds(prev => new Set([...prev, id]))
    try {
      await deletePortfolioById(id, adminDb)
    } catch (err) {
      console.error('Delete error:', err)
      alert('ลบไม่สำเร็จ')
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  // Handle batch delete selected
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`ยืนยันการลบ ${selectedIds.size} รูป?`)) return

    setDeletingIds(selectedIds)
    try {
      for (const id of selectedIds) {
        await deletePortfolioById(id, adminDb)
      }
      setSelectedIds(new Set())
      setSelectMode(false)
    } catch (err) {
      console.error('Delete error:', err)
      alert('ลบไม่สำเร็จ')
    } finally {
      setDeletingIds(new Set())
    }
  }, [selectedIds])

  // Toggle selection
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Select all / Deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map(item => item.id)))
    }
  }, [items, selectedIds.size])

  // Handle edit save
  const handleEditSave = useCallback(async (data) => {
    try {
      await updatePortfolioById(editItem.id, data, adminDb)
      setEditItem(null)
    } catch (err) {
      console.error('Update error:', err)
      alert('บันทึกไม่สำเร็จ')
    }
  }, [editItem])

  // Handle drag end
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = dragItems.findIndex(item => item.id === active.id)
    const newIndex = dragItems.findIndex(item => item.id === over.id)
    const newItems = arrayMove(dragItems, oldIndex, newIndex)
    setDragItems(newItems)

    // Update orders in Firestore
    const updates = newItems.map((item, index) => ({
      id: item.id,
      order: index + 1,
    }))
    try {
      await batchUpdatePortfolioOrders(updates, adminDb)
    } catch (err) {
      console.error('Reorder error:', err)
    }
  }, [dragItems])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการผลงาน</h1>
          <p className="text-slate-600 mt-1">
            อัปโหลดรูปผลงานเพื่อแสดงในหน้า Portfolio ({items.length} รูป)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deletingIds.size > 0 || uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5" />
              ลบ {selectedIds.size} รายการ
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (selectMode) {
                setSelectedIds(new Set())
              }
              setSelectMode(!selectMode)
            }}
            disabled={uploading}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition disabled:opacity-50 ${
              selectMode 
                ? 'bg-slate-600 text-white hover:bg-slate-700' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckSquare className="h-5 w-5" />
            {selectMode ? 'ยกเลิกโหมดเลือก' : 'เลือกหลายรายการ'}
          </button>
          <label
            htmlFor="upload-portfolio"
            className={`inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="h-5 w-5" />
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูป'}
          </label>
          <input
            id="upload-portfolio"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{uploadError}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-medium text-blue-800 mb-2">💡 คำแนะนำ</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• ลากเพื่อสลับลำดับการแสดงผล</li>
          <li>• คลิกที่รูปเพื่อแก้ไขข้อมูล</li>
          <li>• ใช้โหมด &quot;เลือกหลายรายการ&quot; เพื่อเลือกและลบทีละหลายรูป</li>
          <li>• ขนาดไฟล์สูงสุด: {MAX_FILE_SIZE_MB}MB ต่อรูป (หลังบีบอัด)</li>
        </ul>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
          <Camera className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">ยังไม่มีผลงาน</h3>
          <p className="text-slate-500 mb-4">เริ่มอัปโหลดรูปผลงานของคุณได้เลย</p>
          <label
            htmlFor="upload-portfolio-empty"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition cursor-pointer ${
              uploading 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Upload className="h-5 w-5" />
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปแรก'}
          </label>
          <input
            id="upload-portfolio-empty"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </div>
      )}

      {/* Select All Bar */}
      {items.length > 0 && selectMode && (
        <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={uploading}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium disabled:opacity-50"
          >
            {selectedIds.size === items.length ? (
              <CheckSquare className="h-5 w-5 text-blue-600" />
            ) : (
              <Square className="h-5 w-5" />
            )}
            เลือกทั้งหมด ({items.length})
          </button>
          <span className="text-sm text-slate-600">
            เลือกแล้ว {selectedIds.size} รายการ
          </span>
        </div>
      )}

      {/* Grid */}
      {items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={dragItems.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {dragItems.map((item, index) => (
                <SortablePortfolioItem
                  key={item.id}
                  item={item}
                  index={index}
                  onDelete={handleDelete}
                  onEdit={setEditItem}
                  isDeleting={deletingIds.has(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Modal */}
      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Upload Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">กำลังอัปโหลด...</h3>
            <p className="text-slate-600">กรุณารอสักครู่</p>
            <p className="text-slate-500 text-sm mt-1">อย่าปิดหน้านี้</p>
          </div>
        </div>
      )}
    </div>
  )
}
