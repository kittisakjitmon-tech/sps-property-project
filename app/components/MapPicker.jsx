import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadLongdoMap } from '../lib/longdoMapLoader'

export default function MapPicker({ lat, lng, onLocationSelect, className = '' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const onLocationSelectRef = useRef(onLocationSelect)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapLoadError, setMapLoadError] = useState('')

  onLocationSelectRef.current = onLocationSelect

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
        console.error('MapPicker: failed to load Longdo Map API', error)
        setMapLoadError('ไม่สามารถโหลดแผนที่ได้')
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return
    const longdo = window.longdo

    const initialLat = lat != null && lat !== '' ? Number(lat) : 13.7563
    const initialLng = lng != null && lng !== '' ? Number(lng) : 100.5018
    const hasInitial = lat != null && lat !== '' && lng != null && lng !== ''

    const map = new longdo.Map({
      placeholder: mapRef.current,
      language: 'th',
      lastView: false,
      location: { lon: initialLng, lat: initialLat },
      zoom: hasInitial ? 15 : 10,
    })
    mapInstanceRef.current = map

    const addOrUpdateMarker = (lon, lat) => {
      if (markerRef.current) {
        map.Overlays.remove(markerRef.current)
      }
      const marker = new longdo.Marker(
        { lon, lat },
        {
          title: 'คลิกเพื่อย้ายตำแหน่ง',
          draggable: true,
          clickable: true,
        }
      )
      map.Overlays.add(marker)
      markerRef.current = marker
    }

    const handleOverlayDrag = (overlay) => {
      if (overlay !== markerRef.current) return
      const loc = overlay.location()
      if (loc && onLocationSelectRef.current) {
        onLocationSelectRef.current({ lat: loc.lat, lng: loc.lon })
      }
    }

    const handleMapClick = (point) => {
      const loc = map.location(point)
      if (!loc) return
      addOrUpdateMarker(loc.lon, loc.lat)
      if (onLocationSelectRef.current) {
        onLocationSelectRef.current({ lat: loc.lat, lng: loc.lon })
      }
    }

    map.Event.bind('overlayDrag', handleOverlayDrag)
    map.Event.bind('click', handleMapClick)

    if (hasInitial && !isNaN(initialLat) && !isNaN(initialLng)) {
      addOrUpdateMarker(initialLng, initialLat)
    }

    return () => {
      map.Event.unbind('overlayDrag', handleOverlayDrag)
      map.Event.unbind('click', handleMapClick)
      if (markerRef.current) {
        map.Overlays.remove(markerRef.current)
        markerRef.current = null
      }
      map.Overlays.clear()
      mapInstanceRef.current = null
    }
  }, [isMapReady])

  // อัปเดตเฉพาะตำแหน่งหมุดและมุมมองเมื่อ lat/lng เปลี่ยน (ไม่สร้างแผนที่ใหม่ – ลดการโหลด tile ซ้ำ)
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return
    const numLat = lat != null && lat !== '' ? Number(lat) : null
    const numLng = lng != null && lng !== '' ? Number(lng) : null
    if (numLat == null || numLng == null || isNaN(numLat) || isNaN(numLng)) return
    const map = mapInstanceRef.current
    const longdo = window.longdo
    if (markerRef.current) {
      map.Overlays.remove(markerRef.current)
    }
    const marker = new longdo.Marker(
      { lon: numLng, lat: numLat },
      { title: 'คลิกเพื่อย้ายตำแหน่ง', draggable: true, clickable: true }
    )
    map.Overlays.add(marker)
    markerRef.current = marker
    map.location({ lon: numLng, lat: numLat }, false)
  }, [isMapReady, lat, lng])

  if (mapLoadError) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: '400px' }}>
        <div className="text-center px-4">
          <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-700">{mapLoadError}</p>
        </div>
      </div>
    )
  }

  if (!isMapReady) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: '400px' }}>
        <div className="text-center">
          <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">กำลังโหลดแผนที่…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <div ref={mapRef} style={{ width: '100%', height: '400px' }} />
      <div className="bg-slate-50 px-4 py-2 text-sm text-slate-600 border-t border-slate-200">
        💡 คลิกบนแผนที่เพื่อเลือกตำแหน่ง หรือลากหมุดเพื่อย้ายตำแหน่ง
      </div>
    </div>
  )
}
