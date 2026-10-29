/** Keep prices as unformatted decimal strings so filtering and saving use numbers. */
export function parseMoneyInput(value) {
  const normalized = String(value ?? '').replace(/[๐-๙]/g, digit => String(digit.charCodeAt(0) - 0x0e50)).replace(/[,\s฿]/g, '')
  if (normalized === '') return ''
  if (!/^\d*(?:\.\d{0,2})?$/.test(normalized)) return null
  const [integer, fraction] = normalized.split('.')
  const clean = (integer || '0').replace(/^0+(?=\d)/, '')
  if (clean.length > 13) return null
  return fraction == null ? clean : `${clean}.${fraction}`
}

export function formatMoneyInput(value) {
  if (value == null || value === '') return ''
  const raw = parseMoneyInput(value)
  if (raw == null) return ''
  const [integer, fraction] = raw.split('.')
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction == null ? '' : `.${fraction}`)
}

export function moneyCaretPosition(formatted, charactersBeforeCaret) {
  if (charactersBeforeCaret === 0) return 0
  let seen = 0
  for (let index = 0; index < formatted.length; index++) {
    if (/[\d.]/.test(formatted[index])) seen++
    if (seen === charactersBeforeCaret) return index + 1
  }
  return formatted.length
}

export function propertyDateParts(value) {
  if (value == null || value === '') return null
  let date
  try {
    if (typeof value.toDate === 'function') date = value.toDate()
    else if (typeof value.toMillis === 'function') date = new Date(value.toMillis())
    else if (typeof value.seconds === 'number') date = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000)
    else date = new Date(value)
  } catch { return null }
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null
  const options = { timeZone: 'Asia/Bangkok' }
  return {
    iso: date.toISOString(),
    date: new Intl.DateTimeFormat('th-TH', { ...options, day: '2-digit', month: 'short', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('th-TH', { ...options, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date),
  }
}
