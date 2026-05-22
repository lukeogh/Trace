import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { LayoutDashboard, History, BrainCircuit, Search, Plus } from 'lucide-react'
import { getAreaStatus } from '../utils/status'
import { MOD_KEY } from '../utils/platform'
import SettingsMenu from './SettingsMenu'
import { AreaIcon } from './IconPicker'
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
  displayName,
  onChangeDisplayName,
  textSize,
  onChangeTextSize,
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
        bg-paper-100 dark:bg-pitch-900
        border-r border-paper-300 dark:border-pitch-700
      "
    >
      {/* Brand — kept clean: logo + wordmark only */}
      <div className="px-4 py-5 border-b border-paper-300 dark:border-pitch-700">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <Logo size={36} />
          <div className="font-display font-medium text-xl tracking-tightest text-pitch-800 dark:text-white leading-none">
            Trace
          </div>
        </Link>
      </div>

      {/* Quick switcher trigger */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenSwitcher}
          className="
            w-full flex items-center gap-2 px-3 py-2 rounded-md
            bg-white dark:bg-pitch-800 border border-paper-300 dark:border-pitch-700
            text-paper-500 dark:text-paper-600
            hover:border-paper-400 dark:hover:border-pitch-500
            hover:text-paper-700 dark:hover:text-paper-400
            transition-colors
          "
        >
          <Search size={13} />
          <span className="text-xs flex-1 text-left">Jump to…</span>
          <span className="text-xs font-mono text-paper-400 dark:text-paper-700 whitespace-nowrap">
            {MOD_KEY} K
          </span>
        </button>
      </div>

      {/* Top nav links */}
      <div className="px-3 pt-3 pb-1 space-y-0.5">
        <NavLink to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} />
        <NavLink to="/log" icon={History} label="Audit Log" active={location.pathname === '/log'} />
        <NavLink to="/process" icon={BrainCircuit} label="Smart Generate" active={location.pathname === '/process'} />
      </div>

      {/* Areas section header */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-xs font-display uppercase tracking-widest text-paper-500 dark:text-paper-700">
          Areas
        </span>
      </div>

      {/* Area list + inline Add area */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {areas.map((area) => {
          const config = getAreaStatus(area.status)
          const isActive = areaId && parseInt(areaId) === area.id

          return (
            <Link
              key={area.id}
              to={`/area/${area.id}`}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors group
                ${isActive
                  ? 'bg-paper-200 dark:bg-pitch-700 text-pitch-800 dark:text-white'
                  : 'text-paper-600 dark:text-paper-500 hover:bg-paper-200 dark:hover:bg-pitch-700 hover:text-pitch-700 dark:hover:text-paper-200'
                }
              `}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: config.dot,
                  boxShadow: isActive ? `0 0 5px ${config.dot}` : 'none',
                }}
              />
              {area.icon ? (
                <AreaIcon name={area.icon} size={13} className="flex-shrink-0" />
              ) : null}
              <span className="flex-1 truncate font-medium text-xs font-display uppercase tracking-wide">
                {area.name}
              </span>
              {area.open_thread_count > 0 && (
                <span className="text-xs font-mono text-paper-500 dark:text-paper-600">
                  {area.open_thread_count}
                </span>
              )}
            </Link>
          )
        })}

        {/* Subtle add-area row — sits directly under the last area entry */}
        <button
          onClick={onOpenNewArea}
          className="
            w-full flex items-center gap-2 px-3 py-1.5 rounded-md mt-0.5
            text-xs text-paper-500 dark:text-paper-700
            hover:text-paper-700 dark:hover:text-paper-500
            hover:bg-paper-200/60 dark:hover:bg-pitch-700/40
            transition-colors
          "
        >
          <Plus size={12} className="flex-shrink-0" />
          <span className="font-display uppercase tracking-wide">
            {areas.length === 0 ? 'Add your first area' : 'Add area'}
          </span>
        </button>
      </nav>

      {/* Footer — settings + keyboard shortcuts */}
      <div className="border-t border-paper-300 dark:border-pitch-700">
        <div className="px-2 pt-2">
          <SettingsMenu
            displayName={displayName}
            onChangeDisplayName={onChangeDisplayName}
            dark={dark}
            onToggleTheme={onToggleTheme}
            font={font}
            onChangeFont={onChangeFont}
            textSize={textSize}
            onChangeTextSize={onChangeTextSize}
          />
        </div>
        <div className="px-4 pb-3 pt-1 space-y-1">
          <ShortcutHint label="Capture" keys={['N']} />
          <ShortcutHint label="Switcher" keys={[MOD_KEY, 'K']} />
          <div className="pt-1 text-xs font-mono text-paper-400 dark:text-pitch-500">
            v1.0.0
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDownHandle}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        title="Drag to resize · double-click to reset"
        className="
          absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize
          hover:bg-accent-500/40 dark:hover:bg-accent-500/40
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
          ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
          : 'text-paper-600 dark:text-paper-500 hover:bg-paper-200 dark:hover:bg-pitch-700 hover:text-pitch-700 dark:hover:text-paper-200'
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
    <div className="flex items-center justify-between text-xs text-paper-500 dark:text-paper-700">
      <span className="font-display uppercase tracking-wide">{label}</span>
      <span className="flex items-center gap-0.5">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-1.5 py-0.5 rounded bg-paper-200 dark:bg-pitch-700 border border-paper-300 dark:border-pitch-500 font-mono text-paper-600 dark:text-paper-500 text-[10px]"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  )
}
