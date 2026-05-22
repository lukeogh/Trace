import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useTheme } from './hooks/useTheme'
import { useFont } from './hooks/useFont'
import { ToastProvider } from './components/Toast'
import QuickCapture from './components/QuickCapture'
import QuickSwitcher from './components/QuickSwitcher'
import NewAreaModal from './components/NewAreaModal'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AreaView from './pages/AreaView'
import ThreadView from './pages/ThreadView'
import LogView from './pages/LogView'
import ProcessView from './pages/ProcessView'
import { areasApi } from './api/client'

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { dark, toggle } = useTheme()
  const { font, setFont } = useFont()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [newAreaOpen, setNewAreaOpen] = useState(false)

  // Global ⌘K / Ctrl+K toggles the QuickSwitcher from anywhere
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSwitcherOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <ToastProvider>
      <BrowserRouter>
        <Shell
          dark={dark}
          onToggleTheme={toggle}
          font={font}
          onChangeFont={setFont}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onOpenNewArea={() => setNewAreaOpen(true)}
        />
        <QuickCapture />
        <QuickSwitcher
          isOpen={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
        />
        <NewAreaModal
          isOpen={newAreaOpen}
          onClose={() => setNewAreaOpen(false)}
        />
      </BrowserRouter>
    </ToastProvider>
  )
}

// Shell wraps every route so navigation is always visible
function Shell({ dark, onToggleTheme, font, onChangeFont, onOpenSwitcher, onOpenNewArea }) {
  const [areas, setAreas] = useState([])
  const location = useLocation()

  const loadAreas = useCallback(() => {
    areasApi.list().then(setAreas).catch(() => {})
  }, [])

  useEffect(() => { loadAreas() }, [location.pathname, loadAreas])

  return (
    <div className="flex min-h-screen bg-white dark:bg-navy-900">
      <Sidebar
        areas={areas}
        dark={dark}
        onToggleTheme={onToggleTheme}
        font={font}
        onChangeFont={onChangeFont}
        onOpenSwitcher={onOpenSwitcher}
        onOpenNewArea={onOpenNewArea}
      />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/area/:areaId" element={<AreaView />} />
          <Route path="/thread/:threadId" element={<ThreadView />} />
          <Route path="/log" element={<LogView />} />
          <Route path="/process" element={<ProcessView />} />
        </Routes>
      </main>
    </div>
  )
}
