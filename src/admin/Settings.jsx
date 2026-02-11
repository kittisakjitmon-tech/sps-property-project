import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSystemSettingsSnapshot, updateSystemSettings } from '../lib/firestore'
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  Bell,
  Globe,
  Mail,
  Save,
  Check,
  AlertCircle,
  Info,
} from 'lucide-react'

export default function Settings() {
  const { isSuperAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Settings state
  const [settings, setSettings] = useState({
    siteName: 'SPS Property Solution',
    siteDescription: 'ระบบค้นหาและจัดการอสังหาริมทรัพย์',
    contactEmail: '',
    contactPhone: '',
    maintenanceMode: false,
    allowPublicRegistration: true,
    maxPropertiesPerUser: 10,
    autoApproveProperties: false,
  })

  // Load settings from Firestore
  useEffect(() => {
    if (!isSuperAdmin()) return

    const unsub = getSystemSettingsSnapshot((data) => {
      setSettings({
        siteName: data.siteName || 'SPS Property Solution',
        siteDescription: data.siteDescription || 'ระบบค้นหาและจัดการอสังหาริมทรัพย์',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        maintenanceMode: data.maintenanceMode || false,
        allowPublicRegistration: data.allowPublicRegistration !== false,
        maxPropertiesPerUser: data.maxPropertiesPerUser || 10,
        autoApproveProperties: data.autoApproveProperties || false,
      })
      setInitialLoading(false)
    })

    return () => unsub()
  }, [isSuperAdmin])

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

  const handleSave = async () => {
    setLoading(true)
    setErrorMessage(null)
    
    try {
      await updateSystemSettings(settings)
      setSuccessMessage('บันทึกการตั้งค่าสำเร็จ')
    } catch (error) {
      console.error('Error saving settings:', error)
      setErrorMessage('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isSuperAdmin()) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-red-700">เฉพาะ Super Admin เท่านั้นที่สามารถเข้าถึงหน้านี้ได้</p>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-slate-600">กำลังโหลดการตั้งค่า...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">การตั้งค่าระบบ</h1>
        </div>
        <p className="text-slate-600">จัดการการตั้งค่าระบบและค่าคอนฟิกต่างๆ</p>
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
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">การตั้งค่าทั่วไป</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ชื่อเว็บไซต์
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                placeholder="ชื่อเว็บไซต์"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                คำอธิบายเว็บไซต์
              </label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                placeholder="คำอธิบายเว็บไซต์"
              />
            </div>
          </div>
        </div>

        {/* Contact Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">ข้อมูลติดต่อ</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                อีเมลติดต่อ
              </label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                placeholder="02-XXX-XXXX"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">การตั้งค่าระบบ</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  โหมดบำรุงรักษา
                </label>
                <p className="text-xs text-slate-500">
                  เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าถึงเว็บไซต์ได้
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  อนุญาตให้สมัครสมาชิก
                </label>
                <p className="text-xs text-slate-500">
                  อนุญาตให้ผู้ใช้ทั่วไปสามารถสมัครสมาชิกได้
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowPublicRegistration}
                  onChange={(e) =>
                    setSettings({ ...settings, allowPublicRegistration: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  อนุมัติประกาศอัตโนมัติ
                </label>
                <p className="text-xs text-slate-500">
                  ประกาศใหม่จะถูกอนุมัติอัตโนมัติโดยไม่ต้องรอตรวจสอบ
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoApproveProperties}
                  onChange={(e) =>
                    setSettings({ ...settings, autoApproveProperties: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-900/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                จำนวนประกาศสูงสุดต่อผู้ใช้
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxPropertiesPerUser}
                onChange={(e) =>
                  setSettings({ ...settings, maxPropertiesPerUser: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
              <p className="text-xs text-slate-500 mt-1">
                จำนวนประกาศที่ผู้ใช้แต่ละคนสามารถสร้างได้สูงสุด
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-6 py-4 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">ความปลอดภัย</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-yellow-900 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 mb-1">
                  การตั้งค่าความปลอดภัย
                </p>
                <p className="text-xs text-yellow-800">
                  การตั้งค่าความปลอดภัยจะถูกจัดการผ่าน Firestore Security Rules และ Firebase
                  Authentication
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-5 w-5" />
            {loading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </div>
  )
}
