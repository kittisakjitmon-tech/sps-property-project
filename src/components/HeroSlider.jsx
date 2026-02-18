import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import { getHeroSlidesOnce } from '../lib/firestore'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920'

function getSlideImageUrl(slide) {
  // รองรับหลายรูปแบบ field เผื่อข้อมูลเก่า/ต่าง version
  return (
    slide?.imageUrl ||
    slide?.image ||
    slide?.url ||
    DEFAULT_IMAGE
  )
}

export default function HeroSlider({ children, className = '' }) {
  const [slides, setSlides] = useState([{ id: 'default', imageUrl: DEFAULT_IMAGE, order: 0 }])
  const [loading, setLoading] = useState(true)
  //console.log(slides)

  useEffect(() => {
    getHeroSlidesOnce()
      .then((list) => {
        const finalSlides = list.length > 0 ? list : [{ id: 'default', imageUrl: DEFAULT_IMAGE, order: 0 }]
        setSlides(finalSlides)
        setLoading(false)
      })
      .catch((error) => {
        console.error('[HeroSlider] Error loading hero slides:', error)
        setSlides([{ id: 'default', imageUrl: DEFAULT_IMAGE, order: 0 }])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <section className={`relative flex items-center justify-center bg-slate-900 bg-cover bg-center min-h-[85vh] ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75" />
        <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[85vh] py-16 md:py-20 px-4">
          {children}
        </div>
      </section>
    )
  }

  return (
    <section className={`relative min-h-[85vh] flex items-center justify-center ${className}`} style={{ minHeight: '85vh' }}>
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        effect="fade"
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-white/50 !w-2 !h-2 !mx-1',
          bulletActiveClass: '!bg-yellow-400 !w-6',
        }}
        loop={slides.length > 1}
        className="!absolute !inset-0 !w-full !h-full"
        style={{ height: '100%', minHeight: '85vh' }}
      >
        {slides.map((slide) => {
          const imageUrl = getSlideImageUrl(slide)
          return (
            <SwiperSlide key={slide.id} style={{ height: '100%', minHeight: '85vh' }}>
              <div
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url("${imageUrl}")`,
                  minHeight: '85vh',
                  height: '100%',
                  width: '100%',
                }}
              />
            </SwiperSlide>
          )
        })}
      </Swiper>
      {/* Overlay: stronger gradient for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/50 to-black/75 z-[1]" />
      {/* Content Container */}
      <div className="relative z-[2] w-full flex flex-col items-center justify-center min-h-[85vh] py-16 md:py-20 px-4">
        {children}
      </div>
    </section>
  )
}
