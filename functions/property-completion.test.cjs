const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createService, tokenHash, CompletionError } = require('./property-completion-core.cjs')

function fakeDb(seed = {}) {
  const store = new Map(Object.entries(seed))
  let serial = 0
  const doc = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path) })
  const snapshot = path => ({ exists: store.has(path), data: () => structuredClone(store.get(path)), id: path.split('/').at(-1) })
  const collection = name => ({
    name,
    doc(...args) {
      if (args.length && (typeof args[0] !== 'string' || !args[0])) throw new Error('Document path must be a non-empty string')
      return doc(`${name}/${args.length ? args[0] : `auto${++serial}`}`)
    },
    select: () => collection(name),
  })
  let tail = Promise.resolve()
  return {
    store, doc, collection,
    runTransaction(fn) {
      const result = tail.then(async () => {
        const writes = []
        const result = await fn({
          get: async ref => ref.path ? snapshot(ref.path) : { docs: [...store.entries()].filter(([key]) => key.startsWith(`${ref.name}/`)).map(([key]) => snapshot(key)) },
          set: (ref, value, options) => writes.push(() => store.set(ref.path, options?.merge ? { ...store.get(ref.path), ...structuredClone(value) } : structuredClone(value))),
          update: (ref, value) => writes.push(() => { if (!store.has(ref.path)) throw Error('missing'); store.set(ref.path, { ...store.get(ref.path), ...structuredClone(value) }) }),
        })
        for (const write of writes) write()
        return result
      })
      tail = result.catch(() => {})
      return result
    },
  }
}
const USER = { role: 'admin', status: 'active' }
const FORM = { title: 'บ้านเดี่ยว', type: 'SPS-S-1CLASS-ID', listingType: 'sale', price: '', priceMax: '', locationDisplay: '', location: { province: '', district: '', subDistrict: '' }, bedrooms: 3, bathrooms: 2, area: 200, description: 'บ้านพร้อมอยู่', images: ['https://res.cloudinary.com/demo/image/upload/a.jpg'], agentContact: { phone: '0123456789' }, bankPrice: 3000000, commissionRate: 3 }
const VALUES = { price: 2600000, locationDisplay: 'นาป่า', province: 'ชลบุรี', district: 'เมืองชลบุรี', subDistrict: 'นาป่า' }
const TOKEN = 'a'.repeat(64)
const NOW = 1800000000000
function setup(seed = {}) {
  const db = fakeDb({ 'users/admin1': USER, ...seed })
  let time = NOW
  const service = createService({ db, now: () => time, tokenFactory: () => TOKEN, serverTimestamp: () => time })
  return { db, service, later: value => { time = value } }
}
const create = service => service.admin({ action: 'create', form: FORM }, { auth: { uid: 'admin1' } })
const rejects = (promise, code) => assert.rejects(promise, err => err instanceof CompletionError && err.code === code)

test('creation requires active authorized issuer and stores only a hash of opaque token', async () => {
  const { service, db } = setup()
  await rejects(service.admin({ action: 'create', form: FORM }, {}), 'unauthenticated')
  db.store.set('users/member1', { role: 'member' })
  await rejects(service.admin({ action: 'create', form: FORM }, { auth: { uid: 'member1' } }), 'permission-denied')
  const result = await create(service)
  assert.equal(result.token, TOKEN)
  assert.equal(result.expiresAt, NOW + 7 * 86400000)
  assert(db.store.has(`_propertyCompletionRequests/${tokenHash(TOKEN)}`))
  assert(!JSON.stringify([...db.store.values()]).includes(TOKEN))
  assert.equal([...db.store.keys()].filter(key => key.startsWith('properties/')).length, 0)
})

