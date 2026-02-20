import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'
import MapPicker from '../components/MapPicker'
import ModernProgressLoader from '../components/ModernProgressLoader'
import { useProgressLoader } from '../hooks/useProgressLoader'
import {
  getPropertyByIdOnce,
  getPropertiesOnce,
  createProperty,
  updatePropertyById,
  uploadPropertyImageWithProgress,
} from '../lib/firestore'
import { generatePropertyID, checkPropertyIdDuplicate } from '../lib/propertyId'
import { logActivity } from '../services/activityLogger'
import { fetchAndCacheNearbyPlaces } from '../services/nearbyPlacesService'
import { compressImages } from '../lib/imageCompressor'
import { generateAutoTags, mergeTags } from '../lib/autoTags'
import { ImagePlus, X, ArrowLeft, RefreshCw, Plus, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import GoogleMapsInputWithPreview from '../components/GoogleMapsInputWithPreview'
import { PROPERTY_TYPES, getPropertyLabel } from '../constants/propertyTypes'

// CATEGORIES removed, using PROPERTY_TYPES from constants

const STATUS_OPTIONS = [
  { value: 'available', label: 'ว่าง', color: 'bg-green-100 text-green-900' },
  { value: 'reserved', label: 'ติดจอง', color: 'bg-yellow-100 text-yellow-900' },
  { value: 'sold', label: 'ขายแล้ว', color: 'bg-blue-100 text-blue-900' },
  { value: 'pending', label: 'รออนุมัติ', color: 'bg-orange-100 text-orange-900' },
]

const BUY_SUB_STATUS_OPTIONS = [
  { value: 'มือ 1', label: 'มือ 1', color: 'bg-blue-100 text-blue-900' },
  { value: 'มือ 2', label: 'มือ 2', color: 'bg-slate-100 text-slate-900' },
]

const RENT_AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'ว่าง', color: 'bg-green-100 text-green-800' },
  { value: 'reserved', label: 'ติดจอง', color: 'bg-red-100 text-red-800' },
]

// Listing Type Options (ประเภทการดีล)
const LISTING_TYPE_OPTIONS = [
  { value: 'sale', label: 'ซื้อ' },
  { value: 'rent', label: 'เช่า/ผ่อนตรง' },
]

// Sub Listing Type Options (ตัวเลือกย่อยสำหรับเช่า/ผ่อนตรง)
const SUB_LISTING_TYPE_OPTIONS = [
  { value: 'rent_only', label: 'เช่า' },
  { value: 'installment_only', label: 'ผ่อนตรง' },
]

// Property Condition Options (สภาพบ้าน - สำหรับซื้อเท่านั้น)
const PROPERTY_CONDITION_OPTIONS = [
  { value: 'มือ 1', label: 'มือ 1', color: 'bg-blue-100 text-blue-800' },
  { value: 'มือ 2', label: 'มือ 2', color: 'bg-slate-100 text-slate-800' },
]

// Sale Availability Options (สถานะการขาย - สำหรับซื้อเท่านั้น)
const SALE_AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'ว่าง', color: 'bg-green-100 text-green-800' },
  { value: 'sold', label: 'ขายแล้ว', color: 'bg-red-100 text-red-800' },
]

const defaultForm = {
  title: '',
  price: '',
  displayId: '',
  type: 'SPS-CD-ID',
  locationDisplay: '',
  location: { province: '', district: '', subDistrict: '' },
  bedrooms: 2,
  bathrooms: 1,
  area: '',
  description: '',
  images: [],
  coverImageUrl: '', // URL ของภาพหน้าปก
  agentContact: { name: '', lineId: '', phone: '' },
  featured: false,
  isRental: false,
  directInstallment: false,
  hotDeal: false,
  listingType: 'sale', // ประเภทการดีล: 'sale' หรือ 'rent'
  subListingType: '', // ตัวเลือกย่อยสำหรับเช่า/ผ่อนตรง: 'rent_only' หรือ 'installment_only'
  propertyCondition: '', // สภาพบ้าน: 'มือ 1' หรือ 'มือ 2' (สำหรับซื้อเท่านั้น)
  availability: 'available', // สถานะ: 'available', 'sold' (ซื้อ) หรือ 'available', 'reserved' (เช่า)
  status: 'available', // เก็บไว้เพื่อ backward compatibility
  propertySubStatus: '', // เก็บไว้เพื่อ backward compatibility
  showPrice: true,
  customTags: [],
  mapUrl: '',
  lat: null,
  lng: null,
  nearbyPlace: [],
}

