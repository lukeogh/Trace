/**
 * Task-decomposition + action-detection API helpers.
 *
 * Talks to /api/ai/* and /api/(entries|subtasks)/*. The two AI endpoints are
 * hint features - callers treat failures as "no suggestion" rather than errors.
 */

const BASE = '/api'

async function _json(res, fallback) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || fallback)
  }
  return res.json()
}

// ── AI flows ──────────────────────────────────────────────────────────────────

/** Scan an Update entry for action vocabulary → { actions: [{phrase, todo_title}] } */
export async function detectActions(text, entryId) {
  return _json(
    await fetch(`${BASE}/ai/detect-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, entry_id: entryId }),
    }),
    'Action detection failed'
  )
}

/** Assess a to-do → { needed, reason, subtasks: [{title, time_estimate_minutes}] } */
export async function decomposeTask(entryId, taskTitle, taskContent) {
  return _json(
    await fetch(`${BASE}/ai/decompose-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, task_title: taskTitle, task_content: taskContent }),
    }),
    'Decomposition failed'
  )
}

/** Mark a to-do's decomposition dismissed (switches to "Break this down" affordance). */
export async function dismissDecomp(entryId) {
  return _json(
    await fetch(`${BASE}/ai/dismiss-decomp/${entryId}`, { method: 'PATCH' }),
    'Dismiss failed'
  )
}

// ── Subtasks ──────────────────────────────────────────────────────────────────

/** Bulk-create subtasks under a parent to-do → { subtasks: [...] } */
export async function createSubtasks(entryId, subtasks) {
  return _json(
    await fetch(`${BASE}/entries/${entryId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtasks }),
    }),
    'Failed to create subtasks'
  )
}

/** Toggle a subtask's completion → updated subtask entry */
export async function toggleSubtask(subtaskId) {
  return _json(
    await fetch(`${BASE}/subtasks/${subtaskId}/complete`, { method: 'PATCH' }),
    'Failed to update subtask'
  )
}

/** Delete a subtask. */
export async function deleteSubtask(subtaskId) {
  return _json(
    await fetch(`${BASE}/subtasks/${subtaskId}`, { method: 'DELETE' }),
    'Failed to delete subtask'
  )
}
