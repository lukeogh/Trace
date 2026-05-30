import { useEffect, useState } from 'react'
import { isTauri } from '../api/tauri'

// Frontend package.json version - kept in sync with tauri.conf.json + Cargo.toml
// via the release commits. Used as the browser/Docker fallback.
import pkg from '../../package.json'

/**
 * Returns the running app's version.
 *
 * Source of truth in the desktop shell is the custom `app_version` Rust
 * command, which returns `env!("CARGO_PKG_VERSION")` - the version baked
 * into the binary at compile time. Reading it this way side-steps two
 * issues that previously left the sidebar stuck on a stale number after
 * an in-place upgrade:
 *   1. `@tauri-apps/api/app`'s `getVersion()` needs a specific capability
 *      permission; if it isn't granted the call silently rejects.
 *   2. The bundled `frontend/package.json` can be cached by the WebView
 *      across upgrades, so the bundled-pkg fallback can lie.
 *
 * If the Rust call fails for any reason we fall back to Tauri's JS API,
 * and finally to the bundled package.json (browser / Docker preview).
 *
 * Returns null while the call is in flight on first mount.
 */
export function useAppVersion() {
  const [version, setVersion] = useState(() => isTauri() ? null : pkg.version)

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    ;(async () => {
      // 1. Authoritative: ask the Rust binary directly.
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const v = await invoke('app_version')
        if (v && !cancelled) {
          setVersion(v)
          return
        }
      } catch {
        // fall through to JS-API fallback
      }
      // 2. JS API fallback (reads tauri.conf.json at runtime).
      try {
        const { getVersion } = await import('@tauri-apps/api/app')
        const v = await getVersion()
        if (!cancelled) setVersion(v || pkg.version)
      } catch {
        if (!cancelled) setVersion(pkg.version)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return version
}
