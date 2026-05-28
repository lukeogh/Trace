import { useState, useEffect } from 'react'
import { Check, ChevronDown, X, ListTree } from 'lucide-react'
import { toggleSubtask, deleteSubtask } from '../api/tasks'

/**
 * SubtaskList — nested subtasks shown under a parent to-do.
 *
 * - Per-subtask completion toggle (optimistic) + delete-on-hover
 * - Progress bar + count, collapsible (expanded by default)
 * - When a to-do was dismissed from the breakdown drawer but has no subtasks,
 *   shows a "Break this down" link to re-open the drawer.
 *
 * Subtasks are Entry rows: { id, content, completed, time_estimate_minutes }.
 *
 * Props:
 *   parentId          parent to-do entry id
 *   subtasks          [{id, content, completed, time_estimate_minutes}]
 *   decomp_dismissed  whether the user deferred the breakdown
 *   taskTitle         parent title (passed to onBreakDown)
 *   onBreakDown       (parentId, taskTitle) => void
 *   onSubtasksChange  (updatedSubtasks) => void   keeps parent state in sync
 */
export default function SubtaskList({
  parentId,
  subtasks = [],
  decomp_dismissed = false,
  taskTitle = '',
  onBreakDown,
  onSubtasksChange,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [localSubtasks, setLocalSubtasks] = useState(subtasks)

  // useState only snapshots the prop on first mount — so when the parent
  // merges freshly-approved subtasks in (or a refetch arrives), sync them
  // down. Optimistic toggle/delete already push the same data up via
  // onSubtasksChange, so this stays consistent and doesn't ping-pong.
  useEffect(() => {
    setLocalSubtasks(subtasks)
  }, [subtasks])

  const completedCount = localSubtasks.filter((s) => s.completed).length
  const totalCount = localSubtasks.length
  const allDone = totalCount > 0 && completedCount === totalCount
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const formatEstimate = (mins) => {
    if (!mins) return null
    if (mins < 60) return `~${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `~${h}h ${m}m` : `~${h}h`
  }

  const handleToggle = async (subtask) => {
    const prev = localSubtasks
    const updated = localSubtasks.map((s) =>
      s.id === subtask.id ? { ...s, completed: !s.completed } : s
    )
    setLocalSubtasks(updated)
    onSubtasksChange?.(updated)
    try {
      await toggleSubtask(subtask.id)
    } catch {
      setLocalSubtasks(prev)
      onSubtasksChange?.(prev)
    }
  }

  const handleDelete = async (subtaskId) => {
    const prev = localSubtasks
    const updated = localSubtasks.filter((s) => s.id !== subtaskId)
    setLocalSubtasks(updated)
    onSubtasksChange?.(updated)
    try {
      await deleteSubtask(subtaskId)
    } catch {
      setLocalSubtasks(prev)
      onSubtasksChange?.(prev)
    }
  }

  // No subtasks yet — only offer "Break this down" if the user deferred earlier.
  if (totalCount === 0) {
    if (!decomp_dismissed) return null
    return (
      <div className="mt-2 ml-6">
        <button
          onClick={() => onBreakDown?.(parentId, taskTitle)}
          className="flex items-center gap-1.5 text-xs text-paper-500 dark:text-paper-600 hover:text-mint-700 dark:hover:text-mint-300 transition-colors"
        >
          <ListTree size={13} />
          Break this down
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 ml-6 space-y-1.5">
      {/* Progress header + collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2.5 w-full"
      >
        <div className="flex-1 h-1 rounded-full bg-paper-200 dark:bg-pitch-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-mint' : 'bg-sky-muted'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className={`text-[10px] font-mono tabular-nums flex-shrink-0 ${
          allDone ? 'text-mint-700 dark:text-mint-300' : 'text-paper-500 dark:text-paper-600'
        }`}>
          {completedCount}/{totalCount}
        </span>
        <ChevronDown
          size={13}
          className={`text-paper-400 dark:text-paper-600 flex-shrink-0 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>

      {!collapsed && (
        <div className="space-y-1">
          {localSubtasks.map((subtask) => {
            const isDone = subtask.completed
            return (
              <div
                key={subtask.id}
                className={`group flex items-start gap-2.5 px-2.5 py-2 rounded-md border transition-colors ${
                  isDone
                    ? 'bg-paper-100/50 dark:bg-pitch-800/40 border-paper-200 dark:border-pitch-700 opacity-70'
                    : 'bg-white dark:bg-pitch-800 border-paper-200 dark:border-pitch-700 hover:border-paper-300 dark:hover:border-pitch-500'
                }`}
              >
                <button
                  onClick={() => handleToggle(subtask)}
                  className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    isDone
                      ? 'bg-mint-700 border-mint-700'
                      : 'border-paper-400 dark:border-pitch-500 hover:border-mint'
                  }`}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                >
                  {isDone && <Check size={11} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${
                    isDone ? 'text-paper-500 dark:text-paper-600 line-through' : 'text-pitch-700 dark:text-paper-200'
                  }`}>
                    {subtask.content}
                  </p>
                  {subtask.time_estimate_minutes && !isDone && (
                    <span className="text-[10px] font-mono text-paper-500 dark:text-paper-600 mt-0.5 block">
                      {formatEstimate(subtask.time_estimate_minutes)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(subtask.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 flex-shrink-0 text-paper-400 dark:text-paper-600 hover:text-red-500"
                  aria-label="Delete subtask"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
