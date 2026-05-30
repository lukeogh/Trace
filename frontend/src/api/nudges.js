/**
 * Daily nudge API - the gentle usage reminder shown on the dashboard.
 */

const BASE = '/api'

/** Today's nudge → { id, text, source } (text is null if the pool is empty). */
export async function getTodayNudge() {
  const res = await fetch(`${BASE}/nudges/today`)
  if (!res.ok) throw new Error('Failed to load nudge')
  return res.json()
}

/**
 * A random nudge from the active pool, optionally excluding one id (use this
 * to guarantee the user sees something different when they "flick through").
 * → { id, text, source }
 */
export async function getRandomNudge(excludeId) {
  const qs = excludeId != null ? `?exclude=${excludeId}` : ''
  const res = await fetch(`${BASE}/nudges/random${qs}`)
  if (!res.ok) throw new Error('Failed to load nudge')
  return res.json()
}
