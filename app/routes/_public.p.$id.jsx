/**
 * /p/:id — Short URL redirect for properties
 * Redirect to canonical /properties/:slug path
 */
import { useParams, useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { getPropertyByIdOnce } from '../lib/firestore'
import { generatePropertySlug } from '../lib/propertySlug'

export default function PropertyRedirect() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getPropertyByIdOnce(id).then(p => {
      if (p) navigate(`/properties/${generatePropertySlug(p)}`, { replace: true })
      else navigate('/', { replace: true })
      setLoading(false)
    }).catch(() => { navigate('/', { replace: true }); setLoading(false) })
  }, [id, navigate])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">กำลังโหลด...</p></div>
  return null
}
