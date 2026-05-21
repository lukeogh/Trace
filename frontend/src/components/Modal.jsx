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
      <div className="absolute inset-0 bg-navy-950/70 dark:bg-navy-950/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={`
          relative w-full ${width} animate-slide-in
          bg-white dark:bg-navy-850
          border border-navy-200 dark:border-navy-700
          rounded-xl shadow-2xl
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 dark:border-navy-700">
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-navy-800 dark:text-navy-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-navy-400 hover:text-navy-600 dark:hover:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-700 transition-colors"
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
