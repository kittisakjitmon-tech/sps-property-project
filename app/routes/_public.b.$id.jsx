/**
 * /b/:id — Short URL redirect for blogs
 * Redirect to canonical /blogs/:slug path
 */
import { useParams, useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { getBlogByIdOnce } from '../lib/firestore'
import { generateBlogSlug } from '../lib/blogSlug'

export default function BlogRedirect() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getBlogByIdOnce(id).then(b => {
      if (b) navigate(`/blogs/${generateBlogSlug(b)}`, { replace: true })
      else navigate('/', { replace: true })
      setLoading(false)
    }).catch(() => { navigate('/', { replace: true }); setLoading(false) })
  }, [id, navigate])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">กำลังโหลด...</p></div>
  return null
}
