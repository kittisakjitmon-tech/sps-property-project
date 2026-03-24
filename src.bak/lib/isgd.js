/**
 * is.gd short URL helper
 * - Uses the public is.gd endpoint: https://is.gd/create.php?format=json&url=...
 * - Returns short URL (string) or original longUrl on failure
 */

const ISGD_ENDPOINT = 'https://is.gd/create.php?format=json&url='
const ISGD_TIMEOUT = 8000 // ms

async function fetchWithTimeout(url, opts = {}, timeout = ISGD_TIMEOUT) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

export async function createIsgdShortUrl(longUrl) {
  if (!longUrl || typeof longUrl !== 'string') return null
  try {
    const endpoint = ISGD_ENDPOINT + encodeURIComponent(longUrl)
    const res = await fetchWithTimeout(endpoint, { method: 'GET' })
    if (!res.ok) throw new Error('is.gd request failed')
    const data = await res.json()
    // is.gd returns {shorturl: "https://is.gd/abc", url: "...", shorturl_length: 11}
    if (data && data.shorturl) return data.shorturl
    throw new Error('Invalid is.gd response')
  } catch (err) {
    console.warn('is.gd shortening failed, falling back to long URL', err)
    return longUrl
  }
}

export default { createIsgdShortUrl }
