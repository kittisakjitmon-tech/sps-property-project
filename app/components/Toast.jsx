import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

/**
 * Toast — notification popup
 * @param {string}  message   - ข้อความที่ต้องการแสดง
 * @param {boolean} isVisible - toggle แสดง/ซ่อน
 * @param {Function} onClose  - callback เมื่อหมดเวลาหรือปิด
 * @param {number}  duration  - ระยะเวลาแสดง (ms) — default 2500
 */
export default function Toast({ message, isVisible, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [isVisible, onClose, duration])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 px-4 py-3 flex items-center gap-3 min-w-[200px]">
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
        <span className="text-slate-700 text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}
