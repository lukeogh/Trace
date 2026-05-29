/**
 * Daily nudge API - the gentle usage reminder shown on the dashboard.
 */

const BASE = '/api'

/** Today's nudge → { text, source } (text is null if the pool is empty). */
export async function getTodayNudge() {
  const res = await fetch(`${BASE}/nudges/today`)
  if (!res.ok) throw new Error('Failed to load nudge')
  return res.json()
}
