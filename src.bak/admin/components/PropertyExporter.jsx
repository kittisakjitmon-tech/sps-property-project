import { useState } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Download, Loader2 } from 'lucide-react'
import { getPropertyLabel } from '../../constants/propertyTypes'

export default function PropertyExporter({ property }) {
    const [isExporting, setIsExporting] = useState(false)

    if (!property) return null

    const handleExport = async () => {
        setIsExporting(true)

        try {
            const zip = new JSZip()

            // 1. Generate Property Info Text
            let propertyText = `ชื่อประกาศ: ${property.title || '-'}\n`
            propertyText += `ราคา: ${property.price ? Number(property.price).toLocaleString() + ' บาท' : 'ไม่ระบุ'}\n`
            propertyText += `ประเภททรัพย์: ${getPropertyLabel(property.type) || '-'}\n`

            // Deal Type
            const listingTypeStr = property.listingType === 'rent' ? 'เช่า/ผ่อนตรง' : 'ซื้อ'
            const subListingTypeStr = property.subListingType === 'rent_only' ? 'เช่า' : property.subListingType === 'installment_only' ? 'ผ่อนตรง' : ''
            propertyText += `ประเภทการดีล: ${listingTypeStr} ${subListingTypeStr ? `(${subListingTypeStr})` : ''}\n`

            if (property.listingType === 'sale') {
                propertyText += `สภาพบ้าน: ${property.propertyCondition || '-'}\n`
            }

            propertyText += `พื้นที่: ${property.area || '-'}\n`
            propertyText += `ห้องนอน: ${property.bedrooms || '-'} ห้อง\n`
            propertyText += `ห้องน้ำ: ${property.bathrooms || '-'} ห้อง\n`

            // Location
            const loc = property.location || {}
            propertyText += `ทำเล: ${property.locationDisplay || `${loc.subDistrict || ''} ${loc.district || ''} ${loc.province || ''}`}\n`

            if (property.mapUrl) {
                propertyText += `ลิงก์ Google Map: ${property.mapUrl}\n`
            }

            propertyText += `\nรายละเอียด:\n${property.description || '-'}\n`

            // Nearby Places
            if (property.nearbyPlace && property.nearbyPlace.length > 0) {
                propertyText += `\nสถานที่ใกล้เคียง:\n`
                property.nearbyPlace.forEach((place, i) => {
                    propertyText += `- ${place.name} (${place.distance} กม.)\n`
                })
            }

            // Add text to ZIP
            zip.file(`ข้อมูลประกาศ-${property.displayId || 'property'}.txt`, propertyText)

            // 2. Download and Add Images to ZIP
            if (property.images && property.images.length > 0) {
                const imgFolder = zip.folder('รูปภาพ')
                const failedImages = []

                // Function to fetch image reliably
                const fetchImage = async (url) => {
                    try {
                        const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'download=' + Date.now();
                        const res = await fetch(fetchUrl, { mode: 'cors', cache: 'no-cache' })
                        if (!res.ok) throw new Error(`HTTP ${res.status}`)
                        return await res.blob()
                    } catch (e1) {
                        console.warn('Fetch with cors failed, trying no-cors or canvas fallback...', e1)
                        // Fallback to Canvas (this works if the server sends Access-Control-Allow-Origin but fetch still acts up)
                        return new Promise((resolve, reject) => {
                            const img = new Image()
                            img.crossOrigin = 'anonymous'
                            img.onload = () => {
                                const canvas = document.createElement('canvas')
                                canvas.width = img.width
                                canvas.height = img.height
                                const ctx = canvas.getContext('2d')
                                ctx.drawImage(img, 0, 0)
                                canvas.toBlob((blob) => {
                                    if (blob) resolve(blob)
                                    else reject(new Error('Canvas toBlob failed'))
                                }, 'image/jpeg', 0.95)
                            }
                            img.onerror = () => reject(new Error('Image load failed (likely CORS blocked by Storage Bucket)'))
                            // Use the original url, but append a cache buster
                            img.src = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now()
                        })
                    }
                }

                // Fetch all images concurrently
                const fetchPromises = property.images.map(async (imageUrl, index) => {
                    try {
                        const blob = await fetchImage(imageUrl)

                        let ext = 'jpg'
                        if (blob.type === 'image/webp') ext = 'webp'
                        else if (blob.type === 'image/png') ext = 'png'

                        const isCover = property.coverImageUrl === imageUrl || (!property.coverImageUrl && index === 0)
                        const prefix = isCover ? '00-ภาพหน้าปก' : `0${index + 1}-ภาพ`

                        imgFolder.file(`${prefix}.${ext}`, blob)
                    } catch (err) {
                        console.error(`Failed to download image ${index}:`, err)
                        failedImages.push(`ภาพที่ ${index + 1} (${err.message})`)
                    }
                })

                await Promise.all(fetchPromises)

                if (failedImages.length > 0) {
                    zip.file('read_me_errors.txt', `เกิดข้อผิดพลาดในการโหลดรูปภาพบางรูป (มักเกิดจาก CORS การตั้งค่า Firebase Storage):\n\n${failedImages.join('\n')}\n\nวิธีแก้: ให้ Admin รันคำสั่ง gsutil cors set บน Firebase Storage bucket`)
                    alert(`โหลดรูปภาพไม่สำเร็จ ${failedImages.length} รูป (ถูกบล็อกด้วยระบบความปลอดภัย)\nระบบได้สร้างไฟล์ ZIP ข้อมูลอื่น ๆ ให้แล้ว`)
                }
            }

            // 3. Generate and Save ZIP file
            const zipContent = await zip.generateAsync({ type: 'blob' })
            saveAs(zipContent, `SPS-${property.displayId || 'Property'}.zip`)

        } catch (error) {
            console.error('Export Error:', error)
            alert('เกิดข้อผิดพลาดในการรวบรวมไฟล์ดาวน์โหลด กรุณาลองใหม่อีกครั้ง')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition"
            title="ดาวน์โหลดข้อมูลประกาศเป็นไฟล์ ZIP"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            {isExporting ? 'กำลังเตรียมไฟล์…' : 'โหลด ZIP นำไปแชร์'}
        </button>
    )
}
