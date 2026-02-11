import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import HeroSlider from './HeroSlider'
import { Phone, ArrowUp } from 'lucide-react'

/**
 * PageLayout - Layout component ที่มี Navbar, Hero section และ Footer สำหรับทุกหน้า
 * @param {ReactNode} children - เนื้อหาหลักของหน้า
 * @param {ReactNode} searchComponent - Search component ของแต่ละหน้า (optional)
 * @param {ReactNode} heroTitle - Title ใน hero section (string หรือ JSX)
 * @param {string} heroSubtitle - Subtitle ใน hero section
 * @param {ReactNode} heroExtra - เนื้อหาเพิ่มเติมด้านล่าง search (optional)
 * @param {boolean} showHero - แสดง hero section หรือไม่ (default: true)
 * @param {boolean} fullHeight - ใช้ความสูงเต็ม (สำหรับหน้าแรก) หรือไม่ (default: false)
 */
export default function PageLayout({ 
  children, 
  searchComponent = null,
  heroTitle = "SPS Property Solution",
  heroSubtitle = "บ้านคอนโดสวย อมตะซิตี้ ชลบุรี",
  heroExtra = null,
  showHero = true,
  fullHeight = false,
  useHeroSlider = false,
  showFooter = true
}) {
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {showHero && (
        useHeroSlider && fullHeight ? (
          <HeroSlider>
            <div className="w-full max-w-5xl mx-auto">
              {/* Hero Title & Subtitle */}
              <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
                  {heroTitle}
                </h1>
                <p className="text-white text-lg sm:text-xl md:text-2xl drop-shadow-md font-medium">
                  {heroSubtitle}
                </p>
              </div>

              {/* Search Component - Glassmorphism */}
              {searchComponent && (
                <div className="mb-8">
                  <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl p-4 sm:p-6 max-w-3xl mx-auto">
                    {searchComponent}
                  </div>
                </div>
              )}

              {/* Hero Extra Content */}
              {heroExtra && (
                <div className="mt-12">
                  {heroExtra}
                </div>
              )}
            </div>
          </HeroSlider>
        ) : (
          <section
            className={`relative flex items-center justify-center bg-slate-800 bg-cover bg-center ${fullHeight ? 'min-h-[70vh]' : 'min-h-[20vh]'}`}
            style={{
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.6)), url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920')`,
            }}
          >
            <div className="absolute inset-0" />
            <div className={`relative z-10 w-full max-w-4xl px-4 ${fullHeight ? '' : 'py-4'}`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-2">
                {heroTitle}
              </h1>
              <p className={`text-slate-200 text-center text-lg ${fullHeight ? 'mb-6' : 'mb-2'}`}>{heroSubtitle}</p>

              {searchComponent && (
                <div className={`bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl ${fullHeight ? 'p-4 sm:p-6' : 'p-3 sm:p-4 max-w-2xl mx-auto'}`}>
                  {searchComponent}
                </div>
              )}

              {heroExtra && (
                <div className="mt-8">
                  {heroExtra}
                </div>
              )}
            </div>
          </section>
        )
      )}

      <main>
        {children}
      </main>

      {showFooter && <Footer />}

      {/* Floating Call Button - Mobile only */}
      <a
        href="tel:0955520801"
        className="md:hidden fixed bottom-6 left-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 shadow-lg hover:shadow-xl transition-all duration-300"
        aria-label="โทรหาเรา"
      >
        <Phone className="h-6 w-6" />
      </a>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          aria-label="กลับขึ้นบน"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
