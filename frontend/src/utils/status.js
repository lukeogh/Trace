// ─── Area statuses ────────────────────────────────────────────────────────────

export const AREA_STATUSES = {
  stable: {
    label: 'Stable',
    dot: '#22C55E',         // green-500
    textClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-200 dark:border-green-800',
    ringClass: 'ring-green-500',
  },
  active: {
    label: 'Active',
    dot: '#0EA5E9',         // signal-500
    textClass: 'text-signal-600 dark:text-signal-400',
    bgClass: 'bg-signal-50 dark:bg-signal-900/20',
    borderClass: 'border-signal-200 dark:border-signal-800',
    ringClass: 'ring-signal-500',
  },
  review: {
    label: 'Review',
    dot: '#F59E0B',         // amber-500
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
    ringClass: 'ring-amber-500',
  },
  blocked: {
    label: 'Blocked',
    dot: '#EF4444',         // red-500
    textClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-red-200 dark:border-red-800',
    ringClass: 'ring-red-500',
  },
}

// ─── Thread statuses ──────────────────────────────────────────────────────────

export const THREAD_STATUSES = {
  open: {
    label: 'Open',
    dot: '#0EA5E9',
    textClass: 'text-signal-600 dark:text-signal-400',
    bgClass: 'bg-signal-50 dark:bg-signal-900/20',
    borderClass: 'border-signal-200 dark:border-signal-800',
  },
  'in-progress': {
    label: 'In Progress',
    dot: '#F59E0B',
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  resolved: {
    label: 'Resolved',
    dot: '#22C55E',
    textClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-200 dark:border-green-800',
  },
  parked: {
    label: 'Parked',
    dot: '#8B5CF6',
    textClass: 'text-violet-600 dark:text-violet-400',
    bgClass: 'bg-violet-50 dark:bg-violet-900/20',
    borderClass: 'border-violet-200 dark:border-violet-800',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAreaStatus(key) {
  return AREA_STATUSES[key] ?? AREA_STATUSES.stable
}

export function getThreadStatus(key) {
  return THREAD_STATUSES[key] ?? THREAD_STATUSES.open
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
