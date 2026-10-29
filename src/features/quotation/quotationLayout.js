// Plan all text before drawing. A quote is either one readable A4 page or an explicit error.
export function wrapQuotationText(value, width, size, measure, bold = false) {
  const lines = []
  const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' })
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    let row = ''
    for (const { segment } of segmenter.segment(paragraph)) {
      if (row && measure(row + segment, size, bold) > width) { lines.push(row.trimEnd()); row = segment.trimStart() }
      else row += segment
    }
    lines.push(row)
  }
  return lines
}

export function planQuotationLayout(snapshot, measure) {
  const wrap = (value, width, size, bold = false) => wrapQuotationText(value, width, size, measure, bold)
  const names = [snapshot.sellerName, snapshot.customerName].map(name => wrap(name, 318, 13, true))
  const peopleY = 147, peopleHeight = 59 + Math.max(...names.map(lines => lines.length)) * 17
  const titleY = peopleY + peopleHeight + 27
  const title = wrap(snapshot.title || snapshot.code, 704, 18, true)
  const location = snapshot.location ? wrap(snapshot.location, 704, 11.5) : []
  const locationY = titleY + title.length * 24
  const photoY = locationY + location.length * 17 + 9
  const giftItems = String(snapshot.gifts || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  const noteContent = String(snapshot.notes || '').trim()
  for (const fontSize of [12, 11.5, 11, 10.5]) {
    const leading = fontSize * 1.45
    const entries = giftItems.map(item => {
      const lines = wrap(item, 323, fontSize)
      return { lines, height: lines.length * leading + 5 }
    })
    let columns = [[], []], giftsHeight = 0, best = Infinity
    for (let split = 0; split <= entries.length; split++) {
      const candidate = [entries.slice(0, split), entries.slice(split)]
      const heights = candidate.map(column => column.reduce((sum, entry) => sum + entry.height, 0))
      const height = Math.max(...heights)
      if (height < best) { best = height; columns = candidate; giftsHeight = height }
    }
    const noteSize = Math.min(fontSize, 11.5)
    const notes = noteContent ? wrap(noteContent, 704, noteSize) : []
    const noteLeading = noteSize * 1.45
    for (const photoHeight of [236, 214, 192]) {
      const giftsY = photoY + photoHeight + 26
      const notesY = giftsY + (entries.length ? 23 + giftsHeight + 13 : 0)
      const contentEnd = notesY + (notes.length ? 22 + notes.length * noteLeading : 0)
      if (contentEnd <= 970) return {
        names, peopleY, peopleHeight, titleY, title, locationY, location, photoY, photoHeight,
        fontSize, leading, columns, giftsY, giftsHeight, notesY, notes, noteSize, noteLeading, contentEnd,
      }
    }
  }
  throw new Error('ข้อความยาวเกินพื้นที่ A4 หน้าเดียว กรุณาย่อรายละเอียดของแถมหรือหมายเหตุก่อนสร้าง PDF ระบบจะไม่ตัดรายการออกหรือย่อตัวหนังสือจนอ่านยาก')
}
