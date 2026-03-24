import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { formatPrice } from '../lib/priceFormat'
import { loadLongdoMap } from '../lib/longdoMapLoader'
import { getPropertyPath } from '../lib/propertySlug'

export default function PropertiesMap({ properties, className = '' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapLoadError, setMapLoadError] = useState('')

  const propertiesWithCoords = properties.filter(
    (p) => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
  )

  useEffect(() => {
    let mounted = true
    loadLongdoMap()
      .then(() => {
        if (!mounted) return
        setMapLoadError('')
        setIsMapReady(true)
      })
      .catch((error) => {
        if (!mounted) return
        console.error('PropertiesMap: failed to load Longdo Map API', error)
        const msg = error?.message?.includes('VITE_LONGDO_MAP_KEY') || !import.meta.env.VITE_LONGDO_MAP_KEY
          ? 'ไม่สามารถโหลดแผนที่ได้ (กรุณาตั้งค่า VITE_LONGDO_MAP_KEY ใน .env)'
          : 'ไม่สามารถโหลดแผนที่ได้'
        setMapLoadError(msg)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return
    let disposed = false
    const longdo = window.longdo

    const map = mapInstanceRef.current
      ? mapInstanceRef.current
      : new longdo.Map({
          placeholder: mapRef.current,
          language: 'th',
          lastView: false,
          location: { lon: 100.5018, lat: 13.7563 },
          zoom: 6,
        })
    if (!mapInstanceRef.current) mapInstanceRef.current = map

    if (disposed) return
    map.Overlays.clear()
    markersRef.current = []

    // ถ้าไม่มีข้อมูลพิกัด ให้ล้างแผนที่แล้วจบการทำงาน (แต่ยังแสดงตัวแผนที่ว่างไว้)
    if (propertiesWithCoords.length === 0) {
      map.location({ lon: 100.5018, lat: 13.7563 }, false)
      map.zoom(6, false)
      return
    }

    const locationList = propertiesWithCoords.map((p) => ({
      lon: Number(p.lng),
      lat: Number(p.lat),
    }))

    // ให้ Longdo แสดง popup เมื่อคลิกปักหมุดทั้งบน desktop และ mobile โดยไม่ redirect ทันที
    const closePopup = () => {
      console.log('closePopup called')
      try {
        if (map && map.Overlays) {
          // ลอง lastOpenPopup ก่อน
          if (typeof map.Overlays.lastOpenPopup === 'function') {
            const popup = map.Overlays.lastOpenPopup()
            console.log('lastOpenPopup:', popup)
            // ถ้ามี marker ให้ใช้ marker.popup(false) แทน
            if (popup && popup.marker) {
              console.log('popup.marker:', popup.marker)
              if (typeof popup.marker.popup === 'function') {
                popup.marker.popup(false)
                console.log('Called marker.popup(false)')
                return
              }
            }
          }
        }
      } catch (e) {
        console.error('Error closing popup:', e)
      }
    }

    const unbindOverlayClick = map.Event?.bind?.('overlayClick', (overlay) => {
      try {
        if (map && typeof map.pop === 'function') {
          const location = overlay.location ? overlay.location() : { lon: overlay.lon, lat: overlay.lat }
          map.pop(true, location)
        }
      } catch {
        // ป้องกัน error จาก Longdo ภายใน โดยไม่ให้พังทั้งแผนที่
      }
    })

    // Bind popupClose event
    const unbindPopupClose = map.Event?.bind?.('popupClose', () => {
      // Popup ถูกปิดแล้ว
    })

    // ฟังก์ชัน global สำหรับปิด popup (ถูกเรียกจากปุ่ม X ภายใน popup HTML)
    const previousCloseHandler = window.spsCloseMapPopup
    window.spsCloseMapPopup = closePopup

    // Delegate click event สำหรับปุ่มปิด popup ที่อยู่ใน Longdo popup element
    const handlePopupCloseClick = (e) => {
      const target = e.target
      console.log('Click detected:', target, target.dataset)
      if (target.matches('[data-popup-close]') || target.closest('[data-popup-close]')) {
        console.log('Close button clicked')
        closePopup()
      }
    }
    document.addEventListener('click', handlePopupCloseClick)

    // MutationObserver เพื่อหา popup element ที่ Longdo สร้างขึ้นและ bind event โดยตรง
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            console.log('New node added:', node)
            const closeBtn = node.querySelector ? node.querySelector('[data-popup-close]') : null
            if (closeBtn) {
              console.log('Found close button via observer:', closeBtn)
              closeBtn.addEventListener('click', closePopup)
            }
            // หาใน child nodes ด้วย
            if (node.querySelectorAll) {
              node.querySelectorAll('[data-popup-close]').forEach((btn) => {
                btn.addEventListener('click', closePopup)
              })
            }
          }
        })
      })
    })
    observer.observe(mapRef.current, { childList: true, subtree: true })

    propertiesWithCoords.forEach((property) => {
      if (disposed) return
      const lon = Number(property.lng)
      const lat = Number(property.lat)
      const priceText = formatPrice(property.price, property.isRental, property.showPrice)
      const locationText = property.location
        ? `${property.location.district || ''}, ${property.location.province || ''}`.trim()
        : ''
      const detailUrl = getPropertyPath(property)
      const safeTitle = (property.title || 'ทรัพย์สิน').replace(/</g, '&lt;')
      // ปุ่มใหญ่ ง่ายต่อการแตะบนมือถือ: min-height 44px, touch-action: manipulation
      const infoContent = `
        <div style="min-width: 230px; max-width: 280px; padding: 12px 12px 10px; background: #ffffff; border-radius: 14px; box-shadow: 0 10px 30px rgba(15,23,42,0.35); font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.4;">
              ${safeTitle}
            </h3>
            <button type="button" data-popup-close aria-label="ปิด" style="border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 0; margin: 0; line-height: 1; font-size: 14px;">
              ×
            </button>
          </div>
          <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #dc2626;">
            ${priceText}
          </p>
          ${locationText ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">📍 ${locationText}</p>` : ''}
          ${property.bedrooms ? `<p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">🛏️ ${property.bedrooms} ห้องนอน</p>` : ''}
          <a href="${detailUrl}" aria-label="ดูรายละเอียด ${(property.title || 'ทรัพย์สิน').replace(/"/g, '&quot;')}" style="display: block; margin-top: 12px; padding: 12px 16px; min-height: 44px; box-sizing: border-box; background: #fbbf24; color: #78350f; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center; touch-action: manipulation; -webkit-tap-highlight-color: transparent;">
            ดูรายละเอียด →
          </a>
        </div>
      `

      const marker = new longdo.Marker(
        { lon, lat },
        {
          title: property.title || 'ทรัพย์สิน',
          popup: { html: infoContent },
          clickable: true,
        }
      )
      map.Overlays.add(marker)
      markersRef.current.push({ marker, propertyId: property.id, url: detailUrl })
    })

    if (locationList.length > 0 && longdo.Util && longdo.Util.locationBound) {
      try {
        const bound = longdo.Util.locationBound(locationList)
        map.bound(bound, undefined, true)
      } catch {
        map.location({ lon: 100.5018, lat: 13.7563 }, false)
        map.zoom(6, false)
      }
    } else {
      map.location({ lon: 100.5018, lat: 13.7563 }, false)
      map.zoom(6, false)
    }

    return () => {
      disposed = true
      if (typeof unbindOverlayClick === 'function') {
        unbindOverlayClick()
      }
      if (typeof unbindPopupClose === 'function') {
        unbindPopupClose()
      }
      observer.disconnect()
      document.removeEventListener('click', handlePopupCloseClick)
      if (previousCloseHandler) {
        window.spsCloseMapPopup = previousCloseHandler
      } else {
        // eslint-disable-next-line no-param-reassign
        delete window.spsCloseMapPopup
      }
      if (mapInstanceRef.current && mapInstanceRef.current.Overlays) {
        mapInstanceRef.current.Overlays.clear()
      }
      markersRef.current = []
    }
  }, [isMapReady, propertiesWithCoords])

  useEffect(() => {
    return () => {
      mapInstanceRef.current = null
    }
  }, [])

  if (mapLoadError) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center px-4">
          <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-700">{mapLoadError}</p>
        </div>
      </div>
    )
  }

  if (!isMapReady) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center">
          <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">กำลังโหลดแผนที่…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 text-xs font-semibold text-slate-700 pointer-events-auto">
          <MapPin className="h-3 w-3 text-blue-900" />
          {propertiesWithCoords.length > 0 
            ? `พบ ${propertiesWithCoords.length} ตำแหน่งบนแผนที่` 
            : 'ไม่พบพิกัดทรัพย์สินในผลการค้นหานี้'}
        </div>
      </div>
    </div>
  )
}
