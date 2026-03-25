/**
 * spoo.me short URL helper
 * - Uses the spoo.me endpoint: https://spoo.me/
 * - Returns short URL (string) or original longUrl on failure
 */

const SPOO_TIMEOUT = 8000 // ms

async function fetchWithTimeout(url, opts = {}, timeout = SPOO_TIMEOUT) {
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

export async function createSpoomeShortUrl(longUrl) {
  if (!longUrl || typeof longUrl !== 'string') return null
  try {
    const res = await fetchWithTimeout('https://spoo.me/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `url=${encodeURIComponent(longUrl)}`
    })
    
    if (!res.ok) throw new Error('spoo.me request failed')
    
    const data = await res.json()
    // spoo.me returns { short_url: "https://spoo.me/xxx", original_url: "...", domain: "spoo.me" }
    if (data && data.short_url) return data.short_url
    
    throw new Error('Invalid spoo.me response')
  } catch (err) {
    console.warn('spoo.me shortening failed, falling back to long URL', err)
    return longUrl
  }
}

export default { createSpoomeShortUrl }
