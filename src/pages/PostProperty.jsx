import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePublicAuth } from '../context/PublicAuthContext'
import { ChevronLeft, ChevronRight, Upload, X, Check, AlertCircle, Target, Zap, Shield, Phone } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import LocationAutocomplete from '../components/LocationAutocomplete'
import { createPendingProperty, uploadPendingPropertyImage } from '../lib/firestore'
import { compressImages } from '../lib/imageCompressor'

const CATEGORIES = [
  { value: 'บ้านเดี่ยว', label: 'บ้านเดี่ยว' },
  { value: 'คอนโดมิเนียม', label: 'คอนโดมิเนียม' },
  { value: 'ทาวน์โฮม', label: 'ทาวน์โฮม' },
  { value: 'วิลล่า', label: 'วิลล่า' },
  { value: 'บ้านเช่า', label: 'บ้านเช่า' },
]

const SUGGESTED_TAGS = [
  'บ้านเดี่ยว',
  'คอนโด',
  'ใกล้นิคมอมตะซิตี้',
  'ผ่อนตรง',
  'พร้อมอยู่',
  'พานทอง',
  'ชลบุรี',
]

export default function PostProperty() {
  const navigate = useNavigate()
  const { user } = usePublicAuth()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    title: '',
    type: 'คอนโดมิเนียม',
    price: '',
    area: '',
    bedrooms: 2,
    bathrooms: 1,
    locationDisplay: '',
    location: { province: '', district: '', subDistrict: '' },
    description: '',
    images: [],
    tags: [],
    contactName: '',
    contactPhone: '',
    contactLineId: '',
    isRental: false,
    directInstallment: false,
    hotDeal: false,
    acceptedTerms: false,
  })

  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [previewFiles, setPreviewFiles] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const updateForm = (partial) => setForm((prev) => ({ ...prev, ...partial }))

  // Tag Autocomplete
  const filteredTags = SUGGESTED_TAGS.filter(
    (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !form.tags.includes(tag)
  )

  const addTag = (tag) => {
    if (!form.tags.includes(tag) && form.tags.length < 10) {
      updateForm({ tags: [...form.tags, tag] })
      setTagInput('')
      setShowTagSuggestions(false)
    }
  }

  const removeTag = (tagToRemove) => {
    updateForm({ tags: form.tags.filter((tag) => tag !== tagToRemove) })
  }

  // Image Upload
  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (previewFiles.length + files.length > 10) {
      setError('อัปโหลดได้สูงสุด 10 รูป')
      return
    }

    setUploadingImages(true)
    try {
      const compressed = await compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 2,
      })

      const newPreviews = compressed.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))

      setPreviewFiles((prev) => [...prev, ...newPreviews])
    } catch (err) {
      console.error('Error compressing:', err)
      setError('เกิดข้อผิดพลาดในการบีบอัดรูปภาพ')
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  const removeImage = (index) => {
    URL.revokeObjectURL(previewFiles[index].preview)
    setPreviewFiles(previewFiles.filter((_, i) => i !== index))
  }

  // Form Validation
  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      if (!form.title.trim()) {
        setError('กรุณากรอกชื่อประกาศ')
        return false
      }
      if (!form.price || Number(form.price) <= 0) {
        setError('กรุณากรอกราคาที่ถูกต้อง')
        return false
      }
      if (!form.locationDisplay.trim()) {
        setError('กรุณาเลือกพื้นที่')
        return false
      }
    }
    if (stepNum === 3) {
      if (!form.contactName.trim()) {
        setError('กรุณากรอกชื่อผู้ติดต่อ')
        return false
      }
      if (!form.contactPhone.trim()) {
        setError('กรุณากรอกเบอร์โทรศัพท์')
        return false
      }
      if (!form.acceptedTerms) {
        setError('กรุณายอมรับเงื่อนไขก่อนส่งประกาศ')
        return false
      }
    }
    setError(null)
    return true
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setSubmitting(true)
    setError(null)

    try {
      // Upload images
      let imageUrls = []
      if (previewFiles.length > 0) {
        const tempId = `temp_${Date.now()}`
        for (const { file } of previewFiles) {
          const url = await uploadPendingPropertyImage(file, tempId)
          imageUrls.push(url)
        }
      }

      // Create pending property
      await createPendingProperty({
        title: form.title.trim(),
        type: form.type,
        price: Number(form.price) || 0,
        area: Number(form.area) || 0,
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        location: form.location,
        locationDisplay: form.locationDisplay.trim(),
        description: form.description.trim(),
        images: imageUrls,
        tags: form.tags,
        agentContact: {
          name: form.contactName.trim(),
          phone: form.contactPhone.trim(),
          lineId: form.contactLineId.trim(),
        },
        isRental: form.isRental || form.type === 'บ้านเช่า',
        directInstallment: form.directInstallment,
        hotDeal: form.hotDeal,
        userId: user?.uid || null,
        createdBy: user?.uid || null,
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 5000)
    } catch (err) {
      console.error('Error submitting:', err)
      setError('เกิดข้อผิดพลาดในการส่งประกาศ: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <PageLayout heroTitle="ส่งประกาศสำเร็จ" heroSubtitle="" showHero={false}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-blue-900 mb-4">ส่งประกาศสำเร็จ!</h2>
            <p className="text-slate-600 mb-6">
              ระบบได้รับข้อมูลแล้ว เจ้าหน้าที่จะตรวจสอบและอนุมัติภายใน 24 ชม.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout heroTitle="ลงประกาศฟรี" heroSubtitle="ฟอร์มลงประกาศขาย-เช่าอสังหาฯ" showHero={true}>
      <div className="min-h-screen bg-slate-50 py-12 px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            {/* Main Form Column (7/10) */}
            <div className="lg:col-span-7">
              {/* Form Content */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Card Header with Progress Steps */}
                <div className="bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-50 px-6 sm:px-8 py-6 border-b border-blue-200">
                  <div className="flex flex-col items-center justify-center">
                    {/* Progress Steps Circles */}
                    <div className="flex items-center justify-between w-full mb-4">
                      {[1, 2, 3].map((s) => {
                        const isActive = step === s
                        const isCompleted = step > s
                        const isPending = step < s

                        return (
                          <div key={s} className="flex-1 flex items-center">
                            <div className="relative flex flex-col items-center flex-1">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 relative z-10 ${
                                  isActive
                                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/40 ring-4 ring-blue-900/20'
                                    : isCompleted
                                    ? 'bg-blue-900 text-white shadow-md'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="h-6 w-6 text-white" />
                                ) : (
                                  <span className="text-base">{s}</span>
                                )}
                              </div>
                            </div>
                            {s < 3 && (
                              <div
                                className={`flex-1 h-1 mx-3 rounded-full transition-all duration-300 ${
                                  isCompleted || step > s
                                    ? 'bg-blue-900'
                                    : 'bg-gray-200'
                                }`}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Step Labels */}
                    <div className="flex justify-between w-full text-sm">
                      <span
                        className={`text-center transition-all ${
                          step >= 1
                            ? step === 1
                              ? 'font-bold text-blue-900'
                              : 'font-semibold text-blue-900'
                            : 'font-normal text-gray-400'
                        }`}
                      >
                        ข้อมูลทรัพย์สิน
                      </span>
                      <span
                        className={`text-center transition-all ${
                          step >= 2
                            ? step === 2
                              ? 'font-bold text-blue-900'
                              : 'font-semibold text-blue-900'
                            : 'font-normal text-gray-400'
                        }`}
                      >
                        รูปภาพ
                      </span>
                      <span
                        className={`text-center transition-all ${
                          step >= 3
                            ? step === 3
                              ? 'font-bold text-blue-900'
                              : 'font-semibold text-blue-900'
                            : 'font-normal text-gray-400'
                        }`}
                      >
                        ข้อมูลติดต่อ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6 sm:p-8">
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="p-1 hover:bg-red-100 rounded transition"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              )}

              {/* Step 1: Property Info */}
              {step === 1 && (
                <div className="space-y-6">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ชื่อประกาศ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm({ title: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="เช่น คอนโดหรู ใกล้ BTS อารีย์"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ประเภท <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        updateForm({
                          type: e.target.value,
                          isRental: e.target.value === 'บ้านเช่า',
                        })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ราคา (บาท) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => updateForm({ price: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                      placeholder="เช่น 5000000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">พื้นที่ (ตร.ว.)</label>
                    <input
                      type="number"
                      value={form.area !== '' && form.area != null ? String(Number(form.area) / 4) : ''}
                      onChange={(e) => updateForm({ area: e.target.value ? String(Math.round(Number(e.target.value) * 4)) : '' })}
                      min="0"
                      step="0.5"
                      placeholder="เช่น 25"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">ห้องนอน</label>
                    <input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) => updateForm({ bedrooms: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">ห้องน้ำ</label>
                    <input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) => updateForm({ bathrooms: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    พื้นที่ (จังหวัด/อำเภอ/ตำบล) <span className="text-red-500">*</span>
                  </label>
                  <LocationAutocomplete
                    value={form.locationDisplay}
                    onChange={(v, loc) =>
                      updateForm({
                        locationDisplay: v,
                        location: loc || form.location,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">รายละเอียด</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="อธิบายรายละเอียดทรัพย์สิน..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">แท็กที่เกี่ยวข้อง</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value)
                        setShowTagSuggestions(true)
                      }}
                      onFocus={() => setShowTagSuggestions(true)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                      placeholder="พิมพ์เพื่อค้นหาแท็ก..."
                    />
                    {showTagSuggestions && filteredTags.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 transition"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-blue-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.directInstallment}
                      onChange={(e) => updateForm({ directInstallment: e.target.checked })}
                      className="w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
                    />
                    <span className="text-sm text-slate-700">ผ่อนตรง</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hotDeal}
                      onChange={(e) => updateForm({ hotDeal: e.target.checked })}
                      className="w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
                    />
                    <span className="text-sm text-slate-700">ดีลร้อน</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Images */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-blue-900 mb-6">อัปโหลดรูปภาพ</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    เลือกรูปภาพ (สูงสุด 10 รูป)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={uploadingImages || previewFiles.length >= 10}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:opacity-50"
                  />
                </div>

                {previewFiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {previewFiles.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                          <img
                            src={preview.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {previewFiles.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>ยังไม่มีรูปภาพ</p>
                    <p className="text-sm mt-1">อัปโหลดรูปภาพเพื่อให้ประกาศของคุณน่าสนใจยิ่งขึ้น</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-blue-900 mb-6">ข้อมูลติดต่อ</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ชื่อผู้ติดต่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => updateForm({ contactName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="ชื่อของคุณ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => updateForm({ contactPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="0812345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">LINE ID</label>
                  <input
                    type="text"
                    value={form.contactLineId}
                    onChange={(e) => updateForm({ contactLineId: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    placeholder="@lineid หรือ ID"
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.acceptedTerms}
                      onChange={(e) => updateForm({ acceptedTerms: e.target.checked })}
                      className="w-5 h-5 mt-0.5 text-blue-900 rounded focus:ring-blue-900"
                    />
                    <span className="text-sm text-slate-700">
                      <span className="text-red-500">*</span> ข้าพเจ้ายืนยันว่าข้อมูลที่ลงประกาศเป็นความจริง
                      และขอสงวนสิทธิ์ในการพิจารณาอนุมัติหรือลบประกาศที่ไม่เป็นไปตามมาตรฐานของคุณภาพจากระบบ
                    </span>
                  </label>
                </div>
              </div>
            )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-5 w-5" />
                ย้อนกลับ
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 transition"
                >
                  ถัดไป
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-yellow-900 font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      ส่งประกาศ
                    </>
                  )}
                </button>
              )}
              </div>
                </div>
              </div>
            </div>

            {/* Sidebar Column (3/10) */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Why Post With Us Sidebar */}
                <div className="bg-blue-50 rounded-xl border-2 border-blue-900/20 p-6 shadow-md">
                  <h3 className="text-xl font-bold text-blue-900 mb-6 text-center">
                    ทำไมต้องลงประกาศกับเรา?
                  </h3>
                  <div className="space-y-6">
                    {/* Benefit 1 */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center shrink-0">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          เข้าถึงคนอมตะซิตี้โดยตรง
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          เจาะกลุ่มเป้าหมายในนิคมอุตสาหกรรม ชลบุรี และระยอง
                        </p>
                      </div>
                    </div>

                    {/* Benefit 2 */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center shrink-0">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          โอกาสขายไวด้วยระบบผ่อนตรง
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          รองรับกลุ่มลูกค้าที่สนใจการเช่าซื้อ/ผ่อนตรง
                        </p>
                      </div>
                    </div>

                    {/* Benefit 3 */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-900 flex items-center justify-center shrink-0">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          ลงง่าย ไม่มีค่าธรรมเนียม
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          ระบบจัดการง่าย พร้อมทีมงานช่วยตรวจสอบข้อมูล
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Help */}
                  <div className="mt-8 pt-6 border-t border-blue-200">
                    <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-blue-200">
                      <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                        <Phone className="h-5 w-5 text-yellow-900" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 mb-1">ปรึกษาการลงประกาศ</p>
                        <a
                          href="tel:0955520801"
                          className="text-base font-bold text-blue-900 hover:text-blue-700 transition"
                        >
                          095 552 0801
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
