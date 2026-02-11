import { useState, useEffect } from 'react'
import { getFavorites } from '../lib/favorites'
import { getPropertiesSnapshot } from '../lib/firestore'
import PageLayout from '../components/PageLayout'
import PropertyCard from '../components/PropertyCard'
import { Heart } from 'lucide-react'

export default function Favorites() {
  const [favoriteIds, setFavoriteIds] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setFavoriteIds(getFavorites())
    const unsub = getPropertiesSnapshot(setProperties)
    return () => unsub()
  }, [])

  useEffect(() => {
    // Update favorites when localStorage changes
    const interval = setInterval(() => {
      setFavoriteIds(getFavorites())
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const favoriteProperties = properties.filter((p) => favoriteIds.includes(p.id))

  return (
    <PageLayout heroTitle="รายการโปรด" heroSubtitle="ทรัพย์สินที่คุณบันทึกไว้" searchComponent={null}>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {favoriteProperties.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">ยังไม่มีรายการโปรด</h2>
              <p className="text-slate-500 mb-6">คลิกปุ่มหัวใจบนการ์ดทรัพย์สินเพื่อบันทึกเป็นรายการโปรด</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">
                  รายการโปรด ({favoriteProperties.length})
                </h1>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
