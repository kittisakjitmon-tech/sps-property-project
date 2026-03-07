import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { formatPrice } from '../lib/priceFormat'
import { loadLongdoMap } from '../lib/longdoMapLoader'

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

    // เมื่อแตะ/คลิกมุด → ไปหน้ารายละเอียดทันที (รองรับมือถือ)
    const unbindOverlayClick = map.Event?.bind?.('overlayClick', (overlay) => {
      const entry = markersRef.current.find((e) => e.marker === overlay)
      if (entry?.propertyId) {
        window.location.href = `/properties/${entry.propertyId}`
      }
    })

    propertiesWithCoords.forEach((property) => {
      if (disposed) return
      const lon = Number(property.lng)
      const lat = Number(property.lat)
      const priceText = formatPrice(property.price, property.isRental, property.showPrice)
      const locationText = property.location
        ? `${property.location.district || ''}, ${property.location.province || ''}`.trim()
        : ''
      const detailUrl = `/properties/${property.id}`
      // ปุ่มใหญ่ ง่ายต่อการแตะบนมือถือ: min-height 44px, touch-action: manipulation
      const infoContent = `
        <div style="min-width: 200px; padding: 10px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">
            ${(property.title || 'ทรัพย์สิน').replace(/</g, '&lt;')}
          </h3>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #dc2626;">
            ${priceText}
          </p>
          ${locationText ? `<p style="margin: 4px 0; font-size: 14px; color: #64748b;">📍 ${locationText}</p>` : ''}
          ${property.bedrooms ? `<p style="margin: 4px 0; font-size: 14px; color: #64748b;">🛏️ ${property.bedrooms} ห้องนอน</p>` : ''}
          <a href="${detailUrl}" style="display: block; margin-top: 12px; padding: 12px 16px; min-height: 44px; box-sizing: border-box; background: #fbbf24; color: #78350f; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; text-align: center; touch-action: manipulation; -webkit-tap-highlight-color: transparent;">
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
      markersRef.current.push({ marker, propertyId: property.id })
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
      if (typeof unbindOverlayClick === 'function') unbindOverlayClick()
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
