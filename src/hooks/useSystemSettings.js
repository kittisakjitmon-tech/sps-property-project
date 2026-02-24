import { useState, useEffect } from 'react'
import { getSystemSettingsSnapshot } from '../lib/firestore'

const DEFAULT_SETTINGS = {
    siteName: 'SPS Property Solution',
    siteDescription: '',
    contactEmail: '',
    contactPhone: '',
    maintenanceMode: false,
    allowPublicRegistration: true,
    maxPropertiesPerUser: 10,
    autoApproveProperties: false,
}

/**
 * useSystemSettings — อ่านค่า system_settings จาก Firestore แบบ realtime
 * ใช้ใน component ทั่วไปที่ต้องอ่าน setting (ไม่ใช่แก้ไข)
 */
export function useSystemSettings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = getSystemSettingsSnapshot((data) => {
            setSettings({ ...DEFAULT_SETTINGS, ...data })
            setLoading(false)
        })
        return () => unsub()
    }, [])

    return { settings, loading }
}
