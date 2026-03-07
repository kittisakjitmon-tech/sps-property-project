import { useState, useEffect } from 'react'
import { getSystemSettingsSnapshot } from '../lib/firestore'

const CACHE_KEY = 'sps_system_settings'

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
 * พร้อมระบบ Cache ใน localStorage เพื่อความรวดเร็วในการโหลดครั้งถัดไป
 */
export function useSystemSettings() {
    // โหลดค่าจาก cache ก่อนเพื่อความเร็ว (Optimistic)
    const [settings, setSettings] = useState(() => {
        const cached = localStorage.getItem(CACHE_KEY)
        return cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS
    })
    
    // ถ้ามี cache แล้วให้ loading เป็น false ทันทีเพื่อแสดงหน้าเว็บ
    const [loading, setLoading] = useState(!localStorage.getItem(CACHE_KEY))

    useEffect(() => {
        const unsub = getSystemSettingsSnapshot((data) => {
            const newSettings = { ...DEFAULT_SETTINGS, ...data }
            setSettings(newSettings)
            setLoading(false)
            // เก็บลง cache สำหรับการเข้าครั้งหน้า
            localStorage.setItem(CACHE_KEY, JSON.stringify(newSettings))
        })
        return () => unsub()
    }, [])

    return { settings, loading }
}
