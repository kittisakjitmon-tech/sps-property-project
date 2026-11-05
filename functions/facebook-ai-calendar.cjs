'use strict'

// Scheduling rules for appointments booked through the Messenger AI. Pure logic, no
// network: the Google Calendar calls live in google-calendar.js. All times are Thai
// time (UTC+7, no daylight saving), written as 'YYYY-MM-DD' and 'HH:MM'.

const crypto = require('node:crypto')

const TZ_OFFSET = '+07:00'
const MINUTES_PER_DAY = 24 * 60
const STEP_MINUTES = 30 // customers can pick any 30-minute mark
const DEFAULTS = {
  workDays: [1, 2, 3, 4, 5, 6], // Monday-Saturday (0 = Sunday)
  workStart: '09:00',
  workEnd: '18:00',
  slotMinutes: 90,
  leadHours: 2,
}

const pad = value => String(value).padStart(2, '0')
const fromMinutes = minutes => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

function toMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(typeof value === 'string' ? value.trim() : '')
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

// Settings come from messenger_settings/ai. Bad values fall back to the defaults.
function calendarSettings(settings = {}) {
  const calendarId = typeof settings.calendarId === 'string' ? settings.calendarId.trim() : ''
  let start = toMinutes(settings.calendarWorkStart)
  let end = toMinutes(settings.calendarWorkEnd)
  if (start == null || end == null || start >= end) {
    start = toMinutes(DEFAULTS.workStart)
    end = toMinutes(DEFAULTS.workEnd)
  }
  const slot = Math.floor(Number(settings.calendarSlotMinutes))
  const lead = Number(settings.calendarLeadHours)
  const days = Array.isArray(settings.calendarWorkDays)
    ? [...new Set(settings.calendarWorkDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))]
    : []
  return {
    enabled: settings.calendarEnabled === true && calendarId.length > 0,
    calendarId,
    serviceAccount: typeof settings.calendarServiceAccount === 'string' ? settings.calendarServiceAccount.trim() : '',
    workDays: days.length ? days : DEFAULTS.workDays,
    startMinutes: start,
    endMinutes: end,
    slotMinutes: slot >= 15 && slot <= 240 ? slot : DEFAULTS.slotMinutes,
    leadHours: Number.isFinite(lead) && lead >= 0 && lead <= 72 ? lead : DEFAULTS.leadHours,
  }
}

const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

// "จันทร์-เสาร์ 09:00-18:00 นัดละ 90 นาที" for the prompt.
function describeSchedule(cfg) {
  const days = [...cfg.workDays].sort((a, b) => a - b)
  const consecutive = days.every((day, index) => index === 0 || day === days[index - 1] + 1)
  const dayText = consecutive && days.length > 2
    ? `${DAY_NAMES[days[0]]}-${DAY_NAMES[days[days.length - 1]]}`
    : days.map(day => DAY_NAMES[day]).join(', ')
  return `${dayText} ${fromMinutes(cfg.startMinutes)}-${fromMinutes(cfg.endMinutes)} นัดละ ${cfg.slotMinutes} นาที`
}

function weekdayOf(date) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// Start of `minutes` after midnight of Thai `date`, as epoch milliseconds.
function instant(date, minutes) {
  const dayOffset = Math.floor(minutes / MINUTES_PER_DAY)
  const within = minutes - dayOffset * MINUTES_PER_DAY
  return Date.parse(`${date}T${fromMinutes(within)}:00${TZ_OFFSET}`) + dayOffset * MINUTES_PER_DAY * 60000
}

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd

// Every start time of the day that fits a whole appointment inside opening hours.
function candidateStarts(cfg, date) {
  if (!cfg.workDays.includes(weekdayOf(date))) return []
  const starts = []
  for (let minute = cfg.startMinutes; minute + cfg.slotMinutes <= cfg.endMinutes; minute += STEP_MINUTES) starts.push(minute)
  return starts
}

// busy: [{ start, end }] as ISO strings or epoch ms (Google's free/busy periods).
function normalizeBusy(busy) {
  return (Array.isArray(busy) ? busy : [])
    .map(period => ({ start: new Date(period.start).getTime(), end: new Date(period.end).getTime() }))
    .filter(period => Number.isFinite(period.start) && Number.isFinite(period.end) && period.end > period.start)
}

function isFreeStart(cfg, date, minute, busy, now) {
  const start = instant(date, minute)
  const end = start + cfg.slotMinutes * 60000
  if (start < now + cfg.leadHours * 3600000) return false
  return !busy.some(period => overlaps(start, end, period.start, period.end))
}

function freeStarts(cfg, date, busy, now = Date.now()) {
  const periods = normalizeBusy(busy)
  return candidateStarts(cfg, date).filter(minute => isFreeStart(cfg, date, minute, periods, now))
}

// A few well-spread suggestions: whole-appointment steps from opening time first.
function suggestStarts(cfg, starts, max = 4) {
  const aligned = starts.filter(minute => (minute - cfg.startMinutes) % cfg.slotMinutes === 0)
  const pool = aligned.length >= Math.min(max, 2) ? aligned : starts
  return pool.slice(0, max)
}

// Can the customer's chosen start be booked? reason explains a "no".
function checkSlot(cfg, date, time, busy, now = Date.now()) {
  const minute = toMinutes(time)
  if (minute == null || minute % STEP_MINUTES !== 0) return { ok: false, reason: 'bad-time' }
  const starts = candidateStarts(cfg, date)
  if (!starts.length) return { ok: false, reason: 'closed' }
  if (!starts.includes(minute)) return { ok: false, reason: 'outside-hours' }
  const periods = normalizeBusy(busy)
  const start = instant(date, minute)
  if (start < now + cfg.leadHours * 3600000) return { ok: false, reason: 'too-soon' }
  if (!isFreeStart(cfg, date, minute, periods, now)) return { ok: false, reason: 'busy' }
  return { ok: true, minute, endMinute: minute + cfg.slotMinutes }
}

// Time range to ask Google about for one day.
function dayRange(date) {
  return { timeMin: new Date(instant(date, 0)).toISOString(), timeMax: new Date(instant(date, MINUTES_PER_DAY)).toISOString() }
}

// The same booking always gets the same event id, so a retry cannot create a duplicate.
// Google event ids may only use a-v and 0-9; a hex digest qualifies.
function eventIdFor(...parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex')
}

module.exports = {
  TZ_OFFSET,
  STEP_MINUTES,
  DEFAULTS,
  calendarSettings,
  describeSchedule,
  toMinutes,
  fromMinutes,
  weekdayOf,
  instant,
  overlaps,
  candidateStarts,
  freeStarts,
  suggestStarts,
  checkSlot,
  dayRange,
  eventIdFor,
}
