const BASE = '/api'

// ─── Core request helper ──────────────────────────────────────────────────────

async function request(path, options = {}) {
  const { body, headers = {}, ...rest } = options

  const init = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...rest,
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, init)

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      message = data.detail || message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

// ─── Areas ────────────────────────────────────────────────────────────────────

export const areasApi = {
  list: () =>
    request('/areas'),

  get: (id) =>
    request(`/areas/${id}`),

  update: (id, payload) =>
    request(`/areas/${id}`, { method: 'PUT', body: payload }),

  listThreads: (areaId) =>
    request(`/areas/${areaId}/threads`),

  createThread: (areaId, payload) =>
    request(`/areas/${areaId}/threads`, { method: 'POST', body: payload }),
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export const threadsApi = {
  get: (id) =>
    request(`/threads/${id}`),

  update: (id, payload) =>
    request(`/threads/${id}`, { method: 'PUT', body: payload }),

  delete: (id) =>
    request(`/threads/${id}`, { method: 'DELETE' }),
}

// ─── Entries ──────────────────────────────────────────────────────────────────

export const entriesApi = {
  create: (threadId, payload) =>
    request(`/threads/${threadId}/entries`, { method: 'POST', body: payload }),

  update: (id, payload) =>
    request(`/entries/${id}`, { method: 'PUT', body: payload }),

  delete: (id) =>
    request(`/entries/${id}`, { method: 'DELETE' }),
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export const attachmentsApi = {
  addLink: (threadId, payload) =>
    request(`/threads/${threadId}/attachments/link`, { method: 'POST', body: payload }),

  uploadFile: async (threadId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/threads/${threadId}/attachments/file`, {
      method: 'POST',
      body: formData,
      // NOTE: do NOT set Content-Type; browser sets multipart boundary automatically
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },

  delete: (id) =>
    request(`/attachments/${id}`, { method: 'DELETE' }),
}
