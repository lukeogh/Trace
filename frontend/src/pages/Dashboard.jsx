import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { areasApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import { getAreaStatus } from '../utils/status'

export default function Dashboard() {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const totalThreads = areas.reduce((s, a) => s + a.thread_count, 0)
  const openThreads = areas.reduce((s, a) => s + a.open_thread_count, 0)
  const blockedAreas = areas.filter((a) => a.status === 'blocked').length

  if (loading) return <DashboardSkeleton />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900 bg-grid-light dark:bg-grid-dark">
      {/* Top bar */}
      <header className="
        sticky top-0 z-10 px-8 py-4
        bg-navy-50/90 dark:bg-navy-900/90 backdrop-blur-md
        border-b border-navy-200 dark:border-navy-800
      ">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl uppercase tracking-widest text-navy-900 dark:text-white">
              Department Log
            </h1>
            <p className="text-xs font-mono text-navy-400 dark:text-navy-500 mt-0.5">
              Axithra · Software Department · Overview
            </p>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-6">
            <Stat label="Total Threads" value={totalThreads} />
            <Stat label="Open" value={openThreads} accent />
            {blockedAreas > 0 && (
              <Stat label="Blocked" value={blockedAreas} danger />
            )}
          </div>
        </div>
      </header>

      {/* Area grid */}
      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map((area) => (
            <AreaCard key={area.id} area={area} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs font-mono text-navy-300 dark:text-navy-700">
          Click any area to view threads and activity
        </p>
      </main>
    </div>
  )
}

// ─── Area card ────────────────────────────────────────────────────────────────

function AreaCard({ area }) {
  const config = getAreaStatus(area.status)
  const relativeTime = formatDistanceToNow(new Date(area.updated_at), { addSuffix: true })

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
          <div>
            <h2 className="font-display font-bold text-base uppercase tracking-wider text-navy-900 dark:text-white">
              {area.name}
            </h2>
          </div>
          <StatusBadge status={area.status} type="area" size="xs" />
        </div>

        {/* Summary */}
        <p className="
          text-sm text-navy-500 dark:text-navy-400 leading-relaxed flex-1
          line-clamp-3 mb-4
        ">
          {area.summary || (
            <span className="italic text-navy-300 dark:text-navy-600">
              No summary yet — click to add one.
            </span>
          )}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-navy-100 dark:border-navy-700">
          <div className="flex items-center gap-3">
            {/* Thread counts */}
            <span className="flex items-center gap-1.5 text-xs text-navy-400 dark:text-navy-500">
              <MessageSquare size={12} />
              <span className="font-mono">
                {area.open_thread_count}
                <span className="text-navy-300 dark:text-navy-700">
                  /{area.thread_count}
                </span>
              </span>
              <span className="text-navy-300 dark:text-navy-700">active</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-navy-300 dark:text-navy-600">
              {relativeTime}
            </span>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, accent, danger }) {
  return (
    <div className="text-right">
      <div className={`
        font-display font-bold text-xl
        ${danger ? 'text-red-500' : accent ? 'text-signal-500' : 'text-navy-800 dark:text-white'}
      `}>
        {value}
      </div>
      <div className="text-xs font-mono text-navy-400 dark:text-navy-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900">
      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-3 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-xl bg-navy-100 dark:bg-navy-800 animate-pulse"
          />
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
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-navy-100 dark:bg-navy-800 text-sm text-navy-700 dark:text-navy-200 hover:bg-navy-200 dark:hover:bg-navy-700 transition-colors mx-auto"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      </div>
    </div>
  )
}
