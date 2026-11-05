const axios = require('axios')
const { GoogleAuth, Impersonated } = require('google-auth-library')

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'
const API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_MARGIN_MS = 60 * 1000

// Cloud Functions' own credentials cannot ask for the Calendar scope directly, so the
// function impersonates its own service account with that scope. This needs the service
// account to have "Service Account Token Creator" on itself and the IAM Credentials API
// enabled; no key file is stored anywhere.
async function impersonatedToken(serviceAccount) {
  const source = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient()
  const client = new Impersonated({
    sourceClient: source,
    targetPrincipal: serviceAccount,
    lifetime: 3600,
    delegates: [],
    targetScopes: [CALENDAR_SCOPE],
  })
  const { token } = await client.getAccessToken()
  return { token, expiresAt: Number(client.credentials?.expiry_date) || Date.now() + 50 * 60 * 1000 }
}

function describeError(error) {
  const detail = error.response?.data?.error
  const reason = detail?.message || error.message
  const failure = new Error(`Google Calendar: ${reason}`)
  failure.status = error.response?.status
  return failure
}

// getToken() resolves to { token, expiresAt }. Both getToken and http can be replaced in tests.
function createGoogleCalendarClient({ serviceAccount, getToken = () => impersonatedToken(serviceAccount), http = axios }) {
  let cached = null

  async function authHeader() {
    if (!cached || cached.expiresAt - TOKEN_MARGIN_MS < Date.now()) cached = await getToken()
    return { Authorization: `Bearer ${cached.token}` }
  }

  async function call(config) {
    try {
      return await http.request({ timeout: 10000, ...config, headers: await authHeader() })
    } catch (error) {
      throw describeError(error)
    }
  }

  return {
    // Busy periods [{ start, end }] of one calendar. Only free/busy is read, never event details.
    async freeBusy(calendarId, timeMin, timeMax) {
      const response = await call({
        method: 'POST',
        url: `${API}/freeBusy`,
        data: { timeMin, timeMax, timeZone: 'Asia/Bangkok', items: [{ id: calendarId }] },
      })
      const entry = response.data?.calendars?.[calendarId]
      if (!entry) throw new Error('Google Calendar: no free/busy answer for this calendar')
      if (Array.isArray(entry.errors) && entry.errors.length) {
        throw new Error(`Google Calendar: ${entry.errors[0].reason || 'calendar not accessible'} (is the calendar shared with the service account?)`)
      }
      return entry.busy || []
    },

    // Create an event. A repeated id (same booking retried) is not an error.
    async insertEvent(calendarId, event) {
      try {
        const response = await call({
          method: 'POST',
          url: `${API}/calendars/${encodeURIComponent(calendarId)}/events`,
          data: event,
        })
        return { id: response.data.id, htmlLink: response.data.htmlLink || '', duplicate: false }
      } catch (error) {
        if (error.status === 409) return { id: event.id, htmlLink: '', duplicate: true }
        throw error
      }
    },

    async deleteEvent(calendarId, eventId) {
      try {
        await call({ method: 'DELETE', url: `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}` })
      } catch (error) {
        if (error.status !== 404 && error.status !== 410) throw error
      }
    },
  }
}

module.exports = { createGoogleCalendarClient, CALENDAR_SCOPE }
