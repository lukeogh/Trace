/**
 * Microsoft 365 integration API.
 *
 * The OAuth login flow uses a full-page navigation (or system browser on
 * desktop), so `loginUrl()` returns the URL rather than fetching anything -
 * the caller does `window.location.href = url` (or Tauri's shell.open).
 *
 * After login, the connected status is polled via getProfile() until
 * `connected: true` flips - that's how the settings card detects the OAuth
 * round-trip has finished, even on desktop where the browser window is in
 * a separate process.
 */

const BASE = '/api/microsoft'

/** Azure app config (Client ID + Secret + tenant). Secret is masked on read. */
export async function getMicrosoftConfig() {
  const res = await fetch(`${BASE}/config`)
  if (!res.ok) throw new Error('Failed to load Microsoft config')
  return res.json()
}

export async function saveMicrosoftConfig({ client_id, client_secret, tenant_id }) {
  const res = await fetch(`${BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id, client_secret, tenant_id: tenant_id || 'common' }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Connected MS account, or { connected: false }. Polled during OAuth. */
export async function getMicrosoftProfile() {
  const res = await fetch(`${BASE}/profile`)
  if (!res.ok) throw new Error('Failed to load Microsoft profile')
  return res.json()
}

/** The URL the user's browser should hit to start the OAuth flow.
 *  Full path including /api so it's hit on the backend even when the
 *  frontend is served by Vite in development. */
export function loginUrl() {
  return `${BASE}/auth/login`
}

/** Wipe the stored integration (tokens + profile). One-click disconnect. */
export async function disconnectMicrosoft() {
  const res = await fetch(`${BASE}/auth/disconnect`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Disconnect failed')
  return res.json()
}

/** Trigger an immediate sync (drives Signals + Insights). Returns counts. */
export async function syncNow() {
  const res = await fetch(`${BASE}/sync-now`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}
