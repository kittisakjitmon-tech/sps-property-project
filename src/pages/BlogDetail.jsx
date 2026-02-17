import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, ArrowLeft, Play } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { getBlogByIdOnce } from '../lib/firestore'

export default function BlogDetail() {
  const { id } = useParams()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const loadBlog = async () => {
      try {
        const blogData = await getBlogByIdOnce(id)
        if (!blogData || !blogData.published) {
          setBlog(null)
        } else {
          setBlog(blogData)
        }
      } catch (error) {
        console.error('Error loading blog:', error)
        setBlog(null)
      } finally {
        setLoading(false)
      }
    }

    loadBlog()
  }, [id])

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const extractYouTubeId = (url) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const getYouTubeEmbedUrl = (url) => {
    const videoId = extractYouTubeId(url)
    if (!videoId) return null
    return `https://www.youtube.com/embed/${videoId}`
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded-lg"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              <div className="h-4 bg-slate-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!blog) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">ไม่พบบทความ</h1>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 text-blue-900 hover:underline"
            >
              <ArrowLeft className="h-5 w-5" />
              กลับไปหน้าบทความทั้งหมด
            </Link>
          </div>
        </div>
      </PageLayout>
    )
  }

  const coverImage = blog.images?.[0]
  const youtubeEmbedUrl = getYouTubeEmbedUrl(blog.youtubeUrl)

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-900 mb-6 transition"
        >
          <ArrowLeft className="h-5 w-5" />
          กลับไปหน้าบทความทั้งหมด
        </Link>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{blog.title}</h1>

        {/* Date */}
        <div className="flex items-center gap-2 text-slate-500 mb-8">
          <Calendar className="h-5 w-5" />
          <span>{formatDate(blog.createdAt)}</span>
        </div>

        {/* Cover Image */}
        {coverImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={coverImage}
              alt={blog.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* YouTube Video */}
        {youtubeEmbedUrl && (
          <div className="mb-8 aspect-video rounded-lg overflow-hidden">
            <iframe
              src={youtubeEmbedUrl}
              title={blog.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-slate max-w-none mb-8">
          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
            {blog.content}
          </div>
        </div>

        {/* Image Gallery */}
        {blog.images && blog.images.length > 1 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">รูปภาพเพิ่มเติม</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blog.images.slice(1).map((imageUrl, index) => (
                <div key={index} className="rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={`${blog.title} - รูปภาพ ${index + 2}`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blogs */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-blue-900 hover:underline font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            กลับไปหน้าบทความทั้งหมด
          </Link>
        </div>
      </div>
    </PageLayout>
  )
}