test('public view exposes photos and listing facts while withholding internal contacts and finance', async () => {
  const { service } = setup()
  await create(service)
  const result = await service.public({ action: 'read', token: TOKEN })
  assert.equal(result.state, 'open')
  assert.deepEqual(result.form.images, FORM.images)
  for (const secret of ['agentContact', 'bankPrice', 'commissionRate', 'createdBy']) assert.equal(result.form[secret], undefined)
  assert(result.missingFields.includes('price'))
  assert(result.missingFields.includes('province'))
  assert(!result.missingFields.includes('bedrooms'))
})

test('submit requires complete valid fields and rejects tampering with known or privileged data', async () => {
  const { service } = setup()
  await create(service)
  for (const patch of [{ ...VALUES, bedrooms: 99 }, { ...VALUES, createdBy: 'hacker' }, { ...VALUES, images: [] }, { ...VALUES, price: true }, { ...VALUES, price: -1 }, { ...VALUES, priceMax: 2400000 }, { ...VALUES, subDistrict: '' }, { ...VALUES, price: 0 }]) {
    await rejects(service.public({ action: 'submit', token: TOKEN, values: patch }), 'invalid-argument')
  }
  await rejects(service.public({ action: 'submit', token: TOKEN, values: {} }), 'invalid-argument')
})

test('valid completion atomically publishes exactly one property and retries return its id', async () => {
  const { service, db } = setup({ 'properties/old': { displayId: 'SPS-TW-1CLASS-017', propertyId: 'SPS-TW-1CLASS-017' } })
  await create(service)
  const requests = await Promise.all([1, 2].map(() => service.public({ action: 'submit', token: TOKEN, values: VALUES })))
  assert.deepEqual(requests[0], requests[1])
  const property = db.store.get(`properties/${requests[0].propertyId}`)
  assert.equal(property.price, 2600000)
  assert.equal(property.title, 'บ้านเดี่ยว นาป่า')
  assert.equal(property.status, 'available')
  assert.equal(property.availability, 'available')
  assert.equal(property.createdBy, 'admin1')
  assert.equal(property.displayId, 'SPS-S-1CLASS-018')
  assert.equal(property.area, 200)
  assert.equal(property.bankPrice, 3000000)
  assert.equal((await service.public({ action: 'read', token: TOKEN })).state, 'completed')
  assert.equal([...db.store.keys()].filter(key => key.startsWith('properties/')).length, 2)
})

test('expired revoked malformed and disabled-issuer links cannot read or publish', async () => {
  for (const scenario of ['expired', 'revoked', 'disabled']) {
    const { service, db, later } = setup()
    await create(service)
    if (scenario === 'expired') later(NOW + 7 * 86400000)
    if (scenario === 'revoked') await service.admin({ action: 'revoke', token: TOKEN }, { auth: { uid: 'admin1' } })
    if (scenario === 'disabled') db.store.set('users/admin1', { ...USER, disabled: true })
    for (const action of ['read', 'submit']) await assert.rejects(service.public({ action, token: TOKEN, values: VALUES }))
    assert.equal([...db.store.keys()].filter(key => key.startsWith('properties/')).length, 0)
  }
  const { service } = setup()
  for (const token of ['../admin', '', null, 'b'.repeat(64)]) await rejects(service.public({ action: 'read', token }), 'not-found')
})

test('editing an existing property enforces ownership, version at creation and version at submit', async () => {
  const old = { ...FORM, price: null, createdBy: 'owner', updatedAt: 100, status: 'pending', availability: 'pending' }
  const { service, db } = setup({ 'properties/p1': old, 'users/agent1': { role: 'agent' } })
  const data = { action: 'create', form: FORM, propertyId: 'p1', baseVersion: 100 }
  await rejects(service.admin(data, { auth: { uid: 'agent1' } }), 'permission-denied')
  await rejects(service.admin({ ...data, baseVersion: 99 }, { auth: { uid: 'admin1' } }), 'failed-precondition')
  await service.admin(data, { auth: { uid: 'admin1' } })
  db.store.set('properties/p1', { ...old, updatedAt: 101 })
  await rejects(service.public({ action: 'submit', token: TOKEN, values: VALUES }), 'failed-precondition')
  assert.equal(db.store.get('properties/p1').status, 'pending')
})

