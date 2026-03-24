import { Wrench } from 'lucide-react'

/**
 * MaintenancePage — แสดงเมื่อ maintenanceMode = true
 * Admin ยังเข้า /sps-internal-admin ได้ตามปกติ
 */
export default function MaintenancePage({ siteName = 'SPS Property Solution' }) {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
            {/* Animated icon */}
            <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full bg-yellow-400/10 border-2 border-yellow-400/30 flex items-center justify-center animate-pulse">
                    <Wrench className="w-10 h-10 text-yellow-400" />
                </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                {siteName}
            </h1>
            <p className="text-xl text-yellow-400 font-semibold mb-4">
                ปิดปรับปรุงระบบชั่วคราว
            </p>
            <p className="text-slate-400 max-w-md leading-relaxed">
                ขออภัยในความไม่สะดวก ระบบอยู่ระหว่างการปรับปรุง
                กรุณากลับมาใหม่ในอีกสักครู่
            </p>

            <div className="mt-10 flex items-center gap-2 text-slate-500 text-sm">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    )
}
