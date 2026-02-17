import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, Play } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { getPublishedBlogs } from '../lib/firestore'

export default function Blogs() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [lastDoc, setLastDoc] = useState(null)
  const [pageHistory, setPageHistory] = useState([]) // Store lastDoc for each page
  const pageSize = 9

  useEffect(() => {
    loadBlogs(1)
  }, [])

  const loadBlogs = async (page) => {
    setLoading(true)
    try {
      // Get the lastDoc for this page from history
      const lastDocForPage = page === 1 ? null : pageHistory[page - 2] || null

      const result = await getPublishedBlogs(pageSize, lastDocForPage)
      setBlogs(result.blogs)
      setHasMore(result.hasMore)
      setLastDoc(result.lastDoc)

      // Update page history
      if (result.lastDoc) {
        const newHistory = [...pageHistory]
        newHistory[page - 1] = result.lastDoc
        setPageHistory(newHistory)
      }
    } catch (error) {
      console.error('Error loading blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage < 1) return
    setCurrentPage(newPage)
    loadBlogs(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeId(url)
    if (!videoId) return null
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  if (loading && blogs.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">บทความทั้งหมด</h1>
          <p className="text-slate-600">อ่านบทความที่น่าสนใจเกี่ยวกับอสังหาริมทรัพย์</p>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">ยังไม่มีบทความ</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {blogs.map((blog) => {
                const coverImage = blog.images?.[0] || getYouTubeThumbnail(blog.youtubeUrl)
                const hasVideo = !!blog.youtubeUrl

                return (
                  <Link
                    key={blog.id}
                    to={`/blogs/${blog.id}`}
                    className="group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-video bg-slate-200 overflow-hidden">
                      {coverImage ? (
                        <>
                          <img
                            src={coverImage}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {hasVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="bg-white/90 rounded-full p-3">
                                <Play className="h-6 w-6 text-blue-900" fill="currentColor" />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                          <span className="text-blue-600 text-sm font-medium">ไม่มีรูปภาพ</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition">
                        {blog.title}
                      </h2>
                      <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                        {blog.content?.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(blog.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <span className="px-4 py-2 text-slate-700">
                หน้า {currentPage}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasMore || loading}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}
