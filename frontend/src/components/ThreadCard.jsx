import { Link } from 'react-router-dom'
import { MessageSquare, Paperclip, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from './StatusBadge'
import { getThreadStatus } from '../utils/status'

export default function ThreadCard({ thread, areaId }) {
  const config = getThreadStatus(thread.status)
  const relativeTime = formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })

  return (
    <Link
      to={`/thread/${thread.id}`}
      className="
        group block rounded-lg border transition-all duration-200
        bg-white dark:bg-navy-850
        border-navy-200 dark:border-navy-700
        hover:border-navy-300 dark:hover:border-navy-600
        hover:shadow-md dark:hover:shadow-navy-900/50
        hover:-translate-y-px
      "
    >
      {/* Status accent line */}
      <div
        className="h-0.5 rounded-t-lg"
        style={{ backgroundColor: config.dot }}
      />

      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display font-semibold text-sm text-navy-900 dark:text-white group-hover:text-signal-600 dark:group-hover:text-signal-400 transition-colors leading-snug">
            {thread.title}
          </h3>
          <ChevronRight
            size={14}
            className="text-navy-300 dark:text-navy-600 flex-shrink-0 mt-0.5 group-hover:text-signal-500 group-hover:translate-x-0.5 transition-all"
          />
        </div>

        {/* Description */}
        {thread.description && (
          <p className="text-xs text-navy-500 dark:text-navy-400 line-clamp-2 mb-3 leading-relaxed">
            {thread.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={thread.status} type="thread" size="xs" />

          <div className="flex items-center gap-3">
            {/* Entry count */}
            <span className="flex items-center gap-1 text-xs text-navy-400 dark:text-navy-500">
              <MessageSquare size={11} />
              <span className="font-mono">{thread.entry_count}</span>
            </span>

            {/* Attachment count */}
            {thread.attachment_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-navy-400 dark:text-navy-500">
                <Paperclip size={11} />
                <span className="font-mono">{thread.attachment_count}</span>
              </span>
            )}

            {/* Last updated */}
            <span className="text-xs font-mono text-navy-300 dark:text-navy-600">
              {relativeTime}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
