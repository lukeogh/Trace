import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Check, X, Edit3, RefreshCw } from 'lucide-react'
import { areasApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import ThreadCard from '../components/ThreadCard'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { AREA_STATUSES, THREAD_STATUSES } from '../utils/status'

export default function AreaView() {
  const { areaId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [area, setArea] = useState(null)
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Editing states
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')
  const [savingSummary, setSavingSummary] = useState(false)

  const [editingStatus, setEditingStatus] = useState(false)

  // New thread modal
  const [newThreadOpen, setNewThreadOpen] = useState(false)
  const [threadForm, setThreadForm] = useState({ title: '', description: '', status: 'open' })
  const [creatingThread, setCreatingThread] = useState(false)

  const summaryRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [areaData, threadsData] = await Promise.all([
        areasApi.get(areaId),
        areasApi.listThreads(areaId),
      ])
      setArea(areaData)
      setSummaryDraft(areaData.summary || '')
      setThreads(threadsData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [areaId])

  useEffect(() => {
    if (editingSummary && summaryRef.current) {
      summaryRef.current.focus()
      summaryRef.current.selectionStart = summaryRef.current.value.length
    }
  }, [editingSummary])

  // ── Summary save ────────────────────────────────────────────────────────────

  const saveSummary = async () => {
    setSavingSummary(true)
    try {
      const updated = await areasApi.update(areaId, { summary: summaryDraft })
      setArea(updated)
      setEditingSummary(false)
      toast('Summary saved')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSavingSummary(false)
    }
  }

  const cancelSummary = () => {
    setSummaryDraft(area?.summary || '')
    setEditingSummary(false)
  }

  // ── Status change ───────────────────────────────────────────────────────────

  const changeStatus = async (newStatus) => {
    setEditingStatus(false)
    if (newStatus === area.status) return
    try {
      const updated = await areasApi.update(areaId, { status: newStatus })
      setArea(updated)
      toast(`Status updated to ${newStatus}`)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // ── Create thread ───────────────────────────────────────────────────────────

  const createThread = async () => {
    if (!threadForm.title.trim()) return
    setCreatingThread(true)
    try {
      const thread = await areasApi.createThread(areaId, threadForm)
      setThreads((t) => [thread, ...t])
      setNewThreadOpen(false)
      setThreadForm({ title: '', description: '', status: 'open' })
      toast('Thread created')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setCreatingThread(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <AreaSkeleton />
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-md bg-navy-100 dark:bg-navy-800 text-sm mx-auto hover:bg-navy-200 dark:hover:bg-navy-700 transition-colors">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    )
  }
  if (!area) return null

  return (
    <div className="flex-1 min-h-screen bg-white dark:bg-navy-900">
      {/* Area header */}
      <header className="
        sticky top-0 z-10 px-8 py-5
        bg-white/90 dark:bg-navy-900/90 backdrop-blur-md
        border-b border-navy-100 dark:border-navy-800
      ">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display font-bold text-xl uppercase tracking-widest text-navy-900 dark:text-white">
              {area.name}
            </h1>

            {/* Status badge — click to change */}
            <div className="relative">
              <button onClick={() => setEditingStatus((v) => !v)}>
                <StatusBadge status={area.status} type="area" />
              </button>

              {editingStatus && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-lg shadow-xl overflow-hidden">
                  {Object.entries(AREA_STATUSES).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => changeStatus(key)}
                      className={`
                        flex items-center gap-2 w-full px-4 py-2.5 text-left text-xs font-display uppercase tracking-wide hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors
                        ${key === area.status ? 'bg-navy-50 dark:bg-navy-800' : ''}
                        ${cfg.textClass}
                      `}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Backdrop to close status dropdown */}
              {editingStatus && (
                <div className="fixed inset-0 z-10" onClick={() => setEditingStatus(false)} />
              )}
            </div>
          </div>

          <button
            onClick={() => setNewThreadOpen(true)}
            className="
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-display font-medium uppercase tracking-wide
              bg-signal-500 hover:bg-signal-600 text-white
              shadow-sm hover:shadow-signal-500/25
              transition-all duration-150
            "
          >
            <Plus size={15} />
            New Thread
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-6">
        {/* Summary block */}
        <div className="mb-8 p-5 rounded-xl bg-navy-50 dark:bg-navy-850 border border-navy-200 dark:border-navy-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-500">
              Current Situation
            </span>
            {!editingSummary && (
              <button
                onClick={() => setEditingSummary(true)}
                className="flex items-center gap-1.5 text-xs text-navy-400 dark:text-navy-500 hover:text-signal-500 transition-colors"
              >
                <Edit3 size={12} />
                Edit
              </button>
            )}
          </div>

          {editingSummary ? (
            <div>
              <textarea
                ref={summaryRef}
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={5}
                placeholder="Describe the current situation for this area..."
                className="
                  w-full text-sm bg-white dark:bg-navy-800
                  border border-navy-300 dark:border-navy-600
                  rounded-lg px-3 py-2.5 resize-none
                  text-navy-800 dark:text-navy-100
                  placeholder:text-navy-300 dark:placeholder:text-navy-600
                  focus:outline-none focus:ring-2 focus:ring-signal-500
                  transition-colors
                "
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={cancelSummary} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md text-navy-500 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700 transition-colors">
                  <X size={12} /> Cancel
                </button>
                <button
                  onClick={saveSummary}
                  disabled={savingSummary}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-signal-500 hover:bg-signal-600 text-white disabled:opacity-60 transition-colors"
                >
                  <Check size={12} />
                  {savingSummary ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm text-navy-700 dark:text-navy-300 leading-relaxed whitespace-pre-wrap cursor-text"
              onClick={() => setEditingSummary(true)}
            >
              {area.summary || (
                <span className="italic text-navy-300 dark:text-navy-600">
                  No summary yet. Click to add one.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Threads section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500">
              Threads{' '}
              <span className="font-mono text-navy-300 dark:text-navy-600">
                ({threads.length})
              </span>
            </h2>
          </div>

          {threads.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-navy-200 dark:border-navy-700 rounded-xl">
              <p className="text-sm text-navy-400 dark:text-navy-600 mb-4">No threads yet for this area.</p>
              <button
                onClick={() => setNewThreadOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-signal-500 hover:bg-signal-600 text-white text-sm mx-auto transition-colors"
              >
                <Plus size={14} />
                Create first thread
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} areaId={areaId} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Thread Modal */}
      <Modal
        isOpen={newThreadOpen}
        onClose={() => { setNewThreadOpen(false); setThreadForm({ title: '', description: '', status: 'open' }) }}
        title="New Thread"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={threadForm.title}
              onChange={(e) => setThreadForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Bootloader version mismatch investigation"
              autoFocus
              className="
                w-full px-3 py-2.5 text-sm rounded-lg
                bg-navy-50 dark:bg-navy-800
                border border-navy-200 dark:border-navy-600
                text-navy-900 dark:text-white
                placeholder:text-navy-300 dark:placeholder:text-navy-600
                focus:outline-none focus:ring-2 focus:ring-signal-500
              "
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) createThread() }}
            />
          </div>

          <div>
            <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">
              Description
            </label>
            <textarea
              value={threadForm.description}
              onChange={(e) => setThreadForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this thread covers…"
              rows={3}
              className="
                w-full px-3 py-2.5 text-sm rounded-lg resize-none
                bg-navy-50 dark:bg-navy-800
                border border-navy-200 dark:border-navy-600
                text-navy-900 dark:text-white
                placeholder:text-navy-300 dark:placeholder:text-navy-600
                focus:outline-none focus:ring-2 focus:ring-signal-500
              "
            />
          </div>

          <div>
            <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(THREAD_STATUSES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setThreadForm((f) => ({ ...f, status: key }))}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-display uppercase tracking-wide border transition-colors
                    ${threadForm.status === key
                      ? `${cfg.textClass} ${cfg.bgClass} ${cfg.borderClass}`
                      : 'text-navy-500 dark:text-navy-400 border-navy-200 dark:border-navy-700 hover:border-navy-300 dark:hover:border-navy-600'
                    }
                  `}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setNewThreadOpen(false)}
              className="px-4 py-2 text-sm rounded-md text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createThread}
              disabled={!threadForm.title.trim() || creatingThread}
              className="px-4 py-2 text-sm rounded-md font-medium bg-signal-500 hover:bg-signal-600 text-white disabled:opacity-50 transition-colors"
            >
              {creatingThread ? 'Creating…' : 'Create Thread'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AreaSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-white dark:bg-navy-900 p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
        <div className="h-24 rounded-xl bg-navy-100 dark:bg-navy-800 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-lg bg-navy-100 dark:bg-navy-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
