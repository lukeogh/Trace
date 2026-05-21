import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Edit3, Trash2, Check, X,
  Paperclip, Link2, Upload, ExternalLink,
  RefreshCw, FileText
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { threadsApi, entriesApi, attachmentsApi, areasApi } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { THREAD_STATUSES, formatBytes, DUE_DATE_OPTIONS } from '../utils/status'

const INACTIVITY_THRESHOLD_DAYS = 7

const ENTRY_TYPES = [
  { key: 'entry',    label: 'Entry' },
  { key: 'todo',     label: 'To Do' },
  { key: 'decision', label: 'Decision' },
]

function getDueDateClass(dueDateStr) {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (dueDateStr === today) return 'text-amber-500 font-semibold'
  if (dueDateStr < today)  return 'text-red-500 font-semibold'
  return 'text-navy-400 dark:text-navy-500'
}

export default function ThreadView() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [thread, setThread] = useState(null)
  const [area, setArea] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastVisitedBanner, setLastVisitedBanner] = useState(null)

  // Thread-level editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [editingStatus, setEditingStatus] = useState(false)

  // Entry composer state
  const [newEntryContent, setNewEntryContent] = useState('')
  const [entryType, setEntryType] = useState('entry')
  const [dueDateOption, setDueDateOption] = useState(null)
  const [dueDate, setDueDate] = useState(null)
  const [addingEntry, setAddingEntry] = useState(false)

  // Entry editing
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [entryDraft, setEntryDraft] = useState('')

  // Attachment modals
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkForm, setLinkForm] = useState({ name: '', url: '' })
  const [addingLink, setAddingLink] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef(null)

  // Delete dialogs
  const [deleteThreadOpen, setDeleteThreadOpen] = useState(false)
  const [deleteEntryId, setDeleteEntryId] = useState(null)
  const [deleteAttachmentId, setDeleteAttachmentId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const t = await threadsApi.get(threadId)
      setThread(t)
      setTitleDraft(t.title)
      setDescDraft(t.description || '')
      const a = await areasApi.get(t.area_id)
      setArea(a)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [threadId])

  // Last-visited banner
  useEffect(() => {
    const key = `thread_last_visited_${threadId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const diff = Date.now() - new Date(stored).getTime()
      if (diff > 24 * 60 * 60 * 1000) {
        setLastVisitedBanner(formatDistanceToNow(new Date(stored), { addSuffix: true }))
      }
    }
    localStorage.setItem(key, new Date().toISOString())
  }, [threadId])

  // ── Thread-level edits ──────────────────────────────────────────────────────

  const saveTitle = async () => {
    if (!titleDraft.trim()) return
    try {
      const updated = await threadsApi.update(threadId, { title: titleDraft })
      setThread(updated)
      setEditingTitle(false)
      toast('Title updated')
    } catch (e) { toast(e.message, 'error') }
  }

  const saveDescription = async () => {
    try {
      const updated = await threadsApi.update(threadId, { description: descDraft })
      setThread(updated)
      setEditingDescription(false)
      toast('Description updated')
    } catch (e) { toast(e.message, 'error') }
  }

  const changeStatus = async (newStatus) => {
    setEditingStatus(false)
    if (newStatus === thread.status) return
    try {
      const updated = await threadsApi.update(threadId, { status: newStatus })
      setThread(updated)
      toast(`Status → ${THREAD_STATUSES[newStatus]?.label}`)
    } catch (e) { toast(e.message, 'error') }
  }

  const deleteThread = async () => {
    try {
      await threadsApi.delete(threadId)
      toast('Thread deleted')
      navigate(`/area/${thread.area_id}`)
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Entries ─────────────────────────────────────────────────────────────────

  const addEntry = async () => {
    if (!newEntryContent.trim()) return
    setAddingEntry(true)
    try {
      const entry = await entriesApi.create(threadId, {
        content: newEntryContent,
        type: entryType,
        due_date: entryType === 'todo' ? dueDate : undefined,
      })
      setThread((t) => ({ ...t, entries: [...t.entries, entry] }))
      setNewEntryContent('')
      setEntryType('entry')
      setDueDateOption(null)
      setDueDate(null)
      toast('Entry added')
    } catch (e) { toast(e.message, 'error') }
    finally { setAddingEntry(false) }
  }

  const saveEntry = async (entryId) => {
    try {
      const updated = await entriesApi.update(entryId, { content: entryDraft })
      setThread((t) => ({
        ...t,
        entries: t.entries.map((e) => (e.id === entryId ? updated : e)),
      }))
      setEditingEntryId(null)
      toast('Entry updated')
    } catch (e) { toast(e.message, 'error') }
  }

  const deleteEntry = async (entryId) => {
    try {
      await entriesApi.delete(entryId)
      setThread((t) => ({ ...t, entries: t.entries.filter((e) => e.id !== entryId) }))
      toast('Entry deleted')
    } catch (e) { toast(e.message, 'error') }
  }

  const toggleEntryComplete = async (entryId, completed) => {
    // Optimistic update
    setThread((t) => ({
      ...t,
      entries: t.entries.map((e) =>
        e.id === entryId
          ? { ...e, completed, completed_at: completed ? new Date().toISOString() : null }
          : e
      ),
    }))
    try {
      const updated = await entriesApi.update(entryId, { completed })
      setThread((t) => ({
        ...t,
        entries: t.entries.map((e) => (e.id === entryId ? updated : e)),
      }))
    } catch (err) {
      // Revert
      setThread((t) => ({
        ...t,
        entries: t.entries.map((e) =>
          e.id === entryId ? { ...e, completed: !completed } : e
        ),
      }))
      toast(err.message, 'error')
    }
  }

  // ── Attachments ─────────────────────────────────────────────────────────────

  const addLink = async () => {
    if (!linkForm.name.trim() || !linkForm.url.trim()) return
    setAddingLink(true)
    try {
      const att = await attachmentsApi.addLink(threadId, linkForm)
      setThread((t) => ({ ...t, attachments: [...t.attachments, att] }))
      setLinkModalOpen(false)
      setLinkForm({ name: '', url: '' })
      toast('Link added')
    } catch (e) { toast(e.message, 'error') }
    finally { setAddingLink(false) }
  }

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const att = await attachmentsApi.uploadFile(threadId, file)
      setThread((t) => ({ ...t, attachments: [...t.attachments, att] }))
      toast(`File "${file.name}" uploaded`)
    } catch (e) { toast(e.message, 'error') }
    finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  const deleteAttachment = async (attId) => {
    try {
      await attachmentsApi.delete(attId)
      setThread((t) => ({ ...t, attachments: t.attachments.filter((a) => a.id !== attId) }))
      toast('Attachment removed')
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <ThreadSkeleton />
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }
  if (!thread) return null

  const files = thread.attachments.filter((a) => a.type === 'file')
  const links = thread.attachments.filter((a) => a.type === 'link')

  // Open tasks: incomplete todos sorted by due_date asc, undated last
  const openTasks = thread.entries
    .filter((e) => e.type === 'todo' && !e.completed)
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return 0
    })

  // Render order: incomplete entries/todos/decisions chrono, completed todos last
  const sortedEntries = [...thread.entries].sort((a, b) => {
    const aCompleted = a.type === 'todo' && a.completed
    const bCompleted = b.type === 'todo' && b.completed
    if (aCompleted && !bCompleted) return 1
    if (!aCompleted && bCompleted) return -1
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const handleDueDateOption = (opt) => {
    setDueDateOption(opt.label)
    const resolved = opt.resolve()
    setDueDate(resolved)
  }

  return (
    <div className="flex-1 min-h-screen bg-navy-50 dark:bg-navy-900 bg-grid-light dark:bg-grid-dark">
      {/* Header */}
      <header className="
        sticky top-0 z-10 px-8 py-4
        bg-navy-50/90 dark:bg-navy-900/90 backdrop-blur-md
        border-b border-navy-100 dark:border-navy-800
      ">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-mono text-navy-400 dark:text-navy-500 mb-3">
            <Link to="/" className="hover:text-signal-500 transition-colors">Dashboard</Link>
            <span>/</span>
            {area && (
              <>
                <Link to={`/area/${area.id}`} className="hover:text-signal-500 transition-colors uppercase">
                  {area.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-navy-300 dark:text-navy-600 truncate max-w-xs">{thread.title}</span>
          </nav>

          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                    className="
                      flex-1 font-display font-bold text-xl uppercase tracking-wider
                      bg-transparent border-b-2 border-signal-500
                      text-navy-900 dark:text-white outline-none px-0
                    "
                  />
                  <button onClick={saveTitle} className="p-1 text-green-500 hover:text-green-600"><Check size={16} /></button>
                  <button onClick={() => { setTitleDraft(thread.title); setEditingTitle(false) }} className="p-1 text-navy-400 hover:text-navy-600"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h1 className="font-display font-bold text-xl uppercase tracking-wider text-navy-900 dark:text-white truncate">
                    {thread.title}
                  </h1>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-navy-300 hover:text-signal-500 transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Status selector */}
              <div className="relative">
                <button onClick={() => setEditingStatus((v) => !v)}>
                  <StatusBadge status={thread.status} type="thread" />
                </button>
                {editingStatus && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setEditingStatus(false)} />
                    <div className="absolute top-full right-0 mt-1 z-20 bg-white dark:bg-navy-850 border border-navy-200 dark:border-navy-700 rounded-lg shadow-xl overflow-hidden">
                      {Object.entries(THREAD_STATUSES).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => changeStatus(key)}
                          className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-xs font-display uppercase tracking-wide hover:bg-navy-50 dark:hover:bg-navy-800 transition-colors ${cfg.textClass}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Delete thread */}
              <button
                onClick={() => setDeleteThreadOpen(true)}
                className="p-2 rounded text-navy-300 dark:text-navy-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete thread"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-2">
            {editingDescription ? (
              <div className="flex gap-2">
                <textarea
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  rows={2}
                  className="
                    flex-1 text-sm bg-transparent border-b border-navy-300 dark:border-navy-600
                    text-navy-600 dark:text-navy-300 outline-none resize-none
                  "
                />
                <button onClick={saveDescription} className="p-1 text-green-500"><Check size={14} /></button>
                <button onClick={() => { setDescDraft(thread.description); setEditingDescription(false) }} className="p-1 text-navy-400"><X size={14} /></button>
              </div>
            ) : (
              <div
                className="flex items-start gap-2 group cursor-text"
                onClick={() => setEditingDescription(true)}
              >
                <p className="text-sm text-navy-500 dark:text-navy-400 flex-1">
                  {thread.description || (
                    <span className="italic text-navy-300 dark:text-navy-600">Add a description…</span>
                  )}
                </p>
                <Edit3 size={12} className="text-navy-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body: two columns */}
      <div className="max-w-5xl mx-auto px-8 py-6 flex gap-8">
        {/* ── Left: Entry log ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-500">
              Entries <span className="font-mono text-navy-300 dark:text-navy-600">({thread.entries.length})</span>
            </h2>
          </div>

          {/* Last-visited banner */}
          {lastVisitedBanner && (
            <p className="font-mono text-xs text-navy-400 dark:text-navy-600 italic mb-3">
              ↩ Last visited {lastVisitedBanner}
            </p>
          )}

          {/* Entry composer */}
          <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-navy-200 dark:border-navy-700 bg-navy-50/50 dark:bg-navy-850/50">
            {/* Type selector */}
            <div className="flex items-center gap-1.5 mb-3">
              {ENTRY_TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setEntryType(key); setDueDateOption(null); setDueDate(null) }}
                  className={`
                    px-3 py-1 rounded-full text-xs font-display uppercase tracking-wide transition-colors
                    ${entryType === key
                      ? 'bg-signal-500 text-white'
                      : 'text-navy-500 dark:text-navy-400 bg-navy-100 dark:bg-navy-800 hover:bg-navy-200 dark:hover:bg-navy-700'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            <textarea
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              placeholder={
                entryType === 'todo'     ? 'Describe the task…' :
                entryType === 'decision' ? 'State the decision and rationale…' :
                'What\'s happening? Document findings, decisions, blockers…'
              }
              rows={4}
              className="
                w-full bg-white dark:bg-navy-800 border border-navy-200 dark:border-navy-600
                rounded-lg px-3 py-2.5 text-sm resize-none
                text-navy-900 dark:text-white
                placeholder:text-navy-300 dark:placeholder:text-navy-600
                focus:outline-none focus:ring-2 focus:ring-signal-500
              "
            />

            {/* Due date row for To Do */}
            {entryType === 'todo' && (
              <div className="mt-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {DUE_DATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleDueDateOption(opt)}
                      className={`
                        px-2.5 py-1 rounded-full text-xs font-display uppercase tracking-wide transition-colors
                        ${dueDateOption === opt.label
                          ? 'bg-signal-500 text-white'
                          : 'text-navy-500 dark:text-navy-400 bg-navy-100 dark:bg-navy-800 hover:bg-navy-200 dark:hover:bg-navy-700'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {dueDateOption === 'Pick date' && (
                    <input
                      type="date"
                      value={dueDate || ''}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="text-xs px-2 py-1 rounded-md bg-white dark:bg-navy-800 border border-navy-200 dark:border-navy-600 text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-signal-500"
                    />
                  )}
                </div>
                {dueDate && (
                  <p className="font-mono text-xs text-navy-400 mt-1">
                    due {format(parseISO(dueDate), 'dd MMM yyyy')}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                onClick={addEntry}
                disabled={!newEntryContent.trim() || addingEntry}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium bg-signal-500 hover:bg-signal-600 text-white disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                {addingEntry ? 'Adding…' : 'Add Entry'}
              </button>
            </div>
          </div>

          {/* Open tasks section */}
          {openTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display uppercase tracking-widest text-xs text-navy-400 dark:text-navy-500">
                  Open Tasks
                </span>
                <span className="font-mono text-xs text-navy-300 dark:text-navy-600">
                  {openTasks.length}
                </span>
              </div>
              <div className="space-y-1">
                {openTasks.map((task) => (
                  <a
                    key={task.id}
                    href={`#entry-${task.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-navy-850 border border-navy-100 dark:border-navy-700 hover:border-navy-200 dark:hover:border-navy-600 transition-colors group"
                  >
                    <TaskCheckbox
                      completed={false}
                      onToggle={(e) => { e.preventDefault(); toggleEntryComplete(task.id, true) }}
                    />
                    <span className="flex-1 text-xs text-navy-700 dark:text-navy-200 truncate group-hover:text-navy-900 dark:group-hover:text-white">
                      {task.content}
                    </span>
                    {task.due_date && (
                      <span className={`font-mono text-xs flex-shrink-0 ${getDueDateClass(task.due_date)}`}>
                        {format(parseISO(task.due_date), 'dd MMM')}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Entry timeline */}
          {thread.entries.length === 0 ? (
            <div className="text-center py-12 text-sm text-navy-400 dark:text-navy-600 italic">
              No entries yet. Add the first one above.
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-navy-100 dark:bg-navy-800" />

              <div className="space-y-1">
                {sortedEntries.map((entry) => (
                  <EntryBlock
                    key={entry.id}
                    entry={entry}
                    editing={editingEntryId === entry.id}
                    draft={entryDraft}
                    onEditStart={() => { setEditingEntryId(entry.id); setEntryDraft(entry.content) }}
                    onDraftChange={(v) => setEntryDraft(v)}
                    onSave={() => saveEntry(entry.id)}
                    onCancel={() => setEditingEntryId(null)}
                    onDelete={() => setDeleteEntryId(entry.id)}
                    onToggleComplete={(completed) => toggleEntryComplete(entry.id, completed)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Attachments ───────────────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0">
          <div className="sticky top-32 space-y-5">
            {/* Files */}
            <div className="p-4 rounded-xl bg-navy-50 dark:bg-navy-850 border border-navy-200 dark:border-navy-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-500">
                  Files <span className="font-mono text-navy-300 dark:text-navy-600">({files.length})</span>
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-1 text-xs text-signal-600 dark:text-signal-400 hover:text-signal-500 transition-colors disabled:opacity-50"
                >
                  <Upload size={12} />
                  {uploadingFile ? 'Uploading…' : 'Upload'}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
              </div>

              {files.length === 0 ? (
                <p className="text-xs italic text-navy-300 dark:text-navy-600">No files attached.</p>
              ) : (
                <div className="space-y-2">
                  {files.map((f) => (
                    <FileItem key={f.id} file={f} onDelete={() => setDeleteAttachmentId(f.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="p-4 rounded-xl bg-navy-50 dark:bg-navy-850 border border-navy-200 dark:border-navy-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-display uppercase tracking-widest text-navy-400 dark:text-navy-500">
                  Links <span className="font-mono text-navy-300 dark:text-navy-600">({links.length})</span>
                </h3>
                <button
                  onClick={() => setLinkModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-signal-600 dark:text-signal-400 hover:text-signal-500 transition-colors"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>

              {links.length === 0 ? (
                <p className="text-xs italic text-navy-300 dark:text-navy-600">No links added.</p>
              ) : (
                <div className="space-y-2">
                  {links.map((l) => (
                    <LinkItem key={l.id} link={l} onDelete={() => setDeleteAttachmentId(l.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modals & dialogs ──────────────────────────────────────────────────── */}

      <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Add Link" width="max-w-sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">Label</label>
            <input
              autoFocus
              type="text"
              value={linkForm.name}
              onChange={(e) => setLinkForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. GitHub Issue #142"
              className="w-full px-3 py-2 text-sm rounded-lg bg-navy-50 dark:bg-navy-800 border border-navy-200 dark:border-navy-600 text-navy-900 dark:text-white placeholder:text-navy-300 dark:placeholder:text-navy-600 focus:outline-none focus:ring-2 focus:ring-signal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">URL</label>
            <input
              type="url"
              value={linkForm.url}
              onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://…"
              className="w-full px-3 py-2 text-sm rounded-lg bg-navy-50 dark:bg-navy-800 border border-navy-200 dark:border-navy-600 text-navy-900 dark:text-white placeholder:text-navy-300 dark:placeholder:text-navy-600 focus:outline-none focus:ring-2 focus:ring-signal-500"
              onKeyDown={(e) => { if (e.key === 'Enter') addLink() }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setLinkModalOpen(false)} className="px-4 py-2 text-sm rounded-md text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-700 transition-colors">Cancel</button>
            <button onClick={addLink} disabled={!linkForm.name.trim() || !linkForm.url.trim() || addingLink} className="px-4 py-2 text-sm rounded-md font-medium bg-signal-500 hover:bg-signal-600 text-white disabled:opacity-50 transition-colors">
              {addingLink ? 'Adding…' : 'Add Link'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteThreadOpen}
        onClose={() => setDeleteThreadOpen(false)}
        onConfirm={deleteThread}
        title="Delete Thread"
        message="This will permanently delete the thread and all its entries and attachments. This cannot be undone."
      />

      <ConfirmDialog
        isOpen={!!deleteEntryId}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={() => deleteEntry(deleteEntryId)}
        title="Delete Entry"
        message="Delete this entry permanently?"
      />

      <ConfirmDialog
        isOpen={!!deleteAttachmentId}
        onClose={() => setDeleteAttachmentId(null)}
        onConfirm={() => deleteAttachment(deleteAttachmentId)}
        title="Remove Attachment"
        message="Remove this attachment? Uploaded files will be deleted from the server."
      />
    </div>
  )
}

// ─── Task checkbox ────────────────────────────────────────────────────────────

function TaskCheckbox({ completed, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0
        transition-all duration-150
        ${completed
          ? 'bg-signal-500 border-signal-500'
          : 'border-navy-300 dark:border-navy-600 bg-transparent hover:border-signal-400'
        }
      `}
    >
      <svg viewBox="0 0 24 24" width={13} height={13} fill="none">
        <path
          d="M4 12l5 5 11-11"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="24"
          strokeDashoffset={completed ? 0 : 24}
          style={{ transition: 'stroke-dashoffset 200ms ease 150ms' }}
        />
      </svg>
    </button>
  )
}

// ─── Entry block ──────────────────────────────────────────────────────────────

function EntryBlock({ entry, editing, draft, onEditStart, onDraftChange, onSave, onCancel, onDelete, onToggleComplete }) {
  const date = new Date(entry.created_at)
  const wasEdited = entry.updated_at !== entry.created_at
  const isDecision = entry.type === 'decision'
  const isTodo = entry.type === 'todo'

  return (
    <div id={`entry-${entry.id}`} className="relative pl-10 pb-6 group animate-fade-in">
      {/* Timeline dot */}
      <div className={`
        absolute left-3 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-navy-900 z-10
        ${isDecision ? 'bg-amber-400' : 'bg-signal-500'}
      `} />

      <div className={`
        relative rounded-xl border overflow-hidden
        bg-white dark:bg-navy-850
        border-navy-100 dark:border-navy-700
        group-hover:border-navy-200 dark:group-hover:border-navy-600
        transition-colors
        ${isTodo && entry.completed ? 'opacity-60' : ''}
      `}>
        {/* Decision accent bar */}
        {isDecision && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
        )}

        {/* Entry header */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b border-navy-50 dark:border-navy-700 bg-navy-50/50 dark:bg-navy-900/30 ${isDecision ? 'pl-5' : ''}`}>
          <div className="flex items-center gap-2">
            {isDecision && (
              <span className="font-display uppercase text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                Decision
              </span>
            )}
            <span className="text-xs font-mono font-medium text-signal-600 dark:text-signal-400">
              {format(date, 'dd MMM yyyy')}
            </span>
            <span className="text-xs font-mono text-navy-400 dark:text-navy-500">
              {format(date, 'HH:mm')}
            </span>
            {wasEdited && (
              <span className="text-xs font-mono text-navy-300 dark:text-navy-600">(edited)</span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEditStart} className="p-1 rounded text-navy-300 dark:text-navy-600 hover:text-signal-500 hover:bg-signal-50 dark:hover:bg-signal-900/20 transition-colors">
              <Edit3 size={12} />
            </button>
            <button onClick={onDelete} className="p-1 rounded text-navy-300 dark:text-navy-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`px-4 py-3 ${isDecision ? 'pl-5' : ''}`}>
          {editing ? (
            <div>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                rows={6}
                className="
                  w-full bg-navy-50 dark:bg-navy-800 border border-navy-200 dark:border-navy-600
                  rounded-lg px-3 py-2 text-sm resize-none font-mono
                  text-navy-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-signal-500
                "
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded text-navy-500 hover:bg-navy-100 dark:hover:bg-navy-700 transition-colors">
                  <X size={12} /> Cancel
                </button>
                <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-signal-500 hover:bg-signal-600 text-white transition-colors">
                  <Check size={12} /> Save
                </button>
              </div>
            </div>
          ) : isTodo ? (
            <div className="flex items-start gap-3">
              <TaskCheckbox
                completed={entry.completed}
                onToggle={() => onToggleComplete(!entry.completed)}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug transition-colors duration-200 ${
                  entry.completed
                    ? 'line-through text-navy-400 dark:text-navy-500'
                    : 'text-navy-700 dark:text-navy-200'
                }`}>
                  {entry.content}
                </p>
                {entry.due_date && !entry.completed && (
                  <p className={`font-mono text-xs mt-1 ${getDueDateClass(entry.due_date)}`}>
                    due {format(parseISO(entry.due_date), 'dd MMM yyyy')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="prose-entry text-navy-700 dark:text-navy-200">
              <ReactMarkdown>{entry.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── File item ────────────────────────────────────────────────────────────────

function FileItem({ file, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-2 group py-1">
      <a
        href={`/uploads/${file.stored_name}`}
        download={file.original_name}
        className="flex items-center gap-2 min-w-0 text-xs text-navy-700 dark:text-navy-300 hover:text-signal-500 transition-colors"
      >
        <FileText size={12} className="flex-shrink-0 text-navy-400 dark:text-navy-500" />
        <span className="truncate">{file.name}</span>
        {file.size && (
          <span className="text-navy-300 dark:text-navy-600 flex-shrink-0 font-mono">
            {formatBytes(file.size)}
          </span>
        )}
      </a>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-navy-300 hover:text-red-500 transition-all"
      >
        <X size={11} />
      </button>
    </div>
  )
}

// ─── Link item ────────────────────────────────────────────────────────────────

function LinkItem({ link, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-2 group py-1">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 min-w-0 text-xs text-navy-700 dark:text-navy-300 hover:text-signal-500 transition-colors"
      >
        <Link2 size={12} className="flex-shrink-0 text-navy-400 dark:text-navy-500" />
        <span className="truncate">{link.name}</span>
        <ExternalLink size={10} className="flex-shrink-0 text-navy-300 dark:text-navy-600" />
      </a>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-navy-300 hover:text-red-500 transition-all"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function ThreadSkeleton() {
  return (
    <div className="flex-1 min-h-screen bg-white dark:bg-navy-900 p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-7 w-64 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
        <div className="h-5 w-96 rounded bg-navy-100 dark:bg-navy-800 animate-pulse" />
        <div className="h-32 rounded-xl bg-navy-100 dark:bg-navy-800 animate-pulse mt-8" />
      </div>
    </div>
  )
}
