import { planQuotationLayout } from './quotationLayout.js'
import logoUrl from '../../assets/logo.png'
import regularFontUrl from '../../assets/fonts/NotoSansThai-Regular.ttf?url'
import boldFontUrl from '../../assets/fonts/NotoSansThai-SemiBold.ttf?url'

const W = 794, H = 1123, SCALE = 2
const colors = { navy: '#153459', ink: '#20334b', muted: '#64758a', pale: '#f3f7fa', line: '#dce4ec' }
let fontsReady
async function loadFonts() {
  if (!fontsReady) fontsReady = Promise.all([
    new FontFace('SPSQuotation', `url(${regularFontUrl})`, { weight: '400' }).load(),
    new FontFace('SPSQuotation', `url(${boldFontUrl})`, { weight: '600' }).load(),
  ]).then(fonts => fonts.forEach(font => document.fonts.add(font))).catch(error => { fontsReady = null; throw error })
  return fontsReady
}
async function loadImage(url) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  const loaded = new Promise((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ กรุณาเลือกรูปอื่น หรือลองใหม่'))
  })
  image.src = url
  return loaded
}

// A small PDF image writer: embed full-resolution JPEG pages with byte-accurate xref offsets.
export function jpegPagesToPdf(pages, width = W * SCALE, height = H * SCALE) {
  const encoder = new TextEncoder(), chunks = [], offsets = [0]
  let length = 0
  const push = value => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); length += bytes.length }
  const obj = (id, content) => { offsets[id] = length; push(`${id} 0 obj\n`); content(); push('\nendobj\n') }
  push('%PDF-1.4\n')
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3+i*3} 0 R`).join(' ')}] >>`))
  pages.forEach((bytes, i) => {
    const id = 3 + i * 3
    obj(id, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`))
    obj(id+1, () => { push(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`); push(bytes); push('\nendstream') })
    const stream = 'q\n595.276 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n'
    obj(id+2, () => push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`))
  })
  const xref = length, count = 3 + pages.length * 3
  push(`xref\n0 ${count}\n0000000000 65535 f \n`)
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(chunks, { type: 'application/pdf' })
}

export async function renderQuotation(snapshot) {
  await loadFonts()
  const [logo, photo] = await Promise.all([loadImage(logoUrl), loadImage(snapshot.photo)])
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE; canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  const measure = (value, size, bold = false) => { ctx.font = `${bold ? 600 : 400} ${size}px SPSQuotation`; return ctx.measureText(value).width }
  const layout = planQuotationLayout(snapshot, measure)
  const text = (x, y, value, size = 13, bold = false, color = colors.ink, align = 'left') => {
    ctx.font = `${bold ? 600 : 400} ${size}px SPSQuotation`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(String(value ?? ''), x, y)
  }
  const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) }
  const line = (y, x = 45, end = 749) => { ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(end, y); ctx.stroke() }
  const contain = (image, x, y, w, h) => { const scale = Math.min(w/image.width, h/image.height); const dw=image.width*scale, dh=image.height*scale; ctx.drawImage(image, x+(w-dw)/2, y+(h-dh)/2, dw, dh) }
  const drawLines = (lines, x, y, size, spacing, bold = false, color = colors.ink) => lines.forEach((s, i) => text(x, y+i*spacing, s, size, bold, color))
  const money = value => Number(value).toLocaleString('th-TH', { maximumFractionDigits: 2 })
  const price = money(snapshot.price) + (snapshot.priceMax != null && snapshot.priceMax !== snapshot.price ? ` - ${money(snapshot.priceMax)}` : '')
  const date = new Date(`${snapshot.date}T12:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
  rect(0,0,W,H,'white'); rect(0,0,W,8,colors.navy)
  contain(logo,45,25,70,53); text(129,49,'SPS Property Solution',20,true,colors.navy); text(129,73,'บ้านคอนโดสวย อมตะซิตี้ ชลบุรี',11,false,colors.muted)
  text(749,50,'ใบเสนอราคา',26,true,colors.navy,'right');text(749,73,'QUOTATION',10,false,colors.muted,'right');line(97)
  text(45,126,`รหัสทรัพย์ ${snapshot.code}`,15,true,colors.navy);text(749,126,date,11,false,colors.muted,'right')
  rect(45,layout.peopleY,704,layout.peopleHeight,colors.pale)
  const people = [[61,'ผู้เสนอราคา',snapshot.sellerPhone],[412,'ลูกค้า',snapshot.customerPhone]]
  people.forEach(([x,label,phone],i) => {
    text(x,layout.peopleY+18,label,10,false,colors.muted)
    drawLines(layout.names[i],x,layout.peopleY+38,13,17,true)
    text(x,layout.peopleY+layout.peopleHeight-12,`โทรศัพท์ ${phone || '-'}`,11)
  })
  drawLines(layout.title,45,layout.titleY,18,24,true,colors.navy)
  drawLines(layout.location,45,layout.locationY,11.5,17,false,colors.muted)
  const y=layout.photoY, h=layout.photoHeight
  rect(45,y,284,h,colors.pale);contain(photo,52,y+7,270,h-14)
  text(351,y+17,'รายละเอียดทรัพย์',14,true,colors.navy)
  const rows=[['ห้องนอน',snapshot.bedrooms==null?'-':`${snapshot.bedrooms} ห้อง`],['ห้องน้ำ',snapshot.bathrooms==null?'-':`${snapshot.bathrooms} ห้อง`],['พื้นที่ดิน',snapshot.landAreaSqw==null?'-':`${money(snapshot.landAreaSqw)} ตร.ว.`]]
  if(snapshot.usableAreaSqm!=null) rows.push(['พื้นที่ใช้สอย',`${money(snapshot.usableAreaSqm)} ตร.ม.`])
  rows.forEach(([label,value],i)=> { text(351,y+37+i*17,label,11,false,colors.muted);text(737,y+37+i*17,value,12,true,colors.ink,'right') })
  if(snapshot.bankPrice!=null) {
    text(351,y+h-91,'ราคาหน้าสัญญา / ราคาประเมิน',10.5,false,colors.muted)
    text(737,y+h-68,`${money(snapshot.bankPrice)} บาท`,18,true,colors.navy,'right')
  }
  rect(351,y+h-54,398,54,colors.navy)
  text(364,y+h-36,snapshot.isRental?'ราคาเช่า / ผ่อนตรง':'ราคาเสนอขายหลังส่วนลด',11,false,'#cee5f3')
  let size=25
  while(size>14 && measure(`${price} บาท`,size,true)>370) size--
  text(736,y+h-10,`${price} บาท`,size,true,'white','right')
  if (layout.columns.some(column=>column.length)) {
    text(45,layout.giftsY,'ของแถมและสิทธิประโยชน์',14,true,colors.navy)
    layout.columns.forEach((column,index)=> {
      const x=index===0?45:408
      let rowY=layout.giftsY+23
      column.forEach(entry=> {
        text(x,rowY,'•',layout.fontSize,false,colors.navy)
        drawLines(entry.lines,x+13,rowY,layout.fontSize,layout.leading)
        rowY+=entry.height
      })
    })
  }
  if(layout.notes.length) {
    line(layout.notesY-8)
    text(45,layout.notesY+9,'หมายเหตุและเงื่อนไข',13,true,colors.navy)
    drawLines(layout.notes,45,layout.notesY+31,layout.noteSize,layout.noteLeading,false,colors.muted)
  }
  line(1012,75,325);line(1012,469,719)
  text(200,1034,'ผู้เสนอราคา',11,false,colors.muted,'center');text(594,1034,'ผู้รับใบเสนอราคา',11,false,colors.muted,'center')
  line(1065);text(45,1090,'SPS Property Solution',10,true,colors.navy);text(749,1090,'หน้า 1 / 1',10,false,colors.muted,'right')
  const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', .94).split(',')[1]), ch=>ch.charCodeAt(0))
  return { blob: jpegPagesToPdf([jpeg]), preview: canvas.toDataURL('image/jpeg', .85), pages: 1 }
}
