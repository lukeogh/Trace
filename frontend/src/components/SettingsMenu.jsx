import { useState, useEffect, useRef } from 'react'
import { ChevronUp, Sun, Moon, Check } from 'lucide-react'
import { getInitials } from '../hooks/useDisplayName'
import { FONT_OPTIONS } from '../hooks/useFont'
import { TEXT_SIZES } from '../hooks/useTextSize'

export default function SettingsMenu({
  displayName,
  onChangeDisplayName,
  dark,
  onToggleTheme,
  font,
  onChangeFont,
  textSize,
  onChangeTextSize,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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

  const initials = getInitials(displayName)
  const hasName = Boolean(displayName)

  return (
    <div className="relative" ref={ref}>
      {/* Avatar row — looks like a profile entry, clickable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors
          ${open
            ? 'bg-paper-200 dark:bg-pitch-700'
            : 'hover:bg-paper-200/70 dark:hover:bg-pitch-700/70'
          }
        `}
      >
        <span className="
          w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
          bg-accent-500 text-white text-xs font-display font-semibold
        ">
          {initials}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-display font-medium text-pitch-800 dark:text-white truncate">
            {hasName ? displayName : 'Set your name'}
          </span>
          <span className="block text-[10px] font-mono uppercase tracking-widest text-paper-500 dark:text-paper-600">
            Settings
          </span>
        </span>
        <ChevronUp
          size={13}
          className={`text-paper-500 dark:text-paper-600 flex-shrink-0 transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>

      {open && (
        <div className="
          absolute bottom-full left-0 right-0 mb-2 z-30
          rounded-lg shadow-xl
          bg-white dark:bg-pitch-700
          border border-paper-300 dark:border-pitch-500
          p-3 space-y-3
          animate-fade-in
        ">
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
