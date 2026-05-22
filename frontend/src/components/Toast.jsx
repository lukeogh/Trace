import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((item) => item.id !== id))
    }, 3500)
  }, [])

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((item) => item.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={add}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

// ─── Single toast ─────────────────────────────────────────────────────────────

function Toast({ toast, onRemove }) {
  const isSuccess = toast.type === 'success'

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg
        border text-sm font-medium animate-slide-in
        ${isSuccess
          ? 'bg-white dark:bg-pitch-700 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
          : 'bg-white dark:bg-pitch-700 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }
      `}
    >
      {isSuccess
        ? <CheckCircle size={15} className="flex-shrink-0" />
        : <AlertCircle size={15} className="flex-shrink-0" />
      }
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  )
}
