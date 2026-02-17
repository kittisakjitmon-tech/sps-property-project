import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadGoogleMapsApi } from '../lib/googleMapsLoader'

export default function MapPicker({ lat, lng, onLocationSelect, className = '' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapLoadError, setMapLoadError] = useState('')

  useEffect(() => {
    let mounted = true
    loadGoogleMapsApi()
      .then(() => {
        if (!mounted) return
        setMapLoadError('')
        setIsMapReady(true)
      })
      .catch((error) => {
        if (!mounted) return
        console.error('MapPicker: failed to load Google Maps API', error)
        setMapLoadError('ไม่สามารถโหลด Google Maps ได้')
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapRef.current) return

    const initialLat = lat != null && lat !== '' ? Number(lat) : 13.7563 // Bangkok default
    const initialLng = lng != null && lng !== '' ? Number(lng) : 100.5018

    // Initialize map
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: (lat != null && lat !== '' && lng != null && lng !== '') ? 15 : 10,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map

    // Create marker if coordinates exist
    const numLat = lat != null && lat !== '' ? Number(lat) : null
    const numLng = lng != null && lng !== '' ? Number(lng) : null
    if (numLat != null && numLng != null && !isNaN(numLat) && !isNaN(numLng)) {
      const marker = new window.google.maps.Marker({
        position: { lat: numLat, lng: numLng },
        map,
        draggable: true,
        title: 'คลิกเพื่อย้ายตำแหน่ง',
      })
      markerRef.current = marker

      // Update coordinates when marker is dragged
      marker.addListener('dragend', () => {
        const position = marker.getPosition()
        if (onLocationSelect) {
          onLocationSelect({
            lat: position.lat(),
            lng: position.lng(),
          })
        }
      })
    }

    // Add click listener to map
    map.addListener('click', (e) => {
      const clickedLat = e.latLng.lat()
      const clickedLng = e.latLng.lng()

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }

      // Create new marker at clicked position
      const marker = new window.google.maps.Marker({
        position: { lat: clickedLat, lng: clickedLng },
        map,
        draggable: true,
        title: 'คลิกเพื่อย้ายตำแหน่ง',
      })
      markerRef.current = marker

      // Update coordinates
      if (onLocationSelect) {
        onLocationSelect({
          lat: clickedLat,
          lng: clickedLng,
        })
      }

      // Update marker position on drag
      marker.addListener('dragend', () => {
        const position = marker.getPosition()
        if (onLocationSelect) {
          onLocationSelect({
            lat: position.lat(),
            lng: position.lng(),
          })
        }
      })
    })

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
    }
  }, [isMapReady, lat, lng, onLocationSelect])

  // Update marker position when lat/lng changes externally
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !markerRef.current) return
    const numLat = lat != null && lat !== '' ? Number(lat) : null
    const numLng = lng != null && lng !== '' ? Number(lng) : null
    if (numLat != null && numLng != null && !isNaN(numLat) && !isNaN(numLng)) {
      const newPosition = new window.google.maps.LatLng(numLat, numLng)
      markerRef.current.setPosition(newPosition)
      mapInstanceRef.current.setCenter(newPosition)
    }
  }, [lat, lng, isMapReady])

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
          <p className="text-slate-600">กำลังโหลดแผนที่...</p>
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