test('deleted properties cannot be recreated and forbidden status transitions cannot publish sold stock', async () => {
  for (const scenario of ['deleted', 'sold']) {
    const old = { ...FORM, createdBy: 'admin1', updatedAt: 100, status: scenario === 'sold' ? 'sold' : 'pending', availability: scenario === 'sold' ? 'sold' : 'pending' }
    const { service, db } = setup({ 'properties/p1': old })
    if (scenario === 'sold') {
      await rejects(service.admin({ action: 'create', form: FORM, propertyId: 'p1', baseVersion: 100 }, { auth: { uid: 'admin1' } }), 'failed-precondition')
      continue
    }
    await service.admin({ action: 'create', form: FORM, propertyId: 'p1', baseVersion: 100 }, { auth: { uid: 'admin1' } })
    db.store.delete('properties/p1')
    await rejects(service.public({ action: 'submit', token: TOKEN, values: VALUES }), 'failed-precondition')
    assert(!db.store.has('properties/p1'))
  }
})

test('known location components remain fixed and optional missing fields accept valid area only', async () => {
  const { service, db } = setup()
  await service.admin({ action: 'create', form: { ...FORM, area: '', location: { province: 'ชลบุรี', district: '', subDistrict: '' } } }, { auth: { uid: 'admin1' } })
  await rejects(service.public({ action: 'submit', token: TOKEN, values: VALUES }), 'invalid-argument')
  const { province, ...values } = VALUES
  const result = await service.public({ action: 'submit', token: TOKEN, values: { ...values, area: 216, usableAreaSqm: 120 } })
  const property = db.store.get(`properties/${result.propertyId}`)
  assert.equal(property.location.province, province)
  assert.equal(property.area, 216)
})

test('separate concurrent links allocate distinct listing codes without sharing a sequence number', async () => {
  const db = fakeDb({ 'users/admin1': USER })
  let tokenNumber = 0
  const service = createService({ db, now: () => NOW, tokenFactory: () => String(++tokenNumber).padStart(64, '0') })
  const first = await create(service)
  const second = await create(service)
  const completed = await Promise.all([first, second].map(({ token }) => service.public({ action: 'submit', token, values: VALUES })))
  assert.notEqual(completed[0].propertyId, completed[1].propertyId)
  assert.deepEqual(completed.map(result => db.store.get(`properties/${result.propertyId}`).displayId), ['SPS-S-1CLASS-001', 'SPS-S-1CLASS-002'])
})

test('agent may revoke their own link and cannot revoke another issuer link', async () => {
  const { service, db } = setup({ 'users/agent1': { role: 'agent' } })
  await create(service)
  await rejects(service.admin({ action: 'revoke', token: TOKEN }, { auth: { uid: 'agent1' } }), 'permission-denied')
  assert.equal(db.store.get(`_propertyCompletionRequests/${tokenHash(TOKEN)}`).state, 'open')
  const result = await service.admin({ action: 'revoke', token: TOKEN }, { auth: { uid: 'admin1' } })
  assert.equal(result.state, 'revoked')
})

test('invalid photos, oversized forms, numeric rooms and exact-price copy cannot publish', async () => {
  for (const form of [
    { ...FORM, images: ['javascript:alert(1)'] },
    { ...FORM, images: [] },
    { ...FORM, bedrooms: 2.5 },
    { ...FORM, bedrooms: true },
    { ...FORM, description: 'a'.repeat(20001) },
  ]) {
    const { service } = setup()
    await rejects(service.admin({ action: 'create', form }, { auth: { uid: 'admin1' } }), 'invalid-argument')
  }
  const { service } = setup()
  await rejects(service.admin({ action: 'create', form: { ...FORM, description: 'ราคา 2,600,000 บาท' } }, { auth: { uid: 'admin1' } }), 'invalid-argument')
})

