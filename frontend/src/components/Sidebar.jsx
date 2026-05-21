import { Link, useParams, useLocation } from 'react-router-dom'
import { LayoutDashboard, ChevronRight } from 'lucide-react'
import { getAreaStatus } from '../utils/status'
import ThemeToggle from './ThemeToggle'

export default function Sidebar({ areas, dark, onToggleTheme }) {
  const { areaId, threadId } = useParams()
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <aside className="
      w-56 flex-shrink-0 flex flex-col h-screen sticky top-0
      bg-navy-50 dark:bg-navy-950
      border-r border-navy-200 dark:border-navy-800
    ">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-navy-200 dark:border-navy-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-sm tracking-widest uppercase text-navy-900 dark:text-white">
              Dept Log
            </div>
            <div className="text-xs text-navy-400 dark:text-navy-500 mt-0.5 font-mono">
              Axithra · SW
            </div>
          </div>
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
        </div>
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3 pb-1">
        <Link
          to="/"
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${isDashboard
              ? 'bg-signal-500/10 text-signal-600 dark:text-signal-400'
              : 'text-navy-500 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-800 hover:text-navy-800 dark:hover:text-navy-100'
            }
          `}
        >
          <LayoutDashboard size={15} className="flex-shrink-0" />
          <span className="font-display uppercase tracking-wide text-xs">Dashboard</span>
        </Link>
      </div>

      {/* Divider with label */}
      <div className="px-4 pt-2 pb-1">
        <span className="text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-600">
          Areas
        </span>
      </div>

      {/* Area list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
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
              {/* Status dot */}
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
              {/* Thread count badge */}
              {area.open_thread_count > 0 && (
                <span className="text-xs font-mono text-navy-400 dark:text-navy-500">
                  {area.open_thread_count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-navy-200 dark:border-navy-800">
        <span className="text-xs font-mono text-navy-300 dark:text-navy-600">
          v1.0.0
        </span>
      </div>
    </aside>
  )
}
