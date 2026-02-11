import { useState, useEffect, useCallback } from 'react'
import { X, Upload, Trash2, Image as ImageIcon, GripVertical, Check, AlertCircle } from 'lucide-react'
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
  getHeroSlidesSnapshot,
  createHeroSlide,
  deleteHeroSlideById,
  uploadHeroSlideImage,
  batchUpdateHeroSlideOrders,
} from '../lib/firestore'
import { compressImages } from '../lib/imageCompressor'

const MAX_SLIDES = 6
const MAX_FILE_SIZE_MB = 2

// Sortable Slide Item Component
function SortableSlideItem({ slide, index, onDelete, isDeleting }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

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

      {/* Image */}
      <div className="aspect-video relative bg-slate-100">
        <img
          src={slide.imageUrl}
          alt={`Slide ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
      </div>

      {/* Actions */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            ลำดับที่ {index + 1}
          </span>
          <button
            type="button"
            onClick={() => onDelete(slide.id, slide.imageUrl)}
            disabled={isDeleting}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="ลบสไลด์"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HeroSlidesAdmin() {
  const [slides, setSlides] = useState([])
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const unsub = getHeroSlidesSnapshot((newSlides) => {
      setSlides(newSlides)
    })
    return () => unsub()
  }, [])

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = async (event) => {
    setIsDragging(false)
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = slides.findIndex((slide) => slide.id === active.id)
    const newIndex = slides.findIndex((slide) => slide.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Update local state immediately for better UX
    const newSlides = arrayMove(slides, oldIndex, newIndex)
    setSlides(newSlides)

    // Batch update order in Firestore
    try {
      const updates = newSlides.map((slide, index) => ({
        id: slide.id,
        order: index,
      }))
      await batchUpdateHeroSlideOrders(updates)
      setSuccessMessage('สลับลำดับสไลด์สำเร็จ')
    } catch (error) {
      console.error('Error updating order:', error)
      // Revert on error
      setSlides(slides)
      alert('เกิดข้อผิดพลาดในการอัปเดตลำดับ: ' + error.message)
    }
  }

  const handleFileSelect = async (file) => {
    if (!file) return

    setUploadError(null)

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกรูปภาพเท่านั้น (JPG, PNG, etc.)')
      return
    }

    // Check file size (2MB)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setUploadError(`ขนาดไฟล์เกิน ${MAX_FILE_SIZE_MB}MB (ปัจจุบัน: ${fileSizeMB.toFixed(2)}MB)`)
      return
    }

    // Check limit
    if (slides.length >= MAX_SLIDES) {
      setUploadError(`อัปโหลดได้สูงสุด ${MAX_SLIDES} รูป`)
      return
    }

    setSelectedFile(file)
    setCompressing(true)

    try {
      const compressed = await compressImages([file], {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9,
        maxSizeMB: MAX_FILE_SIZE_MB,
      })
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(compressed[0])
      setSelectedFile(compressed[0])
    } catch (err) {
      console.error('Error compressing:', err)
      setUploadError('เกิดข้อผิดพลาดในการบีบอัดรูปภาพ: ' + err.message)
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)
    } finally {
      setCompressing(false)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((f) => f.type.startsWith('image/'))

      if (imageFile) {
        handleFileSelect(imageFile)
      } else if (files.length > 0) {
        setUploadError('กรุณาลากไฟล์รูปภาพเท่านั้น')
      }
    },
    [slides.length]
  )

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (!preview || !selectedFile) return

    if (slides.length >= MAX_SLIDES) {
      setUploadError(`อัปโหลดได้สูงสุด ${MAX_SLIDES} รูป`)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const imageUrl = await uploadHeroSlideImage(selectedFile)
      const maxOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.order ?? 0)) : -1
      await createHeroSlide({
        imageUrl,
        order: maxOrder + 1,
      })
      setPreview(null)
      setSelectedFile(null)
      setSuccessMessage('อัปโหลดสไลด์สำเร็จ')
    } catch (err) {
      console.error('Error uploading:', err)
      setUploadError('เกิดข้อผิดพลาดในการอัปโหลด: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm('ต้องการลบสไลด์นี้หรือไม่?')) return

    setDeletingId(id)
    setUploadError(null)

    try {
      await deleteHeroSlideById(id, imageUrl)
      setSuccessMessage('ลบสไลด์สำเร็จ')
    } catch (err) {
      console.error('Error deleting:', err)
      setUploadError('เกิดข้อผิดพลาดในการลบ: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const canUpload = slides.length < MAX_SLIDES && !uploading && !compressing

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">จัดการสไลด์หน้าแรก</h1>
        <p className="text-slate-600">
          อัปโหลดได้สูงสุด {MAX_SLIDES} รูป (ปัจจุบัน: <span className="font-semibold text-blue-900">{slides.length}</span>/{MAX_SLIDES})
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{uploadError}</p>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded transition"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      {canUpload && (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 mb-6 transition-all hover:border-blue-400">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`text-center transition-all ${
              isDragging ? 'scale-105 border-blue-500' : ''
            }`}
          >
            {!preview ? (
              <>
                <div className="mb-4">
                  <Upload className="h-12 w-12 mx-auto text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">
                  ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  รองรับไฟล์รูปภาพ (JPG, PNG) ขนาดไม่เกิน {MAX_FILE_SIZE_MB}MB
                </p>
                <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition cursor-pointer">
                  <Upload className="h-5 w-5" />
                  เลือกรูปภาพ
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={uploading || compressing}
                  />
                </label>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-700 mb-2">ตัวอย่างรูปภาพ</p>
                <div className="relative inline-block max-w-2xl">
                  <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-slate-200 shadow-lg">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null)
                        setSelectedFile(null)
                        setUploadError(null)
                      }}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50 transition"
                      title="ยกเลิก"
                    >
                      <X className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null)
                      setSelectedFile(null)
                      setUploadError(null)
                    }}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || compressing}
                    className="px-6 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        กำลังอัปโหลด...
                      </>
                    ) : compressing ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                        กำลังบีบอัด...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        บันทึกสไลด์
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Limit Reached Message */}
      {slides.length >= MAX_SLIDES && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-yellow-800">
            ถึงขีดจำกัดแล้ว ({MAX_SLIDES} รูป) กรุณาลบสไลด์เก่าก่อนเพิ่มใหม่
          </p>
        </div>
      )}

      {/* Slides Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">สไลด์ทั้งหมด</h2>
        {slides.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">ยังไม่มีสไลด์</p>
            <p className="text-sm">อัปโหลดสไลด์แรกของคุณได้เลย</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={slides.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slides.map((slide, index) => (
                  <SortableSlideItem
                    key={slide.id}
                    slide={slide}
                    index={index}
                    onDelete={handleDelete}
                    isDeleting={deletingId === slide.id}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Instructions */}
      {slides.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 คำแนะนำ:</strong> ลากไอคอน <GripVertical className="inline h-4 w-4" /> เพื่อสลับลำดับสไลด์
          </p>
        </div>
      )}
    </div>
  )
}
