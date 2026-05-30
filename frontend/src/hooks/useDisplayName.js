import { useState, useEffect } from 'react'

/**
 * User's display name - used for the settings avatar's initials and as the
 * identity surface in the sidebar. Persists to localStorage.
 */
export function useDisplayName() {
  const [displayName, setDisplayNameState] = useState(() => {
    return localStorage.getItem('displayName') || ''
  })

  useEffect(() => {
    if (displayName) localStorage.setItem('displayName', displayName)
    else            localStorage.removeItem('displayName')
  }, [displayName])

  return { displayName, setDisplayName: setDisplayNameState }
}

/**
 * Derive up-to-two-letter initials from a display name.
 * "Luke Keogh" → "LK" ; "luke" → "L" ; "" → "?"
 */
export function getInitials(name) {
  const cleaned = (name || '').trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
