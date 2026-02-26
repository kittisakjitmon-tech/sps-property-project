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
    if (!isMapReady || !mapRef.current || propertiesWithCoords.length === 0) return
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

  if (propertiesWithCoords.length === 0) {
    return (
      <div className={`bg-slate-50 rounded-lg border border-slate-200 p-8 text-center ${className}`}>
        <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">ไม่มีทรัพย์สินที่มีพิกัดแผนที่</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <div ref={mapRef} style={{ width: '100%', height: '500px' }} />
      <div className="bg-slate-50 px-4 py-2 text-sm text-slate-600 border-t border-slate-200">
        📍 แสดง {propertiesWithCoords.length} ทรัพย์สินบนแผนที่
      </div>
    </div>
  )
}
