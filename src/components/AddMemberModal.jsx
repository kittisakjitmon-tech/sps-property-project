import { useState } from 'react'
import { Mail, X, UserPlus, Lock } from 'lucide-react'
import { createUserWithPassword } from '../lib/users'

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'สมาชิก' },
]

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export default function AddMemberModal({ isOpen, onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('member')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const reset = () => {
    setEmail('')
    setPassword('')
    setRole('member')
    setSaving(false)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!normalizedEmail) {
      setError('กรุณากรอกอีเมล')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง')
      return
    }
    if (!password || password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    setSaving(true)
    setError('')
    try {
      await createUserWithPassword({
        email: normalizedEmail,
        password,
        role,
        status: 'active',
      })
      onSuccess?.(`เพิ่มสมาชิก ${normalizedEmail} สำเร็จ`)
      handleClose()
    } catch (err) {
      setError(err?.message || 'ไม่สามารถเพิ่มสมาชิกได้')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="ปิด"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-900" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-900">เพิ่มสมาชิกใหม่</h3>
              <p className="text-sm text-slate-500">สถานะเริ่มต้น: ใช้งานปกติ</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@sps.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    error ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">สิทธิ์การใช้งาน</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่านเริ่มต้น</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    error ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-100'
                  }`}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {saving && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'กำลังเพิ่มสมาชิก...' : 'เพิ่มสมาชิก'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

