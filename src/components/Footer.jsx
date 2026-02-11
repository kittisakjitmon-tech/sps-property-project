import { Phone, Mail, Facebook, Clock } from 'lucide-react'
import logo from '../assets/logo.png'

const MAPS_EMBED_URL = 'https://www.google.com/maps?q=%E0%B8%99%E0%B8%B4%E0%B8%84%E0%B8%A1%E0%B8%AD%E0%B8%B8%E0%B8%95%E0%B8%AA%E0%B8%B2%E0%B8%AB%E0%B8%81%E0%B8%A3%E0%B8%A3%E0%B8%A1%E0%B8%AD%E0%B8%A1%E0%B8%95%E0%B8%B2%E0%B8%8B%E0%B8%B4%E0%B8%95%E0%B8%B5%E0%B9%8E+%E0%B8%8A%E0%B8%A5%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&output=embed'

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Google Maps */}
        {/*<div className="w-full h-[300px] -mx-4 sm:-mx-6 lg:-mx-8">
          <iframe
            title="แผนที่ นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี"
            src={MAPS_EMBED_URL}
            width="100%"
            height="300"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full"
          />
        </div>*/}

        {/* Content */}
        <div className="py-8 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <img src={logo} alt="SPS Property Solution" className="h-12 w-auto" />
              <div>
                <p className="font-bold text-lg">SPS Property Solution</p>
                <p className="text-blue-200 text-sm">บ้านคอนโดสวย อมตะซิตี้ ชลบุรี</p>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col sm:flex-row gap-6 text-sm">
              <a
                href="tel:0955520801"
                className="flex items-center gap-2 hover:text-yellow-400 transition"
              >
                <Phone className="h-4 w-4 shrink-0" />
                095 552 0801
              </a>
              <a
                href="mailto:propertysommai@gmail.com"
                className="flex items-center gap-2 hover:text-yellow-400 transition"
              >
                <Mail className="h-4 w-4 shrink-0" />
                propertysommai@gmail.com
              </a>
              <a
                href="https://www.facebook.com/houseamata"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-yellow-400 transition"
              >
                <Facebook className="h-4 w-4 shrink-0" />
                Facebook
              </a>
              <div className="flex items-center gap-2 text-blue-200">
                <Clock className="h-4 w-4 shrink-0" />
                เปิดทำการตลอดเวลา (24/7)
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-blue-800 text-center text-blue-200 text-sm">
            © SPS Property Solution | บ้านคอนโดสวย อมตะซิตี้ ชลบุรี
          </div>
        </div>
      </div>
    </footer>
  )
}