test('legacy zero price remains missing, safe photo URLs and showPrice are preserved', async () => {
  const { service, db } = setup()
  const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/test/o/a.jpg?alt=media&token=photo-token'
  const result = await service.admin({ action: 'create', form: { ...FORM, price: 0, showPrice: false, images: [...FORM.images, firebaseUrl] } }, { auth: { uid: 'admin1' } })
  assert(result.missingFields.includes('price'))
  const saved = await service.public({ action: 'submit', token: TOKEN, values: VALUES })
  assert.equal(db.store.get(`properties/${saved.propertyId}`).showPrice, false)
  assert.deepEqual(db.store.get(`properties/${saved.propertyId}`).images, [...FORM.images, firebaseUrl])
})

test('optional-only missing fields can be completed and known maximum price cannot be changed', async () => {
  const { service, db } = setup()
  const form = { ...FORM, ...VALUES, location: { province: VALUES.province, district: VALUES.district, subDistrict: VALUES.subDistrict }, area: '' }
  const result = await service.admin({ action: 'create', form }, { auth: { uid: 'admin1' } })
  assert(result.missingFields.includes('area'))
  const saved = await service.public({ action: 'submit', token: TOKEN, values: { area: 216 } })
  assert.equal(db.store.get(`properties/${saved.propertyId}`).area, 216)
  const next = setup()
  await next.service.admin({ action: 'create', form: { ...FORM, priceMax: 2900000 } }, { auth: { uid: 'admin1' } })
  await rejects(next.service.public({ action: 'submit', token: TOKEN, values: { ...VALUES, priceMax: 3000000 } }), 'invalid-argument')
})

test('document ID allocation matches the installed Firestore SDK zero-argument contract', async () => {
  const { Firestore } = require('firebase-admin/firestore')
  const real = new Firestore({ projectId: 'sps-completion-test' }).collection('properties')
  const fake = fakeDb().collection('properties')
  for (const collection of [real, fake]) {
    assert.throws(() => collection.doc(undefined))
    assert.throws(() => collection.doc(''))
    assert(collection.doc().id)
    assert.equal(collection.doc('existing-house').id, 'existing-house')
  }
  // Resolve reference creation with the real SDK, while all database reads and writes stay local.
  const db = fakeDb({ 'users/admin1': USER })
  const localCollection = db.collection
  db.collection = name => {
    const local = localCollection(name)
    return { ...local, doc(...args) {
      const ref = new Firestore({ projectId: 'sps-completion-test' }).collection(name).doc(...args)
      return { path: ref.path, id: ref.id, get: async () => ({ data: () => structuredClone(db.store.get(ref.path)) }) }
    } }
  }
  const service = createService({ db, now: () => NOW, tokenFactory: () => TOKEN })
  const result = await create(service)
  assert.equal(result.token, TOKEN)
})

test('creation rejects an uneditable invalid title even without location while accepting missing titles', async () => {
  const { service } = setup()
  await rejects(service.admin({ action: 'create', form: { ...FORM, title: 'บ้าน โครงการทดสอบ' } }, { auth: { uid: 'admin1' } }), 'invalid-argument')
  for (const locationDisplay of ['', 'นาป่า']) {
    const next = setup()
    const result = await next.service.admin({ action: 'create', form: { ...FORM, title: '', locationDisplay } }, { auth: { uid: 'admin1' } })
    assert(result.missingFields.includes('title'))
  }
  const next = setup()
  const result = await next.service.admin({ action: 'create', form: { ...FORM, title: 'โครงการทดสอบ', project: 'ทดสอบ' } }, { auth: { uid: 'admin1' } })
  assert(result.missingFields.includes('title'))
})

