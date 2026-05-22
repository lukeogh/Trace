import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Accessible modal dialog.
 * Closes on backdrop click or Escape key.
 */
export default function Modal({ isOpen, onClose, title, children, width = 'max-w-lg' }) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-pitch-900/70 dark:bg-pitch-900/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`
          relative w-full ${width} animate-slide-in
          bg-white dark:bg-pitch-700
          border border-paper-300 dark:border-pitch-500
          rounded-xl shadow-2xl
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-200 dark:border-pitch-500">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-pitch-700 dark:text-paper-200">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-paper-500 hover:text-paper-700 dark:hover:text-paper-300 hover:bg-paper-200 dark:hover:bg-pitch-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
