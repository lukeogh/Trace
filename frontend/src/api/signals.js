/**
 * Signals API - the source-agnostic triage surface.
 *
 * Microsoft 365 is the first source; future Jira/GitHub items will use
 * the same endpoints, just with different `source` values on each row.
 */

const BASE = '/api/signals'

/** Pending + assigned signals, with AI's suggested area/thread names resolved. */
export async function listSignals() {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error('Failed to load signals')
  return res.json()
}

/** Commit a signal to a meeting Entry. Either picks an existing thread
 *  (thread_id) or creates a new one under the area (new_thread_title). */
export async function acceptSignal(signalId, { area_id, thread_id, new_thread_title }) {
  const res = await fetch(`${BASE}/${signalId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area_id, thread_id, new_thread_title }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Change the suggested area/thread without committing yet. */
export async function reassignSignal(signalId, { area_id, thread_id }) {
  const res = await fetch(`${BASE}/${signalId}/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area_id, thread_id }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Dismiss a signal. Auto-revival is suppressed; the row stays as a
 *  tombstone so a re-arrival doesn't ping the user twice. */
export async function dismissSignal(signalId) {
  const res = await fetch(`${BASE}/${signalId}/dismiss`, { method: 'POST' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Dashboard nudge mode setting (off | gentle | with-peek). */
export async function getNudgeSetting() {
  const res = await fetch(`${BASE}/nudge-setting`)
  if (!res.ok) throw new Error('Failed to load nudge setting')
  return res.json()
}

export async function setNudgeSetting(mode) {
  const res = await fetch(`${BASE}/nudge-setting`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || `HTTP ${res.status}`)
  }
  return res.json()
}
