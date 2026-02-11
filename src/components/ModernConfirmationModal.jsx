import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Modern Confirmation Modal - ป๊อปอัปยืนยันที่ทันสมัยแทน window.confirm()
 * 
 * @param {boolean} isOpen - ควบคุมการแสดงผล
 * @param {function} onClose - ฟังก์ชันเมื่อกดปิดหรือยกเลิก
 * @param {function} onConfirm - ฟังก์ชันเมื่อกดยืนยัน
 * @param {string} title - หัวข้อป๊อปอัป
 * @param {string|ReactNode} message - ข้อความยืนยัน
 * @param {string} confirmText - ข้อความปุ่มยืนยัน (default: 'ลบ')
 * @param {string} cancelText - ข้อความปุ่มยกเลิก (default: 'ยกเลิก')
 * @param {boolean} isDanger - ถ้า true ปุ่มยืนยันเป็นสีแดง (default: true)
 * @param {string} variant - รูปแบบไอคอน: 'delete' | 'warning' (default: 'delete')
 */
export default function ModernConfirmationModal({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'ยืนยันการดำเนินการ',
  message = 'คุณแน่ใจหรือไม่ว่าต้องการดำเนินการนี้?',
  confirmText = 'ลบ',
  cancelText = 'ยกเลิก',
  isDanger = true,
  variant = 'delete',
}) {
  // ป้องกันการ scroll background เมื่อเปิด modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // ปิด modal เมื่อกด Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  const handleConfirm = () => {
    onConfirm?.()
    onClose?.()
  }

  // เลือกไอคอนตาม variant
  const IconComponent = variant === 'warning' ? AlertTriangle : Trash2
  const iconColorClass = isDanger ? 'text-red-600' : 'text-amber-600'
  const iconBgClass = isDanger ? 'bg-red-100' : 'bg-amber-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300"
      onClick={handleOverlayClick}
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl transform transition-all duration-300"
        style={{ animation: 'scaleIn 0.3s ease-out' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon Header */}
          <div className="flex justify-center mb-6">
            <div className={`${iconBgClass} p-4 rounded-full`}>
              <IconComponent className={`w-12 h-12 ${iconColorClass}`} strokeWidth={2} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {title}
          </h2>

          {/* Message */}
          <div className="text-center text-gray-600 mb-8 leading-relaxed">
            {message}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              {cancelText}
            </button>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              className={`flex-1 px-6 py-3.5 font-medium rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
