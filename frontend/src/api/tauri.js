/**
 * Tauri bridge — thin wrappers around Tauri invoke calls.
 *
 * Every function is a no-op (returns null) when running outside Tauri so
 * the rest of the app stays unaware. The browser/Docker build of the
 * frontend has zero Tauri-specific behaviour.
 *
 * The dynamic import of `@tauri-apps/api/core` is what keeps the browser
 * build healthy: Vite tree-shakes it out when isTauri() is false, and
 * the import itself never resolves outside the WebView2 process.
 */

export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function invoke(cmd, args = {}) {
  if (!isTauri()) return null
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
  return tauriInvoke(cmd, args)
}

/** Returns the current data directory path string, or null outside Tauri. */
export async function getDataDir() {
  return invoke('get_data_dir')
}

/**
 * Opens a native OS folder picker. Returns the absolute path string of the
 * chosen folder, or null if the user cancelled (or we're not in Tauri).
 */
export async function pickDataDir() {
  return invoke('pick_data_dir')
}

/**
 * Copies trace.db + uploads/ from the current data dir to `newPath` and
 * saves the new path to the config store. The old data is **not** deleted —
 * intentional safety net. Caller must `relaunch()` afterwards because the
 * running sidecar still points at the old location.
 *
 * Surfaces Tauri's Err(String) as a rejected promise with the message.
 */
export async function migrateAndSetDataDir(newPath) {
  if (!isTauri()) return
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
  return tauriInvoke('migrate_and_set_data_dir', { newPath })
}

/** Restarts the Tauri app (no-op in browser). */
export async function relaunch() {
  return invoke('relaunch')
}
