import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'
import MapPicker from '../components/MapPicker'
import ModernProgressLoader from '../components/ModernProgressLoader'
import { useProgressLoader } from '../hooks/useProgressLoader'
import {
  getPropertyByIdOnce,
  createProperty,
  updatePropertyById,
  uploadPropertyImageWithProgress,
} from '../lib/firestore'
import { logActivity } from '../services/activityLogger'
import { fetchAndCacheNearbyPlaces } from '../services/nearbyPlacesService'
import { compressImages } from '../lib/imageCompressor'
import { ImagePlus, X, ArrowLeft, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import GoogleMapsInputWithPreview from '../components/GoogleMapsInputWithPreview'

const CATEGORIES = [
  { value: 'บ้านเดี่ยว', label: 'บ้านเดี่ยว' },
  { value: 'คอนโดมิเนียม', label: 'คอนโดมิเนียม' },
  { value: 'ทาวน์โฮม', label: 'ทาวน์โฮม' },
  { value: 'วิลล่า', label: 'วิลล่า' },
  { value: 'บ้านเช่า', label: 'บ้านเช่า' },
]

const STATUS_OPTIONS = [
  { value: 'available', label: 'ว่าง', color: 'bg-green-100 text-green-900' },
  { value: 'reserved', label: 'ติดจอง', color: 'bg-yellow-100 text-yellow-900' },
  { value: 'sold', label: 'ขายแล้ว', color: 'bg-blue-100 text-blue-900' },
  { value: 'pending', label: 'รออนุมัติ', color: 'bg-orange-100 text-orange-900' },
]

const defaultForm = {
  title: '',
  price: '',
  type: 'คอนโดมิเนียม',
  locationDisplay: '',
  location: { province: '', district: '', subDistrict: '' },
  bedrooms: 2,
  bathrooms: 1,
  area: '',
  description: '',
  images: [],
  agentContact: { name: '', lineId: '', phone: '' },
  featured: false,
  isRental: false,
  directInstallment: false,
  hotDeal: false,
  status: 'available',
  mapUrl: '',
  lat: null,
  lng: null,
}

export default function PropertyForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userRole } = useAuth()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [refreshingNearby, setRefreshingNearby] = useState(false)
  const [nearbyStatusMessage, setNearbyStatusMessage] = useState('')
  const [uploadingFiles, setUploadingFiles] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [compressing, setCompressing] = useState(false)
  const progressLoader = useProgressLoader()

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    getPropertyByIdOnce(id).then((p) => {
      if (cancelled || !p) return
      const loc = p.location || {}
      setForm({
        title: p.title ?? '',
        price: p.price ?? '',
        type: p.type ?? 'คอนโดมิเนียม',
        locationDisplay: p.locationDisplay ?? `${loc.district || ''} ${loc.province || ''}`.trim(),
        location: {
          province: loc.province ?? '',
          district: loc.district ?? '',
          subDistrict: loc.subDistrict ?? '',
        },
        bedrooms: p.bedrooms ?? 2,
        bathrooms: p.bathrooms ?? 1,
        area: p.area ?? '',
        description: p.description ?? '',
        images: Array.isArray(p.images) ? p.images : [],
        agentContact: {
          name: p.agentContact?.name ?? '',
          lineId: p.agentContact?.lineId ?? '',
          phone: p.agentContact?.phone ?? '',
        },
        featured: Boolean(p.featured),
        isRental: Boolean(p.isRental),
        directInstallment: Boolean(p.directInstallment),
        hotDeal: Boolean(p.hotDeal),
        status: p.status ?? 'available',
        mapUrl: p.mapUrl ?? '',
        lat: p.lat ?? null,
        lng: p.lng ?? null,
      })
    }).finally(() => setLoading(false))
    return () => { cancelled = true }
  }, [id, isEdit])

  const update = (partial) => setForm((prev) => ({ ...prev, ...partial }))

  const handleLocationSelect = (loc) => {
    if (!loc) return
    update({
      locationDisplay: loc.displayName,
      location: {
        province: loc.province ?? '',
        district: loc.district ?? '',
        subDistrict: loc.subDistrict ?? '',
      },
    })
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    setCompressing(true)
    try {
      // Compress images before adding to state
      const compressedFiles = await compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2,
      })
      setNewFiles((prev) => [...prev, ...compressedFiles])
    } catch (err) {
      console.error('Error compressing images:', err)
      alert('เกิดข้อผิดพลาดในการบีบอัดรูปภาพ: ' + err.message)
      // Fallback: use original files if compression fails
      setNewFiles((prev) => [...prev, ...files])
    } finally {
      setCompressing(false)
    }
    
    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index) => {
    update({
      images: form.images.filter((_, i) => i !== index),
    })
  }

  const handleRefreshNearbyPlaces = async () => {
    if (!isEdit || !id) {
      setNearbyStatusMessage('กรุณาบันทึกทรัพย์ก่อนจึงจะอัปเดตข้อมูลสถานที่สำคัญได้')
      return
    }
    if (form.lat == null || form.lng == null) {
      setNearbyStatusMessage('กรุณาระบุพิกัด Latitude/Longitude ก่อน')
      return
    }
    setRefreshingNearby(true)
    setNearbyStatusMessage('กำลังอัปเดตข้อมูลสถานที่สำคัญ...')
    try {
      const nearby = await fetchAndCacheNearbyPlaces(
        {
          id,
          lat: Number(form.lat),
          lng: Number(form.lng),
          mapUrl: form.mapUrl || '',
          nearbyPlaces: [],
        },
        { forceRefresh: true }
      )
      if (nearby.length > 0) {
        setNearbyStatusMessage(`อัปเดตข้อมูลแล้ว (${nearby.length} รายการ)`)
      } else {
        setNearbyStatusMessage('ไม่พบสถานที่สำคัญในระยะ 20 กม. หรือยังตั้งค่า API ไม่ครบ')
      }
    } catch {
      setNearbyStatusMessage('อัปเดตข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setRefreshingNearby(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const price = Number(form.price) || 0
    const area = Number(form.area) || 0
    const payload = {
      title: form.title.trim(),
      price,
      type: form.type,
      location: form.location,
      locationDisplay: form.locationDisplay.trim(),
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      area,
      description: form.description.trim(),
      agentContact: form.agentContact,
      featured: form.featured,
      isRental: form.isRental,
      directInstallment: form.directInstallment,
      hotDeal: form.hotDeal,
      status: form.status || 'available',
      mapUrl: (form.mapUrl || '').trim(),
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
    }
    let imageUrls = [...(form.images || [])]
    const totalNew = newFiles.length

    try {
      // เริ่มแสดง Progress (Simulated 0% -> 70% สำหรับขั้นตอนบันทึกข้อมูล)
      progressLoader.startLoading('กำลังบันทึกข้อมูล...', { simulated: true })

      if (isEdit) {
        if (totalNew > 0) {
          progressLoader.setStatus('กำลังอัปโหลดรูปภาพ...', '')
          for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i]
            progressLoader.setStatus('กำลังอัปโหลดรูปภาพ...', `${i + 1}/${totalNew}`)
            const url = await uploadPropertyImageWithProgress(file, id, (p) => {
              const segment = 100 / totalNew
              const overall = 70 + (i * segment) + (p / 100) * segment
              progressLoader.updateProgress(overall)
            })
            imageUrls.push(url)
          }
        }
        payload.images = imageUrls
        await updatePropertyById(id, payload)
        // Activity Log: แก้ไขทรัพย์ (รวมเปรียบเทียบราคา)
        const oldPrice = Number(form.price) || 0
        const newPrice = payload.price
        const priceDetails =
          oldPrice !== newPrice && (oldPrice > 0 || newPrice > 0)
            ? `Price: ${(oldPrice / 1_000_000).toFixed(1)}M -> ${(newPrice / 1_000_000).toFixed(1)}M`
            : totalNew > 0
              ? `เพิ่มรูปภาพ ${totalNew} รูป`
              : 'อัปเดตข้อมูล'
        const userForLog = user ? { email: user.email, role: userRole || 'member' } : null
        if (userForLog?.email) {
          try {
            await logActivity({
              action: oldPrice !== newPrice ? 'UPDATE_PRICE' : 'UPDATE_PROPERTY',
              target: payload.title,
              details: priceDetails,
              currentUser: userForLog,
            })
          } catch (e) {
            console.error('[PropertyForm] Failed to log activity:', e)
          }
        }
        progressLoader.updateProgress(100)
        progressLoader.stopLoading()
        if (id && (payload.lat != null) && (payload.lng != null)) {
          fetchAndCacheNearbyPlaces({
            id,
            lat: payload.lat,
            lng: payload.lng,
            mapUrl: payload.mapUrl,
          }).catch(() => {})
        }
        navigate('/admin/properties')
      } else {
        const newId = await createProperty({
          ...payload,
          images: [],
          createdBy: user?.uid || null,
        })
        if (totalNew > 0) {
          progressLoader.setStatus('กำลังอัปโหลดรูปภาพ...', '')
          for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i]
            progressLoader.setStatus('กำลังอัปโหลดรูปภาพ...', `${i + 1}/${totalNew}`)
            const url = await uploadPropertyImageWithProgress(file, newId, (p) => {
              const segment = 100 / totalNew
              const overall = 70 + (i * segment) + (p / 100) * segment
              progressLoader.updateProgress(overall)
            })
            imageUrls.push(url)
          }
          await updatePropertyById(newId, { images: imageUrls })
        }
        // Activity Log: เพิ่มทรัพย์ใหม่
        const userForLog = user ? { email: user.email, role: userRole || 'member' } : null
        if (userForLog?.email) {
          try {
            await logActivity({
              action: 'CREATE_PROPERTY',
              target: payload.title,
              details: payload.isRental
                ? `ราคา ${Number(payload.price).toLocaleString('th-TH')} บาท/เดือน`
                : `ราคา ${(payload.price / 1_000_000).toFixed(1)} ล้าน บาท`,
              currentUser: userForLog,
            })
          } catch (e) {
            console.error('[PropertyForm] Failed to log activity:', e)
          }
        }
        progressLoader.updateProgress(100)
        progressLoader.stopLoading()
        if (newId && (payload.lat != null) && (payload.lng != null)) {
          fetchAndCacheNearbyPlaces({
            id: newId,
            lat: payload.lat,
            lng: payload.lng,
            mapUrl: payload.mapUrl,
          }).catch(() => {})
        }
        navigate('/admin/properties')
      }
    } catch (err) {
      console.error(err)
      progressLoader.stopLoading()
      alert('บันทึกไม่สำเร็จ: ' + (err?.message || 'Unknown error'))
    } finally {
      setSaving(false)
      setUploadingFiles([])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <>
      {progressLoader.isActive && (
        <ModernProgressLoader
          progress={progressLoader.progress}
          status={progressLoader.status}
          subStatus={progressLoader.subStatus}
        />
      )}
      <div className="max-w-3xl">
        {/* Back Button / Breadcrumb */}
        <Link
          to="/admin/properties"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>ย้อนกลับรายการทรัพย์สิน</span>
        </Link>
        <h1 className="text-2xl font-bold text-blue-900 mb-6">
          {isEdit ? 'แก้ไขทรัพย์' : 'เพิ่มทรัพย์'}
        </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อประกาศ *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              placeholder="เช่น คอนโดหรู ใกล้ BTS อารีย์"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ราคา (บาท) *</label>
              <input
                type="text"
                value={form.price ? Number(form.price).toLocaleString('th-TH') : ''}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/,/g, '')
                  if (rawValue === '' || /^\d+$/.test(rawValue)) {
                    update({ price: rawValue })
                  }
                }}
                required
                placeholder="เช่น 3,000,000"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท *</label>
              <select
                value={form.type}
                onChange={(e) => update({ type: e.target.value, isRental: e.target.value === 'บ้านเช่า' })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">พื้นที่ (จังหวัด/อำเภอ/ตำบล) *</label>
            <LocationAutocomplete
              value={form.locationDisplay}
              onChange={(v) => update({ locationDisplay: v })}
              onSelect={handleLocationSelect}
              placeholder="ค้นหาพื้นที่..."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ห้องนอน</label>
              <input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => update({ bedrooms: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ห้องน้ำ</label>
              <input
                type="number"
                min="0"
                value={form.bathrooms}
                onChange={(e) => update({ bathrooms: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">พื้นที่ (ตร.ว.)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.area !== '' && form.area != null ? String(Number(form.area) / 4) : ''}
                onChange={(e) => update({ area: e.target.value ? String(Math.round(Number(e.target.value) * 4)) : '' })}
                placeholder="เช่น 25"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              placeholder="อธิบายทรัพย์สิน..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ลิงก์ Google Maps (ถ้ามี)</label>
            <GoogleMapsInputWithPreview
              value={form.mapUrl}
              onChange={(url) => update({ mapUrl: url })}
              onCoordinatesChange={(coords) => coords && update({ lat: coords.lat, lng: coords.lng })}
            />
          </div>
        </div>

        {/* Map Coordinates */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-medium text-blue-900">พิกัดแผนที่ (Latitude/Longitude)</h3>
          <p className="text-sm text-slate-600">
            กรอกพิกัดหรือคลิกบนแผนที่ด้านล่างเพื่อเลือกตำแหน่งอัตโนมัติ
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Latitude (ละติจูด)</label>
              <input
                type="number"
                step="any"
                value={form.lat ?? ''}
                onChange={(e) => update({ lat: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                placeholder="เช่น 13.7563"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Longitude (ลองจิจูด)</label>
              <input
                type="number"
                step="any"
                value={form.lng ?? ''}
                onChange={(e) => update({ lng: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                placeholder="เช่น 100.5018"
              />
            </div>
          </div>
          <MapPicker
            lat={form.lat}
            lng={form.lng}
            onLocationSelect={({ lat, lng }) => {
              update({ lat, lng })
            }}
            className="mt-4"
          />
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleRefreshNearbyPlaces}
              disabled={refreshingNearby}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-800 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingNearby ? 'animate-spin' : ''}`} />
              อัปเดตข้อมูลสถานที่สำคัญ
            </button>
            <p className="text-xs text-slate-500 mt-2">
              ใช้สำหรับคำนวณระยะทางและเวลาเดินทางใหม่ (Driving)
            </p>
            {nearbyStatusMessage && (
              <p className="text-xs text-slate-600 mt-1">{nearbyStatusMessage}</p>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">รูปภาพทรัพย์</label>
          <div className="flex flex-wrap gap-3 mb-4">
            {form.images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {newFiles.map((file, i) => (
              <div key={`new-${i}`} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeNewFile(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
            <ImagePlus className="h-5 w-5" />
            {compressing ? 'กำลังบีบอัดรูปภาพ...' : 'เลือกไฟล์รูปจากเครื่อง'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={compressing}
              className="hidden"
            />
          </label>
          {compressing && (
            <p className="text-sm text-slate-500 mt-2">กำลังบีบอัดรูปภาพเพื่อลดขนาดไฟล์...</p>
          )}
        </div>

        {/* Agent */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-medium text-blue-900">ข้อมูลตัวแทน</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อตัวแทน</label>
              <input
                type="text"
                value={form.agentContact.name}
                onChange={(e) => update({ agentContact: { ...form.agentContact, name: e.target.value } })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Line ID</label>
              <input
                type="text"
                value={form.agentContact.lineId}
                onChange={(e) => update({ agentContact: { ...form.agentContact, lineId: e.target.value } })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
              <input
                type="tel"
                value={form.agentContact.phone}
                onChange={(e) => update({ agentContact: { ...form.agentContact, phone: e.target.value } })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">สถานะทรัพย์สิน</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update({ status: option.value })}
                  className={`px-4 py-2.5 rounded-lg border-2 transition ${
                    form.status === option.value
                      ? `${option.color} border-blue-900 font-semibold`
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update({ featured: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-slate-700">แสดงในทรัพย์เด่น</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hotDeal}
                onChange={(e) => update({ hotDeal: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-slate-700">Hot Deal</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.directInstallment}
                onChange={(e) => update({ directInstallment: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-slate-700">ผ่อนตรง</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="px-6 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
    </>
  )
}
