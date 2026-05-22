import { useEffect, useState } from 'react'
import { isTauri, checkForUpdate, relaunchForUpdate } from '../api/tauri'

/**
 * Silent updater hook — checks for a newer version on mount (only in Tauri),
 * exposes the result so a banner can show "Update available — install now."
 *
 * State shape:
 *   - status: 'idle' | 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error'
 *   - available: the update object from `checkForUpdate()` (when status === 'available')
 *   - progress: { downloaded, contentLength } during download
 *   - error: string when status === 'error'
 *
 * The check is debounced — re-mounts won't re-fire if we've already checked
 * within the last hour (cached in module scope so it survives unmounts but
 * not full page reloads, which is the right semantics for an SPA hosted by
 * the bundled FastAPI).
 */
let _lastCheckedAt = 0
const RECHECK_INTERVAL_MS = 60 * 60 * 1000   // 1 hour

export function useUpdater() {
  const [status, setStatus] = useState('idle')
  const [available, setAvailable] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isTauri()) return

    const now = Date.now()
    if (now - _lastCheckedAt < RECHECK_INTERVAL_MS) return
    _lastCheckedAt = now

    let cancelled = false
    setStatus('checking')

    checkForUpdate()
      .then((result) => {
        if (cancelled) return
        if (!result) return setStatus('idle')           // not in Tauri
        if (!result.available) return setStatus('none')
        setAvailable(result)
        setStatus('available')
      })
      .catch((err) => {
        if (cancelled) return
        setError(typeof err === 'string' ? err : String(err))
        setStatus('error')
      })

    return () => { cancelled = true }
  }, [])

  /** Download + install + relaunch. UI should disable buttons during this. */
  const install = async () => {
    if (!available) return
    setStatus('downloading')
    try {
      await available.downloadAndInstall((event) => {
        // Event shape per tauri-plugin-updater:
        //   { event: 'Started', data: { contentLength } }
        //   { event: 'Progress', data: { chunkLength } }
        //   { event: 'Finished' }
        if (event.event === 'Started') {
          setProgress({ downloaded: 0, contentLength: event.data?.contentLength ?? 0 })
        } else if (event.event === 'Progress') {
          setProgress((p) => p
            ? { ...p, downloaded: p.downloaded + (event.data?.chunkLength ?? 0) }
            : null)
        }
      })
      setStatus('ready')
      await relaunchForUpdate()
    } catch (err) {
      setError(typeof err === 'string' ? err : String(err))
      setStatus('error')
    }
  }

  return { status, available, progress, error, install }
}
