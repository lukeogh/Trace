import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { areasApi } from '../api/client'
import { useToast } from './Toast'
import Modal from './Modal'

export default function NewAreaModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setName('')
    setSummary('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      const area = await areasApi.create({ name: trimmed, summary: summary.trim() })
      toast(`Created “${area.name}”`)
      onCreated?.(area)
      onClose()
      navigate(`/area/${area.id}`)
    } catch (e) {
      toast(e.message || 'Failed to create area', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New area" width="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">
            Name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit() }}
            placeholder="e.g. Customer Portal"
            className="
              w-full px-3 py-2 text-sm rounded-lg
              bg-navy-50 dark:bg-navy-800 border border-navy-200 dark:border-navy-600
              text-navy-900 dark:text-white
              placeholder:text-navy-300 dark:placeholder:text-navy-600
              focus:outline-none focus:ring-2 focus:ring-signal-500
            "
          />
        </div>

        <div>
          <label className="block text-xs font-display uppercase tracking-wide text-navy-500 dark:text-navy-400 mb-1.5">
            Summary <span className="text-navy-300 dark:text-navy-600 normal-case font-mono">— optional</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="What does this area cover?"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
            className="
              w-full px-3 py-2.5 text-sm rounded-lg resize-none
              bg-navy-50 dark:bg-navy-800 border border-navy-200 dark:border-navy-600
              text-navy-900 dark:text-white
              placeholder:text-navy-300 dark:placeholder:text-navy-600
              focus:outline-none focus:ring-2 focus:ring-signal-500
            "
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || submitting}
            className="px-4 py-2 text-sm rounded-md font-medium bg-signal-500 hover:bg-signal-600 text-white disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create area'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
