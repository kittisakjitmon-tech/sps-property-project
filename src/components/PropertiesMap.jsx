import { useEffect, useRef, useState } from 'react'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { formatPrice } from '../lib/priceFormat'

export default function PropertiesMap({ properties, className = '' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowsRef = useRef([])
  const clustererRef = useRef(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Filter properties that have coordinates
  const propertiesWithCoords = properties.filter(
    (p) => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng)
  )

  useEffect(() => {
    if (!window.google || !window.google.maps) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval)
          setIsMapReady(true)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }
    setIsMapReady(true)
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapRef.current || propertiesWithCoords.length === 0) return

    // Initialize map centered on Thailand
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 13.7563, lng: 100.5018 }, // Bangkok default
      zoom: 6,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map

    // Clear existing markers and info windows
    markersRef.current.forEach((marker) => marker.setMap(null))
    infoWindowsRef.current.forEach((iw) => iw.close())
    markersRef.current = []
    infoWindowsRef.current = []

    // Create bounds to fit all markers
    const bounds = new window.google.maps.LatLngBounds()

    // Create markers for each property
    const markers = propertiesWithCoords.map((property) => {
      const position = { lat: Number(property.lat), lng: Number(property.lng) }
      bounds.extend(position)

      // Create marker
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: property.title || 'ทรัพย์สิน',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32),
        },
      })

      // Create info window content
      const priceText = formatPrice(property.price, property.isRental, property.showPrice)

      const locationText = property.location
        ? `${property.location.district || ''}, ${property.location.province || ''}`.trim()
        : ''

      const infoContent = `
        <div style="min-width: 200px; padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">
            ${property.title || 'ทรัพย์สิน'}
          </h3>
          <p style="margin: 4px 0; font-size: 18px; font-weight: bold; color: #dc2626;">
            ${priceText}
          </p>
          ${locationText ? `<p style="margin: 4px 0; font-size: 14px; color: #64748b;">📍 ${locationText}</p>` : ''}
          ${property.bedrooms ? `<p style="margin: 4px 0; font-size: 14px; color: #64748b;">🛏️ ${property.bedrooms} ห้องนอน</p>` : ''}
          <a 
            href="/properties/${property.id}" 
            style="display: inline-block; margin-top: 8px; padding: 6px 12px; background: #fbbf24; color: #78350f; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;"
            onmouseover="this.style.background='#f59e0b'"
            onmouseout="this.style.background='#fbbf24'"
          >
            ดูรายละเอียด →
          </a>
        </div>
      `

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
      })

      // Add click listener to marker
      marker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach((iw) => iw.close())
        // Open this info window
        infoWindow.open(map, marker)
      })

      infoWindowsRef.current.push(infoWindow)
      return marker
    })

    markersRef.current = markers

    // Create marker clusterer
    if (window.google && window.google.maps && MarkerClusterer) {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
      }
      clustererRef.current = new MarkerClusterer({ map, markers })
    }

    // Fit bounds to show all markers
    if (propertiesWithCoords.length > 0) {
      map.fitBounds(bounds)
      // Set minimum zoom level to prevent zooming too far out
      map.addListener('bounds_changed', () => {
        if (map.getZoom() > 15) {
          map.setZoom(15)
        }
      })
    } else {
      // If no properties with coordinates, center on Thailand
      map.setCenter({ lat: 13.7563, lng: 100.5018 })
      map.setZoom(6)
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      infoWindowsRef.current.forEach((iw) => iw.close())
      if (clustererRef.current) {
        clustererRef.current.clearMarkers()
      }
    }
  }, [isMapReady, propertiesWithCoords])

  if (!isMapReady) {
    return (
      <div className={`bg-slate-100 rounded-lg flex items-center justify-center ${className}`} style={{ minHeight: '500px' }}>
        <div className="text-center">
          <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600">กำลังโหลดแผนที่...</p>
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
