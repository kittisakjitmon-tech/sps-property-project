/**
 * Longdo Map loader – โหลดสคริปต์ครั้งเดียวและ cache เพื่อลดค่าใช้จ่าย
 *
 * Cache ที่ทำอยู่:
 * - โหลดสคริปต์จาก api.longdo.com แค่ครั้งเดียวต่อ session (longdoLoadingPromise)
 * - ถ้า window.longdo มีอยู่แล้ว (เช่น กลับมาเปิดแผนที่อีก) ไม่โหลดซ้ำ
 * - ไม่ใส่ query cache-bust ให้ browser ใช้ HTTP cache ตาม URL ได้
 *
 * ใช้กับ PropertiesMap และ MapPicker
 */

const LONGDO_SCRIPT_ID = 'longdo-map-sdk'
let longdoLoadingPromise = null

function getApiKey() {
  return import.meta.env.VITE_LONGDO_MAP_KEY
}

export function loadLongdoMap() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window is not available'))
  }
  if (window.longdo && window.longdo.Map) {
    return Promise.resolve(window.longdo)
  }
  if (longdoLoadingPromise) {
    return longdoLoadingPromise
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    longdoLoadingPromise = Promise.reject(new Error('Missing VITE_LONGDO_MAP_KEY'))
    return longdoLoadingPromise
  }

  const existing = document.getElementById(LONGDO_SCRIPT_ID)
  if (existing) {
    if (window.longdo && window.longdo.Map) {
      return Promise.resolve(window.longdo)
    }
    longdoLoadingPromise = new Promise((resolve, reject) => {
      const check = () => {
        if (window.longdo && window.longdo.Map) {
          resolve(window.longdo)
          return
        }
        requestAnimationFrame(check)
      }
      check()
      setTimeout(() => {
        if (!window.longdo?.Map) reject(new Error('Longdo Map script failed to load'))
      }, 15000)
    })
    return longdoLoadingPromise
  }

  longdoLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = LONGDO_SCRIPT_ID
    script.src = `https://api.longdo.com/map/?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.onload = () => {
      if (window.longdo && window.longdo.Map) {
        resolve(window.longdo)
      } else {
        longdoLoadingPromise = null
        reject(new Error('Longdo Map API did not attach to window'))
      }
    }
    script.onerror = () => {
      longdoLoadingPromise = null
      reject(new Error('Failed to load Longdo Map script'))
    }
    document.head.appendChild(script)
  })

  return longdoLoadingPromise
}
