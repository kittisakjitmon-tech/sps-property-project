import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { MapPin, Bed, Bath, Maximize2 } from 'lucide-react'
import { getCloudinaryThumbUrl } from '../lib/cloudinary'

// Constants
const formatPrice = (price, isRental, showPrice) => {
    if (showPrice === false) return 'Contact for Price'
    if (!price) return 'Contact for Price'
    const formatted = new Intl.NumberFormat('th-TH').format(price)
    return isRental ? `฿${formatted}/เดือน` : `฿${formatted}`
}

export default function RelatedProperties({ currentPropertyId, district, type }) {
    const [related, setRelated] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRelated = async () => {
            try {
                setLoading(true)
                const seen = new Set([currentPropertyId])
                let items = []

                // ขั้น 1: type + district เดียวกัน
                if (district && type) {
                    const q1 = query(
                        collection(db, 'properties'),
                        where('status', '==', 'available'),
                        where('type', '==', type),
                        where('location.district', '==', district),
                        limit(4)
                    )
                    const snap1 = await getDocs(q1)
                    snap1.forEach(doc => {
                        if (!seen.has(doc.id)) {
                            seen.add(doc.id)
                            items.push({ id: doc.id, ...doc.data() })
                        }
                    })
                }

                // ขั้น 2: type เดียวกัน ทุก district (ถ้ายังไม่ครบ 3)
                if (items.length < 3 && type) {
                    const q2 = query(
                        collection(db, 'properties'),
                        where('status', '==', 'available'),
                        where('type', '==', type),
                        limit(10)
                    )
                    const snap2 = await getDocs(q2)
                    snap2.forEach(doc => {
                        if (!seen.has(doc.id) && items.length < 3) {
                            seen.add(doc.id)
                            items.push({ id: doc.id, ...doc.data() })
                        }
                    })
                }

                // ขั้น 3: ทรัพย์ล่าสุดทั่วไป (ถ้ายังไม่ครบ 3)
                if (items.length < 3) {
                    const q3 = query(
                        collection(db, 'properties'),
                        where('status', '==', 'available'),
                        limit(15)
                    )
                    const snap3 = await getDocs(q3)
                    snap3.forEach(doc => {
                        if (!seen.has(doc.id) && items.length < 3) {
                            seen.add(doc.id)
                            items.push({ id: doc.id, ...doc.data() })
                        }
                    })
                }

                setRelated(items)
            } catch (error) {
                console.error('Error fetching related properties:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRelated()
    }, [currentPropertyId, district, type])

    if (loading) {
        return (
            <div className="mt-12 mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-4">บ้านที่คุณอาจสนใจ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="aspect-[4/3] bg-slate-200" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (related.length === 0) return null

    return (
        <div className="mt-12 mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-4">บ้านที่คุณอาจสนใจ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {related.map(prop => {
                    const coverImage = (prop.images && prop.images.length > 0) ? prop.images[0] : null

                    return (
                        <Link key={prop.id} to={`/properties/${prop.id}`} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
                            <div className="aspect-[4/3] bg-slate-200 overflow-hidden relative">
                                {coverImage ? (
                                    <img src={getCloudinaryThumbUrl(coverImage)} alt={prop.title} width={400} height={300} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                                )}
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-blue-900 shadow-sm">
                                    {formatPrice(prop.price, prop.isRental, prop.showPrice)}
                                </div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-semibold text-slate-900 line-clamp-1 mb-2 group-hover:text-blue-700 transition">{prop.title}</h4>
                                <div className="flex items-center gap-1.5 text-slate-500 mb-3 text-sm">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">{prop.location?.district || ''}, {prop.location?.province || ''}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-600 border-t pt-3">
                                    <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {prop.bedrooms || '-'}</span>
                                    <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {prop.bathrooms || '-'}</span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