test('completed links reopen with saved fields and update the same published property', async () => {
  const { service, db } = setup()
  await create(service)
  const saved = await service.public({ action: 'submit', token: TOKEN, values: { ...VALUES, priceMax: 2900000 } })
  const view = await service.public({ action: 'read', token: TOKEN })
  assert.equal(view.state, 'completed')
  assert.equal(view.form.price, VALUES.price)
  assert.equal(view.form.province, VALUES.province)
  assert(view.missingFields.includes('priceMax'))
  assert.equal(view.form.bankPrice, undefined)
  const path = `properties/${saved.propertyId}`
  db.store.set(path, { ...db.store.get(path), views: 42 })
  const latest = await service.public({ action: 'read', token: TOKEN })
  const edit = { action: 'update', token: TOKEN, revision: latest.revision, values: { price: 2700000, priceMax: 3100000 } }
  assert.deepEqual(await service.public(edit), saved)
  assert.deepEqual(await service.public(edit), saved)
  const current = db.store.get(path)
  assert.equal(current.price, 2700000)
  assert.equal(current.priceMax, 3100000)
  assert.equal(current.views, 42)
  assert.equal(current.bankPrice, FORM.bankPrice)
  assert.equal(current.createdAt, NOW)
  assert.equal(current.displayId, 'SPS-S-1CLASS-001')
  await service.public({ action: 'submit', token: TOKEN, values: VALUES })
  assert.equal(db.store.get(path).price, 2700000)
  assert.equal([...db.store.keys()].filter(key => key.startsWith('properties/')).length, 1)
})

test('completed links reject unauthorized fields and stale revisions including concurrent edits', async () => {
  const { service, db } = setup()
  await create(service)
  const saved = await service.public({ action: 'submit', token: TOKEN, values: VALUES })
  const view = await service.public({ action: 'read', token: TOKEN })
  for (const values of [{ title: 'เปลี่ยนชื่อ' }, { bankPrice: 1 }, { bedrooms: 9 }, { price: 0 }]) {
    await rejects(service.public({ action: 'update', token: TOKEN, revision: view.revision, values }), 'invalid-argument')
  }
  await rejects(service.public({ action: 'update', token: TOKEN, values: { price: 2800000 } }), 'failed-precondition')
  const results = await Promise.allSettled([2700000, 2800000].map(price => service.public({ action: 'update', token: TOKEN, revision: view.revision, values: { price } })))
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter(result => result.status === 'rejected').length, 1)
  const next = await service.public({ action: 'read', token: TOKEN })
  const path = `properties/${saved.propertyId}`
  db.store.set(path, { ...db.store.get(path), description: 'แก้ไขจากหลังบ้าน' })
  await rejects(service.public({ action: 'update', token: TOKEN, revision: next.revision, values: { price: 2900000 } }), 'failed-precondition')
})

test('legacy completed links remain editable while expiry revocation issuer and property status are enforced', async () => {
  for (const scenario of ['legacy', 'expired', 'revoked', 'disabled', 'deleted', 'sold']) {
    const { service, db, later } = setup()
    await create(service)
    const saved = await service.public({ action: 'submit', token: TOKEN, values: VALUES })
    const view = await service.public({ action: 'read', token: TOKEN })
    if (scenario === 'expired') later(NOW + 7 * 86400000)
    if (scenario === 'revoked') await service.admin({ action: 'revoke', token: TOKEN }, { auth: { uid: 'admin1' } })
    if (scenario === 'disabled') db.store.set('users/admin1', { ...USER, disabled: true })
    if (scenario === 'deleted') db.store.delete(`properties/${saved.propertyId}`)
    if (scenario === 'sold') db.store.set(`properties/${saved.propertyId}`, { ...db.store.get(`properties/${saved.propertyId}`), status: 'sold' })
    const edit = { action: 'update', token: TOKEN, revision: view.revision, values: { price: 2800000 } }
    if (scenario === 'legacy') {
      await service.public(edit)
      assert.equal((await service.public({ action: 'read', token: TOKEN })).form.price, 2800000)
    } else {
      await assert.rejects(service.public({ action: 'read', token: TOKEN }))
      await assert.rejects(service.public(edit))
    }
  }
})
