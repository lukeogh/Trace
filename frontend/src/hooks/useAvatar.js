import { useState, useEffect } from 'react'

/**
 * Profile photo for the top-right avatar. Stored as a base64 data URL in
 * localStorage so it survives refreshes without needing backend storage -
 * fine for a single-user self-hosted app. Clearing the value falls back
 * to the initials-rendered avatar.
 */
export function useAvatar() {
  const [avatar, setAvatarState] = useState(() => {
    return localStorage.getItem('displayAvatar') || ''
  })

  useEffect(() => {
    if (avatar) localStorage.setItem('displayAvatar', avatar)
    else        localStorage.removeItem('displayAvatar')
  }, [avatar])

  return { avatar, setAvatar: setAvatarState }
}