export default function PropertyForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, userRole } = useAdminAuth()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [refreshingNearby, setRefreshingNearby] = useState(false)
  const [nearbyStatusMessage, setNearbyStatusMessage] = useState('')
  const [uploadingFiles, setUploadingFiles] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [compressing, setCompressing] = useState(false)
  const [allProperties, setAllProperties] = useState([])
  const [displayIdManuallyEdited, setDisplayIdManuallyEdited] = useState(false)
  const progressLoader = useProgressLoader()

  useEffect(() => {
    getPropertiesOnce().then(setAllProperties)
  }, [])

  useEffect(() => {
    if (!isEdit && form.type && !displayIdManuallyEdited) {
      const nextId = generatePropertyID(form.type, allProperties)
      setForm((prev) => prev.displayId !== nextId ? { ...prev, displayId: nextId } : prev)
    }
  }, [isEdit, form.type, displayIdManuallyEdited, allProperties])

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    getPropertyByIdOnce(id).then((p) => {
      if (cancelled || !p) return
      const loc = p.location || {}

      // Determine listingType from existing data
      let listingType = 'sale'
      if (p.listingType) {
        listingType = p.listingType
      } else if (p.isRental) {
        listingType = 'rent'
      }

      // Determine subListingType from existing data
      let subListingType = ''
      if (p.subListingType) {
        subListingType = p.subListingType
      } else if (p.directInstallment && listingType === 'rent') {
        // ถ้ามี directInstallment และเป็น rent ให้ตั้งเป็น 'installment_only'
        subListingType = 'installment_only'
      } else if (listingType === 'rent') {
        // ถ้าเป็น rent แต่ไม่มี directInstallment ให้ตั้งเป็น 'rent_only'
        subListingType = 'rent_only'
      }

      // Determine propertyCondition from existing data
      let propertyCondition = ''
      if (p.propertyCondition) {
        propertyCondition = p.propertyCondition
      } else if (p.propertySubStatus) {
        propertyCondition = p.propertySubStatus
      }

      // Determine availability from existing data
      let availability = 'available'
      if (p.availability) {
        availability = p.availability
      } else if (p.status && listingType === 'sale') {
        // Map old status to new availability for sale
        if (p.status === 'sold') {
          availability = 'sold'
        } else {
          availability = 'available'
        }
      }

      setForm({
        title: p.title ?? '',
        price: p.price ?? '',
        displayId: p.displayId ?? p.propertyId ?? '',
        type: p.type ?? 'SPS-CD-ID',
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
        coverImageUrl: p.coverImageUrl || '',
        agentContact: {
          name: p.agentContact?.name ?? '',
          lineId: p.agentContact?.lineId ?? '',
          phone: p.agentContact?.phone ?? '',
        },
        featured: Boolean(p.featured),
        isRental: Boolean(p.isRental),
        directInstallment: Boolean(p.directInstallment),
        hotDeal: Boolean(p.hotDeal),
        listingType,
        subListingType,
        propertyCondition,
        availability,
        status: p.status ?? 'available', // Keep for backward compatibility
        propertySubStatus: p.propertySubStatus ?? '', // Keep for backward compatibility
        showPrice: p.showPrice !== false,
        customTags: Array.isArray(p.customTags) ? p.customTags : [],
        mapUrl: p.mapUrl ?? '',
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        nearbyPlace: Array.isArray(p.nearbyPlace) ? p.nearbyPlace : [],
      })
    }).finally(() => setLoading(false))
    return () => { cancelled = true }
  }, [id, isEdit])

  const update = (partial) => setForm((prev) => ({ ...prev, ...partial }))

  // Auto-update tags when key fields change
  useEffect(() => {
    // Skip auto-update during initial load or if form is not ready
    if (loading || !form.title) return

    // Prepare property data for auto-tag generation
    const propertyDataForTags = {
      displayId: form.displayId || '',
      type: form.type,
      locationDisplay: form.locationDisplay || '',
      nearbyPlace: form.nearbyPlace || [],
      listingType: form.listingType || (form.isRental ? 'rent' : 'sale'),
      subListingType: form.subListingType || null,
      directInstallment: form.directInstallment || form.subListingType === 'installment_only',
      availability: form.availability || 'available',
      status: form.status || form.availability || 'available',
      propertyCondition: form.propertyCondition || null,
      propertySubStatus: form.propertySubStatus || form.propertyCondition || null,
      price: Number(form.price) || 0,
    }

    // Generate auto tags
    const autoTags = generateAutoTags(propertyDataForTags)

    // Get current custom tags (exclude auto-generated ones)
    const currentCustomTags = Array.isArray(form.customTags) ? form.customTags.filter((tag) => tag && tag.trim()) : []

    // Merge custom tags with auto-generated tags
    const mergedTags = mergeTags(currentCustomTags, autoTags)

    // Only update if tags have changed (to avoid infinite loops)
    const currentTagsStr = JSON.stringify((form.customTags || []).sort())
    const mergedTagsStr = JSON.stringify(mergedTags.sort())

    if (currentTagsStr !== mergedTagsStr) {
      update({ customTags: mergedTags })
    }
  }, [
    form.price,
    form.availability,
    form.listingType,
    form.subListingType,
    form.propertyCondition,
    form.locationDisplay,
    form.nearbyPlace,
    form.type,
    form.propertyId,
    // Don't include form.customTags to avoid infinite loop
    // Don't include loading to avoid updating during initial load
  ])

  const handleTypeChange = (newType) => {
    const isRental = newType === 'SPS-RP-ID' || newType === 'บ้านเช่า'
    const next = { type: newType, isRental }
    if (!isEdit && !displayIdManuallyEdited) {
      const nextId = generatePropertyID(newType, allProperties)
      next.displayId = nextId
    }
    if (isRental) {
      next.propertySubStatus = ''
      next.availability = 'available'
      next.listingType = 'rent'
      next.propertyCondition = ''
    } else {
      next.availability = 'available'
      next.propertySubStatus = ''
      next.listingType = 'sale'
      next.propertyCondition = ''
    }
    update(next)
  }

  const handleListingTypeChange = (newListingType) => {
    const next = { listingType: newListingType }

    if (newListingType === 'sale') {
      // ถ้าเปลี่ยนเป็น 'ซื้อ': reset availability, propertyCondition และ subListingType
      next.availability = 'available'
      next.propertyCondition = ''
      next.subListingType = ''
      next.isRental = false
      next.directInstallment = false
    } else if (newListingType === 'rent') {
      // ถ้าเปลี่ยนเป็น 'เช่า/ผ่อนตรง': reset propertyCondition และตั้งค่า subListingType default
      next.availability = 'available'
      next.propertyCondition = ''
      next.subListingType = form.subListingType || 'rent_only' // ถ้ายังไม่มีให้ default เป็น 'rent_only'
      next.isRental = true
    }

    update(next)
  }

  const handleSubListingTypeChange = (newSubListingType) => {
    const next = { subListingType: newSubListingType }

    // Sync directInstallment กับ subListingType
    if (newSubListingType === 'installment_only') {
      next.directInstallment = true
    } else if (newSubListingType === 'rent_only') {
      next.directInstallment = false
    }

    update(next)
  }

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
      // ถ้ายังไม่มี coverImageUrl และยังไม่มีรูปภาพ ให้ตั้งรูปแรกเป็น coverImageUrl โดยอัตโนมัติ
      if (!form.coverImageUrl && form.images.length === 0) {
        const firstFileUrl = URL.createObjectURL(compressedFiles[0])
        setForm((prev) => ({ ...prev, coverImageUrl: firstFileUrl }))
      }
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
    const removedUrl = form.images[index]
    const remainingImages = form.images.filter((_, i) => i !== index)
    update({
      images: remainingImages,
      // ถ้าลบรูปที่เป็น coverImageUrl ให้ reset เป็นรูปแรก (หรือ null ถ้าไม่มีรูปเหลือ)
      coverImageUrl: form.coverImageUrl === removedUrl
        ? (remainingImages.length > 0 ? remainingImages[0] : '')
        : form.coverImageUrl,
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
    let propertyIdTrimmed = String(form.propertyId || '').trim()
    if (!propertyIdTrimmed && !isEdit) {
      propertyIdTrimmed = generatePropertyID(form.type, allProperties)
    }
    if (propertyIdTrimmed && checkPropertyIdDuplicate(propertyIdTrimmed, id, allProperties)) {
      alert('รหัสทรัพย์นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่นหรือปล่อยว่างเพื่อสร้างรหัสอัตโนมัติ')
      return
    }
    setSaving(true)
    const price = Number(form.price) || 0
    const area = Number(form.area) || 0

    // Prepare property data for auto-tag generation
    const propertyDataForTags = {
      propertyId: propertyIdTrimmed || null,
      type: form.type,
      locationDisplay: form.locationDisplay.trim(),
      nearbyPlace: form.nearbyPlace || [],
      listingType: form.listingType || (form.isRental ? 'rent' : 'sale'),
      subListingType: form.subListingType || null,
      directInstallment: form.directInstallment || form.subListingType === 'installment_only',
      availability: form.availability || 'available',
      status: form.status || form.availability || 'available', // Backward compatibility
      propertyCondition: form.propertyCondition || null,
      propertySubStatus: form.propertySubStatus || form.propertyCondition || null, // Backward compatibility
      price,
    }

    // Generate auto tags
    const autoTags = generateAutoTags(propertyDataForTags)

    // Clean customTags: filter out empty strings
    const cleanedCustomTags = Array.isArray(form.customTags) ? form.customTags.filter((tag) => tag && tag.trim()) : []

    // Merge custom tags with auto-generated tags (remove duplicates)
    const mergedTags = mergeTags(cleanedCustomTags, autoTags)

    const payload = {
      title: form.title.trim(),
      price,
      propertyId: propertyIdTrimmed || null,
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
      listingType: form.listingType || (form.isRental ? 'rent' : 'sale'),
      subListingType: form.subListingType || null, // บันทึก subListingType
      propertyCondition: form.propertyCondition || null,
      availability: form.availability || 'available',
      status: form.status || 'available', // Keep for backward compatibility
      propertySubStatus: form.propertySubStatus || form.propertyCondition || null, // Keep for backward compatibility
      showPrice: form.showPrice !== false,
      customTags: mergedTags, // Use merged tags (custom + auto-generated)
      coverImageUrl: form.coverImageUrl || null, // บันทึก coverImageUrl
      mapUrl: (form.mapUrl || '').trim(),
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      nearbyPlace: form.nearbyPlace || [],
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
        // ถ้า coverImageUrl เป็น URL.createObjectURL (ยังไม่ได้อัปโหลด) ให้หา URL ที่ถูกต้อง
        if (form.coverImageUrl && form.coverImageUrl.startsWith('blob:')) {
          // ถ้า coverImageUrl เป็น blob URL (รูปใหม่) ให้ใช้รูปแรกที่อัปโหลดแล้ว
          payload.coverImageUrl = imageUrls.length > 0 ? imageUrls[imageUrls.length - newFiles.length] : null
        } else {
          // ถ้า coverImageUrl เป็น URL ที่มีอยู่แล้ว ให้ใช้ตามเดิม
          payload.coverImageUrl = form.coverImageUrl && imageUrls.includes(form.coverImageUrl) ? form.coverImageUrl : (imageUrls.length > 0 ? imageUrls[0] : null)
        }
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
          }).catch(() => { })
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
          // ตั้งค่า coverImageUrl: ใช้รูปแรกที่อัปโหลดแล้ว
          await updatePropertyById(newId, {
            images: imageUrls,
            coverImageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
          })
        } else {
          // ถ้าไม่มีรูปใหม่ แต่มี coverImageUrl ใน form ให้บันทึกด้วย
          if (form.coverImageUrl) {
            await updatePropertyById(newId, { coverImageUrl: form.coverImageUrl })
          }
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
          }).catch(() => { })
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
              <label className="block text-sm font-medium text-slate-700 mb-1">รหัสทรัพย์</label>
              <input
                type="text"
                value={form.displayId}
                onChange={(e) => {
                  setDisplayIdManuallyEdited(true)
                  update({ displayId: e.target.value })
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                placeholder="เช่น SPS-TH-1CLASS-001 (เว้นว่างเพื่อสร้างอัตโนมัติ)"
              />
              <p className="text-xs text-slate-500 mt-1">แก้ไขได้เองเมื่อจำเป็น (Manual Override)</p>
            </div>
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
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                >
                  {/* Fallback option for legacy types that are not in PROPERTY_TYPES */}
                  {!PROPERTY_TYPES.some(pt => pt.id === form.type) && form.type && (
                    <option value={form.type}>{getPropertyLabel(form.type)}</option>
                  )}
                  {PROPERTY_TYPES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Listing Type (ประเภทการดีล) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทการดีล *</label>
              <div className="flex flex-wrap gap-3">
                {LISTING_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleListingTypeChange(opt.value)}
                    className={`px-4 py-2.5 rounded-lg border-2 transition ${form.listingType === opt.value
                      ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Fields based on listingType */}
            {form.listingType === 'sale' ? (
              <>
                {/* สภาพบ้าน (มือ 1/มือ 2) - แสดงเฉพาะเมื่อเลือก 'ซื้อ' */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">สภาพบ้าน *</label>
                  <div className="flex flex-wrap gap-3">
                    {PROPERTY_CONDITION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ propertyCondition: opt.value, propertySubStatus: opt.value })}
                        className={`px-4 py-2.5 rounded-lg border-2 transition ${form.propertyCondition === opt.value
                          ? `${opt.color} border-blue-900 font-semibold`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* สถานะการขาย (ว่าง/ขายแล้ว) - แสดงเฉพาะเมื่อเลือก 'ซื้อ' */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">สถานะการขาย *</label>
                  <div className="flex flex-wrap gap-3">
                    {SALE_AVAILABILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ availability: opt.value, status: opt.value === 'sold' ? 'sold' : 'available' })}
                        className={`px-4 py-2.5 rounded-lg border-2 transition ${form.availability === opt.value
                          ? `${opt.color} border-blue-900 font-semibold`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Sub-selection: เช่า หรือ ผ่อนตรง - แสดงเฉพาะเมื่อเลือก 'เช่า/ผ่อนตรง' */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เลือกประเภท *</label>
                  <div className="flex flex-wrap gap-3">
                    {SUB_LISTING_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSubListingTypeChange(opt.value)}
                        className={`px-4 py-2.5 rounded-lg border-2 transition ${form.subListingType === opt.value
                          ? 'bg-blue-900 text-white border-blue-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* สถานะการจอง (ว่าง/ติดจอง) - แสดงเฉพาะเมื่อเลือก 'เช่า/ผ่อนตรง' */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">สถานะการจอง *</label>
                  <div className="flex flex-wrap gap-3">
                    {RENT_AVAILABILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update({ availability: opt.value })}
                        className={`px-4 py-2.5 rounded-lg border-2 transition ${form.availability === opt.value
                          ? `${opt.color} border-blue-900 font-semibold`
                          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-6">
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
                  checked={form.showPrice !== false}
                  onChange={(e) => update({ showPrice: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-slate-700">แสดงราคาเต็มหน้าเว็บ</span>
              </label>
            </div>

            {/* Custom Tags Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Custom Tags</label>
              <div className="space-y-3">
                {/* Input for adding new tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="พิมพ์ Tag แล้วกด Enter เพื่อเพิ่ม"
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const tagValue = e.target.value.trim()
                        if (tagValue) {
                          const currentTags = form.customTags || []
                          const normalizedTag = tagValue.toLowerCase()
                          const isDuplicate = currentTags.some(
                            (tag) => tag.toLowerCase() === normalizedTag
                          )
                          if (!isDuplicate) {
                            update({ customTags: [...currentTags, tagValue] })
                            e.target.value = ''
                          } else {
                            alert(`Tag "${tagValue}" มีอยู่แล้ว`)
                          }
                        }
                      }
                    }}
                  />
                </div>
                {/* Display existing tags */}
                {form.customTags && form.customTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.customTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-md text-sm font-medium border border-blue-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            update({
                              customTags: form.customTags.filter((_, i) => i !== index),
                            })
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                          aria-label={`ลบ ${tag}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Tags เหล่านี้จะถูกแสดงผลในหน้าบ้านพร้อมไอคอนอัตโนมัติ
              </p>
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
            <p className="text-xs text-slate-500 mb-3">คลิกที่ไอคอน ⭐ เพื่อตั้งเป็นภาพหน้าปก</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {form.images.map((url, i) => {
                const isCoverImage = form.coverImageUrl === url || (!form.coverImageUrl && i === 0)
                return (
                  <div
                    key={i}
                    className={`relative group ${isCoverImage ? 'ring-4 ring-green-500 ring-offset-2' : ''}`}
                  >
                    <img
                      src={url}
                      alt=""
                      className={`w-24 h-24 object-cover rounded-lg ${isCoverImage ? 'opacity-90' : ''}`}
                    />
                    {/* Cover Image Badge */}
                    {isCoverImage && (
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        <span>ภาพหน้าปก</span>
                      </div>
                    )}
                    {/* Set Cover Image Button */}
                    {!isCoverImage && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, coverImageUrl: url }))}
                        className="absolute top-1 left-1 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition"
                        title="ตั้งเป็นภาพหน้าปก"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    {/* Remove Image Button */}
                    {isEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          // ถ้าลบรูปที่เป็น coverImageUrl ให้ reset coverImageUrl
                          if (form.coverImageUrl === url) {
                            const remainingImages = form.images.filter((_, idx) => idx !== i)
                            setForm((prev) => ({
                              ...prev,
                              images: remainingImages,
                              coverImageUrl: remainingImages.length > 0 ? remainingImages[0] : '',
                            }))
                          } else {
                            removeExistingImage(i)
                          }
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
              {newFiles.map((file, i) => {
                const fileUrl = URL.createObjectURL(file)
                const isCoverImage = form.coverImageUrl === fileUrl
                return (
                  <div
                    key={`new-${i}`}
                    className={`relative group ${isCoverImage ? 'ring-4 ring-green-500 ring-offset-2' : ''}`}
                  >
                    <img
                      src={fileUrl}
                      alt=""
                      className={`w-24 h-24 object-cover rounded-lg ${isCoverImage ? 'opacity-90' : ''}`}
                    />
                    {/* Cover Image Badge */}
                    {isCoverImage && (
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        <span>ภาพหน้าปก</span>
                      </div>
                    )}
                    {/* Set Cover Image Button */}
                    {!isCoverImage && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, coverImageUrl: fileUrl }))}
                        className="absolute top-1 left-1 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition"
                        title="ตั้งเป็นภาพหน้าปก"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    {/* Remove Image Button */}
                    <button
                      type="button"
                      onClick={() => {
                        // ถ้าลบรูปที่เป็น coverImageUrl ให้ reset coverImageUrl
                        if (form.coverImageUrl === fileUrl) {
                          const remainingNewFiles = newFiles.filter((_, idx) => idx !== i)
                          const remainingImages = form.images
                          setForm((prev) => ({
                            ...prev,
                            coverImageUrl: remainingImages.length > 0 ? remainingImages[0] : '',
                          }))
                          setNewFiles(remainingNewFiles)
                        } else {
                          removeNewFile(i)
                        }
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
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
