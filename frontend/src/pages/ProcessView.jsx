import { useState, useEffect, useRef, useCallback } from 'react'
import { Cpu, Check, X, Loader2, RotateCcw } from 'lucide-react'
import { areasApi, generateApi, entriesApi } from '../api/client'
import { useToast } from '../components/Toast'

const STATUS_MESSAGES = ['Reading…', 'Identifying tasks…', 'Structuring items…', 'Preparing review…']
const STORAGE_KEY = 'dept-log-process'

const TYPE_BORDER_LEFT = {
  todo:     'border-l-signal-500',
  entry:    'border-l-violet-500',
  decision: 'border-l-amber-500',
}

const TYPE_BADGE = {
  todo:     'bg-signal-500/10 text-signal-600 dark:text-signal-400',
  entry:    'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  decision: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSaved(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ done }) {
  const [width, setWidth] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setWidth(85), 30)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!done) return
    setWidth(100)
    const t = setTimeout(() => setFading(true), 200)
    return () => clearTimeout(t)
  }, [done])

  return (
    <div className={`transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="w-full h-1 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
        <div
          className="h-full bg-signal-500 rounded-full"
          style={{
            width: `${width}%`,
            transition: done ? 'width 200ms ease' : 'width 4000ms ease-out',
          }}
        />
      </div>
    </div>
  )
}

function StatusCycler() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % STATUS_MESSAGES.length), 1500)
    return () => clearInterval(t)
  }, [])
  return (
    <p className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500 text-center mt-3">
      {STATUS_MESSAGES[idx]}
    </p>
  )
}

// ─── Item card ────────────────────────────────────────────────────────────────

const NEW_THREAD_VAL = '__new__'

function ItemCard({ item: initialItem, areaId, areaThreads, selectedAreaName, onApproved, onDiscarded, bulkTrigger }) {
  const [currentItem, setCurrentItem] = useState(initialItem)
  const [status, setStatus] = useState('idle') // idle | approving | approved | rejecting | refining
  const [selectedThreadId, setSelectedThreadId] = useState(NEW_THREAD_VAL)
  const [rejectionReason, setRejectionReason] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [flash, setFlash] = useState(false)
  const toast = useToast()

  // Keep a ref to the latest approve logic so bulkTrigger effect never goes stale
  const approveRef = useRef(null)
  approveRef.current = async () => {
    if (status !== 'idle') return
    setStatus('approving')
    try {
      let threadId
      if (selectedThreadId === NEW_THREAD_VAL) {
        const thread = await areasApi.createThread(areaId, {
          title: currentItem.suggested_thread,
          status: 'open',
        })
        threadId = thread.id
      } else {
        threadId = Number(selectedThreadId)
      }
      await entriesApi.create(threadId, {
        content: currentItem.content,
        type: currentItem.type,
        due_date: currentItem.due_date || undefined,
      })
      setStatus('approved')
      setTimeout(() => {
        setCollapsed(true)
        setTimeout(onApproved, 400)
      }, 1500)
    } catch (e) {
      toast(e.message, 'error')
      setStatus('idle')
    }
  }

  const approve = useCallback(() => approveRef.current(), [])

  // Trigger from parent bulk approve
  useEffect(() => {
    if (bulkTrigger) {
      approveRef.current()
    }
  }, [bulkTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

  const discard = () => {
    setCollapsed(true)
    setTimeout(onDiscarded, 400)
  }

  const handleRefine = async () => {
    if (!rejectionReason.trim()) return
    setStatus('refining')
    try {
      const response = await generateApi.refine(currentItem, rejectionReason, selectedAreaName)
      setCurrentItem(response.item)
      setStatus('idle')
      setRejectionReason('')
      setFlash(true)
      setTimeout(() => setFlash(false), 300)
    } catch (e) {
      toast(e.message, 'error')
      setStatus('idle')
    }
  }

  const borderLeft = TYPE_BORDER_LEFT[currentItem.type] ?? TYPE_BORDER_LEFT.todo
  const badge = TYPE_BADGE[currentItem.type] ?? TYPE_BADGE.todo

  return (
    <div
      className={`overflow-hidden transition-all duration-400 ${
        collapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
      }`}
    >
      <div
        className={`
          bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl overflow-hidden
          border-l-[3px] ${borderLeft}
          ${flash ? 'bg-signal-500/10 dark:bg-signal-500/10' : ''}
          transition-colors duration-300
        `}
      >
        {/* Header strip */}
        <div className="px-4 py-2.5 bg-navy-50/50 dark:bg-navy-900/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-display uppercase text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badge}`}>
              {currentItem.type}
            </span>
            <span className="font-mono text-xs text-navy-400 dark:text-navy-500 truncate">
              {currentItem.suggested_thread}
            </span>
          </div>
          {currentItem.due_date && (
            <span className="font-mono text-xs text-amber-500 flex-shrink-0">
              {currentItem.due_date}
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`px-4 py-3 transition-opacity duration-300 ${status === 'approved' ? 'opacity-50' : ''}`}>
          <p className="text-sm text-navy-800 dark:text-navy-100">{currentItem.content}</p>
          <p className="text-xs text-navy-400 dark:text-navy-500 italic mt-1">Why: {currentItem.rationale}</p>
        </div>

        {/* Action row */}
        {status === 'approved' ? (
          <div className="px-4 py-3 border-t border-navy-50 dark:border-navy-800">
            <span className="text-xs font-display uppercase tracking-wide text-signal-600 dark:text-signal-400">
              Added ✓
            </span>
          </div>
        ) : status === 'rejecting' || status === 'refining' ? (
          <div className="px-4 py-3 border-t border-navy-50 dark:border-navy-800 space-y-2">
            <textarea
              rows={2}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why are you rejecting this?"
              autoFocus
              className="
                w-full bg-navy-50 dark:bg-navy-800 border border-navy-200 dark:border-navy-600
                rounded-lg px-3 py-2 text-sm resize-none
                text-navy-900 dark:text-white
                placeholder:text-navy-300 dark:placeholder:text-navy-600
                focus:outline-none focus:ring-2 focus:ring-signal-500
              "
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={discard}
                className="
                  px-3 py-1.5 text-xs font-display uppercase tracking-wide rounded-md
                  text-navy-500 dark:text-navy-400 hover:bg-navy-100 dark:hover:bg-navy-700
                  transition-colors
                "
              >
                Discard
              </button>
              <button
                onClick={handleRefine}
                disabled={!rejectionReason.trim() || status === 'refining'}
                className="
                  flex items-center gap-1.5 px-3 py-1.5 text-xs font-display uppercase tracking-wide rounded-md
                  bg-signal-500/10 text-signal-600 dark:text-signal-400 hover:bg-signal-500/20
                  disabled:opacity-50 transition-colors
                "
              >
                {status === 'refining' && <Loader2 size={11} className="animate-spin" />}
                Refine
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-navy-50 dark:border-navy-800 flex items-center justify-between gap-3">
            <select
              value={selectedThreadId}
              onChange={(e) => setSelectedThreadId(e.target.value)}
              className="
                flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg
                bg-white dark:bg-navy-800 border border-navy-200 dark:border-navy-600
                text-navy-700 dark:text-navy-200
                focus:outline-none focus:ring-2 focus:ring-signal-500
                font-display uppercase tracking-wide
              "
            >
              <option value={NEW_THREAD_VAL}>+ New thread: {currentItem.suggested_thread}</option>
              {areaThreads.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.title}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={approve}
                disabled={status === 'approving'}
                title="Approve"
                className="
                  flex items-center justify-center
                  bg-signal-500/10 text-signal-600 dark:text-signal-400 hover:bg-signal-500/20
                  rounded-md p-2 transition-colors disabled:opacity-50
                "
              >
                {status === 'approving' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </button>
              <button
                onClick={() => setStatus('rejecting')}
                title="Reject"
                className="
                  flex items-center justify-center
                  bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20
                  rounded-md p-2 transition-colors
                "
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ProcessView ──────────────────────────────────────────────────────────────

export default function ProcessView() {
  // Initialise from localStorage so navigation away doesn't lose work
  const [selectedAreaId, setSelectedAreaId] = useState(() => loadSaved()?.selectedAreaId ?? null)
  const [inputText, setInputText]           = useState(() => loadSaved()?.inputText ?? '')
  const [items, setItems]                   = useState(() => loadSaved()?.items ?? [])
  const [hasExtracted, setHasExtracted]     = useState(() => loadSaved()?.hasExtracted ?? false)

  const [areas, setAreas]           = useState([])
  const [areaThreads, setAreaThreads] = useState([])
  const [processing, setProcessing] = useState(false)
  const [progressDone, setProgressDone] = useState(false)
  const [error, setError]           = useState(null)
  const [bulkTrigger, setBulkTrigger] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRemaining, setBulkRemaining] = useState(0)

  // Persist state whenever it changes
  useEffect(() => {
    saveSaved({ selectedAreaId, inputText, items, hasExtracted })
  }, [selectedAreaId, inputText, items, hasExtracted])

  useEffect(() => {
    areasApi.list().then(setAreas).catch(() => {})
  }, [])

  const selectedArea = areas.find((a) => a.id === selectedAreaId)

  useEffect(() => {
    if (!selectedAreaId) { setAreaThreads([]); return }
    areasApi.listThreads(selectedAreaId).then(setAreaThreads).catch(() => {})
  }, [selectedAreaId])

  const canSubmit = selectedAreaId && inputText.trim().length > 0 && !processing

  const handleProcess = async () => {
    if (!canSubmit) return
    setProcessing(true)
    setProgressDone(false)
    setError(null)
    setItems([])
    setHasExtracted(false)
    setBulkTrigger(false)
    setBulkApproving(false)

    try {
      const response = await generateApi.process(selectedArea.name, inputText)
      setProgressDone(true)
      setTimeout(() => {
        setProcessing(false)
        setHasExtracted(true)
        setItems(response.items.map((item, i) => ({ ...item, _id: i })))
        areasApi.listThreads(selectedAreaId).then(setAreaThreads).catch(() => {})
      }, 600)
    } catch (e) {
      setProgressDone(true)
      setTimeout(() => {
        setProcessing(false)
        if (e.message.includes('ANTHROPIC_API_KEY')) {
          setError('API key not configured — add ANTHROPIC_API_KEY to your .env file and rebuild.')
        } else {
          setError(e.message)
        }
      }, 600)
    }
  }

  const handleItemApproved = (id) => {
    setItems((prev) => prev.filter((item) => item._id !== id))
    setBulkRemaining((c) => Math.max(0, c - 1))
  }

  const handleItemDiscarded = (id) => {
    setItems((prev) => prev.filter((item) => item._id !== id))
    if (bulkApproving) setBulkRemaining((c) => Math.max(0, c - 1))
  }

  useEffect(() => {
    if (bulkApproving && bulkRemaining === 0) setBulkApproving(false)
  }, [bulkApproving, bulkRemaining])

  const handleBulkApprove = () => {
    if (items.length === 0) return
    setBulkRemaining(items.length)
    setBulkApproving(true)
    setBulkTrigger((t) => !t)
  }

  const handleClear = () => {
    clearSaved()
    setSelectedAreaId(null)
    setInputText('')
    setItems([])
    setHasExtracted(false)
    setError(null)
    setBulkApproving(false)
  }

  // All items reviewed — show completion banner instead of results panel
  const allReviewed = hasExtracted && items.length === 0

  return (
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900 bg-grid-light dark:bg-grid-dark">
      {/* Header */}
      <header className="
        sticky top-0 z-10 px-8 py-5
        bg-navy-50/90 dark:bg-navy-900/90 backdrop-blur-md
        border-b border-navy-100 dark:border-navy-800
      ">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Cpu size={16} className="text-navy-400 dark:text-navy-500" />
          <h1 className="font-display font-bold text-xl uppercase tracking-widest text-navy-900 dark:text-white">
            Process
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
        {/* Input Panel */}
        <div className="bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl p-6">
          <p className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500 mb-4">
            Process Information
          </p>

          {/* Area selector pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-display uppercase tracking-wide transition-colors
                  ${selectedAreaId === area.id
                    ? 'bg-signal-500 text-white'
                    : 'text-navy-500 dark:text-navy-400 bg-navy-100 dark:bg-navy-800 hover:bg-navy-200 dark:hover:bg-navy-700'
                  }
                `}
              >
                {area.name}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste meeting notes, emails, documents, or any unstructured text here…"
            className="
              w-full min-h-[200px] bg-navy-50 dark:bg-navy-800
              border border-navy-200 dark:border-navy-600
              rounded-lg px-3 py-2.5 font-sans text-sm resize-y
              text-navy-900 dark:text-white
              placeholder:text-navy-300 dark:placeholder:text-navy-600
              focus:outline-none focus:ring-2 focus:ring-signal-500
              mb-4
            "
          />

          {/* Loading state or submit button */}
          {processing ? (
            <div>
              <ProgressBar done={progressDone} />
              <StatusCycler />
            </div>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!canSubmit}
              className="
                w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                bg-signal-500 hover:bg-signal-600 text-white text-sm
                font-display uppercase tracking-wide
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              "
            >
              <Cpu size={14} />
              Extract Items
            </button>
          )}

          {/* Error state */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-200 dark:border-red-900/50">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => { setError(null); handleProcess() }}
                className="mt-2 text-xs font-display uppercase tracking-wide text-navy-400 hover:text-navy-700 dark:hover:text-navy-200 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* All reviewed — completion banner */}
        {allReviewed && (
          <div className="
            bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-xl
            px-6 py-5 flex items-center justify-between gap-4
          ">
            <div>
              <p className="font-display uppercase tracking-widest text-xs text-signal-600 dark:text-signal-400 mb-0.5">
                All items reviewed
              </p>
              <p className="text-xs text-navy-400 dark:text-navy-500">
                Clear this session to start a new extraction.
              </p>
            </div>
            <button
              onClick={handleClear}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg
                bg-navy-100 dark:bg-navy-800 hover:bg-navy-200 dark:hover:bg-navy-700
                text-xs font-display uppercase tracking-wide text-navy-600 dark:text-navy-300
                transition-colors flex-shrink-0
              "
            >
              <RotateCcw size={12} />
              Clear
            </button>
          </div>
        )}

        {/* Results Panel */}
        {items.length > 0 && (
          <div>
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500">
                  Extracted Items
                </span>
                <p className="text-xs text-navy-500 dark:text-navy-400 italic mt-1">
                  Review each item. Approved items will be added to the selected area.
                </p>
              </div>
              <span className="font-mono text-xs text-navy-400 dark:text-navy-500 flex-shrink-0 ml-4 mt-0.5">
                {items.length} items found
              </span>
            </div>

            <div className="space-y-3 mt-3">
              {items.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  areaId={selectedAreaId}
                  areaThreads={areaThreads}
                  selectedAreaName={selectedArea?.name ?? ''}
                  onApproved={() => handleItemApproved(item._id)}
                  onDiscarded={() => handleItemDiscarded(item._id)}
                  bulkTrigger={bulkTrigger}
                />
              ))}
            </div>

            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving || items.length === 0}
              className="
                mt-4 w-full py-2.5 text-xs font-display uppercase tracking-wide rounded-lg
                text-navy-500 dark:text-navy-400 bg-navy-100 dark:bg-navy-800
                hover:bg-navy-200 dark:hover:bg-navy-700
                disabled:opacity-50 transition-colors
              "
            >
              {bulkApproving ? `Approving ${bulkRemaining} items…` : 'Approve all remaining'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
