import { useEffect, useState } from 'react'
import { isTauri } from '../api/tauri'

// Frontend package.json version — kept in sync with tauri.conf.json + Cargo.toml
// via the release commits. Used as the browser/Docker fallback.
import pkg from '../../package.json'

/**
 * Returns the running app's version. Prefers Tauri's `app.getVersion()`
 * (the authoritative source — reads tauri.conf.json at runtime) and falls
 * back to the frontend's bundled package.json version for browser/Docker.
 *
 * Returns null while the Tauri call is in flight on first mount.
 */
export function useAppVersion() {
  const [version, setVersion] = useState(() => isTauri() ? null : pkg.version)

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    ;(async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app')
        const v = await getVersion()
        if (!cancelled) setVersion(v)
      } catch {
        if (!cancelled) setVersion(pkg.version)  // fallback
      }
    })()
    return () => { cancelled = true }
  }, [])

  return version
}
