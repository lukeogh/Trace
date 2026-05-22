import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, RefreshCw, Activity, Plus, PenLine, Link2, Paperclip, Clock, CheckSquare, CheckCheck, Sparkles, RotateCcw } from 'lucide-react'
import { formatDistanceToNow, format, differenceInDays, differenceInCalendarDays, parseISO } from 'date-fns'
import { areasApi, entriesApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import WeeklyRoundupModal from '../components/WeeklyRoundupModal'
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
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900 bg-grid-light dark:bg-grid-dark">
      {/* ── Sub-toolbar (page-level, no brand) ── */}
      <header className="
        sticky top-0 z-10 px-8 py-5
        bg-navy-50/90 dark:bg-navy-900/90 backdrop-blur-md
        border-b border-navy-200 dark:border-navy-800
      ">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display font-bold text-3xl uppercase tracking-widest text-navy-900 dark:text-white leading-tight">
              Department Log
            </h1>
            <p className="text-sm font-display uppercase tracking-wider text-navy-500 dark:text-navy-400 mt-1.5">
              The Software Department Brain
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            <ViewSegmentedControl viewMode={viewMode} onChange={handleViewMode} />
            <button
              onClick={() => setRoundupOpen(true)}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-md
                bg-signal-500/10 text-signal-600 dark:text-signal-400
                hover:bg-signal-500/15 transition-colors
              "
            >
              <Sparkles size={13} />
              <span className="text-xs font-display uppercase tracking-wide">Weekly Roundup</span>
            </button>
          </div>
        </div>

        {filterNotice && (
          <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-navy-400 dark:text-navy-500">
              {filterNotice}
            </span>
            <button
              onClick={() => handleViewMode('default')}
              className="
                inline-flex items-center gap-1 text-xs font-mono
                text-navy-400 dark:text-navy-500
                hover:text-signal-500 dark:hover:text-signal-400
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
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-navy-100 dark:bg-navy-800/60 border border-navy-200 dark:border-navy-700">
      {VIEW_MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`
            px-3 py-1 rounded text-xs font-display uppercase tracking-wide transition-colors
            ${viewMode === key
              ? 'bg-white dark:bg-navy-900 text-navy-900 dark:text-white shadow-sm'
              : 'text-navy-500 dark:text-navy-400 hover:text-navy-800 dark:hover:text-navy-200'
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
        bg-white dark:bg-navy-850
        border-navy-200 dark:border-navy-700
        hover:border-navy-300 dark:hover:border-navy-600
        hover:shadow-lg dark:hover:shadow-navy-950/60
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
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-display font-bold text-base uppercase tracking-wider text-navy-900 dark:text-white">
            {area.name}
          </h2>
          <StatusBadge status={area.status} type="area" size="xs" />
        </div>

        {/* Summary */}
        <p className="text-sm text-navy-500 dark:text-navy-400 leading-relaxed flex-1 line-clamp-3 mb-4">
          {area.summary || (
            <span className="italic text-navy-300 dark:text-navy-600">
              No summary yet — click to add one.
            </span>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-navy-100 dark:border-navy-700">
          <span className="flex items-center gap-1.5 text-xs text-navy-400 dark:text-navy-500">
            <MessageSquare size={12} />
            <span className="font-mono">
              {area.open_thread_count}
              <span className="text-navy-300 dark:text-navy-700">/{area.thread_count}</span>
            </span>
            <span className="text-navy-300 dark:text-navy-700">active</span>
          </span>

          <div className="flex items-center gap-2">
              {daysSinceUpdate >= INACTIVITY_THRESHOLD_DAYS && area.status !== 'stable' && (
                <span className="flex items-center gap-1 font-mono text-xs text-amber-500 dark:text-amber-400">
                  <Clock size={11} />
                  {daysSinceUpdate}d quiet
                </span>
              )}
            <span className="text-xs font-mono text-navy-300 dark:text-navy-600">{relativeTime}</span>
            <ArrowRight
              size={13}
              className="text-navy-300 dark:text-navy-600 group-hover:text-signal-500 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900 bg-grid-light dark:bg-grid-dark">
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl bg-navy-100 dark:bg-navy-800 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-navy-50 dark:bg-navy-900">
      <div className="text-center">
        <p className="text-sm text-red-500 mb-3">{message}</p>
        <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-md bg-navy-100 dark:bg-navy-800 text-sm text-navy-700 dark:text-navy-200 hover:bg-navy-200 dark:hover:bg-navy-700 transition-colors mx-auto">
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
    className: 'bg-signal-500/10 text-signal-500 dark:text-signal-400',
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
        hover:bg-navy-100/50 dark:hover:bg-navy-800/40
        first:rounded-t-xl last:rounded-b-xl
      "
    >
      <span className={`p-1.5 rounded-md flex-shrink-0 ${cfg.className}`}>
        <Icon size={13} />
      </span>
      <span className="font-display font-semibold uppercase tracking-wide text-xs text-navy-800 dark:text-navy-100 flex-shrink-0">
        {item.area_name}
      </span>
      <span className="text-navy-300 dark:text-navy-600 text-xs flex-shrink-0">/</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-xs text-navy-700 dark:text-navy-200 truncate">
          {primaryText}
        </span>
        {showThreadContext && (
          <span className="text-xs text-navy-400 dark:text-navy-600 truncate">
            {item.thread_title}
          </span>
        )}
      </div>
      <StatusBadge status={item.thread_status} type="thread" size="xs" />
      <span
        className="font-mono text-xs text-navy-300 dark:text-navy-600 flex-shrink-0"
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
  week:    { label: 'This Week', labelClass: 'text-navy-500 dark:text-navy-400' },
  later:   { label: 'Later',   labelClass: 'text-navy-400 dark:text-navy-500' },
}

function ComingUp() {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    entriesApi.getUpcoming(20).then(setTodos).catch(() => {})
  }, [])

  if (todos.length === 0) {
    return (
      <div className="mb-10 flex flex-col items-center justify-center min-h-[80px]">
        <CheckSquare size={20} className="text-navy-300 dark:text-navy-600 mb-1.5" />
        <p className="text-xs text-navy-400 dark:text-navy-600 italic">No open to-dos</p>
      </div>
    )
  }

  const groups = { overdue: [], today: [], week: [], later: [] }
  todos.forEach((t) => groups[getDueGroup(t.due_date)].push(t))

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500">
          Coming Up
        </span>
      </div>

      <div className="bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl divide-y divide-navy-100 dark:divide-navy-800 overflow-hidden">
        {Object.entries(groups).map(([groupKey, items]) => {
          if (items.length === 0) return null
          const { label, labelClass } = GROUP_CONFIG[groupKey]
          return items.map((todo, i) => (
            <Link
              key={todo.id}
              to={`/thread/${todo.thread_id}`}
              className="
                px-4 py-3 flex items-center gap-3 transition-colors duration-150
                hover:bg-navy-100/50 dark:hover:bg-navy-800/40
                first:rounded-t-xl last:rounded-b-xl
              "
            >
              <span className="p-1.5 rounded-md flex-shrink-0 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                <CheckSquare size={13} />
              </span>
              <span className="font-display font-semibold uppercase tracking-wide text-xs text-navy-800 dark:text-navy-100 flex-shrink-0">
                {todo.area_name}
              </span>
              <span className="text-navy-300 dark:text-navy-600 text-xs flex-shrink-0">/</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs text-navy-700 dark:text-navy-200 truncate">
                  {todo.content}
                </span>
                <span className="text-xs text-navy-400 dark:text-navy-600 truncate">
                  {todo.thread_title}
                </span>
              </div>
              {i === 0 && (
                <span className={`font-mono text-xs flex-shrink-0 ${labelClass}`}>
                  {label}
                </span>
              )}
              <span className="font-mono text-xs text-navy-300 dark:text-navy-600 flex-shrink-0">
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
        <Activity size={20} className="text-navy-300 dark:text-navy-600 mb-1.5" />
        <p className="text-xs text-navy-400 dark:text-navy-600 italic">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500">
          Recent Activity
        </span>
        <span className="font-mono text-xs text-navy-300 dark:text-navy-600">
          {visible.length}
        </span>
      </div>

      <div className="bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl divide-y divide-navy-100 dark:divide-navy-800 overflow-hidden">
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
              text-navy-400 dark:text-navy-500
              hover:text-signal-500 dark:hover:text-signal-400
              hover:bg-navy-100 dark:hover:bg-navy-800
            "
          >
            {showAll ? 'Show less' : 'Show 5 more'}
          </button>
        </div>
      )}
    </div>
  )
}
