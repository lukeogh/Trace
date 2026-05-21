import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './components/Toast'
import QuickCapture from './components/QuickCapture'
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

  return (
    <ToastProvider>
      <BrowserRouter>
        <QuickCapture />
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
          <Route path="/log" element={<LogView />} />
          <Route path="/process" element={<ProcessView />} />
        </Routes>
      </main>
    </div>
  )
}
