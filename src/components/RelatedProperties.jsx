import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { MapPin, Bed, Bath, Maximize2 } from 'lucide-react'

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
        if (!district || !type) return

        const fetchRelated = async () => {
            try {
                setLoading(true)
                const q = query(
                    collection(db, 'properties'),
                    where('status', '==', 'available'),
                    where('type', '==', type),
                    where('location.district', '==', district),
                    limit(4)
                )

                const snapshot = await getDocs(q)
                const items = []
                snapshot.forEach(doc => {
                    if (doc.id !== currentPropertyId) {
                        items.push({ id: doc.id, ...doc.data() })
                    }
                })

                // Take up to 3 properties (we fetched 4 in case one is the current property)
                setRelated(items.slice(0, 3))
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
            <div className="animate-pulse flex gap-4 mt-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-slate-200 rounded-xl flex-1"></div>
                ))}
            </div>
        )
    }

    if (related.length === 0) return null

    return (
        <div className="mt-12 mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 border-b pb-4">ทรัพย์สินที่เกี่ยวข้อง / ใกล้เคียง</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {related.map(prop => {
                    const coverImage = (prop.images && prop.images.length > 0) ? prop.images[0] : null

                    return (
                        <Link key={prop.id} to={`/properties/${prop.id}`} className="group bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
                            <div className="aspect-[4/3] bg-slate-200 overflow-hidden relative">
                                {coverImage ? (
                                    <img src={coverImage} alt={prop.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
