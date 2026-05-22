import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { LayoutDashboard, History, BrainCircuit, Search, Plus } from 'lucide-react'
import { getAreaStatus } from '../utils/status'
import { MOD_KEY } from '../utils/platform'
import ThemeToggle from './ThemeToggle'
import FontPicker from './FontPicker'
import Logo from './Logo'

const MIN_WIDTH = 200
const MAX_WIDTH = 360
const DEFAULT_WIDTH = 240

export default function Sidebar({
  areas,
  dark,
  onToggleTheme,
  font,
  onChangeFont,
  onOpenSwitcher,
  onOpenNewArea,
}) {
  const { areaId } = useParams()
  const location = useLocation()

  // ─── Resizable width ───────────────────────────────────────────────────────
  const [width, setWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem('sidebarWidth') || '', 10)
    if (Number.isFinite(stored) && stored >= MIN_WIDTH && stored <= MAX_WIDTH) return stored
    return DEFAULT_WIDTH
  })
  const draggingRef = useRef(false)

  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(width))
  }, [width])

  const onMouseDownHandle = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX))
      setWidth(next)
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <aside
      style={{ width: `${width}px` }}
      className="
        flex-shrink-0 flex flex-col h-screen sticky top-0 relative
        bg-navy-50 dark:bg-navy-950
        border-r border-navy-200 dark:border-navy-800
      "
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-navy-200 dark:border-navy-800">
        <div className="flex items-start justify-between gap-2">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Logo size={40} />
            <div className="min-w-0">
              <div className="font-display font-bold text-sm uppercase tracking-widest text-navy-900 dark:text-white leading-tight">
                Department
                <br />
                Log
              </div>
              <div className="text-xs text-navy-400 dark:text-navy-500 mt-1 font-mono truncate">
                Axithra · SW
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <FontPicker font={font} onChange={onChangeFont} />
            <ThemeToggle dark={dark} onToggle={onToggleTheme} />
          </div>
        </div>
      </div>

      {/* Quick switcher trigger */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenSwitcher}
          className="
            w-full flex items-center gap-2 px-3 py-2 rounded-md
            bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800
            text-navy-400 dark:text-navy-500
            hover:border-navy-300 dark:hover:border-navy-700
            hover:text-navy-600 dark:hover:text-navy-300
            transition-colors
          "
        >
          <Search size={13} />
          <span className="text-xs flex-1 text-left">Jump to…</span>
          <span className="text-xs font-mono text-navy-300 dark:text-navy-600 whitespace-nowrap">
            {MOD_KEY} K
          </span>
        </button>
      </div>

      {/* Top nav links */}
      <div className="px-3 pt-3 pb-1 space-y-0.5">
        <NavLink to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} />
        <NavLink to="/log" icon={History} label="Audit Log" active={location.pathname === '/log'} />
        <NavLink to="/process" icon={BrainCircuit} label="Auto Generate" active={location.pathname === '/process'} />
      </div>

      {/* Areas section header */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-600">
          Areas
        </span>
      </div>

      {/* Area list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-1 space-y-0.5">
        {areas.map((area) => {
          const config = getAreaStatus(area.status)
          const isActive = areaId && parseInt(areaId) === area.id

          return (
            <Link
              key={area.id}
              to={`/area/${area.id}`}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group
                ${isActive
                  ? 'bg-navy-100 dark:bg-navy-800 text-navy-900 dark:text-white'
                  : 'text-navy-500 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 hover:text-navy-800 dark:hover:text-navy-100'
                }
              `}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: config.dot,
                  boxShadow: isActive ? `0 0 5px ${config.dot}` : 'none',
                }}
              />
              <span className="flex-1 truncate font-medium text-xs font-display uppercase tracking-wide">
                {area.name}
              </span>
              {area.open_thread_count > 0 && (
                <span className="text-xs font-mono text-navy-400 dark:text-navy-500">
                  {area.open_thread_count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Subtle Add area link — sits under the area list */}
      <div className="px-3 pb-3">
        <button
          onClick={onOpenNewArea}
          className="
            w-full flex items-center gap-2 px-3 py-1.5 rounded-md
            text-xs text-navy-400 dark:text-navy-600
            hover:text-navy-600 dark:hover:text-navy-400
            hover:bg-navy-100/60 dark:hover:bg-navy-800/40
            transition-colors
          "
        >
          <Plus size={12} className="flex-shrink-0" />
          <span className="font-display uppercase tracking-wide">
            {areas.length === 0 ? 'Add your first area' : 'Add area'}
          </span>
        </button>
      </div>

      {/* Footer — keyboard shortcut hints */}
      <div className="px-4 py-3 border-t border-navy-200 dark:border-navy-800 space-y-1.5">
        <ShortcutHint label="Capture" keys={['N']} />
        <ShortcutHint label="Switcher" keys={[MOD_KEY, 'K']} />
        <div className="pt-1.5 text-xs font-mono text-navy-300 dark:text-navy-700">
          v1.0.0
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDownHandle}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        title="Drag to resize · double-click to reset"
        className="
          absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize
          hover:bg-signal-500/40 dark:hover:bg-signal-500/40
          transition-colors
        "
      />
    </aside>
  )
}

function NavLink({ to, icon: Icon, label, active }) {
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${active
          ? 'bg-signal-500/10 text-signal-600 dark:text-signal-400'
          : 'text-navy-500 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 hover:text-navy-800 dark:hover:text-navy-100'
        }
      `}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="font-display uppercase tracking-wide text-xs">{label}</span>
    </Link>
  )
}

function ShortcutHint({ label, keys }) {
  return (
    <div className="flex items-center justify-between text-xs text-navy-400 dark:text-navy-600">
      <span className="font-display uppercase tracking-wide">{label}</span>
      <span className="flex items-center gap-0.5">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-1.5 py-0.5 rounded bg-navy-100 dark:bg-navy-800 border border-navy-200 dark:border-navy-700 font-mono text-navy-500 dark:text-navy-400 text-[10px]"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  )
}
