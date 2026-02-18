import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Building2, Lightbulb, Handshake, TrendingUp,
  MapPin, MapPinned, Phone, MessageCircle, Users, Star, Award, Clock,
} from 'lucide-react'
import PageLayout from '../components/PageLayout'
import HomeSearch from '../components/HomeSearch'
import DynamicPropertySection from '../components/DynamicPropertySection'
import { getPropertiesOnce, getPopularLocationsOnce, getHomepageSectionsOnce, filterPropertiesByCriteria, getFeaturedBlogs } from '../lib/firestore'

/** การ์ดทำเลยอดฮิต - placeholder น้ำเงินเป็นพื้นหลังเสมอ รูปทับด้านบนเมื่อโหลดได้ */
const PLACEHOLDER_BG = 'bg-gradient-to-br from-blue-600 to-blue-500'

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
            src={imageUrl}
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

export default function Home() {
  const [properties, setProperties] = useState([])
  const [popularLocations, setPopularLocations] = useState([])
  const [homepageSections, setHomepageSections] = useState([])
  const [featuredBlogs, setFeaturedBlogs] = useState([])

  useEffect(() => {
    let mounted = true
    const loadHomeData = async () => {
      try {
        const [allProperties, locations, sections, blogs] = await Promise.all([
          getPropertiesOnce(false),
          getPopularLocationsOnce(),
          getHomepageSectionsOnce(),
          getFeaturedBlogs(),
        ])
        if (!mounted) return
        setProperties(allProperties)
        setPopularLocations((locations || []).filter((loc) => loc.isActive === true))
        setHomepageSections((sections || []).filter((s) => s.isActive === true))
        setFeaturedBlogs(blogs || [])
      } catch (error) {
        console.error('Error loading home data:', error)
      }
    }
    loadHomeData()
    return () => {
      mounted = false
    }
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
              { icon: Award,     value: '12+',  label: 'ปีประสบการณ์' },
              { icon: Users,     value: '1,200+', label: 'ลูกค้าที่ไว้วางใจ' },
              { icon: Clock,     value: '24/7', label: 'บริการตลอดเวลา' },
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

      {/* Featured Blogs Section */}
      {featuredBlogs.length > 0 && (
        <section className="py-10 sm:py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                const formatDate = (timestamp) => {
                  if (!timestamp) return ''
                  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
                  return date.toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                }
                const extractYouTubeId = (url) => {
                  if (!url) return null
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
                  const match = url.match(regExp)
                  return match && match[2].length === 11 ? match[2] : null
                }
                const getYouTubeThumbnail = (url) => {
                  const videoId = extractYouTubeId(url)
                  if (!videoId) return null
                  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                }
                const thumbnail = coverImage || getYouTubeThumbnail(blog.youtubeUrl)

                return (
                  <Link
                    key={blog.id}
                    to={`/blogs/${blog.id}`}
                    className="group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative aspect-video bg-slate-200 overflow-hidden">
                      {thumbnail ? (
                        <>
                          <img
                            src={thumbnail}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {hasVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="bg-white/90 rounded-full p-3">
                                <svg className="h-6 w-6 text-blue-900" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                          <span className="text-blue-600 text-sm font-medium">ไม่มีรูปภาพ</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition">
                        {blog.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                        {blog.content?.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(blog.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Sections from homepage_sections, or fallback to Featured */}
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
      ) : featured.length > 0 ? (
        <DynamicPropertySection title="ทรัพย์เด่น" properties={featured} sectionIndex={0} />
      ) : null}

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
                icon: '🏠',
                title: 'ทรัพย์ครบทุกประเภท',
                desc: 'บ้านเดี่ยว ทาวน์โฮม คอนโด ทั้งขาย เช่า และผ่อนตรง ในพื้นที่อมตะซิตี้และชลบุรี',
              },
              {
                icon: '💰',
                title: 'รับปิดหนี้ รวมหนี้',
                desc: 'บริการปรึกษาและจัดการภาระหนี้ ผ่อนบ้านทางเดียว ง่าย สบาย ไม่ยุ่งยาก',
              },
              {
                icon: '🤝',
                title: 'บริการครบวงจร',
                desc: 'ดูแลตั้งแต่ต้นจนจบ ทำสัญญา โอนกรรมสิทธิ์ ประสานงานสินเชื่อ',
              },
              {
                icon: '📍',
                title: 'รู้จักทำเลดี',
                desc: 'ทีมงานชำนาญพื้นที่ ชลบุรี ฉะเชิงเทรา ระยอง ปทุมธานี และ กทม.',
              },
              {
                icon: '⚡',
                title: 'ตอบสนองรวดเร็ว',
                desc: 'ทีมงานพร้อมให้คำปรึกษา 24/7 ผ่านโทรศัพท์และ Facebook',
              },
              {
                icon: '🏆',
                title: 'ประสบการณ์กว่า 12 ปี',
                desc: 'ไว้วางใจโดยลูกค้ากว่า 1,200 ราย ด้วยความซื่อสัตย์และโปร่งใส',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center text-center px-6 py-8 rounded-2xl hover:bg-white hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-5 transition-colors duration-300 text-4xl">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Locations ── */}
      <section className="py-10 sm:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </section>
    </PageLayout>
  )
}
