const { createHash, randomBytes } = require('node:crypto')
const { normalizeListingTitle, listingContentIssues } = require('./property-content-rules.cjs')

const COLLECTION = '_propertyCompletionRequests'
const LIFETIME = 7 * 86400000
const TYPES = new Set(['SPS-S-1CLASS-ID', 'SPS-S-2CLASS-ID', 'SPS-TW-1CLASS-ID', 'SPS-TW-2CLASS-ID', 'SPS-TH-1CLASS-ID', 'SPS-TH-2CLASS-ID', 'SPS-PV-ID', 'SPS-CD-ID', 'SPS-LD-ID', 'SPS-RP-ID'])
const TEXT_FIELDS = { title: 300, project: 200, locationDisplay: 300, description: 20000, mapUrl: 2000, subListingType: 40, propertyCondition: 40, propertySubStatus: 40 }
const NUMBER_FIELDS = ['price', 'priceMax', 'bedrooms', 'bathrooms', 'area', 'usableAreaSqm', 'commissionRate', 'bankPrice']
const OPTIONAL_FIELDS = ['area', 'usableAreaSqm', 'mapUrl']
const LOCATION_FIELDS = ['province', 'district', 'subDistrict']
const BOOLEAN_FIELDS = ['featured', 'isRental', 'directInstallment', 'hotDeal', 'showPrice']
const SAFE_FIELDS = ['title', 'type', 'listingType', 'price', 'priceMax', 'locationDisplay', 'location', 'bedrooms', 'bathrooms', 'area', 'usableAreaSqm', 'description', 'images', 'coverImageUrl', 'mapUrl']

class CompletionError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const fail = message => { throw new CompletionError('invalid-argument', message) }
const blank = value => value == null || value === ''
const tokenHash = token => createHash('sha256').update(token).digest('hex')
const version = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : null)
const fingerprint = data => tokenHash(JSON.stringify(data))

function text(value, max, label) {
  if (blank(value)) return ''
  if (typeof value !== 'string' || value.length > max) fail(`${label}ยาวเกินกำหนดหรือรูปแบบไม่ถูกต้อง`)
  return value.trim()
}
function number(value, label) {
  if (blank(value)) return null
  if (!['number', 'string'].includes(typeof value) || !String(value).trim() || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1e12) fail(`${label}ต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป`)
  return Number(value)
}
function imageUrl(value) {
  const url = text(value, 4096, 'ลิงก์รูป')
  try { if (new URL(url).protocol !== 'https:') fail('ลิงก์รูปต้องเป็น HTTPS') } catch { fail('ลิงก์รูปไม่ถูกต้อง') }
  return url
}
function sanitizeForm(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 150000) fail('ข้อมูลบ้านไม่ถูกต้องหรือมีขนาดใหญ่เกินกำหนด')
  const form = {}
  for (const [key, max] of Object.entries(TEXT_FIELDS)) form[key] = text(input[key], max, key)
  for (const key of NUMBER_FIELDS) form[key] = number(input[key], key)
  for (const key of ['bedrooms', 'bathrooms']) if (form[key] != null && (!Number.isInteger(form[key]) || form[key] > 1000)) fail('จำนวนห้องต้องเป็นจำนวนเต็มไม่เกิน 1,000')
  form.type = TYPES.has(input.type) ? input.type : ''
  form.listingType = ['sale', 'rent'].includes(input.listingType) ? input.listingType : ''
  form.location = Object.fromEntries(LOCATION_FIELDS.map(key => [key, text(input.location?.[key], 100, key)]))
  for (const key of BOOLEAN_FIELDS) form[key] = input[key] === true
  form.showPrice = input.showPrice !== false
  if (!Array.isArray(input.images) || !input.images.length || input.images.length > 15) fail('กรุณาแนบรูปบ้าน 1–15 รูปก่อนสร้างลิงก์')
  form.images = [...new Set(input.images.map(imageUrl))]
  form.coverImageUrl = input.coverImageUrl && form.images.includes(input.coverImageUrl) ? input.coverImageUrl : form.images[0]
  form.customTags = Array.isArray(input.customTags) ? input.customTags.slice(0, 60).map(value => text(value, 150, 'แท็ก')).filter(Boolean) : []
  form.agentContact = Object.fromEntries(['name', 'lineId', 'phone'].map(key => [key, text(input.agentContact?.[key], 200, 'ข้อมูลผู้ดูแล')]))
  for (const [key, max] of [['lat', 90], ['lng', 180]]) {
    const value = input[key]
    if (!blank(value) && (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max)) fail('พิกัดแผนที่ไม่ถูกต้อง')
    form[key] = blank(value) ? null : value
  }
  if (form.mapUrl) imageUrl(form.mapUrl)
  return form
}

