function sanitizeBlogSlugPart(str) {
  return String(str)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\-]/g, '')
}

/**
 * Build a URL-safe slug from blog data.
 * Format: {title-slug}--{id}
 */
export function generateBlogSlug(blog) {
  if (!blog?.id) return ''
  const titlePart = blog.title
    ? sanitizeBlogSlugPart(blog.title).replace(/-{2,}/g, '-') || `blog-${blog.id}`
    : `blog-${blog.id}`
  return `${titlePart}--${blog.id}`
}

/** Full path for a blog detail page */
export function getBlogPath(blog) {
  if (!blog?.id) return '/blogs'
  return `/blogs/${generateBlogSlug(blog)}`
}

/** Extract Firestore document ID from slug param (backward-compatible) */
export function extractIdFromSlug(slugParam) {
  if (!slugParam) return null
  const sep = slugParam.lastIndexOf('--')
  return sep !== -1 ? slugParam.substring(sep + 2) : slugParam
}
