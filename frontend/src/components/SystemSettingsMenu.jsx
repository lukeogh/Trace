import { useState, useEffect, useRef } from 'react'
import { FolderOpen, RefreshCw, AlertCircle, Download, Zap, Settings, X } from 'lucide-react'
import {
  isTauri,
  getDataDir,
  pickDataDir,
  migrateAndSetDataDir,
  relaunch,
  getUpdateChannel,
  setUpdateChannel,
} from '../api/tauri'
import { useAppVersion } from '../hooks/useAppVersion'

/**
 * System Settings popover — opens from the cog at the bottom of the sidebar.
 *
 * Houses *infrastructure* settings (data directory, update channel,
 * version info, future system-level toggles). Personal/visual settings
 * (theme, font, text size, avatar, display name) live in the avatar
 * dropdown — `SettingsMenu`. The split is by *intent*: anything about
 * how the app stores/updates itself goes here; anything about how it
 * looks/feels lives there.
 *
 * Renders nothing when running in browser/Docker — these settings only
 * apply to the Tauri desktop build.
 */
export default function SystemSettingsMenu({ isOpen, onClose, updater }) {
  const ref = useRef(null)
  const version = useAppVersion()

  // Data path
  const [dataDir, setDataDir] = useState(null)
  const [dataDirMigrating, setDataDirMigrating] = useState(false)
  const [dataDirError, setDataDirError] = useState('')
  const [restartPending, setRestartPending] = useState(false)

  // Update channel
  const [channel, setChannel] = useState('stable')
  const [channelChangePending, setChannelChangePending] = useState(false)

  // Click-outside + Escape closing
  useEffect(() => {
    if (!isOpen) return
    const onMouse = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  // Lazy-load when first opened
  useEffect(() => {
    if (!isOpen || !isTauri()) return
    getDataDir().then(setDataDir)
    getUpdateChannel().then(setChannel)
  }, [isOpen])

  if (!isOpen || !isTauri()) return null

  const handleChangeDataDir = async () => {
    setDataDirError('')
    try {
      const chosen = await pickDataDir()
      if (!chosen) return
      setDataDirMigrating(true)
      await migrateAndSetDataDir(chosen)
      setDataDir(chosen)
      setRestartPending(true)
    } catch (err) {
      setDataDirError(typeof err === 'string' ? err : 'Migration failed. Your data was not moved.')
    } finally {
      setDataDirMigrating(false)
    }
  }

  const handleChangeChannel = async (next) => {
    if (next === channel) return
    setChannelChangePending(true)
    try {
      await setUpdateChannel(next)
      setChannel(next)
    } finally {
      setChannelChangePending(false)
    }
  }

  return (
    // Backdrop catches off-popover clicks via the outside-click effect above.
    // Positioned next to the sidebar cog — flying up from the bottom-left.
    <div
      ref={ref}
      className="
        fixed bottom-16 left-3 z-40 w-80
        rounded-lg shadow-2xl
        bg-white dark:bg-pitch-700
        border border-paper-300 dark:border-pitch-500
        p-3 space-y-3
        animate-fade-in
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-paper-200 dark:border-pitch-600">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-paper-500 dark:text-paper-400" />
          <span className="font-display uppercase tracking-widest text-xs text-pitch-700 dark:text-paper-200">
            System settings
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-paper-500 dark:text-paper-600 hover:text-pitch-700 dark:hover:text-paper-200"
        >
          <X size={13} />
        </button>
      </div>

      {/* Update available banner — only if there's one pending. Mirrors the
          toast so the cog → menu path always reveals it too. */}
      {updater?.status === 'available' && updater.available && (
        <Section label="Update">
          <div className="
            rounded-md p-2.5
            bg-gradient-to-br from-accent-500/10 to-accent-500/5
            border border-accent-500/40
          ">
            <div className="flex items-start gap-2 mb-2">
              <Zap size={14} className="flex-shrink-0 mt-0.5 text-accent-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-display uppercase tracking-wide text-accent-600 dark:text-accent-400">
                  Update available
                </p>
                <p className="text-[11px] text-pitch-700 dark:text-paper-300 mt-0.5">
                  {updater.available.currentVersion} → <strong>{updater.available.version}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={updater.install}
              className="
                w-full flex items-center justify-center gap-1.5
                px-2.5 py-1.5 rounded-md text-xs
                bg-accent-500 hover:bg-accent-600 text-white
                font-display uppercase tracking-wide transition-colors
              "
            >
              <Download size={11} />
              Install &amp; restart
            </button>
          </div>
        </Section>
      )}

      {updater?.status === 'downloading' && (
        <Section label="Update">
          <div className="rounded-md p-2.5 bg-accent-500/5 border border-accent-500/40 flex items-center gap-2">
            <Download size={12} className="text-accent-500 animate-pulse" />
            <p className="text-[11px] text-pitch-700 dark:text-paper-300">
              Downloading update
              {updater.progress?.contentLength
                ? ` (${Math.round(100 * updater.progress.downloaded / updater.progress.contentLength)}%)`
                : '…'}
            </p>
          </div>
        </Section>
      )}

      {updater?.status === 'error' && (
        <Section label="Update">
          <div className="rounded-md p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-1">
            <AlertCircle size={11} className="flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-[10px] text-red-500 leading-snug">
              Update failed: {updater.error}
            </p>
          </div>
        </Section>
      )}

      {/* Update channel */}
      <Section label="Update channel">
        <Segmented
          value={channel}
          options={[
            { key: 'stable', label: 'Stable' },
            { key: 'beta', label: 'Beta' },
          ]}
          onChange={handleChangeChannel}
        />
        {channelChangePending && (
          <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600">Saving…</p>
        )}
        <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600 leading-snug">
          Beta gets new builds with every merge to main. Restart Trace.
          after switching for the change to take effect.
        </p>
      </Section>

      {/* Data storage */}
      <Section label="Data storage">
        {restartPending ? (
          <div className="rounded-md p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-2 leading-snug">
              Data moved. Trace. needs to restart to use the new location.
            </p>
            <button
              onClick={relaunch}
              className="
                w-full flex items-center justify-center gap-1.5
                px-2.5 py-1.5 rounded-md text-xs
                bg-amber-500 hover:bg-amber-600 text-white
                font-display uppercase tracking-wide transition-colors
              "
            >
              <RefreshCw size={11} />
              Restart now
            </button>
          </div>
        ) : (
          <>
            <div className="
              flex items-center gap-2 px-2.5 py-1.5 rounded-md
              bg-paper-100 dark:bg-pitch-800
              border border-paper-300 dark:border-pitch-500
            ">
              <FolderOpen size={12} className="flex-shrink-0 text-paper-500 dark:text-paper-600" />
              <span
                className="
                  flex-1 text-[11px] font-mono truncate
                  text-pitch-700 dark:text-paper-300
                "
                title={dataDir || ''}
              >
                {dataDir
                  ? dataDir.split(/[/\\]/).filter(Boolean).slice(-2).join('/')
                  : '…'}
              </span>
              <button
                onClick={handleChangeDataDir}
                disabled={dataDirMigrating}
                className="
                  flex-shrink-0 px-2 py-0.5 rounded text-[10px]
                  font-display uppercase tracking-wide
                  text-paper-600 dark:text-paper-400
                  hover:bg-paper-200 dark:hover:bg-pitch-700
                  disabled:opacity-40 transition-colors
                "
              >
                {dataDirMigrating ? 'Moving…' : 'Change…'}
              </button>
            </div>
            {dataDirError && (
              <div className="mt-1.5 flex items-start gap-1">
                <AlertCircle size={11} className="flex-shrink-0 mt-0.5 text-red-500" />
                <p className="text-[10px] text-red-500 leading-snug">{dataDirError}</p>
              </div>
            )}
            <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600 leading-snug">
              Your database and uploads. Changing this copies your data —
              the old folder is not deleted.
            </p>
          </>
        )}
      </Section>

      {/* About */}
      <Section label="About">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-paper-500 dark:text-paper-600">Version</span>
          <span className="font-mono text-pitch-700 dark:text-paper-300">{version ? `v${version}` : '—'}</span>
        </div>
      </Section>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-display uppercase tracking-widest text-paper-500 dark:text-paper-600 mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md w-full bg-paper-100 dark:bg-pitch-800 border border-paper-300 dark:border-pitch-500">
      {options.map((opt) => {
        const active = opt.key === value
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs transition-colors
              ${active
                ? 'bg-white dark:bg-pitch-700 text-pitch-800 dark:text-white shadow-sm'
                : 'text-paper-600 dark:text-paper-500 hover:text-pitch-700 dark:hover:text-paper-200'
              }
            `}
          >
            <span className="font-display uppercase tracking-wide">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
