import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { areasApi } from '../api/client'

const ACTION_BADGE = {
  created:     'bg-signal-500/10 text-signal-600 dark:text-signal-400',
  updated:     'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  deleted:     'bg-red-500/10 text-red-500 dark:text-red-400',
  completed:   'bg-sky-500/10 text-sky-500 dark:text-sky-400',
  uncompleted: 'bg-navy-200/50 text-navy-500 dark:bg-navy-700/50 dark:text-navy-400',
}

function formatAuditDescription({ action, entity_type, field, old_value, new_value }) {
  if (action === 'completed') return 'Task marked complete'
  if (action === 'uncompleted') return 'Task reopened'
  if (action === 'deleted') return `${field} removed: ${old_value}`
  if (action === 'created' && entity_type === 'thread') return `Thread created: ${new_value || field || ''}`
  if (action === 'created' && entity_type === 'entry') return `Entry added (${field})`
  if (action === 'created' && entity_type === 'attachment') return `${field} attached: ${new_value}`
  if (action === 'updated') {
    const base = `${field} changed`
    if (old_value != null && new_value != null) {
      if (old_value.length < 40 && new_value.length < 40) {
        return `${base} from "${old_value}" → "${new_value}"`
      }
      return `${base} from [previous] → [updated]`
    }
    return base
  }
  return `${action} ${entity_type}`
}

function LogRow({ record }) {
  return (
    <Link
      to={`/thread/${record.thread_id}`}
      className="
        px-4 py-3 flex items-center gap-3 text-xs
        border-b border-navy-50 dark:border-navy-800 last:border-0
        hover:bg-navy-50/60 dark:hover:bg-navy-800/40
        transition-colors
      "
    >
      <span className="font-mono text-navy-300 dark:text-navy-600 flex-shrink-0 w-28">
        {format(new Date(record.occurred_at), 'dd MMM HH:mm')}
      </span>
      <span className="font-display font-semibold uppercase tracking-wide text-navy-800 dark:text-navy-100 flex-shrink-0">
        {record.area_name}
      </span>
      {record.thread_title && (
        <>
          <span className="text-navy-300 dark:text-navy-600 flex-shrink-0">/</span>
          <span className="text-navy-500 dark:text-navy-400 truncate w-40 flex-shrink-0">
            {record.thread_title}
          </span>
        </>
      )}
      <span className={`font-display uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${ACTION_BADGE[record.action] ?? ACTION_BADGE.updated}`}>
        {record.action}
      </span>
      <span className="text-navy-500 dark:text-navy-400 flex-1 truncate">
        {formatAuditDescription(record)}
      </span>
    </Link>
  )
}

function LogSkeleton() {
  return (
    <div className="bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl overflow-hidden divide-y divide-navy-50 dark:divide-navy-800">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <div className="w-28 h-3 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
          <div className="w-24 h-3 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
          <div className="w-2 h-3 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
          <div className="w-40 h-3 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
          <div className="w-16 h-3 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
          <div className="flex-1 h-3 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function LogView() {
  const [records, setRecords] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterAreaId, setFilterAreaId] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [log, areaList] = await Promise.all([
        areasApi.getGlobalAudit(),
        areasApi.list(),
      ])
      setRecords(log)
      setAreas(areaList)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const displayed = filterAreaId
    ? records.filter((r) => String(r.area_id) === filterAreaId)
    : records

  return (
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900 bg-grid-light dark:bg-grid-dark">
      {/* Header */}
      <header className="
        sticky top-0 z-10 px-8 py-5
        bg-navy-50/90 dark:bg-navy-900/90 backdrop-blur-md
        border-b border-navy-100 dark:border-navy-800
      ">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <History size={16} className="text-navy-400 dark:text-navy-500" />
            <h1 className="font-display font-bold text-xl uppercase tracking-widest text-navy-900 dark:text-white">
              Audit Log
            </h1>
            {!loading && (
              <span className="font-mono text-xs text-navy-300 dark:text-navy-600">
                {displayed.length}
              </span>
            )}
          </div>

          {areas.length > 0 && (
            <select
              value={filterAreaId}
              onChange={(e) => setFilterAreaId(e.target.value)}
              className="
                px-3 py-1.5 text-xs rounded-lg
                bg-white dark:bg-navy-800
                border border-navy-200 dark:border-navy-600
                text-navy-700 dark:text-navy-200
                focus:outline-none focus:ring-2 focus:ring-signal-500
                font-display uppercase tracking-wide
              "
            >
              <option value="">All Areas</option>
              {areas.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        {loading ? (
          <LogSkeleton />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={load}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-navy-100 dark:bg-navy-800 text-sm mx-auto hover:bg-navy-200 dark:hover:bg-navy-700 transition-colors"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <History size={24} className="text-navy-200 dark:text-navy-700 mx-auto mb-3" />
            <p className="text-sm italic text-navy-400 dark:text-navy-600">
              {filterAreaId ? 'No audit records for this area yet' : 'No audit records yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl overflow-hidden">
            {displayed.map((record) => (
              <LogRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
