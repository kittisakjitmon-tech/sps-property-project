import test from 'node:test'
import assert from 'node:assert/strict'
import { planQuotationLayout, wrapQuotationText } from './quotationLayout.js'
const measure=(text,size)=>[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(text)].length*size*.65
const snapshot={code:'SPS-TH-2CLASS-411',title:'บ้านแฝด 2 ชั้น หนองกะขะ ซอย 8',location:'หนองกะขะ พานทอง ชลบุรี',sellerName:'ฝ่ายขาย SPS',customerName:'ลูกค้าตัวอย่าง',gifts:Array.from({length:16},(_,i)=>`${i+1}. ปั๊มน้ำและถังสำรองน้ำ รายละเอียดรุ่นและขอบเขตรอยืนยัน`).join('\n'),notes:'โปรดยืนยันราคา สถานะทรัพย์ และของแถมก่อนจอง\nเฟอร์นิเจอร์ในภาพไม่รวม เว้นแต่ระบุไว้'}
test('16 detailed gifts fit one page in two columns with no omissions',()=> {
 const plan=planQuotationLayout(snapshot,measure)
 assert.equal(plan.columns.flat().length,16)
 assert.deepEqual(plan.columns.flat().map(entry=>entry.lines.join('')),snapshot.gifts.split('\n'))
 assert.ok(plan.contentEnd<=970);assert.ok(plan.fontSize>=10.5);assert.ok(plan.photoHeight>=192)
})
test('allows blank gifts and notes and accounts for long names and title',()=> {
 const plan=planQuotationLayout({...snapshot,gifts:'',notes:'',sellerName:'ฝ่ายขายชื่อยาว '.repeat(4),title:'บ้านแฝด 2 ชั้น ทำเลหนองกะขะ ซอย 8 พร้อมพื้นที่ใช้สอยแยกจากที่ดิน'},measure)
 assert.equal(plan.columns.flat().length,0);assert.ok(plan.peopleHeight>76);assert.ok(plan.titleY>plan.peopleY+plan.peopleHeight)
})
test('overlong content fails explicitly instead of dropping gifts, clipping or making unreadable text',()=> {
 assert.throws(()=>planQuotationLayout({...snapshot,gifts:'รายละเอียดของแถมจำนวนมาก '.repeat(2000)},measure),/หน้าเดียว/)
})
test('wrap preserves Thai graphemes and all original non-whitespace text',()=> {
 const source='ปั๊มน้ำและถังน้ำ ไม่รวมน้ำยากำจัดปลวก'
 assert.equal(wrapQuotationText(source,80,12,measure).join('').replace(/\s/g,''),source.replace(/\s/g,''))
})
