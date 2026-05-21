import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './components/Toast'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AreaView from './pages/AreaView'
import ThreadView from './pages/ThreadView'
import { areasApi } from './api/client'

// ─── Shell wraps Sidebar + page content ──────────────────────────────────────

function Shell({ dark, onToggleTheme }) {
  const [areas, setAreas] = useState([])
  const location = useLocation()

  // Load areas for the sidebar on mount and whenever navigation happens
  useEffect(() => {
    areasApi.list().then(setAreas).catch(() => {})
  }, [location.pathname])

  // Dashboard uses its own full-width layout (no sidebar)
  if (location.pathname === '/') {
    return <Dashboard />
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-navy-900">
      <Sidebar areas={areas} dark={dark} onToggleTheme={onToggleTheme} />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/area/:areaId" element={<AreaView />} />
          <Route path="/thread/:threadId" element={<ThreadView />} />
        </Routes>
      </main>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { dark, toggle } = useTheme()

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Dashboard route (full-width, no sidebar) */}
          <Route path="/" element={<Dashboard />} />
          {/* All other routes get the sidebar shell */}
          <Route
            path="/*"
            element={<ShellRoutes dark={dark} onToggleTheme={toggle} />}
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

// Separate component so useLocation works inside BrowserRouter
function ShellRoutes({ dark, onToggleTheme }) {
  const [areas, setAreas] = useState([])
  const location = useLocation()

  useEffect(() => {
    areasApi.list().then(setAreas).catch(() => {})
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-white dark:bg-navy-900">
      <Sidebar areas={areas} dark={dark} onToggleTheme={onToggleTheme} />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/area/:areaId" element={<AreaView />} />
          <Route path="/thread/:threadId" element={<ThreadView />} />
        </Routes>
      </main>
    </div>
  )
}