function missingFields(form) {
  const fields = ['title', 'type', 'listingType', 'locationDisplay'].filter(key => !form[key])
  if (!(form.price > 0)) fields.push('price')
  for (const key of LOCATION_FIELDS) if (!form.location?.[key]) fields.push(key)
  if (form.type !== 'SPS-LD-ID') for (const key of ['bedrooms', 'bathrooms']) if (blank(form[key])) fields.push(key)
  for (const key of OPTIONAL_FIELDS) if (blank(form[key]) || (key !== 'mapUrl' && form[key] === 0)) fields.push(key)
  return fields
}
function publicView(form) {
  const view = Object.fromEntries(SAFE_FIELDS.map(key => [key, form[key] ?? null]))
  return { ...view, ...form.location }
}
function applySubmission(request, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) fail('กรุณากรอกข้อมูลบ้านที่ขาด')
  const allowed = new Set(request.missingFields)
  if (allowed.has('price') && blank(request.form.priceMax)) allowed.add('priceMax')
  for (const key of Object.keys(values)) if (!allowed.has(key)) fail('ลิงก์นี้เติมได้เฉพาะช่องที่ขาด กรุณาโหลดหน้าอีกครั้ง')
  const next = { ...request.form, location: { ...request.form.location } }
  for (const [key, value] of Object.entries(values)) {
    if (LOCATION_FIELDS.includes(key)) next.location[key] = value
    else next[key] = value
  }
  const form = sanitizeForm(next)
  const remaining = missingFields(form).filter(key => !OPTIONAL_FIELDS.includes(key))
  if (remaining.length) fail('กรุณากรอกชื่อบ้าน ประเภท ราคา ที่ตั้ง และจำนวนห้องให้ครบก่อนเผยแพร่')
  if (form.priceMax != null && form.priceMax < form.price) fail('ราคาสูงสุดต้องไม่น้อยกว่าราคาเริ่มต้น')
  form.title = normalizeListingTitle(form.title, form.project, form.locationDisplay, form.location)
  const issues = listingContentIssues(form)
  if (issues.length) fail(issues.join('\n'))
  form.isRental = form.listingType === 'rent'
  form.subListingType = form.isRental ? (form.subListingType || 'rent_only') : null
  form.directInstallment = form.isRental && form.subListingType === 'installment_only'
  return { ...form, status: 'available', availability: 'available' }
}
function validUser(user) {
  return user && ['super_admin', 'admin', 'agent'].includes(user.role) && !user.disabled && !['disabled', 'suspended', 'inactive', 'pending', 'blocked'].includes(user.status)
}
function assertUser(user) {
  if (!validUser(user)) throw new CompletionError('permission-denied', 'บัญชีผู้สร้างลิงก์ไม่มีสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแล')
}
function assertPropertyAccess(user, uid, property) {
  if (user.role === 'agent' && property.createdBy !== uid) throw new CompletionError('permission-denied', 'สร้างลิงก์ได้เฉพาะบ้านที่คุณดูแล')
  if (['sold', 'reserved', 'unavailable', 'ขายแล้ว', 'ติดจอง', 'ไม่ว่าง'].includes(property.status) || ['sold', 'reserved', 'unavailable', 'ขายแล้ว', 'ติดจอง', 'ไม่ว่าง'].includes(property.availability)) {
    throw new CompletionError('failed-precondition', 'บ้านขายแล้ว ติดจอง หรือไม่ว่าง กรุณาตรวจสถานะในหลังบ้านก่อน')
  }
}
function requestRef(db, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new CompletionError('not-found', 'ไม่พบลิงก์นี้ กรุณาขอลิงก์ใหม่จากผู้ส่ง')
  return db.collection(COLLECTION).doc(tokenHash(token))
}
function assertOpen(request, now) {
  if (!request) throw new CompletionError('not-found', 'ไม่พบลิงก์นี้ กรุณาขอลิงก์ใหม่จากผู้ส่ง')
  if (request.state === 'revoked') throw new CompletionError('failed-precondition', 'ผู้ส่งยกเลิกลิงก์นี้แล้ว กรุณาขอลิงก์ใหม่')
  if (request.expiresAt <= now) throw new CompletionError('deadline-exceeded', 'ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่จากผู้ส่ง')
}
function nextDisplayId(type, documents) {
  const numbers = documents.flatMap(document => {
    const data = document.data()
    return [data.displayId, data.propertyId].map(value => Number(String(value || '').match(/\d+$/)?.[0] || 0))
  })
  const prefix = type.endsWith('-ID') ? type.slice(0, -2) : 'SPS-X-'
  return `${prefix}${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`
}

