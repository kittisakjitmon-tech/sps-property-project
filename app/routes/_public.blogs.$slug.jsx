/**
 * ★ Blog Detail Page — Route Module with Server-Side Loader
 * 
 * ข้อมูลบทความถูกดึงจาก Firestore ใน `clientLoader` ก่อน React render
 * → HTML มี title, content, cover image ครบ 100% ตั้งแต่ Server render
 * → OG meta tags สำหรับ social sharing ถูกใส่ลงใน <head> เลย
 */
import { useState } from 'react'
import { Link, useNavigate, useParams, data } from 'react-router'
import { Calendar, ArrowLeft } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { getBlogByIdOnce } from '../lib/firestore'
import { getCloudinaryLargeUrl, getCloudinaryMediumUrl, isValidImageUrl } from '../lib/cloudinary'
import { extractIdFromSlug, generateBlogSlug, getBlogPath } from '../lib/blogSlug'

// ─── SEO Meta Tags (Server-rendered) ────────────────────────────────────────
export function meta({ data: loaderData }) {
  if (!loaderData?.blog) {
    return [
      { title: "ไม่พบบทความ | SPS Property Solution" },
      { name: "robots", content: "noindex" },
    ]
  }
  const blog = loaderData.blog
  const title = `${blog.title} | SPS Property Solution`
  const description = (blog.content || '').substring(0, 160) + '...'
  const canonicalUrl = `https://spspropertysolution.com${getBlogPath(blog)}`
  const rawCover = blog.images?.[0]
  const ogImage = rawCover && isValidImageUrl(rawCover) ? getCloudinaryLargeUrl(rawCover) : 'https://spspropertysolution.com/icon.png'

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    // Open Graph
    { property: "og:type", content: "article" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:url", content: canonicalUrl },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ]
}

// ─── Client-Side Loader ──────────────────────────────────────────────────────
export async function clientLoader({ params }) {
  const blogId = extractIdFromSlug(params.slug)
  if (!blogId) {
    throw data("Not Found", { status: 404 })
  }

  const blog = await getBlogByIdOnce(blogId)
  if (!blog || !blog.published) {
    throw data("Not Found", { status: 404 })
  }

  return { blog }
}
clientLoader.hydrate = true

// ─── Component ───────────────────────────────────────────────────────────────
export default function BlogDetailPage({ loaderData }) {
  const blog = loaderData?.blog
  const { slug, id } = useParams()
  const navigate = useNavigate()

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
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

  if (!blog) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">ไม่พบบทความ</h1>
            <Link to="/blogs" className="inline-flex items-center gap-2 text-blue-900 hover:underline">
              <ArrowLeft className="h-5 w-5" /> กลับไปหน้าบทความทั้งหมด
            </Link>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Redirect ถ้า slug ไม่ตรงกับ canonical
  const canonicalSlug = generateBlogSlug(blog)
  if (id && !slug) navigate(`/blogs/${canonicalSlug}`, { replace: true })
  else if (canonicalSlug && slug !== canonicalSlug) navigate(`/blogs/${canonicalSlug}`, { replace: true })

  const rawCover = blog.images?.[0]
  const coverImage = rawCover && isValidImageUrl(rawCover) ? rawCover : null
  const youtubeEmbedUrl = getYouTubeEmbedUrl(blog.youtubeUrl)

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link to="/blogs" className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-900 mb-6 transition">
          <ArrowLeft className="h-5 w-5" /> กลับไปหน้าบทความทั้งหมด
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
            <img src={getCloudinaryLargeUrl(coverImage)} alt={blog.title} className="w-full h-auto object-cover" loading="eager" decoding="async" />
          </div>
        )}

        {/* YouTube Video */}
        {youtubeEmbedUrl && (
          <div className="mb-8 aspect-video rounded-lg overflow-hidden">
            <iframe src={youtubeEmbedUrl} title={blog.title} className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-slate max-w-none mb-8">
          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{blog.content}</div>
        </div>

        {/* Image Gallery */}
        {blog.images && blog.images.length > 1 && (() => {
          const validExtra = blog.images.slice(1).filter(isValidImageUrl)
          if (validExtra.length === 0) return null
          return (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">รูปภาพเพิ่มเติม</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {validExtra.map((imageUrl, index) => (
                  <div key={index} className="rounded-lg overflow-hidden">
                    <img src={getCloudinaryMediumUrl(imageUrl)} alt={`${blog.title} - รูปภาพ ${index + 2}`}
                      className="w-full h-auto object-cover" loading="lazy" decoding="async" />
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Back to Blogs */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <Link to="/blogs" className="inline-flex items-center gap-2 text-blue-900 hover:underline font-medium">
            <ArrowLeft className="h-5 w-5" /> กลับไปหน้าบทความทั้งหมด
          </Link>
        </div>
      </div>
    </PageLayout>
  )
}
