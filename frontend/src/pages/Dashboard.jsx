import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, RefreshCw, Activity, Plus, PenLine, Link2, Paperclip, Clock, CheckSquare, CheckCheck, Sparkles, RotateCcw } from 'lucide-react'
import { formatDistanceToNow, format, differenceInDays, differenceInCalendarDays, parseISO } from 'date-fns'
import { areasApi, entriesApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import WeeklyRoundupModal from '../components/WeeklyRoundupModal'
import { AreaIcon } from '../components/IconPicker'
import { getAreaStatus } from '../utils/status'

const INACTIVITY_THRESHOLD_DAYS = 7

// Priority order: blocked (most urgent) → on hold → active → stable (least urgent)
const STATUS_PRIORITY = { blocked: 0, review: 1, active: 2, stable: 3 }

const VIEW_MODES = [
  { key: 'default',  label: 'All' },
  { key: 'priority', label: 'Priority' },
  { key: 'focus',    label: 'Focus' },
]

export default function Dashboard() {
  const [areas, setAreas]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const [roundupOpen, setRoundupOpen] = useState(false)

  // View mode persisted to localStorage
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem('dashboardView') || 'default'
  )

  const handleViewMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('dashboardView', mode)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setAreas(await areasApi.list())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Filtered/sorted areas based on view mode
  const displayAreas = viewMode === 'priority'
    ? [...areas].sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 9
        const pb = STATUS_PRIORITY[b.status] ?? 9
        if (pa !== pb) return pa - pb
        return new Date(b.updated_at) - new Date(a.updated_at)
      })
    : viewMode === 'focus'
      ? areas.filter((a) => ['blocked', 'review', 'active'].includes(a.status))
      : areas

  if (loading) return <DashboardSkeleton />
  if (error)   return <ErrorState message={error} onRetry={load} />

  const filterNotice = (() => {
    if (viewMode === 'priority') return 'Priority order — blocked first'
    if (viewMode === 'focus')    return 'Focus mode — stable areas hidden'
    return null
  })()

  return (
    <div className="flex-1 min-h-screen bg-paper-100 dark:bg-pitch-800 bg-grid-light dark:bg-grid-dark">
      {/* ── Sub-toolbar (page-level, no brand) ── */}
      <header className="
        sticky top-0 z-10 px-8 py-5
        bg-paper-100/90 dark:bg-pitch-800/90 backdrop-blur-md
        border-b border-paper-300 dark:border-pitch-700
      ">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display font-medium text-4xl tracking-tightest text-pitch-800 dark:text-white leading-tight">
              Trace
            </h1>
            <p className="text-sm font-mono uppercase tracking-[0.25em] text-paper-600 dark:text-paper-500 mt-2">
              Stay across everything.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            <ViewSegmentedControl viewMode={viewMode} onChange={handleViewMode} />
            <button
              onClick={() => setRoundupOpen(true)}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md
                bg-accent-500/10 text-accent-600 dark:text-accent-400
                hover:bg-accent-500/15 transition-colors
              "
            >
              <Sparkles size={13} />
              <span className="text-xs font-display uppercase tracking-wide">Weekly Roundup</span>
            </button>
          </div>
        </div>

        {filterNotice && (
          <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-paper-500 dark:text-paper-600">
              {filterNotice}
            </span>
            <button
              onClick={() => handleViewMode('default')}
              className="
                inline-flex items-center gap-1 text-xs font-mono
                text-paper-500 dark:text-paper-600
                hover:text-accent-500 dark:hover:text-accent-400
                transition-colors
              "
            >
              <RotateCcw size={11} /> reset
            </button>
          </div>
        )}
      </header>

      {/* ── Area grid ── */}
      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayAreas.map((area) => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>
      </main>

      {/* ── Below-fold sections ── */}
      <div className="max-w-6xl mx-auto px-8 pb-12">
        <ComingUp />
        <RecentActivity />
      </div>

      <WeeklyRoundupModal isOpen={roundupOpen} onClose={() => setRoundupOpen(false)} />
    </div>
  )
}

