import { useState, useEffect, useRef } from 'react'
import { Type, Check } from 'lucide-react'
import { FONT_OPTIONS } from '../hooks/useFont'

export default function FontPicker({ font, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Change font"
        className="
          p-1.5 rounded-md transition-colors
          text-navy-400 dark:text-navy-500
          hover:text-navy-700 dark:hover:text-navy-200
          hover:bg-navy-100 dark:hover:bg-navy-800
        "
      >
        <Type size={15} />
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-1 z-30 w-56
          rounded-lg shadow-xl
          bg-white dark:bg-navy-850
          border border-navy-200 dark:border-navy-700
          p-1
          animate-fade-in
        ">
          <div className="px-2 py-1.5 text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-600">
            Body font
          </div>
          {FONT_OPTIONS.map((opt) => {
            const active = font === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false) }}
                style={{ fontFamily: opt.stack }}
                className={`
                  w-full flex items-center gap-2 px-2 py-2 rounded-md text-left text-sm transition-colors
                  ${active
                    ? 'bg-signal-500/10 text-signal-600 dark:text-signal-400'
                    : 'text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-800'
                  }
                `}
              >
                <Check
                  size={12}
                  className={`flex-shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`}
                />
                <span className="flex-1">{opt.label}</span>
                <span className="text-xs font-mono text-navy-400 dark:text-navy-600">
                  {opt.hint}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
