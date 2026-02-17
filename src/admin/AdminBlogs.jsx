import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Eye, EyeOff, Star, StarOff, ImagePlus } from 'lucide-react'
import {
  getBlogsSnapshot,
  createBlog,
  updateBlogById,
  deleteBlogById,
  uploadBlogImage,
} from '../lib/firestore'
import { compressImage } from '../lib/imageCompressor'

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    youtubeUrl: '',
    images: [],
    published: false,
    isFeatured: false,
  })
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState([])
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    const unsubscribe = getBlogsSnapshot((blogsList) => {
      setBlogs(blogsList)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      youtubeUrl: '',
      images: [],
      published: false,
      isFeatured: false,
    })
    setImageFiles([])
    setEditingBlog(null)
    setShowForm(false)
  }

  const handleEdit = (blog) => {
    setEditingBlog(blog)
    setForm({
      title: blog.title || '',
      content: blog.content || '',
      youtubeUrl: blog.youtubeUrl || '',
      images: blog.images || [],
      published: blog.published ?? false,
      isFeatured: blog.isFeatured ?? false,
    })
    setImageFiles([])
    setShowForm(true)
  }

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return

    setUploadingImages(true)
    try {
      const compressedFiles = await Promise.all(
        Array.from(files).map((file) => compressImage(file, { maxWidth: 1920, maxHeight: 1920 }))
      )

      const uploadPromises = compressedFiles.map((file) => uploadBlogImage(file))
      const urls = await Promise.all(uploadPromises)

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...urls],
      }))
      setSuccessMessage(`อัปโหลดรูปภาพสำเร็จ ${urls.length} รูป`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error uploading images:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    
    if (!form.title.trim()) {
      setErrorMessage('กรุณากรอกหัวข้อบทความ')
      return
    }

    try {
      if (editingBlog) {
        await updateBlogById(editingBlog.id, {
          title: form.title.trim(),
          content: form.content.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          images: form.images,
          published: form.published,
          isFeatured: form.isFeatured,
        })
        setSuccessMessage('อัปเดตบทความสำเร็จ')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        await createBlog({
          title: form.title.trim(),
          content: form.content.trim(),
          youtubeUrl: form.youtubeUrl.trim(),
          images: form.images,
          published: form.published,
          isFeatured: form.isFeatured,
        })
        setSuccessMessage('สร้างบทความสำเร็จ')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
      resetForm()
    } catch (error) {
      console.error('Error saving blog:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึก')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  const handleTogglePublished = async (blogId, currentStatus) => {
    try {
      await updateBlogById(blogId, { published: !currentStatus })
      setSuccessMessage(`${!currentStatus ? 'เผยแพร่' : 'ยกเลิกการเผยแพร่'} บทความสำเร็จ`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error toggling published:', error)
      setErrorMessage('เกิดข้อผิดพลาด')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  const handleToggleFeatured = async (blogId, currentStatus) => {
    try {
      // Check if we're trying to set featured to true and there are already 3 featured blogs
      if (!currentStatus) {
        const featuredCount = blogs.filter((b) => b.isFeatured && b.id !== blogId).length
        if (featuredCount >= 3) {
          setErrorMessage('สามารถตั้งค่า Featured ได้สูงสุด 3 บทความ')
          setTimeout(() => setErrorMessage(null), 5000)
          return
        }
      }
      await updateBlogById(blogId, { isFeatured: !currentStatus })
      setSuccessMessage(`${!currentStatus ? 'ตั้งเป็น' : 'ยกเลิก'} Featured สำเร็จ`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error toggling featured:', error)
      setErrorMessage('เกิดข้อผิดพลาด')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  const handleDelete = async (blogId) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบทความนี้?')) return

    try {
      await deleteBlogById(blogId)
      setSuccessMessage('ลบบทความสำเร็จ')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error deleting blog:', error)
      setErrorMessage('เกิดข้อผิดพลาดในการลบ')
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการบทความ</h1>
          <p className="text-slate-600 mt-1">เพิ่ม แก้ไข และจัดการบทความของคุณ</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-end mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition"
        >
          <Plus className="h-5 w-5" />
          เพิ่มบทความใหม่
        </button>
      </div>

      {/* Blog List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  หัวข้อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                  วันที่สร้าง
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Featured
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {blogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    ยังไม่มีบทความ
                  </td>
                </tr>
              ) : (
                blogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{blog.title || '-'}</div>
                      <div className="text-sm text-slate-500 mt-1 line-clamp-1">
                        {blog.content?.substring(0, 100)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(blog.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePublished(blog.id, blog.published)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition ${
                          blog.published
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {blog.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {blog.published ? 'เผยแพร่' : 'ไม่เผยแพร่'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleFeatured(blog.id, blog.isFeatured)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition ${
                          blog.isFeatured
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {blog.isFeatured ? <Star className="h-3 w-3 fill-current" /> : <StarOff className="h-3 w-3" />}
                        {blog.isFeatured ? 'Featured' : 'ไม่ Featured'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(blog)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(blog.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingBlog ? 'แก้ไขบทความ' : 'เพิ่มบทความใหม่'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  หัวข้อบทความ *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  เนื้อหาบทความ
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="เขียนเนื้อหาบทความที่นี่..."
                />
              </div>

              {/* YouTube URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ลิงก์วิดีโอ YouTube (ไม่บังคับ)
                </label>
                <input
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  รูปภาพ
                </label>
                <div className="space-y-4">
                  {/* Upload Button */}
                  <div>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
                      <ImagePlus className="h-5 w-5 text-slate-600" />
                      <span className="text-sm text-slate-600">
                        {uploadingImages ? 'กำลังอัปโหลด...' : 'คลิกเพื่ออัปโหลดรูปภาพ'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        disabled={uploadingImages}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image Preview */}
                  {form.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {form.images.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                    className="w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
                  />
                  <span className="text-sm font-medium text-slate-700">เผยแพร่</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="w-5 h-5 text-blue-900 border-slate-300 rounded focus:ring-blue-900/20"
                  />
                  <span className="text-sm font-medium text-slate-700">แสดงหน้าแรก (Featured)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition"
                >
                  {editingBlog ? 'บันทึกการแก้ไข' : 'สร้างบทความ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
