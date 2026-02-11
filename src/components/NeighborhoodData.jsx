import { useState, useEffect, useMemo } from 'react'
import { Factory, ShoppingBag, Hospital, GraduationCap, MapPin, Car } from 'lucide-react'
import { fetchAndCacheNearbyPlaces, getCoordsFromProperty } from '../services/nearbyPlacesService'

const TYPE_ICONS = {
  hospital: Hospital,
  education: GraduationCap,
  mall: ShoppingBag,
  industrial: Factory,
}

const TYPE_ORDER = ['industrial', 'mall', 'hospital', 'education']

const TYPE_TITLES = {
  industrial: 'นิคมอุตสาหกรรม',
  mall: 'ห้างสรรพสินค้า',
  hospital: 'โรงพยาบาล',
  education: 'การศึกษา',
}

export default function NeighborhoodData({ property }) {
  const [places, setPlaces] = useState(property?.nearbyPlaces || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const coords = getCoordsFromProperty(property || {})
  const hasMapUrl = !!(property?.mapUrl)
  const hasCoords = !!coords

  useEffect(() => {
    if (!property) return
    if (property.nearbyPlaces && Array.isArray(property.nearbyPlaces) && property.nearbyPlaces.length > 0) {
      setPlaces(property.nearbyPlaces)
      return
    }
    if (!coords) return

    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAndCacheNearbyPlaces({ ...property, lat: coords.lat, lng: coords.lng })
      .then((result) => {
        if (!cancelled) setPlaces(result)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'โหลดข้อมูลไม่สำเร็จ')
          setPlaces([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [property?.id, coords?.lat, coords?.lng, property?.nearbyPlaces?.length])

  const groupedPlaces = useMemo(() => {
    const groups = {
      industrial: [],
      mall: [],
      hospital: [],
      education: [],
    }
    for (const place of places || []) {
      const type = place.type === 'shopping' ? 'mall' : place.type === 'school' ? 'education' : place.type
      if (groups[type]) groups[type].push({ ...place, type })
    }
    return groups
  }, [places])

  // Fallback: ไม่มีลิงก์แผนที่
  if (!hasMapUrl) {
    return (
      <div className="bg-slate-100 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4">สถานที่สำคัญใกล้เคียง</h3>
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <MapPin className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">ยังไม่มี Map</p>
          <p className="text-xs mt-1">ข้อมูลสถานที่สำคัญจะปรากฏขึ้นเมื่อระบุพิกัดแผนที่</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-blue-900 mb-4">สถานที่สำคัญใกล้เคียง</h3>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-3" />
          <p className="text-sm">กำลังค้นหาสถานที่ใกล้เคียง...</p>
        </div>
      ) : error ? (
        <div className="py-6 text-center text-slate-500 text-sm">{error}</div>
      ) : !hasCoords ? (
        <div className="py-6 text-center text-slate-500 text-sm">
          ข้อมูลสถานที่สำคัญจะปรากฏขึ้นเมื่อระบุพิกัดแผนที่
          <br />
          <span className="text-xs">ตรวจสอบจากแผนที่</span>
        </div>
      ) : places.length > 0 ? (
        <div className="space-y-4">
          {TYPE_ORDER.filter((type) => groupedPlaces[type].length > 0).map((type) => {
            const Icon = TYPE_ICONS[type] || MapPin
            return (
              <div key={type} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-blue-900" />
                  </div>
                  <h4 className="font-semibold text-blue-900">{TYPE_TITLES[type]}</h4>
                </div>
                <div className="space-y-2">
                  {groupedPlaces[type].map((place, index) => (
                    <div key={`${place.name}-${index}`} className="rounded-lg bg-white border border-slate-100 p-3">
                      <p className="text-sm font-medium text-slate-800">
                        {place.name} - {place.distanceText || 'ตรวจสอบจากแผนที่'} ({place.durationText || 'ตรวจสอบจากแผนที่'})
                      </p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Car className="h-3.5 w-3.5" />
                        <span>โหมดขับรถ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-slate-500 text-sm">
          ข้อมูลสถานที่สำคัญจะปรากฏขึ้นเมื่อระบุพิกัดแผนที่
          <br />
          <span className="text-xs">ตรวจสอบจากแผนที่</span>
        </div>
      )}
    </div>
  )
}