function createService({ db, now = Date.now, tokenFactory = () => randomBytes(32).toString('hex'), serverTimestamp = now }) {
  async function adminAction(data, context) {
    if (!context?.auth?.uid) throw new CompletionError('unauthenticated', 'กรุณาเข้าสู่ระบบหลังบ้านก่อนสร้างลิงก์')
    const uid = context.auth.uid
    const userRef = db.collection('users').doc(uid)
    const user = (await userRef.get()).data()
    assertUser(user)
    if (data?.action === 'revoke') {
      const ref = requestRef(db, data.token)
      return db.runTransaction(async tx => {
        const request = (await tx.get(ref)).data()
        if (!request) throw new CompletionError('not-found', 'ไม่พบลิงก์นี้')
        if (request.createdBy !== uid && user.role === 'agent') throw new CompletionError('permission-denied', 'คุณไม่มีสิทธิ์ยกเลิกลิงก์นี้')
        tx.update(ref, { state: 'revoked', revokedAt: now() })
        return { state: 'revoked' }
      })
    }
    if (data?.action !== 'create') fail('คำขอไม่ถูกต้อง')
    const form = sanitizeForm(data.form)
    form.title = normalizeListingTitle(form.title, form.project, form.locationDisplay, form.location)
    const issues = listingContentIssues({
      ...form,
      // A missing title is supplied by the recipient before suffix validation can apply.
      locationDisplay: form.title ? form.locationDisplay : '',
    }, { allowMissingLocation: true })
    if (issues.length) fail([...new Set(issues)].join('\n'))
    if (form.price > 0 && form.priceMax != null && form.priceMax < form.price) fail('ราคาสูงสุดต้องไม่น้อยกว่าราคาเริ่มต้น')
    const token = tokenFactory()
    const ref = requestRef(db, token)
    const propertyId = data.propertyId || null
    if (propertyId && (typeof propertyId !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(propertyId))) fail('รหัสบ้านไม่ถูกต้อง')
    const properties = db.collection('properties')
    const propertyRef = propertyId ? properties.doc(propertyId) : properties.doc()
    const missing = missingFields(form)
    if (!missing.length) fail('ข้อมูลบ้านครบแล้ว กรุณาบันทึกบ้านจากหลังบ้านได้เลย')
    const expiresAt = now() + LIFETIME
    return db.runTransaction(async tx => {
      const freshUser = (await tx.get(userRef)).data()
      assertUser(freshUser)
      const property = propertyId ? (await tx.get(propertyRef)).data() : null
      if (propertyId) {
        if (!property) throw new CompletionError('not-found', 'ไม่พบบ้านหลังนี้ กรุณากลับไปรายการบ้าน')
        assertPropertyAccess(freshUser, uid, property)
        if (version(property.updatedAt) !== (data.baseVersion ?? null)) throw new CompletionError('failed-precondition', 'ข้อมูลบ้านเปลี่ยนแล้ว กรุณาโหลดหน้าแก้ไขใหม่ก่อนสร้างลิงก์')
      }
      tx.set(ref, { form, missingFields: missing, propertyId: propertyRef.id, existing: Boolean(propertyId), baseFingerprint: property ? fingerprint(property) : null, createdBy: uid, createdAt: now(), expiresAt, state: 'open' })
      return { token, expiresAt, missingFields: missing }
    })
  }

  async function publicAction(data) {
    if (!['read', 'submit', 'update'].includes(data?.action)) fail('คำขอไม่ถูกต้อง')
    const ref = requestRef(db, data.token)
    return db.runTransaction(async tx => {
      const request = (await tx.get(ref)).data()
      assertOpen(request, now())
      const issuer = (await tx.get(db.collection('users').doc(request.createdBy))).data()
      assertUser(issuer)
      if (request.state === 'completed') {
        const propertyRef = db.collection('properties').doc(request.propertyId)
        const current = (await tx.get(propertyRef)).data()
        if (!current) throw new CompletionError('not-found', 'ไม่พบบ้านหลังนี้ กรุณาติดต่อผู้ส่งลิงก์')
        const result = { state: 'completed', propertyId: request.propertyId }
        // Retried first submissions must never overwrite subsequent corrections.
        if (data.action === 'submit') return result
        assertPropertyAccess(issuer, request.createdBy, current)
        const fields = [...request.missingFields]
        if (fields.includes('price') && blank(request.form.priceMax)) fields.push('priceMax')
        if (data.action === 'read') return {
          ...result, form: publicView(current), missingFields: fields,
          expiresAt: request.expiresAt, revision: fingerprint(current),
        }
        if (request.lastEditRevision === data.revision && request.lastEditValues === fingerprint(data.values || {})) return result
        if (typeof data.revision !== 'string' || data.revision !== fingerprint(current)) {
          throw new CompletionError('failed-precondition', 'ข้อมูลบ้านเปลี่ยนแล้ว กรุณาเปิดลิงก์ใหม่ก่อนแก้ไข')
        }
        const payload = applySubmission({ ...request, form: current, missingFields: fields }, data.values)
        tx.set(propertyRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
        tx.update(ref, { lastEditRevision: data.revision, lastEditValues: fingerprint(data.values || {}), updatedAt: now() })
        return result
      }
      if (data.action === 'update') throw new CompletionError('failed-precondition', 'กรุณาเปิดลิงก์ใหม่ก่อนแก้ไข')
      if (data.action === 'read') return { state: 'open', form: publicView(request.form), missingFields: request.missingFields, expiresAt: request.expiresAt }
      const payload = applySubmission(request, data.values)
      const propertyRef = db.collection('properties').doc(request.propertyId)
      const current = (await tx.get(propertyRef)).data()
      if (request.existing) {
        if (!current || fingerprint(current) !== request.baseFingerprint) throw new CompletionError('failed-precondition', 'ข้อมูลบ้านถูกแก้ไขหรือลบแล้ว กรุณาขอลิงก์ใหม่จากผู้ส่ง')
        assertPropertyAccess(issuer, request.createdBy, current)
      } else if (current) throw new CompletionError('failed-precondition', 'รหัสบ้านนี้ถูกใช้แล้ว กรุณาขอลิงก์ใหม่จากผู้ส่ง')
      let displayId = current?.displayId || current?.propertyId
      if (!displayId) {
        const properties = await tx.get(db.collection('properties').select('displayId', 'propertyId'))
        displayId = nextDisplayId(payload.type, properties.docs)
      }
      const record = {
        ...payload, displayId, propertyId: displayId,
        createdBy: current?.createdBy || request.createdBy,
        createdAt: current?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      // Existing unrelated data (e.g. analytics) remains attached to the same listing.
      tx.set(propertyRef, record, { merge: request.existing })
      tx.update(ref, { state: 'completed', completedAt: now() })
      return { state: 'completed', propertyId: request.propertyId }
    })
  }
  return { admin: adminAction, public: publicAction }
}

module.exports = { CompletionError, createService, tokenHash, sanitizeForm, missingFields, publicView, applySubmission }
