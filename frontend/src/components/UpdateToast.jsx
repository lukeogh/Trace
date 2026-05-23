import { Zap, X, Download } from 'lucide-react'

/**
 * Bottom-right toast that appears once per detected new version.
 *
 * Differs from the existing <Toast> in that it persists until the user
 * acts (Install or Later) — it doesn't auto-dismiss after a few seconds.
 * Install kicks off the update flow; Later marks this specific version
 * as dismissed (persisted in localStorage by useUpdater), at which point
 * a badge dot lights up on the System Settings cog as the ongoing
 * reminder.
 *
 * Renders nothing unless `updater.status === 'available'` — i.e., a
 * version is genuinely newer AND has not yet been dismissed.
 */
export default function UpdateToast({ updater }) {
  if (!updater || updater.status !== 'available' || !updater.available) return null

  const { available, install, dismiss } = updater

  return (
    <div
      className="
        fixed bottom-4 right-4 z-[90] w-80
        pointer-events-auto
        rounded-lg shadow-2xl
        bg-white dark:bg-pitch-700
        border border-accent-500/40
        animate-slide-in
      "
      role="status"
      aria-live="polite"
    >
      {/* Subtle accent strip at the top — pulls the eye gently without
          full-saturation alarm. */}
      <div className="h-0.5 bg-gradient-to-r from-accent-500/40 via-accent-500 to-accent-500/40" />

      <div className="p-3.5">
        <div className="flex items-start gap-2.5 mb-3">
          <Zap size={15} className="flex-shrink-0 mt-0.5 text-accent-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display uppercase tracking-widest text-accent-600 dark:text-accent-400">
              Update available
            </p>
            <p className="text-sm text-pitch-700 dark:text-paper-200 mt-1">
              <span className="font-mono text-paper-500 dark:text-paper-600">{available.currentVersion}</span>
              <span className="mx-1.5 text-paper-400 dark:text-paper-700">→</span>
              <span className="font-mono font-semibold">{available.version}</span>
            </p>
          </div>
          <button
            onClick={dismiss}
            title="Remind me later (badge on Settings)"
            className="
              flex-shrink-0 p-1 rounded opacity-50 hover:opacity-100
              text-paper-500 dark:text-paper-600
              hover:text-pitch-700 dark:hover:text-paper-200
              transition-opacity
            "
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={install}
            className="
              flex-1 flex items-center justify-center gap-1.5
              px-3 py-1.5 rounded-md text-xs
              bg-accent-500 hover:bg-accent-600 text-white
              font-display uppercase tracking-wide transition-colors
            "
          >
            <Download size={11} />
            Install &amp; restart
          </button>
          <button
            onClick={dismiss}
            className="
              px-3 py-1.5 rounded-md text-xs
              text-paper-600 dark:text-paper-400
              hover:bg-paper-200 dark:hover:bg-pitch-800
              font-display uppercase tracking-wide transition-colors
            "
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
