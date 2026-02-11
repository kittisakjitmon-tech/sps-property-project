/**
 * ModernProgressLoader - Overlay แสดงความคืบหน้าแบบ Glassmorphism
 * รองรับทั้งเปอร์เซ็นต์จริง (อัปโหลดไฟล์) และ Simulated (บันทึก Firestore)
 */
export default function ModernProgressLoader({ progress = 0, status = '', subStatus = '' }) {
  const percent = Math.min(100, Math.max(0, Number(progress)))
  const displayPercent = Math.round(percent)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
      role="alert"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Percentage */}
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-blue-900 tabular-nums">{displayPercent}%</p>
          {status && (
            <p className="text-slate-600 mt-2 font-medium">{status}</p>
          )}
          {subStatus && (
            <p className="text-sm text-slate-500 mt-1">{subStatus}</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out relative overflow-hidden progress-loader-bar"
            style={{ width: `${percent}%` }}
          >
            <span className="progress-loader-shine" />
          </div>
        </div>
      </div>

      <style>{`
        .progress-loader-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: progress-loader-shine 1.5s ease-in-out infinite;
        }
        @keyframes progress-loader-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
