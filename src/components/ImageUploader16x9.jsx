import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { compressImage } from '../lib/imageCompressor'

/**
 * Image Uploader Component with 16:9 Aspect Ratio Enforcement
 * Forces image to be cropped/resized to 16:9 ratio
 */
export default function ImageUploader16x9({
  value = null,
  onChange,
  maxSizeMB = 2,
  className = '',
  disabled = false,
}) {
  const [preview, setPreview] = useState(value)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    setError(null)

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกรูปภาพเท่านั้น (JPG, PNG, etc.)')
      return
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`ขนาดไฟล์เกิน ${maxSizeMB}MB (ปัจจุบัน: ${fileSizeMB.toFixed(2)}MB)`)
      return
    }

    setUploading(true)

    try {
      // Compress image first
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9,
        maxSizeMB,
      })

      // Create image element to check dimensions
      const img = new Image()
      const reader = new FileReader()

      reader.onload = (e) => {
        img.onload = () => {
          // Calculate 16:9 crop
          const targetRatio = 16 / 9
          const currentRatio = img.width / img.height

          let cropWidth = img.width
          let cropHeight = img.height
          let cropX = 0
          let cropY = 0

          if (currentRatio > targetRatio) {
            // Image is wider than 16:9, crop width
            cropWidth = img.height * targetRatio
            cropX = (img.width - cropWidth) / 2
          } else {
            // Image is taller than 16:9, crop height
            cropHeight = img.width / targetRatio
            cropY = (img.height - cropHeight) / 2
          }

          // Create canvas and crop to 16:9
          const canvas = document.createElement('canvas')
          canvas.width = 1920
          canvas.height = 1080
          const ctx = canvas.getContext('2d')

          // Draw cropped image
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            1920,
            1080
          )

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                setError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ')
                setUploading(false)
                return
              }

              // Create File object
              const croppedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })

              // Create preview URL
              const previewUrl = URL.createObjectURL(blob)
              setPreview(previewUrl)
              onChange?.(croppedFile)
              setUploading(false)
            },
            'image/jpeg',
            0.9
          )
        }

        img.onerror = () => {
          setError('ไม่สามารถโหลดรูปภาพได้')
          setUploading(false)
        }

        img.src = e.target.result
      }

      reader.onerror = () => {
        setError('เกิดข้อผิดพลาดในการอ่านไฟล์')
        setUploading(false)
      }

      reader.readAsDataURL(compressed)
    } catch (err) {
      console.error('Error processing image:', err)
      setError('เกิดข้อผิดพลาด: ' + err.message)
      setUploading(false)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  const handleRemove = () => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    setError(null)
    onChange?.(null)
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded transition"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      )}

      {preview ? (
        <div className="relative">
          <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="ลบรูปภาพ"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm font-medium flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังประมวลผล...
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500 text-center">
            สัดส่วนภาพ: 16:9 (อัปโหลดอัตโนมัติ)
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              อัปโหลดรูปภาพ (สัดส่วน 16:9)
            </p>
            <p className="text-xs text-slate-500 mb-4">
              รองรับ JPG, PNG ขนาดไม่เกิน {maxSizeMB}MB
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <Upload className="h-4 w-4" />
              เลือกรูปภาพ
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled || uploading}
              />
            </label>
            {uploading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600">
                <span className="inline-block w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                กำลังประมวลผล...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
