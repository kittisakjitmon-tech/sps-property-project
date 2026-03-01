import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Building2, Lightbulb, Handshake, TrendingUp,
  MapPin, MapPinned, Phone, MessageCircle, Users, Star, Award, Clock,
  Home as HomeIcon, Wallet, BadgeCheck, Zap, Trophy, CalendarDays, Play,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import PageLayout from '../components/PageLayout'
import HomeSearch from '../components/HomeSearch'
import DynamicPropertySection from '../components/DynamicPropertySection'
import { getPropertiesOnce, getPopularLocationsOnce, getHomepageSectionsOnce, filterPropertiesByCriteria, getFeaturedBlogs } from '../lib/firestore'
import { getCloudinaryThumbUrl } from '../lib/cloudinary'
import { useInView } from '../hooks/useInView'

/** การ์ดทำเลยอดฮิต - placeholder น้ำเงินเป็นพื้นหลังเสมอ รูปทับด้านบนเมื่อโหลดได้ */
const PLACEHOLDER_BG = 'bg-gradient-to-br from-blue-600 to-blue-500'

/** Blog helper functions (module-level เพื่อป้องกัน re-creation ในทุก render) */
function formatBlogDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function extractYouTubeId(url) {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

function getYouTubeThumbnail(url) {
  const videoId = extractYouTubeId(url)
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null
}

function PopularLocationCard({ loc, buildLocationPath, highPriority = false }) {
  const displayName = loc.displayName || loc.district || loc.province
  const rawUrl = loc.imageUrl || loc.image_url || ''
  const imageUrl = typeof rawUrl === 'string' && rawUrl.trim() ? rawUrl.trim() : null
  const [failedImageUrl, setFailedImageUrl] = useState(null)
  const showImage = imageUrl && failedImageUrl !== imageUrl

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
            key={imageUrl}
            src={getCloudinaryThumbUrl(imageUrl)}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
            loading={highPriority ? 'eager' : 'lazy'}
            draggable={false}
            fetchPriority={highPriority ? 'high' : 'auto'}
            onError={() => setFailedImageUrl(imageUrl)}
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

const ANIMATE_VISIBLE = 'opacity-100 translate-y-0'
const ANIMATE_HIDDEN = 'opacity-0 translate-y-6'
const ANIMATE_TRANSITION = 'transition-all duration-600 ease-out'

export default function Home() {
  const [properties, setProperties] = useState([])
  const [popularLocations, setPopularLocations] = useState([])
  const [homepageSections, setHomepageSections] = useState([])
  const [featuredBlogs, setFeaturedBlogs] = useState([])
  const [blogsLoading, setBlogsLoading] = useState(false)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [showBlogs, setShowBlogs] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [showLocations, setShowLocations] = useState(false)

  const [refBlogs, inViewBlogs] = useInView({ rootMargin: '80px', threshold: 0.05 })
  const [refSections, inViewSections] = useInView({ rootMargin: '80px', threshold: 0.05 })
  const [refLocations, inViewLocations] = useInView({ rootMargin: '80px', threshold: 0.05 })

  const fetchedBlogsRef = useRef(false)
  const fetchedSectionsRef = useRef(false)
  const fetchedLocationsRef = useRef(false)

  // โหลด Featured Blogs เมื่อ section เข้าหน้าจอ
  useEffect(() => {
    if (!inViewBlogs || fetchedBlogsRef.current) return
    fetchedBlogsRef.current = true
    setBlogsLoading(true)
    getFeaturedBlogs()
      .then((blogs) => {
        setFeaturedBlogs(blogs || [])
        requestAnimationFrame(() => setShowBlogs(true))
      })
      .catch((e) => console.error('Error loading featured blogs:', e))
      .finally(() => setBlogsLoading(false))
  }, [inViewBlogs])

  // โหลด Dynamic sections (properties + homepage sections) เมื่อ section เข้าหน้าจอ
  useEffect(() => {
    if (!inViewSections || fetchedSectionsRef.current) return
    fetchedSectionsRef.current = true
    setSectionsLoading(true)
    Promise.all([getPropertiesOnce(false), getHomepageSectionsOnce()])
      .then(([allProperties, sections]) => {
        setProperties(allProperties)
        setHomepageSections((sections || []).filter((s) => s.isActive === true))
        requestAnimationFrame(() => setShowSections(true))
      })
      .catch((e) => console.error('Error loading sections:', e))
      .finally(() => setSectionsLoading(false))
  }, [inViewSections])

  // โหลด Popular Locations เมื่อ section เข้าหน้าจอ
  useEffect(() => {
    if (!inViewLocations || fetchedLocationsRef.current) return
    fetchedLocationsRef.current = true
    setLocationsLoading(true)
    getPopularLocationsOnce()
      .then((locations) => {
        const list = (locations || []).filter((loc) => loc.isActive === true)
        setPopularLocations(list)
        requestAnimationFrame(() => setShowLocations(true))
      })
      .catch((e) => console.error('Error loading popular locations:', e))
      .finally(() => setLocationsLoading(false))
  }, [inViewLocations])

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
  const featured = available.filter((p) => p.featured === true).slice(0, 5)
  const hasSections = homepageSections.length > 0

  // ─── Skeleton card สำหรับ property section ขณะโหลด ───────────────────────
  const PropertySectionSkeleton = () => (
    <section className="py-8 bg-slate-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-40 bg-slate-200 rounded-lg mb-6" />
        <div className="flex gap-5 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shrink-0 w-[300px] rounded-2xl bg-slate-200 h-64" />
          ))}
        </div>
      </div>
    </section>
  )

  return (
    <>
      <Helmet>
        <title>SPS Property Solution | บ้านคอนโดสวย อมตะซิตี้ ชลบุรี</title>
        <meta name="description" content="SPS Property Solution บ้านคอนโดสวย อมตะซิตี้ ชลบุรี - ค้นหาบ้านและคอนโดที่ใช่สำหรับคุณในอมตะซิตี้ ชลบุรี" />
        <link rel="canonical" href="https://spspropertysolution.com/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            "name": "SPS Property Solution",
            "image": "https://spspropertysolution.com/icon.png",
            "description": "SPS Property Solution ให้บริการรับฝาก ซื้อ-ขาย-เช่า-จำนอง-ขายฝาก อสังหาริมทรัพย์ทุกประเภทในเขตพื้นที่ ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี กทม.",
            "url": "https://spspropertysolution.com",
            "telephone": "0955520801",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "เมืองชลบุรี",
              "addressRegion": "ชลบุรี",
              "addressCountry": "TH"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "13.3611",
              "longitude": "100.9847"
            },
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday"
              ],
              "opens": "00:00",
              "closes": "23:59"
            }
          })}
        </script>
      </Helmet>
      <PageLayout
        heroTitle={
          <span className="inline-block leading-tight">
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white">
              รวมภาระหนี้{' '}
              <span className="text-yellow-400 drop-shadow-md">ผ่อนบ้านทางเดียว</span>
            </span>
            <span className="block text-lg sm:text-xl font-medium text-blue-200 mt-3">
              อสังหาริมทรัพย์คุณภาพ อมตะซิตี้ · ชลบุรี
            </span>
          </span>
        }
        heroSubtitle=""
        searchComponent={<HomeSearch />}
        useHeroSlider={true}
        heroExtra={
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {serviceHighlights.map((item) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <IconComponent className={`h-4.5 w-4.5 ${item.iconClassName}`} />
                    </div>
                    <p className="text-white text-base sm:text-lg leading-relaxed font-medium">{item.title}</p>
                  </div>
                )
              })}
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
        {/* ── Stats Strip ── */}
        <section className="bg-blue-900 py-8 sm:py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: Building2, value: '500+', label: 'ทรัพย์สินทั้งหมด' },
                { icon: Award, value: '12+', label: 'ปีประสบการณ์' },
                { icon: Users, value: '1,200+', label: 'ลูกค้าที่ไว้วางใจ' },
                { icon: Clock, value: '24/7', label: 'บริการตลอดเวลา' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1">
                      <Icon className="h-5 w-5 text-yellow-400" />
                    </div>
                    <span className="text-3xl sm:text-4xl font-extrabold text-yellow-400 leading-none">
                      {stat.value}
                    </span>
                    <span className="text-sm text-blue-200 font-medium">{stat.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Featured Blogs Section — โหลดเมื่อเลื่อนถึง + fade/slide in */}
        <section ref={refBlogs} className="py-10 bg-white min-h-[320px]">
          {blogsLoading && featuredBlogs.length === 0 ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl bg-slate-100 aspect-video animate-pulse" />
                ))}
              </div>
            </div>
          ) : featuredBlogs.length > 0 ? (
            <div
              className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${ANIMATE_TRANSITION} ${showBlogs ? ANIMATE_VISIBLE : ANIMATE_HIDDEN}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">บทความน่าสนใจ</h2>
                <Link
                  to="/blogs"
                  className="text-blue-900 font-medium hover:underline flex items-center gap-1"
                >
                  ดูทั้งหมด
                  <span>→</span>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredBlogs.map((blog) => {
                  const coverImage = blog.images?.[0]
                  const hasVideo = !!blog.youtubeUrl
                  const thumbnail = coverImage || getYouTubeThumbnail(blog.youtubeUrl)

                  return (
                    <Link
                      key={blog.id}
                      to={`/blogs/${blog.id}`}
                      className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="relative aspect-video bg-slate-100 overflow-hidden">
                        {thumbnail ? (
                          <>
                            <img
                              src={getCloudinaryThumbUrl(thumbnail)}
                              alt={blog.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {hasVideo && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="bg-white/90 rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                  <Play className="h-6 w-6 text-blue-900 fill-blue-900" />
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                            <span className="text-blue-400 text-sm font-medium">ไม่มีรูปภาพ</span>
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition-colors">
                          {blog.title}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                          {blog.content?.substring(0, 100)}...
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{formatBlogDate(blog.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>

        {/* Dynamic Sections — โหลดเมื่อเลื่อนถึง + fade/slide in */}
        <div ref={refSections} className="min-h-[280px]">
          {sectionsLoading && properties.length === 0 && homepageSections.length === 0 ? (
            <>
              <PropertySectionSkeleton />
              <PropertySectionSkeleton />
            </>
          ) : (hasSections || featured.length > 0) ? (
            <div
              className={`${ANIMATE_TRANSITION} ${showSections ? ANIMATE_VISIBLE : ANIMATE_HIDDEN}`}
            >
              {hasSections ? (
                homepageSections.map((section, idx) => (
                  <DynamicPropertySection
                    key={section.id}
                    title={section.title}
                    subtitle={section.subtitle}
                    properties={sectionPropertiesMap[section.id] || []}
                    targetTag={(section.targetTag && section.targetTag.trim()) || section.title || ''}
                    titleColor={section.titleColor || 'text-blue-900'}
                    isHighlighted={section.isHighlighted || false}
                    isBlinking={section.isBlinking || false}
                    sectionIndex={idx}
                  />
                ))
              ) : (
                <DynamicPropertySection title="ทรัพย์เด่น" properties={featured} sectionIndex={0} />
              )}
            </div>
          ) : null}
        </div>

        {/* ── CTA Banner ── */}
        <section className="relative overflow-hidden bg-blue-900 py-12 sm:py-16">
          {/* Subtle dot pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Colour blobs for depth */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-700 rounded-full blur-3xl opacity-40 pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-700 rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              {/* Left: Text */}
              <div className="md:max-w-xl">
                <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  <MessageCircle className="h-3.5 w-3.5" />
                  ปรึกษาฟรี ไม่มีค่าใช้จ่าย
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
                  ต้องการความช่วยเหลือ<br className="hidden sm:block" />ในการหาบ้าน?
                </h2>
                <p className="text-blue-200 text-sm sm:text-base leading-relaxed">
                  ทีมงานผู้เชี่ยวชาญพร้อมให้คำปรึกษา ตอบทุกคำถาม ตลอด 24 ชั่วโมง ไม่มีค่าใช้จ่าย
                </p>
              </div>

              {/* Right: Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 md:shrink-0">
                <a
                  href="tel:0955520801"
                  className="inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-bold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base whitespace-nowrap"
                >
                  <Phone className="h-5 w-5" />
                  095 552 0801
                </a>
                <a
                  href="https://www.facebook.com/houseamata"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-300 text-sm whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" />
                  ติดต่อผ่าน Facebook
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why Choose Us ── */}
        <section className="py-12 sm:py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full mb-3">
                ทำไมต้องเลือก SPS
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                ครบ · เร็ว · เชื่อใจได้
              </h2>
              <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-xl mx-auto">
                เราดูแลทุกขั้นตอนตั้งแต่ค้นหาจนถึงโอนกรรมสิทธิ์
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[
                {
                  Icon: HomeIcon,
                  title: 'ทรัพย์ครบทุกประเภท',
                  desc: 'บ้านเดี่ยว ทาวน์โฮม คอนโด ทั้งขาย เช่า และผ่อนตรง ในพื้นที่อมตะซิตี้และชลบุรี',
                  color: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100',
                },
                {
                  Icon: Wallet,
                  title: 'รับปิดหนี้ รวมหนี้',
                  desc: 'บริการปรึกษาและจัดการภาระหนี้ ผ่อนบ้านทางเดียว ง่าย สบาย ไม่ยุ่งยาก',
                  color: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100',
                },
                {
                  Icon: BadgeCheck,
                  title: 'บริการครบวงจร',
                  desc: 'ดูแลตั้งแต่ต้นจนจบ ทำสัญญา โอนกรรมสิทธิ์ ประสานงานสินเชื่อ',
                  color: 'bg-purple-50 text-purple-700 group-hover:bg-purple-100',
                },
                {
                  Icon: MapPin,
                  title: 'รู้จักทำเลดี',
                  desc: 'ทีมงานชำนาญพื้นที่ ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี และ กทม.',
                  color: 'bg-amber-50 text-amber-700 group-hover:bg-amber-100',
                },
                {
                  Icon: Zap,
                  title: 'ตอบสนองรวดเร็ว',
                  desc: 'ทีมงานพร้อมให้คำปรึกษา 24/7 ผ่านโทรศัพท์และ Facebook',
                  color: 'bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100',
                },
                {
                  Icon: Trophy,
                  title: 'ประสบการณ์กว่า 12 ปี',
                  desc: 'ไว้วางใจโดยลูกค้ากว่า 1,200 ราย ด้วยความซื่อสัตย์และโปร่งใส',
                  color: 'bg-rose-50 text-rose-700 group-hover:bg-rose-100',
                },
              ].map(({ Icon, title, desc, color }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center px-6 py-8 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors duration-300 ${color}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Popular Locations — โหลดเมื่อเลื่อนถึง + fade/slide in ── */}
        <section ref={refLocations} className="py-10 sm:py-12 bg-white min-h-[320px]">
          {locationsLoading && popularLocations.length === 0 ? (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="h-6 w-40 bg-slate-200 rounded-lg mb-6 animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div
              className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${ANIMATE_TRANSITION} ${showLocations ? ANIMATE_VISIBLE : ANIMATE_HIDDEN}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-1 h-7 bg-yellow-400 rounded-full shrink-0" />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ทำเลยอดฮิต</h2>
                    <p className="text-slate-500 text-sm mt-0.5">พื้นที่แนะนำในชลบุรีและใกล้เคียง</p>
                  </div>
                </div>
                <Link
                  to="/properties"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-900 border border-blue-200 bg-blue-50 hover:bg-blue-900 hover:text-white px-4 py-1.5 rounded-full transition-all duration-200 shrink-0"
                >
                  ดูทั้งหมด →
                </Link>
              </div>
              {popularLocations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MapPinned className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-lg">ยังไม่มีทำเลยอดฮิต</p>
                  <p className="text-sm mt-1">กรุณาเพิ่มทำเลในหน้า Admin</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  {popularLocations.map((loc, index) => (
                    <PopularLocationCard
                      key={loc.id}
                      loc={loc}
                      buildLocationPath={buildLocationPath}
                      highPriority={index === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </PageLayout>
    </>
  )
}
