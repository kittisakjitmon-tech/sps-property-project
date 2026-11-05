const { test } = require('node:test')
const assert = require('node:assert/strict')
const rules = require('./facebook-ai-calendar.cjs')

const cfg = rules.calendarSettings({ calendarEnabled: true, calendarId: 'team@group.calendar.google.com' })
const MON = '2026-11-09' // Monday
const SUN = '2026-11-08'
const at = (date, hhmm) => Date.parse(`${date}T${hhmm}:00+07:00`)
const busy = (date, from, to) => ({ start: new Date(at(date, from)).toISOString(), end: new Date(at(date, to)).toISOString() })
const times = list => list.map(rules.fromMinutes)

test('defaults: Monday-Saturday 09:00-18:00, 90-minute appointments, 2 hours notice', () => {
  assert.equal(cfg.enabled, true)
  assert.deepEqual(cfg.workDays, [1, 2, 3, 4, 5, 6])
  assert.equal(cfg.startMinutes, 540)
  assert.equal(cfg.endMinutes, 1080)
  assert.equal(cfg.slotMinutes, 90)
  assert.equal(cfg.leadHours, 2)
  assert.equal(rules.describeSchedule(cfg), 'จันทร์-เสาร์ 09:00-18:00 นัดละ 90 นาที')
})

test('the calendar is only enabled with the switch on and a calendar id', () => {
  assert.equal(rules.calendarSettings({}).enabled, false)
  assert.equal(rules.calendarSettings({ calendarEnabled: true }).enabled, false)
  assert.equal(rules.calendarSettings({ calendarEnabled: true, calendarId: '  ' }).enabled, false)
  assert.equal(rules.calendarSettings({ calendarEnabled: 'true', calendarId: 'x' }).enabled, false)
  assert.equal(rules.calendarSettings({ calendarId: 'x' }).enabled, false)
})

test('settings override the defaults, and nonsense falls back to them', () => {
  const custom = rules.calendarSettings({
    calendarEnabled: true, calendarId: 'x', calendarWorkStart: '10:00', calendarWorkEnd: '17:00',
    calendarSlotMinutes: 60, calendarLeadHours: 0, calendarWorkDays: [2, 4],
  })
  assert.equal(custom.startMinutes, 600)
  assert.equal(custom.endMinutes, 1020)
  assert.equal(custom.slotMinutes, 60)
  assert.equal(custom.leadHours, 0)
  assert.deepEqual(custom.workDays, [2, 4])
  assert.equal(rules.describeSchedule(custom), 'อังคาร, พฤหัสบดี 10:00-17:00 นัดละ 60 นาที')
  const bad = rules.calendarSettings({
    calendarEnabled: true, calendarId: 'x', calendarWorkStart: '19:00', calendarWorkEnd: '08:00',
    calendarSlotMinutes: 5, calendarLeadHours: -3, calendarWorkDays: ['x', 9],
  })
  assert.equal(bad.startMinutes, 540)
  assert.equal(bad.slotMinutes, 90)
  assert.equal(bad.leadHours, 2)
  assert.deepEqual(bad.workDays, [1, 2, 3, 4, 5, 6])
})

test('start times: every 30 minutes, the last one leaves room for a whole appointment, no Sundays', () => {
  const starts = times(rules.candidateStarts(cfg, MON))
  assert.equal(starts[0], '09:00')
  assert.equal(starts.at(-1), '16:30') // 16:30 + 90 min = 18:00
  assert.ok(!starts.includes('17:00'))
  assert.deepEqual(rules.candidateStarts(cfg, SUN), [])
})

test('busy periods block every start whose appointment would overlap them', () => {
  const now = at(MON, '00:00') // long before opening, so notice is not a factor
  const free = times(rules.freeStarts(cfg, MON, [busy(MON, '10:00', '11:30')], now))
  assert.deepEqual(free.slice(0, 3), ['11:30', '12:00', '12:30'])
  assert.ok(!free.includes('09:00')) // 09:00-10:30 runs into the 10:00 appointment
  assert.ok(!free.includes('11:00')) // 11:00-12:30 runs into it from the other side
  // an appointment that just touches (ends 10:00, next starts 10:00) is fine
  const touching = times(rules.freeStarts(cfg, MON, [busy(MON, '09:00', '10:30')], now))
  assert.ok(touching.includes('10:30'))
  assert.ok(!touching.includes('10:00'))
})

test('notice: nothing is offered closer than the lead time', () => {
  const now = at(MON, '09:30')
  const free = times(rules.freeStarts(cfg, MON, [], now))
  assert.equal(free[0], '11:30') // 09:30 + 2 h
  assert.deepEqual(rules.freeStarts(cfg, MON, [], at(MON, '17:00')), [])
})

test('checkSlot says why a time cannot be booked', () => {
  const now = at(MON, '00:00')
  assert.deepEqual(rules.checkSlot(cfg, MON, '10:00', [], now), { ok: true, minute: 600, endMinute: 690 })
  assert.equal(rules.checkSlot(cfg, MON, '10:15', [], now).reason, 'bad-time')
  assert.equal(rules.checkSlot(cfg, MON, 'abc', [], now).reason, 'bad-time')
  assert.equal(rules.checkSlot(cfg, SUN, '10:00', [], now).reason, 'closed')
  assert.equal(rules.checkSlot(cfg, MON, '08:30', [], now).reason, 'outside-hours')
  assert.equal(rules.checkSlot(cfg, MON, '17:00', [], now).reason, 'outside-hours') // would end 18:30
  assert.equal(rules.checkSlot(cfg, MON, '16:30', [], now).ok, true)
  assert.equal(rules.checkSlot(cfg, MON, '10:00', [], at(MON, '09:00')).reason, 'too-soon')
  assert.equal(rules.checkSlot(cfg, MON, '10:00', [busy(MON, '10:30', '12:00')], now).reason, 'busy')
})

test('busy answers from Google can be strings or numbers, and junk is ignored', () => {
  const now = at(MON, '00:00')
  const junk = [{ start: 'nope', end: 'nope' }, { start: at(MON, '12:00'), end: at(MON, '11:00') }, null].filter(Boolean)
  assert.equal(rules.checkSlot(cfg, MON, '10:00', junk, now).ok, true)
  assert.equal(rules.checkSlot(cfg, MON, '10:00', [{ start: at(MON, '10:00'), end: at(MON, '11:30') }], now).reason, 'busy')
})

test('suggestions are a few well spread whole-appointment steps', () => {
  const now = at(MON, '00:00')
  assert.deepEqual(times(rules.suggestStarts(cfg, rules.freeStarts(cfg, MON, [], now))), ['09:00', '10:30', '12:00', '13:30'])
  const afternoon = rules.freeStarts(cfg, MON, [busy(MON, '09:00', '13:00')], now)
  assert.deepEqual(times(rules.suggestStarts(cfg, afternoon, 2)), ['13:30', '15:00'])
  assert.deepEqual(rules.suggestStarts(cfg, []), [])
})

test('day range covers the whole Thai day', () => {
  assert.deepEqual(rules.dayRange(MON), { timeMin: '2026-11-08T17:00:00.000Z', timeMax: '2026-11-09T17:00:00.000Z' })
})

test('the same booking always gets the same Google-valid event id', () => {
  const a = rules.eventIdFor('conv1', MON, '10:00', 'SPS-TH-1')
  assert.equal(a, rules.eventIdFor('conv1', MON, '10:00', 'SPS-TH-1'))
  assert.notEqual(a, rules.eventIdFor('conv1', MON, '10:30', 'SPS-TH-1'))
  assert.match(a, /^[a-v0-9]{5,1024}$/)
})
