// Turns whatever the team pastes (an Ad ID, a post ID, a post link, a post-insights link, an
// m.me link) into the { kind, value } the referral mapping stores. Pure, so it can be tested.
//
// Facebook sends a post as PAGEID_POSTID with an ad click, and mappings match exactly, so a post
// is always stored in that form.

const digits = /^\d+$/

function decodeContentId(raw) {
  // Post-insights links carry content_id = base64("S:_I{pageId}:{postId}:...").
  try {
    const clean = decodeURIComponent(raw).replace(/-/g, '+').replace(/_/g, '/')
    const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4)
    const match = /^S:_I(\d+):(\d+)/.exec(atob(padded))
    return match ? { pageId: match[1], postId: match[2] } : null
  } catch {
    return null
  }
}

function post(pageId, postId, fallbackPageId) {
  const page = pageId || fallbackPageId
  if (!page) return { error: 'เลือกเพจก่อน ระบบต้องใช้รหัสเพจประกอบรหัสโพสต์' }
  return { kind: 'post', value: `${page}_${postId}`, linkPageId: pageId || null }
}

const PFBID = 'ลิงก์นี้ใช้รหัสโพสต์แบบเข้ารหัส (pfbid) ซึ่งแปลงเป็นตัวเลขไม่ได้ ให้เปิดโพสต์ > ดูข้อมูลเชิงลึก แล้วคัดลอกลิงก์จากหน้านั้นมาแทน หรือใช้รหัสโฆษณา'

// kindHint decides what a bare number means ('ad' or 'post').
export function parseFacebookSource(input, { pageId = '', kindHint = 'ad' } = {}) {
  const text = String(input || '').trim()
  if (!text) return null

  if (/^\d+_\d+$/.test(text)) {
    const [page, postId] = text.split('_')
    return { kind: 'post', value: text, linkPageId: page, postId }
  }
  if (digits.test(text)) {
    if (kindHint === 'post') return post('', text, pageId)
    return { kind: 'ad', value: text }
  }
  if (/^property_[\w-]+$/i.test(text)) return { kind: 'ref', value: text }

  let url
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return { error: 'อ่านค่าไม่ออก วางรหัสโฆษณา รหัสโพสต์ หรือลิงก์โพสต์จาก Facebook' }
  }
  const host = url.hostname === 'm.me' ? 'm.me' : url.hostname.replace(/^(www|m|web)\./, '')
  const params = url.searchParams

  if (host === 'm.me') {
    const ref = params.get('ref')
    return ref ? { kind: 'ref', value: ref.slice(0, 200) } : { error: 'ลิงก์ m.me นี้ไม่มี ?ref= จึงระบุบ้านไม่ได้' }
  }
  if (!/(^|\.)facebook\.com$|^fb\.com$|^fb\.me$/.test(host)) {
    return { error: 'ไม่ใช่ลิงก์ Facebook' }
  }

  // Ads Manager: ...?selected_ad_ids=123 or act=...&selected_ad_ids=
  const adIds = (params.get('selected_ad_ids') || '').split(',').filter(id => digits.test(id))
  if (adIds.length === 1) return { kind: 'ad', value: adIds[0] }
  if (adIds.length > 1) return { error: 'ลิงก์นี้เลือกไว้หลายโฆษณา เปิดทีละโฆษณาแล้วคัดลอกใหม่' }

  const contentId = params.get('content_id')
  if (contentId) {
    const decoded = decodeContentId(contentId)
    if (decoded) return { ...post(decoded.pageId, decoded.postId, pageId), postId: decoded.postId }
    return { error: 'ลิงก์ข้อมูลเชิงลึกนี้ถูกตัดหรือไม่ครบ คัดลอกลิงก์ทั้งเส้นจากแถบที่อยู่อีกครั้ง' }
  }

  const storyId = params.get('story_fbid') || params.get('fbid')
  if (storyId) {
    if (!digits.test(storyId)) return { error: PFBID }
    const owner = params.get('id')
    return { ...post(owner && digits.test(owner) ? owner : '', storyId, pageId), postId: storyId }
  }

  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'share') return { error: 'ลิงก์แชร์ (facebook.com/share/...) ไม่มีรหัสโพสต์ ให้เปิดโพสต์ > ดูข้อมูลเชิงลึก แล้วคัดลอกลิงก์จากหน้านั้น' }
  const postsAt = parts.findIndex(part => part === 'posts' || part === 'videos' || part === 'reel')
  if (postsAt >= 0 && parts[postsAt + 1]) {
    const postId = parts[postsAt + 1]
    if (!digits.test(postId)) return { error: PFBID }
    const owner = postsAt > 0 && digits.test(parts[postsAt - 1]) ? parts[postsAt - 1] : ''
    return { ...post(owner, postId, pageId), postId }
  }
  return { error: 'ลิงก์นี้ไม่มีรหัสโพสต์หรือโฆษณา ให้ใช้ลิงก์จากหน้า "ข้อมูลเชิงลึกของโพสต์" หรือรหัสโฆษณาจากตัวจัดการโฆษณา' }
}

export const SOURCE_LABELS = { ad: 'โฆษณา', post: 'โพสต์', ref: 'ลิงก์ m.me' }

export function facebookSourceLink({ kind, value, postId }, pageId) {
  const post = String(postId || (kind === 'post' ? value : ''))
  const qualified = /^(\d+)_(\d+)$/.exec(post)
  const owner = qualified?.[1] || pageId
  const story = qualified?.[2] || post
  if (digits.test(owner || '') && digits.test(story)) {
    return {
      href: `https://www.facebook.com/permalink.php?story_fbid=${story}&id=${owner}`,
      label: 'ดูโพสต์ต้นฉบับ',
    }
  }
  if (kind === 'ad' && digits.test(value)) {
    return {
      href: `https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=${value}`,
      label: 'ดูในตัวจัดการโฆษณา',
    }
  }
  return null
}
