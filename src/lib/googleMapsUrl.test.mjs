import test from 'node:test'
import assert from 'node:assert/strict'
import { extractMapUrl, parseCoordinatesFromUrl, processMapInput, toEmbedUrl } from './googleMapsUrl.js'

// The URL from the bug report: the place name is in DMS, so it contains literal apostrophes.
const PLACE_URL = "https://www.google.com/maps/place/13%C2%B024'09.4%22N+101%C2%B007'18.3%22E/@13.402623,101.1191871,17z/data=!3m1!4b1!4m4!3m3!8m2!3d13.402623!4d101.121762?entry=ttu&g_ep=EgoyMDI2MTEwMy4wIKXMDSoASAFQAw%3D%3D"

test('a DMS place URL is not cut at the first apostrophe', () => {
  const { url } = extractMapUrl(PLACE_URL)
  assert.equal(url, PLACE_URL)
})

test('the place marker (!3d/!4d) wins over the map viewport centre (@)', () => {
  assert.deepEqual(parseCoordinatesFromUrl(PLACE_URL), { lat: 13.402623, lng: 101.121762 })
})

test('a URL pasted inside quotes keeps no trailing quote or punctuation', () => {
  assert.equal(extractMapUrl("'https://maps.app.goo.gl/abc123',").url, 'https://maps.app.goo.gl/abc123')
  assert.equal(extractMapUrl('https://www.google.com/maps/@13.7563,100.5018,17z').url, 'https://www.google.com/maps/@13.7563,100.5018,17z')
})

test('the classic @lat,lng and ?q=lat,lng forms still parse', () => {
  assert.deepEqual(parseCoordinatesFromUrl('https://www.google.com/maps/@13.7563,100.5018,17z'), { lat: 13.7563, lng: 100.5018 })
  assert.deepEqual(parseCoordinatesFromUrl('https://maps.google.com/?q=13.7563,100.5018'), { lat: 13.7563, lng: 100.5018 })
})

test('the embed !2d(lng)/!3d(lat) form maps the axes correctly', () => {
  assert.deepEqual(parseCoordinatesFromUrl('https://www.google.com/maps/embed?pb=!1m18!2d100.5018!3d13.7563'), { lat: 13.7563, lng: 100.5018 })
})

test('the preview embed uses the marker, not the viewport centre', () => {
  assert.equal(toEmbedUrl(PLACE_URL), 'https://maps.google.com/maps?q=13.402623%2C101.121762&output=embed')
})

test('processMapInput accepts the full DMS place URL and fills coordinates', () => {
  const result = processMapInput(PLACE_URL)
  assert.equal(result.error, null)
  assert.ok(result.embedUrl)
  assert.deepEqual(parseCoordinatesFromUrl(result.cleanedUrl), { lat: 13.402623, lng: 101.121762 })
})
