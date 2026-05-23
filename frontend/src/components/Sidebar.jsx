import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, History, BrainCircuit, Search, Plus,
  PanelLeftClose, PanelLeftOpen, Settings,
} from 'lucide-react'
import { getAreaStatus } from '../utils/status'
import { MOD_KEY } from '../utils/platform'
import { AreaIcon } from './IconPicker'
import { useAppVersion } from '../hooks/useAppVersion'
import Logo from './Logo'

const MIN_WIDTH = 200
const MAX_WIDTH = 360
const DEFAULT_WIDTH = 240
const COLLAPSED_WIDTH = 60

export default function Sidebar({
  areas,
  onOpenSwitcher,
  onOpenNewArea,
  onOpenSystemSettings,
  systemSettingsBadge = false,
}) {
  const { areaId } = useParams()
  const location = useLocation()
  const version = useAppVersion()

  // ─── Collapse state ────────────────────────────────────────────────────────
  // Persisted across sessions. Ctrl/Cmd+B toggles (VSCode convention).
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  )
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setCollapsed((c) => !c)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ─── Resizable width (only when expanded) ──────────────────────────────────
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
    if (collapsed) return  // no resize when collapsed
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [collapsed])

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

  const effectiveWidth = collapsed ? COLLAPSED_WIDTH : width

  return (
    <aside
      style={{ width: `${effectiveWidth}px` }}
      className="
        flex-shrink-0 flex flex-col h-screen sticky top-0 relative
        bg-paper-100 dark:bg-pitch-900
        border-r border-paper-300 dark:border-pitch-700
        transition-[width] duration-150 ease-out
      "
    >
      {/* Brand — logo + wordmark + slogan (collapses to logo glyph only) */}
      <div className={`
        ${collapsed ? 'px-3 py-4 flex justify-center' : 'px-4 py-5'}
        border-b border-paper-300 dark:border-pitch-700
      `}>
        <Link to="/" className={`flex items-center ${collapsed ? '' : 'gap-3'} min-w-0`} title={collapsed ? 'Trace.' : undefined}>
          <Logo size={collapsed ? 28 : 36} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display font-medium text-xl tracking-tightest text-pitch-800 dark:text-white leading-none">
                Trace.
              </div>
              {/* Slogan: tighter tracking + lighter weight so it fits even at min sidebar
                  width and reads as supporting copy rather than competing with the brand. */}
              <div className="mt-1 font-mono uppercase tracking-[0.12em] text-[9px] text-paper-400 dark:text-paper-700 truncate">
                Stay across everything.
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Quick switcher trigger (hidden when collapsed — search icon serves as a hint via the nav rail) */}
      {!collapsed && (
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
      )}
      {collapsed && (
        <div className="px-2 pt-3">
          <CollapsedIconButton
            icon={Search}
            label={`Jump to… (${MOD_KEY}+K)`}
            onClick={onOpenSwitcher}
          />
        </div>
      )}

      {/* Top nav links */}
      <div className={`${collapsed ? 'px-2' : 'px-3'} pt-3 pb-1 space-y-0.5`}>
        <NavLink to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} collapsed={collapsed} />
        <NavLink to="/log" icon={History} label="Audit Log" active={location.pathname === '/log'} collapsed={collapsed} />
        <NavLink to="/process" icon={BrainCircuit} label="Smart Generate" active={location.pathname === '/process'} collapsed={collapsed} />
      </div>

      {/* Areas section header (hidden when collapsed — icons alone provide the hierarchy) */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs font-display uppercase tracking-widest text-paper-500 dark:text-paper-700">
            Areas
          </span>
        </div>
      )}

      {/* Area list + inline Add area */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'} pb-3 space-y-0.5 ${collapsed ? 'pt-3' : ''}`}>
        {areas.map((area) => {
          const config = getAreaStatus(area.status)
          const isActive = areaId && parseInt(areaId) === area.id

          if (collapsed) {
            return (
              <Link
                key={area.id}
                to={`/area/${area.id}`}
                title={`${area.name}${area.open_thread_count > 0 ? ` (${area.open_thread_count})` : ''}`}
                className={`
                  relative flex items-center justify-center p-2 rounded-md transition-colors
                  ${isActive
                    ? 'bg-paper-200 dark:bg-pitch-700 text-pitch-800 dark:text-white'
                    : 'text-paper-600 dark:text-paper-500 hover:bg-paper-200 dark:hover:bg-pitch-700 hover:text-pitch-700 dark:hover:text-paper-200'
                  }
                `}
              >
                {area.icon ? (
                  <AreaIcon name={area.icon} size={16} />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.dot }}
                  />
                )}
                {/* Status dot in the corner */}
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: config.dot }}
                />
              </Link>
            )
          }

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
        {collapsed ? (
          <CollapsedIconButton
            icon={Plus}
            label={areas.length === 0 ? 'Add your first area' : 'Add area'}
            onClick={onOpenNewArea}
          />
        ) : (
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
        )}
      </nav>

      {/* Footer */}
      <div className={`
        ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}
        border-t border-paper-300 dark:border-pitch-700
        ${collapsed ? 'space-y-2' : 'space-y-1.5'}
      `}>
        {/* System Settings cog — always visible (with badge dot for updates) */}
        <SystemSettingsButton
          collapsed={collapsed}
          badge={systemSettingsBadge}
          onClick={onOpenSystemSettings}
        />

        {!collapsed && (
          <>
            <ShortcutHint label="Capture" keys={['N']} />
            <ShortcutHint label="Switcher" keys={[MOD_KEY, 'K']} />
            <div className="pt-1.5 text-xs font-mono text-paper-400 dark:text-pitch-500">
              {version ? `v${version}` : ''}
            </div>
          </>
        )}

        {/* Collapse / expand toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (${MOD_KEY}+B)`}
          className={`
            ${collapsed ? 'w-full flex justify-center' : 'w-full flex items-center justify-end'}
            p-1.5 rounded-md
            text-paper-500 dark:text-paper-600
            hover:text-pitch-700 dark:hover:text-paper-200
            hover:bg-paper-200 dark:hover:bg-pitch-700
            transition-colors
          `}
        >
          {collapsed
            ? <PanelLeftOpen size={14} />
            : <PanelLeftClose size={14} />
          }
        </button>
      </div>

      {/* Resize handle — disabled when collapsed */}
      {!collapsed && (
        <div
          onMouseDown={onMouseDownHandle}
          onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
          title="Drag to resize · double-click to reset"
          className="
            absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize
            hover:bg-paper-300 dark:hover:bg-pitch-600
            transition-colors
          "
        />
      )}
    </aside>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavLink({ to, icon: Icon, label, active, collapsed }) {
  if (collapsed) {
    return (
      <Link
        to={to}
        title={label}
        className={`
          flex items-center justify-center p-2 rounded-md transition-colors
          ${active
            ? 'bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-300 ring-1 ring-mint/30'
            : 'text-paper-600 dark:text-paper-500 hover:bg-paper-200 dark:hover:bg-pitch-700 hover:text-pitch-700 dark:hover:text-paper-200'
          }
        `}
      >
        <Icon size={16} />
      </Link>
    )
  }
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2 pr-3 py-2 rounded-md text-sm font-medium transition-colors
        border-l-2
        ${active
          ? 'bg-mint-50 dark:bg-mint-900/20 border-mint text-mint-700 dark:text-mint-300 pl-[10px]'
          : 'border-transparent pl-3 text-paper-600 dark:text-paper-500 hover:bg-paper-200 dark:hover:bg-pitch-700 hover:text-pitch-700 dark:hover:text-paper-200'
        }
      `}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="font-display uppercase tracking-wide text-xs">{label}</span>
    </Link>
  )
}

function CollapsedIconButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="
        w-full flex items-center justify-center p-2 rounded-md
        text-paper-500 dark:text-paper-600
        hover:bg-paper-200 dark:hover:bg-pitch-700
        hover:text-pitch-700 dark:hover:text-paper-200
        transition-colors
      "
    >
      <Icon size={15} />
    </button>
  )
}

function SystemSettingsButton({ collapsed, badge, onClick }) {
  const inner = (
    <span className="relative">
      <Settings size={collapsed ? 15 : 13} />
      {badge && (
        <span
          className="
            absolute -top-1 -right-1 w-2 h-2 rounded-full
            bg-mint ring-2 ring-paper-100 dark:ring-pitch-900
          "
          aria-label="Update available"
        />
      )}
    </span>
  )

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={badge ? 'System settings (update available)' : 'System settings'}
        className="
          w-full flex items-center justify-center p-2 rounded-md
          text-paper-500 dark:text-paper-600
          hover:bg-paper-200 dark:hover:bg-pitch-700
          hover:text-pitch-700 dark:hover:text-paper-200
          transition-colors
        "
      >
        {inner}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="
        w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md
        text-paper-500 dark:text-paper-600
        hover:bg-paper-200 dark:hover:bg-pitch-700
        hover:text-pitch-700 dark:hover:text-paper-200
        transition-colors
      "
    >
      <span className="flex items-center gap-2">
        {inner}
        <span className="font-display uppercase tracking-wide text-xs">System</span>
      </span>
      {badge && (
        <span className="text-[9px] font-mono uppercase tracking-wide text-paper-700 dark:text-paper-200">
          Update
        </span>
      )}
    </button>
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
