import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Building2, Lightbulb, Handshake, TrendingUp, MapPin, MapPinned } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import HomeSearch from '../components/HomeSearch'
import DynamicPropertySection from '../components/DynamicPropertySection'
import { getPropertiesSnapshot, getPopularLocationsSnapshot, getHomepageSectionsSnapshot, filterPropertiesByCriteria } from '../lib/firestore'

/** การ์ดทำเลยอดฮิต - placeholder น้ำเงินเป็นพื้นหลังเสมอ รูปทับด้านบนเมื่อโหลดได้ */
const PLACEHOLDER_BG = 'bg-gradient-to-br from-blue-600 to-blue-500'

function PopularLocationCard({ loc, buildLocationPath }) {
  const displayName = loc.displayName || loc.district || loc.province
  const rawUrl = loc.imageUrl || loc.image_url || ''
  const imageUrl = typeof rawUrl === 'string' && rawUrl.trim() ? rawUrl.trim() : null
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const imgRef = useRef(null)
  const showImage = imageUrl && !imageFailed
  const imageVisible = showImage && imageLoaded

  // รีเซ็ตเมื่อ URL เปลี่ยน
  useEffect(() => {
    if (!imageUrl) return
    setImageLoaded(false)
    setImageFailed(false)
  }, [imageUrl])

  // จับกรณีรูปโหลดจาก cache แล้ว (onLoad อาจไม่ firing)
  useEffect(() => {
    if (!showImage || !imgRef.current) return
    const img = imgRef.current
    const checkComplete = () => {
      if (img.complete && img.naturalWidth > 0) setImageLoaded(true)
    }
    checkComplete()
    img.addEventListener('load', checkComplete)
    return () => img.removeEventListener('load', checkComplete)
  }, [showImage, imageUrl])

  return (
    <Link
      to={buildLocationPath(loc)}
      className="group relative aspect-video rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 block"
    >
      {/* พื้นหลัง placeholder น้ำเงิน - แสดงเสมอเมื่อรูปยังไม่โหลดหรือโหลดไม่ได้ */}
      <div className={`absolute inset-0 z-0 ${PLACEHOLDER_BG} flex items-center justify-center`}>
        <MapPinned className="h-16 w-16 text-white/40" />
      </div>
      {/* รูปทับด้านบน - z-[1] เมื่อโหลดสำเร็จจะปิด placeholder */}
      {showImage && (
        <div className="absolute inset-0 z-[1] overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt={displayName}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none ${imageVisible ? 'opacity-100' : 'opacity-0'}`}
            loading="eager"
            draggable={false}
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
      <span className="absolute bottom-4 left-4 right-4 text-white text-xl font-bold drop-shadow-lg z-20">
        {displayName} 
      </span>
    </Link>
  )
}

const serviceHighlights = [
  {
    icon: CheckCircle2,
    title: 'รับปิดหนี้ รวมหนี้ ผ่อนทางเดียว',
    iconClassName: 'text-emerald-300',
  },
  {
    icon: Building2,
    title: 'บริการสินเชื่อครบวงจร',
    iconClassName: 'text-blue-200',
  },
  {
    icon: Lightbulb,
    title: 'รับปรึกษาภาระหนี้สินเกินรายได้',
    iconClassName: 'text-amber-300',
  },
  {
    icon: Handshake,
    title: 'บริการครบวงจรทุกขั้นตอน',
    iconClassName: 'text-purple-200',
  },
  {
    icon: TrendingUp,
    title: 'รับนักลงทุนพร้อมบริหารงานเช่า',
    iconClassName: 'text-cyan-200',
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
        <span className="inline-block text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
          รวมภาระหนี้{' '}
          <span className="text-yellow-400 drop-shadow-md">ผ่อนบ้านทางเดียว</span>
        </span>
      }
      heroSubtitle=""
      searchComponent={<HomeSearch />}
      useHeroSlider={true}
      heroExtra={
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {serviceHighlights.map(({ icon: Icon, title, iconClassName }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className={`h-4.5 w-4.5 ${iconClassName}`} />
                </div>
                <p className="text-white text-base sm:text-lg leading-relaxed font-medium">{title}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-300 text-sm">
            <MapPin className="h-4 w-4" />
            <p>พื้นที่ให้บริการ: ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี กทม.</p>
          </div>
        </div>
      }
      searchAfterHeroExtra={true}
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
              {popularLocations.map((loc) => (
                <PopularLocationCard
                  key={loc.id}
                  loc={loc}
                  buildLocationPath={buildLocationPath}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  )
}
