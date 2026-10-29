import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeQuotationSnapshot, quotationGifts, withoutProject } from './quotationData.js'
const property = { displayId:'SPS-TH-2CLASS-411', title:'ทาวน์โฮม โครงการลิเบอร์ตัน บ้านเก่า ซอย 10', project:'ลิเบอร์ตัน', price:2050000, bankPrice:2390000, area:74, bedrooms:3, bathrooms:2, commissionRate:3, locationDisplay:'บ้านเก่า, พานทอง, ชลบุรี' }
const details = { customerName:'ลูกค้า ตัวอย่าง',sellerName:'ฝ่ายขาย',date:'2026-10-27',photo:'https://example.com/home.jpg',gifts:'ปั๊มน้ำจากโครงการลิเบอร์ตัน',notes:'ของแถมตามเงื่อนไข' }
test('snapshot freezes actual price and gifts, removes project, omits internal commission and converts stored sqm to sqwa',()=> {
 const snapshot=makeQuotationSnapshot(property,details)
 assert.equal(snapshot.title,'ทาวน์โฮม บ้านเก่า ซอย 10');assert.equal(snapshot.gifts,'ปั๊มน้ำจาก');assert.equal(snapshot.landAreaSqw,18.5)
 assert.equal(snapshot.price,2050000);assert.equal(snapshot.bankPrice,2390000);assert.equal(snapshot.commissionRate,undefined)
 property.price=2100000;details.gifts='เปลี่ยนแล้ว';assert.equal(snapshot.price,2050000);assert.equal(snapshot.gifts,'ปั๊มน้ำจาก');assert.ok(Object.isFrozen(snapshot))
})
test('missing customer, seller, date, photo, invalid price and missing code block export',()=> {
 for(const override of [{customerName:''},{sellerName:''},{date:''},{photo:''}]) assert.throws(()=>makeQuotationSnapshot(property,{...details,...override}))
 for(const override of [{price:''},{price:-1},{price:'NaN'},{displayId:'',propertyId:''},{priceMax:1}]) assert.throws(()=>makeQuotationSnapshot({...property,...override},details))
})
test('extracts only gifts section and keeps qualifiers, not prices or unrelated description',()=> {
 assert.equal(quotationGifts('บ้าน\nของแถมพิเศษ\n1. ปั๊มน้ำ\n2. ท่อปลวก ไม่รวมน้ำยา\nหมายเหตุ\nราคาขาย', ''),'ปั๊มน้ำ\nท่อปลวก ไม่รวมน้ำยา')
 assert.equal(quotationGifts('ไม่มีรายการของแถมแยกไว้',''),'')
 assert.equal(withoutProject('บ้าน โครงการ A+B (เฟส 2)', 'A+B (เฟส 2)'), 'บ้าน')
})

test('imports gifts from the actual Niranda townhome and twin-home section headings', () => {
 for (const heading of ['รายการของแถมและโปรโมชั่นชุดทาวน์โฮม ตามเอกสาร (รอยืนยันสิทธิ์ปัจจุบัน)', 'รายการของแถมและสิทธิประโยชน์ชุดบ้านแฝด ตามเอกสาร (รอยืนยันสิทธิ์ปัจจุบัน)', '**รายการของแถมและสิทธิประโยชน์**', '🎁 ของแถม', '## สิทธิประโยชน์']) {
  const description = `บ้าน 3 ห้องนอน\n${heading}\n1. ปั๊มน้ำ — รุ่นรอยืนยัน\n2. ท่อปลวก — ไม่รวมน้ำยา\n\nหมายเหตุ: โปรโมชันรอยืนยัน\nข้อมูลอื่น`
  assert.equal(quotationGifts(description, ''), 'ปั๊มน้ำ — รุ่นรอยืนยัน\nท่อปลวก — ไม่รวมน้ำยา', heading)
 }
})
test('keeps inline gifts and excludes unrelated location and contact sections', () => {
 assert.equal(quotationGifts('ของแถม: ปั๊มน้ำ\r\n• ถังน้ำ\r\nทำเล: หนองกะขะ\r\nข้อมูลผู้ติดต่อ: ฝ่ายขาย', ''), 'ปั๊มน้ำ\nถังน้ำ')
 assert.equal(quotationGifts('บ้านไม่มีของแถม\nราคาและทำเล', ''), '')
})
