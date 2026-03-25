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

// SSR-safe localStorage helpers
const getLocalStorageItem = (key) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null
    }
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

const setLocalStorageItem = (key, value) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
    }
    try {
        localStorage.setItem(key, value)
    } catch {
        // Ignore storage errors
    }
}

const removeLocalStorageItem = (key) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
    }
    try {
        localStorage.removeItem(key)
    } catch {
        // Ignore storage errors
    }
}

/**
 * useSystemSettings — อ่านค่า system_settings จาก Firestore แบบ realtime
 * พร้อมระบบ Cache ใน localStorage เพื่อความรวดเร็วในการโหลดครั้งถัดไป
 * SSR-safe: จะ return DEFAULT_SETTINGS บน server-side
 */
export function useSystemSettings() {
    // โหลดค่าจาก cache ก่อนเพื่อความเร็ว (Optimistic) — SSR-safe
    const [settings, setSettings] = useState(() => {
        const cached = getLocalStorageItem(CACHE_KEY)
        if (cached) {
            try {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(cached) }
            } catch {
                removeLocalStorageItem(CACHE_KEY)
            }
        }
        return DEFAULT_SETTINGS
    })

    // ถ้ามี cache แล้วให้ loading เป็น false ทันทีเพื่อแสดงหน้าเว็บ — SSR-safe
    const [loading, setLoading] = useState(() => {
        return !getLocalStorageItem(CACHE_KEY)
    })

    useEffect(() => {
        const unsub = getSystemSettingsSnapshot((data) => {
            const newSettings = { ...DEFAULT_SETTINGS, ...data }
            setSettings(newSettings)
            setLoading(false)
            // เก็บลง cache สำหรับการเข้าครั้งหน้า — SSR-safe
            setLocalStorageItem(CACHE_KEY, JSON.stringify(newSettings))
        })
        return () => unsub()
    }, [])

    return { settings, loading }
}