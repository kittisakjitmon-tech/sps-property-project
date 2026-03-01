import { useEffect, useState, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import { getHeroSlidesOnce } from '../lib/firestore'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1280&q=80&auto=format'

function getSlideImageUrl(slide) {
  return slide?.imageUrl || slide?.image || slide?.url || DEFAULT_IMAGE
}

// ─── Skeleton placeholder (ขนาดเท่ากันกับ hero จริง → ไม่มี layout shift) ───
function HeroSkeleton({ children }) {
  return (
    <section
      className="relative flex items-center justify-center min-h-[85vh]"
      style={{
        backgroundImage: `linear-gradient(rgba(15,23,42,0.8),rgba(15,23,42,0.75)), url("${DEFAULT_IMAGE}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75" />
      <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[85vh] py-16 md:py-20 px-4">
        {children}
      </div>
    </section>
  )
}

export default function HeroSlider({ children, className = '' }) {
  const [slides, setSlides] = useState(null) // null = ยังไม่โหลด
  const preloadedRef = useRef(false)

  useEffect(() => {
    getHeroSlidesOnce()
      .then((list) => {
        const finalSlides = list.length > 0 ? list : [{ id: 'default', imageUrl: DEFAULT_IMAGE, order: 0 }]
        setSlides(finalSlides)
      })
      .catch(() => {
        setSlides([{ id: 'default', imageUrl: DEFAULT_IMAGE, order: 0 }])
      })
  }, [])

  // ยังไม่ได้ข้อมูล → แสดง skeleton (รูป default เป็น background ชั่วคราว — ไม่มี layout shift)
  if (slides === null) {
    return <HeroSkeleton>{children}</HeroSkeleton>
  }

  return (
    <section
      className={`relative min-h-[85vh] flex items-center justify-center ${className}`}
      style={{ minHeight: '85vh' }}
    >
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        effect="fade"
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-white/50 !w-2 !h-2 !mx-1',
          bulletActiveClass: '!bg-yellow-400 !w-6',
        }}
        loop={slides.length > 1}
        className="!absolute !inset-0 !w-full !h-full"
        style={{ height: '100%', minHeight: '85vh' }}
      >
        {slides.map((slide, index) => {
          const imageUrl = getSlideImageUrl(slide)
          return (
            <SwiperSlide key={slide.id} style={{ height: '100%', minHeight: '85vh' }}>
              {/* ใช้ <img> แทน background-image เพื่อให้ browser preload/lazy load ได้ */}
              <img
                src={imageUrl}
                alt=""
                width={1920}
                height={1080}
                className="absolute inset-0 w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                aria-hidden="true"
              />
            </SwiperSlide>
          )
        })}
      </Swiper>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75 z-[1]" />
      {/* Content */}
      <div className="relative z-[2] w-full flex flex-col items-center justify-center min-h-[85vh] py-16 md:py-20 px-4">
        {children}
      </div>
    </section>
  )
}
