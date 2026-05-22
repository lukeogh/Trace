import { useState, useEffect, useRef } from 'react'
import { Sun, Moon, Check, Upload, X, FolderOpen, RefreshCw, AlertCircle, Download, Zap } from 'lucide-react'
import { getInitials } from '../hooks/useDisplayName'
import { FONT_OPTIONS } from '../hooks/useFont'
import { TEXT_SIZES } from '../hooks/useTextSize'
import {
  isTauri,
  getDataDir,
  pickDataDir,
  migrateAndSetDataDir,
  relaunch,
  getUpdateChannel,
  setUpdateChannel,
} from '../api/tauri'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024  // 2 MB

/**
 * Global top-right settings — circular avatar button + popover with profile
 * photo upload, display name, theme, font, text size. Renders fixed in the
 * top-right corner so it's reachable from every page.
 */
export default function SettingsMenu({
  avatar,
  onChangeAvatar,
  displayName,
  onChangeDisplayName,
  dark,
  onToggleTheme,
  font,
  onChangeFont,
  textSize,
  onChangeTextSize,
  updater,            // { status, available, progress, error, install } from useUpdater()
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const fileInputRef = useRef(null)
  const [uploadError, setUploadError] = useState('')

  // Data path (Tauri only). `dataDir` stays null in browser/Docker.
  const [dataDir, setDataDir] = useState(null)
  const [dataDirMigrating, setDataDirMigrating] = useState(false)
  const [dataDirError, setDataDirError] = useState('')
  const [restartPending, setRestartPending] = useState(false)

  // Update channel (Tauri only).
  const [channel, setChannel] = useState('stable')
  const [channelChangePending, setChannelChangePending] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  // Lazy-load the current data dir + channel when the popover opens.
  // Costs nothing outside Tauri (isTauri() short-circuits).
  useEffect(() => {
    if (!open || !isTauri()) return
    getDataDir().then(setDataDir)
    getUpdateChannel().then(setChannel)
  }, [open])

  const initials = getInitials(displayName)

  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''  // allow re-uploading the same filename later
    setUploadError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Pick an image file (PNG, JPG, WEBP).')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError(`Image too large (max ${MAX_AVATAR_BYTES / 1024 / 1024} MB).`)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      onChangeAvatar(ev.target.result)
    }
    reader.onerror = () => setUploadError('Could not read that file.')
    reader.readAsDataURL(file)
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

  const handleChangeDataDir = async () => {
    setDataDirError('')
    try {
      const chosen = await pickDataDir()
      if (!chosen) return  // user cancelled the picker
      setDataDirMigrating(true)
      await migrateAndSetDataDir(chosen)
      setDataDir(chosen)
      setRestartPending(true)
    } catch (err) {
      setDataDirError(
        typeof err === 'string'
          ? err
          : 'Migration failed. Your data was not moved.'
      )
    } finally {
      setDataDirMigrating(false)
    }
  }

  return (
    <div ref={ref} className="fixed top-4 right-4 z-30">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Settings"
        className={`
          w-10 h-10 rounded-full overflow-hidden flex items-center justify-center
          font-display font-semibold text-sm
          shadow-md ring-2 transition-all
          ${avatar
            ? 'ring-paper-300/80 dark:ring-pitch-500/80'
            : 'bg-accent-500 text-white ring-paper-300/40 dark:ring-pitch-500/60'
          }
          ${open ? 'ring-accent-500/60 dark:ring-accent-500/60' : ''}
          hover:ring-accent-500/40
        `}
      >
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {/* Hidden input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-72
          rounded-lg shadow-2xl
          bg-white dark:bg-pitch-700
          border border-paper-300 dark:border-pitch-500
          p-3 space-y-3
          animate-fade-in
        ">
          {/* Update available — only shows when useUpdater() has found one.
              Renders at the top of the popover so it can't be missed. */}
          {isTauri() && updater?.status === 'available' && updater.available && (
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
          )}

          {isTauri() && updater?.status === 'downloading' && (
            <div className="
              rounded-md p-2.5
              bg-accent-500/5
              border border-accent-500/40
            ">
              <div className="flex items-center gap-2">
                <Download size={12} className="text-accent-500 animate-pulse" />
                <p className="text-[11px] text-pitch-700 dark:text-paper-300">
                  Downloading update
                  {updater.progress?.contentLength
                    ? ` (${Math.round(100 * updater.progress.downloaded / updater.progress.contentLength)}%)`
                    : '…'}
                </p>
              </div>
            </div>
          )}

          {isTauri() && updater?.status === 'error' && (
            <div className="rounded-md p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-1">
                <AlertCircle size={11} className="flex-shrink-0 mt-0.5 text-red-500" />
                <p className="text-[10px] text-red-500 leading-snug">
                  Update failed: {updater.error}
                </p>
              </div>
            </div>
          )}

          {/* Profile photo */}
          <Section label="Profile">
            <div className="flex items-center gap-3">
              <span className="
                w-12 h-12 rounded-full overflow-hidden flex-shrink-0
                flex items-center justify-center
                bg-accent-500 text-white font-display font-semibold text-base
              ">
                {avatar
                  ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                  : <span>{initials}</span>
                }
              </span>
              <div className="flex-1 flex flex-col gap-1">
                <button
                  onClick={handlePickFile}
                  className="
                    flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs
                    bg-paper-200 dark:bg-pitch-800
                    text-pitch-700 dark:text-paper-200
                    hover:bg-paper-300 dark:hover:bg-pitch-500
                    font-display uppercase tracking-wide transition-colors
                  "
                >
                  <Upload size={11} />
                  {avatar ? 'Change photo' : 'Upload photo'}
                </button>
                {avatar && (
                  <button
                    onClick={() => onChangeAvatar('')}
                    className="
                      flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs
                      text-paper-600 dark:text-paper-500
                      hover:bg-paper-100 dark:hover:bg-pitch-800
                      font-display uppercase tracking-wide transition-colors
                    "
                  >
                    <X size={11} />
                    Remove
                  </button>
                )}
              </div>
            </div>
            {uploadError && (
              <p className="mt-1.5 text-[10px] text-red-500 font-mono">
                {uploadError}
              </p>
            )}
          </Section>

          {/* Display name */}
          <Section label="Display name">
            <input
              value={displayName}
              onChange={(e) => onChangeDisplayName(e.target.value)}
              placeholder="Your name"
              className="
                w-full px-2.5 py-1.5 text-sm rounded-md
                bg-paper-100 dark:bg-pitch-800
                border border-paper-300 dark:border-pitch-500
                text-pitch-800 dark:text-white
                placeholder:text-paper-400 dark:placeholder:text-paper-700
                focus:outline-none focus:ring-2 focus:ring-accent-500
              "
            />
          </Section>

          {/* Theme */}
          <Section label="Theme">
            <Segmented
              value={dark ? 'dark' : 'light'}
              options={[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark',  label: 'Dark',  icon: Moon },
              ]}
              onChange={(key) => {
                if ((key === 'dark') !== dark) onToggleTheme()
              }}
            />
          </Section>

          {/* Font */}
          <Section label="Font">
            <Segmented
              value={font}
              options={FONT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))}
              onChange={onChangeFont}
              renderLabel={(opt) => (
                <span
                  style={{ fontFamily: FONT_OPTIONS.find((f) => f.key === opt.key)?.stack }}
                  className="text-sm"
                >
                  {opt.label}
                </span>
              )}
            />
          </Section>

          {/* Text size */}
          <Section label="Text size">
            <Segmented
              value={textSize}
              options={TEXT_SIZES.map((s) => ({ key: s.key, label: s.label }))}
              onChange={onChangeTextSize}
            />
          </Section>

          {/* Update channel — Tauri only. */}
          {isTauri() && (
            <Section label="Update channel">
              <Segmented
                value={channel}
                options={[
                  { key: 'stable', label: 'Stable' },
                  { key: 'beta',   label: 'Beta' },
                ]}
                onChange={handleChangeChannel}
              />
              {channelChangePending && (
                <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600">
                  Saving…
                </p>
              )}
              <p className="mt-1 text-[10px] text-paper-500 dark:text-paper-600 leading-snug">
                Beta gets new builds with every merge to main. Restart Trace.
                after switching for the change to take effect.
              </p>
            </Section>
          )}

          {/* Data storage — Tauri only. Hidden in browser/Docker so non-desktop
              users don't see a setting that doesn't apply to them. */}
          {isTauri() && (
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
                      {/* Truncate to last two segments so a long
                          %APPDATA%-style path doesn't overflow the popover.
                          Full path lives in the title attribute on hover. */}
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
          )}
        </div>
      )}
    </div>
  )
}

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

function Segmented({ value, options, onChange, renderLabel }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md w-full bg-paper-100 dark:bg-pitch-800 border border-paper-300 dark:border-pitch-500">
      {options.map((opt) => {
        const Icon = opt.icon
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
            {Icon && <Icon size={12} />}
            {renderLabel ? renderLabel(opt) : (
              <span className="font-display uppercase tracking-wide">{opt.label}</span>
            )}
            {active && !Icon && <Check size={11} className="opacity-60" />}
          </button>
        )
      })}
    </div>
  )
}
