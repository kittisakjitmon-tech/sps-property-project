import test from 'node:test'
import assert from 'node:assert/strict'
import { searchProperty, propertyStatus, countPropertyStatuses, filterByBudget, sortProperties, hasCoordinates } from './propertyManagement.js'

test('ค้นจากทำเล โครงการ แท็ก และคำหลายคำ โดยไม่ต้องมีในชื่อ', () => {
  const property = { title: 'บ้านหลังใหญ่', location: { district: 'พานทอง', province: 'ชลบุรี' }, project: 'AKE Home', customTags: ['ฟรีโอน'] }
  assert.equal(searchProperty(property, 'พานทอง ชลบุรี'), true)
  assert.equal(searchProperty(property, 'ake home'), true)
  assert.equal(searchProperty(property, 'ฟรีโอน'), true)
  assert.equal(searchProperty(property, 'ศรีราชา'), false)
})
test('สถานะใหม่เป็นหลัก รองรับสถานะภาษาไทยเดิม', () => {
  assert.equal(propertyStatus({ availability: 'reserved', status: 'available' }), 'reserved')
  assert.equal(propertyStatus({ status: 'ติดจอง' }), 'reserved')
  assert.equal(propertyStatus({ availability: 'available', status: 'pending' }), 'pending')
})
test('งบรวมขอบเขตและราคา 0 แต่ไม่รวมรายการที่ไม่ทราบราคา', () => {
  const items = [{ price: 0 }, { price: 100 }, { price: 200 }, { price: null }]
  assert.deepEqual(filterByBudget(items, '0', '100'), items.slice(0, 2))
  assert.deepEqual(filterByBudget(items, '200', '100'), [])
})
test('เรียงราคาทั้งสองทาง ไม่เปลี่ยนลำดับต้นฉบับ และวางราคาว่างท้ายรายการ', () => {
  const items = [{ price: 200 }, { price: null }, { price: 100 }]
  assert.deepEqual(sortProperties(items, 'price-asc').map(p => p.price), [100, 200, null])
  assert.deepEqual(sortProperties(items, 'price-desc').map(p => p.price), [200, 100, null])
  assert.equal(items[0].price, 200)
})
test('พิกัดต้องครบและอยู่ในช่วง รองรับศูนย์', () => {
  assert.equal(hasCoordinates({ lat: 0, lng: 0 }), true)
  assert.equal(hasCoordinates({ lat: 13, lng: null }), false)
  assert.equal(hasCoordinates({ lat: 91, lng: 100 }), false)
})

test('วันที่สลับได้สองทิศทาง โดยวันที่ว่างอยู่ท้ายเสมอ และใช้ updatedAt จริง', () => {
  const items = [{ id: 'old', createdAt: { seconds: 100 }, updatedAt: { seconds: 300 } }, { id: 'missing', createdAt: null }, { id: 'new', createdAt: { seconds: 200 }, updatedAt: { seconds: 400 } }]
  assert.deepEqual(sortProperties(items, 'latest').map(p => p.id), ['new', 'old', 'missing'])
  assert.deepEqual(sortProperties(items, 'created-asc').map(p => p.id), ['old', 'new', 'missing'])
  assert.deepEqual(sortProperties(items, 'updated').map(p => p.id), ['new', 'old', 'missing'])
  assert.deepEqual(sortProperties(items, 'updated-asc').map(p => p.id), ['old', 'new', 'missing'])
})
test('ชื่อและประเภทเรียงตามข้อความที่แสดง ส่วนสถานะเรียงตามขั้นตอนงาน', () => {
  const items = [{ title: 'บ้าน 10', type: 'b', status: 'sold' }, { title: 'บ้าน 2', type: 'a', status: 'available' }]
  assert.equal(sortProperties(items, 'title-asc')[0].title, 'บ้าน 2')
  assert.equal(sortProperties(items, 'title-desc')[0].title, 'บ้าน 10')
  const labels = type => ({ a: 'Z', b: 'A' })[type]
  assert.equal(sortProperties(items, 'type-asc', labels)[0].type, 'b')
  assert.equal(sortProperties(items, 'type-desc', labels)[0].type, 'a')
  assert.equal(sortProperties(items, 'status-asc')[0].status, 'available')
  assert.equal(sortProperties(items, 'status-desc')[0].status, 'sold')
})

test('summary counts use full inventory and remain unchanged after search, budget and status filtering', () => {
  const inventory = [{ title: 'บ้าน A', price: 100, status: 'available' }, { title: 'บ้าน B', price: 200, status: 'available' }, { title: 'บ้าน C', price: 300, status: 'reserved' }, { title: 'บ้าน D', price: 400, status: 'pending' }]
  const counts = countPropertyStatuses(inventory)
  assert.deepEqual(counts, { available: 2, reserved: 1, pending: 1 })
  const filtered = filterByBudget(inventory, '150', '350').filter(p => propertyStatus(p) === 'reserved' && searchProperty(p, 'บ้าน C'))
  assert.equal(filtered.length, 1)
  assert.deepEqual(countPropertyStatuses(inventory), counts)
})