// ─── View mode segmented control ──────────────────────────────────────────────

function ViewSegmentedControl({ viewMode, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-paper-200 dark:bg-pitch-700/60 border border-paper-300 dark:border-pitch-500">
      {VIEW_MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`
            px-3 py-1 rounded text-xs font-display uppercase tracking-wide transition-colors
            ${viewMode === key
              ? 'bg-white dark:bg-pitch-800 text-pitch-800 dark:text-white shadow-sm'
              : 'text-paper-600 dark:text-paper-500 hover:text-pitch-700 dark:hover:text-paper-300'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Area card ────────────────────────────────────────────────────────────────

function AreaCard({ area }) {
  const config         = getAreaStatus(area.status)
  const relativeTime   = formatDistanceToNow(new Date(area.updated_at), { addSuffix: true })
  const daysSinceUpdate = differenceInDays(new Date(), new Date(area.updated_at))

  return (
    <Link
      to={`/area/${area.id}`}
      className="
        group relative flex flex-col rounded-xl border overflow-hidden
        bg-white dark:bg-pitch-700
        border-paper-300 dark:border-pitch-500
        hover:border-paper-400 dark:hover:border-paper-700
        hover:shadow-lg dark:hover:shadow-pitch-900/60
        hover:-translate-y-0.5
        transition-all duration-200
        animate-fade-in
      "
    >
      {/* Status accent stripe */}
      <div
        className="h-1"
        style={{
          backgroundColor: config.dot,
          boxShadow: `0 1px 8px ${config.dot}60`,
        }}
      />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {area.icon && (
              <span className="text-paper-700 dark:text-paper-200 flex-shrink-0">
                <AreaIcon name={area.icon} size={18} />
              </span>
            )}
            <h2 className="font-display font-bold text-base uppercase tracking-wider text-pitch-800 dark:text-white truncate">
              {area.name}
            </h2>
          </div>
          <StatusBadge status={area.status} type="area" size="xs" />
        </div>

        {/* Summary */}
        <p className="text-sm text-paper-600 dark:text-paper-500 leading-relaxed flex-1 line-clamp-3 mb-4">
          {area.summary || (
            <span className="italic text-paper-400 dark:text-paper-700">
              No summary yet — click to add one.
            </span>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-paper-200 dark:border-pitch-500">
          <span className="flex items-center gap-1.5 text-xs text-paper-500 dark:text-paper-600">
            <MessageSquare size={12} />
            <span className="font-mono">
              {area.open_thread_count}
              <span className="text-paper-400 dark:text-pitch-500">/{area.thread_count}</span>
            </span>
            <span className="text-paper-400 dark:text-pitch-500">active</span>
          </span>

          <div className="flex items-center gap-2">
              {daysSinceUpdate >= INACTIVITY_THRESHOLD_DAYS && area.status !== 'stable' && (
                <span className="flex items-center gap-1 font-mono text-xs text-amber-500 dark:text-amber-400">
                  <Clock size={11} />
                  {daysSinceUpdate}d quiet
                </span>
              )}
            <span className="text-xs font-mono text-paper-400 dark:text-paper-700">{relativeTime}</span>
            <ArrowRight
              size={13}
              className="text-paper-400 dark:text-paper-700 group-hover:text-accent-500 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-paper-100 dark:bg-pitch-800 bg-grid-light dark:bg-grid-dark">
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl bg-paper-200 dark:bg-pitch-700 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-paper-100 dark:bg-pitch-800">
      <div className="text-center">
        <p className="text-sm text-red-500 mb-3">{message}</p>
        <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-md bg-paper-200 dark:bg-pitch-700 text-sm text-pitch-500 dark:text-paper-300 hover:bg-paper-300 dark:hover:bg-pitch-500 transition-colors mx-auto">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    </div>
  )
}

// ─── Recent activity ──────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  thread_created: {
    Icon: Plus,
    className: 'bg-accent-500/10 text-accent-500 dark:text-accent-400',
  },
  entry_added: {
    Icon: PenLine,
    className: 'bg-violet-500/10 text-violet-500 dark:text-violet-400',
  },
  status_changed: {
    Icon: RefreshCw,
    className: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
  },
  link_added: {
    Icon: Link2,
    className: 'bg-sky-500/10 text-sky-500 dark:text-sky-400',
  },
  file_uploaded: {
    Icon: Paperclip,
    className: 'bg-teal-500/10 text-teal-500 dark:text-teal-400',
  },
  todo_completed: {
    Icon: CheckCheck,
    className: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
  },
}

function formatActivityDetail(eventType, detail, threadTitle) {
  if (eventType === 'thread_created') return detail || threadTitle
  if (eventType === 'entry_added') return detail || 'New entry added'
  if (eventType === 'todo_completed') return detail || 'To-do completed'
  if (eventType === 'status_changed') return detail ? `Status changed ${detail}` : 'Status changed'
  if (eventType === 'file_uploaded') return detail ? `File: ${detail}` : 'File uploaded'
  if (eventType === 'link_added') return detail ? `Link: ${detail}` : 'Link added'
  return detail || eventType
}

function ActivityRow({ item }) {
  const cfg = EVENT_CONFIG[item.event_type] ?? EVENT_CONFIG.entry_added
  const { Icon } = cfg
  const primaryText = formatActivityDetail(item.event_type, item.detail, item.thread_title)
  const showThreadContext = item.event_type !== 'thread_created'

  return (
    <Link
      to={`/thread/${item.thread_id}`}
      className="
        px-4 py-3 flex items-center gap-3 transition-colors duration-150
        hover:bg-paper-200/50 dark:hover:bg-pitch-700/40
        first:rounded-t-xl last:rounded-b-xl
      "
    >
      <span className={`p-1.5 rounded-md flex-shrink-0 ${cfg.className}`}>
        <Icon size={13} />
      </span>
      <span className="font-display font-semibold uppercase tracking-wide text-xs text-pitch-700 dark:text-paper-200 flex-shrink-0">
        {item.area_name}
      </span>
      <span className="text-paper-400 dark:text-paper-700 text-xs flex-shrink-0">/</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-xs text-pitch-500 dark:text-paper-300 truncate">
          {primaryText}
        </span>
        {showThreadContext && (
          <span className="text-xs text-paper-500 dark:text-paper-700 truncate">
            {item.thread_title}
          </span>
        )}
      </div>
      <StatusBadge status={item.thread_status} type="thread" size="xs" />
      <span
        className="font-mono text-xs text-paper-400 dark:text-paper-700 flex-shrink-0"
        title={format(new Date(item.occurred_at), 'dd MMM yyyy HH:mm')}
      >
        {formatDistanceToNow(new Date(item.occurred_at), { addSuffix: true })}
      </span>
    </Link>
  )
}

// ─── Coming Up (upcoming todos) ───────────────────────────────────────────────

const TODAY = new Date()

function getDueGroup(dueDateStr) {
  if (!dueDateStr) return 'later'
  const diff = differenceInCalendarDays(parseISO(dueDateStr), TODAY)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 6) return 'week'
  return 'later'
}

const GROUP_CONFIG = {
  overdue: { label: 'Overdue', labelClass: 'text-red-500 dark:text-red-400' },
  today:   { label: 'Today',   labelClass: 'text-amber-500 dark:text-amber-400' },
  week:    { label: 'This Week', labelClass: 'text-paper-600 dark:text-paper-500' },
  later:   { label: 'Later',   labelClass: 'text-paper-500 dark:text-paper-600' },
}

function ComingUp() {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    entriesApi.getUpcoming(20).then(setTodos).catch(() => {})
  }, [])

  if (todos.length === 0) {
    return (
      <div className="mb-10 flex flex-col items-center justify-center min-h-[80px]">
        <CheckSquare size={20} className="text-paper-400 dark:text-paper-700 mb-1.5" />
        <p className="text-xs text-paper-500 dark:text-paper-700 italic">No open to-dos</p>
      </div>
    )
  }

  const groups = { overdue: [], today: [], week: [], later: [] }
  todos.forEach((t) => groups[getDueGroup(t.due_date)].push(t))

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display uppercase tracking-widest text-xs text-paper-500 dark:text-paper-600">
          Coming Up
        </span>
      </div>

      <div className="bg-white dark:bg-pitch-700 border border-paper-300 dark:border-pitch-500 rounded-xl divide-y divide-paper-200 dark:divide-pitch-700 overflow-hidden">
        {Object.entries(groups).map(([groupKey, items]) => {
          if (items.length === 0) return null
          const { label, labelClass } = GROUP_CONFIG[groupKey]
          return items.map((todo, i) => (
            <Link
              key={todo.id}
              to={`/thread/${todo.thread_id}`}
              className="
                px-4 py-3 flex items-center gap-3 transition-colors duration-150
                hover:bg-paper-200/50 dark:hover:bg-pitch-700/40
                first:rounded-t-xl last:rounded-b-xl
              "
            >
              <span className="p-1.5 rounded-md flex-shrink-0 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                <CheckSquare size={13} />
              </span>
              <span className="font-display font-semibold uppercase tracking-wide text-xs text-pitch-700 dark:text-paper-200 flex-shrink-0">
                {todo.area_name}
              </span>
              <span className="text-paper-400 dark:text-paper-700 text-xs flex-shrink-0">/</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs text-pitch-500 dark:text-paper-300 truncate">
                  {todo.content}
                </span>
                <span className="text-xs text-paper-500 dark:text-paper-700 truncate">
                  {todo.thread_title}
                </span>
              </div>
              {i === 0 && (
                <span className={`font-mono text-xs flex-shrink-0 ${labelClass}`}>
                  {label}
                </span>
              )}
              <span className="font-mono text-xs text-paper-400 dark:text-paper-700 flex-shrink-0">
                {todo.due_date ? format(parseISO(todo.due_date), 'EEE d MMM') : '—'}
              </span>
            </Link>
          ))
        })}
      </div>
    </div>
  )
}

// ─── Recent activity ──────────────────────────────────────────────────────────

function RecentActivity() {
  const [items, setItems] = useState([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    areasApi.getActivity(10).then(setItems).catch(() => {})
  }, [])

  const visible = showAll ? items : items.slice(0, 5)
  const hasMore = items.length > 5

  if (items.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center min-h-[80px]">
        <Activity size={20} className="text-paper-400 dark:text-paper-700 mb-1.5" />
        <p className="text-xs text-paper-500 dark:text-paper-700 italic">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display uppercase tracking-widest text-xs text-paper-500 dark:text-paper-600">
          Recent Activity
        </span>
        <span className="font-mono text-xs text-paper-400 dark:text-paper-700">
          {visible.length}
        </span>
      </div>

      <div className="bg-white dark:bg-pitch-700 border border-paper-300 dark:border-pitch-500 rounded-xl divide-y divide-paper-200 dark:divide-pitch-700 overflow-hidden">
        {visible.map((item, i) => (
          <ActivityRow key={`${item.thread_id}-${item.occurred_at}-${i}`} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="
              p-2 rounded-md text-xs font-display uppercase tracking-wide transition-colors duration-150
              text-paper-500 dark:text-paper-600
              hover:text-accent-500 dark:hover:text-accent-400
              hover:bg-paper-200 dark:hover:bg-pitch-700
            "
          >
            {showAll ? 'Show less' : 'Show 5 more'}
          </button>
        </div>
      )}
    </div>
  )
}
