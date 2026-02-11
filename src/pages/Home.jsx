import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapPinned, Headphones, BadgeCheck } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import HomeSearch from '../components/HomeSearch'
import DynamicPropertySection from '../components/DynamicPropertySection'
import { getPropertiesSnapshot, getPopularLocationsSnapshot, getHomepageSectionsSnapshot, filterPropertiesByCriteria } from '../lib/firestore'

const whyChooseUs = [
  {
    icon: MapPinned,
    title: 'เชี่ยวชาญพื้นที่',
    description: 'รู้ลึก รู้จริง อมตะซิตี้ ชลบุรี',
  },
  {
    icon: Headphones,
    title: 'ปรึกษาฟรี 24 ชม.',
    description: 'ทีมงานพร้อมให้คำแนะนำตลอดเวลา',
  },
  {
    icon: BadgeCheck,
    title: 'คัดสรรบ้านคุณภาพ',
    description: 'เฉพาะบ้านและคอนโดที่ผ่านการตรวจสอบ',
  },
]

export default function Home() {
  const [properties, setProperties] = useState([])
  const [popularLocations, setPopularLocations] = useState([])
  const [homepageSections, setHomepageSections] = useState([])

  useEffect(() => {
    const unsub = getPropertiesSnapshot(setProperties)
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = getPopularLocationsSnapshot((locations) => {
      const active = locations.filter((loc) => loc.isActive === true)
      setPopularLocations(active)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = getHomepageSectionsSnapshot((sections) => {
      const active = sections.filter((s) => s.isActive === true)
      setHomepageSections(active)
    })
    return () => unsub()
  }, [])

  // Resolve properties for each section (จำกัดสูงสุด 5 รายการต่อ section)
  const sectionPropertiesMap = useMemo(() => {
    const map = {}
    homepageSections.forEach((section) => {
      if (section.type === 'manual' && section.propertyIds?.length > 0) {
        const list = section.propertyIds
          .map((id) => properties.find((p) => p.id === id))
          .filter(Boolean)
          .slice(0, 5) // จำกัดสูงสุด 5 รายการ
        map[section.id] = list
      } else if (section.type === 'query' && section.criteria) {
        const filtered = filterPropertiesByCriteria(properties, section.criteria)
        map[section.id] = filtered.slice(0, 5) // จำกัดสูงสุด 5 รายการ
      } else {
        map[section.id] = []
      }
    })
    return map
  }, [homepageSections, properties])

  // Helper function to build search URL for a location
  const buildLocationPath = (location) => {
    const params = new URLSearchParams()
    // Prefer district if available, otherwise use province
    const searchLocation = location.district || location.province
    if (searchLocation) {
      params.set('location', searchLocation)
    }
    return `/properties?${params.toString()}`
  }

  const available = properties.filter((p) => p.status === 'available')
  const featured = available.filter((p) => p.featured === true).slice(0, 5) // จำกัดสูงสุด 5 รายการ
  const hasSections = homepageSections.length > 0

  return (
    <PageLayout
      heroTitle={
        <>
          ค้นหาบ้านคอนโดใน{' '}
          <span className="text-yellow-400 drop-shadow-sm">อมตะซิตี้ ชลบุรี</span>
        </>
      }
      heroSubtitle="บ้านคอนโดสวย คัดสรรโดยผู้เชี่ยวชาญพื้นที่"
      searchComponent={<HomeSearch />}
      useHeroSlider={true}
      heroExtra={
        <div className="max-w-5xl mx-auto w-full">
          <p className="text-white text-center text-base sm:text-lg font-semibold mb-4 drop-shadow-md">
            ทำไมต้องเลือกเรา
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {whyChooseUs.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center p-5 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/15 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-yellow-400/30 flex items-center justify-center mb-4 border-2 border-yellow-400/50">
                  <Icon className="h-8 w-8 text-yellow-400" />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg sm:text-xl">{title}</h3>
                <p className="text-white/90 text-sm sm:text-base leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      }
      fullHeight={true}
    >

      {/* Dynamic Sections from homepage_sections, or fallback to Featured */}
      {hasSections ? (
        homepageSections.map((section) => (
          <DynamicPropertySection
            key={section.id}
            title={section.title}
            subtitle={section.subtitle}
            properties={sectionPropertiesMap[section.id] || []}
          />
        ))
      ) : featured.length > 0 ? (
        <DynamicPropertySection title="ทรัพย์เด่น" properties={featured} />
      ) : null}

      {/* Popular locations */}
      <section className="py-6 sm:py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-3 tracking-tight">ทำเลยอดฮิต</h2>
          {popularLocations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-lg">ยังไม่มีทำเลยอดฮิต</p>
              <p className="text-sm mt-2">กรุณาเพิ่มทำเลในหน้า Admin</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {popularLocations.map((loc) => {
                const displayName = loc.displayName || loc.district || loc.province
                return (
                  <Link
                    key={loc.id}
                    to={buildLocationPath(loc)}
                    className="group relative aspect-video rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 block"
                  >
                    {loc.imageUrl ? (
                      <img
                        src={loc.imageUrl}
                        alt={displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                        <MapPinned className="h-16 w-16 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="absolute bottom-4 left-4 right-4 text-white text-xl font-bold drop-shadow-lg">
                      {displayName}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
