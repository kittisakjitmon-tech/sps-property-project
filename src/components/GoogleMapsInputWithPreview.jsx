import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, MapPin, ExternalLink } from 'lucide-react'
import { processMapInput, parseCoordinatesFromUrl } from '../lib/googleMapsUrl'

/**
 * Google Maps Input พร้อม Live Preview และ Auto-Coordinates
 * รองรับทั้งลิงก์ธรรมดาและโค้ด iframe
 */
export default function GoogleMapsInputWithPreview({ value, onChange, onCoordinatesChange }) {
  const [inputValue, setInputValue] = useState(value || '')
  const [cleanedUrl, setCleanedUrl] = useState(value || '')
  const [embedUrl, setEmbedUrl] = useState(null)
  const [isShortLink, setIsShortLink] = useState(false)
  const [error, setError] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const processTimerRef = useRef(null)

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (processTimerRef.current) clearTimeout(processTimerRef.current)
  }, [])

  // Sync กับ value จากภายนอก (เมื่อโหลดข้อมูล edit)
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '')
      if (value) {
        const { embedUrl: e, cleanedUrl: c, isShortLink: short, error: err } = processMapInput(value)
        setCleanedUrl(c || value)
        setEmbedUrl(e)
        setIsShortLink(short || false)
        setError(err)
        setShowPreview((!!e || !!short) && !!c && !err)
      } else {
        setCleanedUrl('')
        setEmbedUrl(null)
        setIsShortLink(false)
        setError(null)
        setShowPreview(false)
      }
    }
  }, [value])

  const processAndApply = useCallback((raw) => {
    if (processTimerRef.current) clearTimeout(processTimerRef.current)
    setProcessing(true)
    setError(null)
    setEmbedUrl(null)
    setIsShortLink(false)
    setShowPreview(false)

    processTimerRef.current = setTimeout(() => {
      const trimmed = (raw || '').trim()
      if (!trimmed) {
        setCleanedUrl('')
        setEmbedUrl(null)
        setIsShortLink(false)
        setError(null)
        onChange?.('')
        onCoordinatesChange?.(null)
        setProcessing(false)
        return
      }

      const { cleanedUrl: c, embedUrl: e, isShortLink: short, error: err } = processMapInput(trimmed)
      setProcessing(false)

      if (err) {
        setError(err)
        setEmbedUrl(null)
        setIsShortLink(false)
        setShowPreview(false)
        return
      }

      setCleanedUrl(c)
      setEmbedUrl(e)
      setIsShortLink(short || false)
      setError(null)
      setShowPreview(true)
      onChange?.(c)

      // Auto-fill พิกัด
      const coords = parseCoordinatesFromUrl(c || trimmed)
      if (coords) {
        onCoordinatesChange?.(coords)
      }
    }, 300)
  }, [onChange, onCoordinatesChange])

  const handleChange = (e) => {
    const v = e.target.value
    setInputValue(v)
    processAndApply(v)
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text/plain')?.trim()
    if (pasted) {
      e.preventDefault()
      setInputValue(pasted)
      processAndApply(pasted)
    }
  }

  const handleClear = () => {
    setInputValue('')
    setCleanedUrl('')
    setEmbedUrl(null)
    setIsShortLink(false)
    setError(null)
    setShowPreview(false)
    onChange?.('')
    onCoordinatesChange?.(null)
  }

  return (
    <div className="space-y-3">
      {/* Input - แสดงเมื่อยังไม่มี preview หรือต้องการแก้ไข */}
      {!showPreview && (
        <div>
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onPaste={handlePaste}
            placeholder="วางลิงก์ Google Maps หรือโค้ด Embed (iframe)"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 transition-colors ${
              error ? 'border-red-400 focus:ring-red-200' : 'border-slate-200'
            }`}
          />
          {processing && (
            <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
              กำลังตรวจสอบลิงก์...
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-1.5">{error}</p>
          )}
          <p className="text-xs text-slate-500 mt-1.5">
            แนะนำให้ใช้โค้ดฝังจากเมนู Share &gt; Embed map เพื่อความแม่นยำที่สุด
          </p>
        </div>
      )}

      {/* Map Preview Card */}
      {showPreview && cleanedUrl && (
        <div className="relative rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
            title="ลบ/เปลี่ยนตำแหน่ง"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {embedUrl ? (
            <div className="h-[300px] w-full">
              <iframe
                title="แผนที่ตัวอย่าง"
                src={embedUrl}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            /* Fallback สำหรับลิงก์สั้น (maps.app.goo.gl) ที่ฝัง iframe ไม่ได้ */
            <div className="h-[300px] w-full flex flex-col items-center justify-center gap-4 bg-slate-50 px-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-slate-600 text-center text-sm">
                ลิงก์สั้นไม่รองรับการแสดงตัวอย่างใน iframe
              </p>
              <a
                href={cleanedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                เปิดใน Google Maps
              </a>
            </div>
          )}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 truncate flex-1 min-w-0">{cleanedUrl}</span>
            <button
              type="button"
              onClick={() => {
                setShowPreview(false)
                setInputValue(cleanedUrl)
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
            >
              แก้ไขลิงก์
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
