import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useTheme } from './hooks/useTheme'
import { useFont } from './hooks/useFont'
import { useDisplayName } from './hooks/useDisplayName'
import { useTextSize } from './hooks/useTextSize'
import { useAvatar } from './hooks/useAvatar'
import SettingsMenu from './components/SettingsMenu'
import { ToastProvider } from './components/Toast'
import QuickCapture from './components/QuickCapture'
import QuickSwitcher from './components/QuickSwitcher'
import NewAreaModal from './components/NewAreaModal'
import SplashScreen from './components/SplashScreen'
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
  const { displayName, setDisplayName } = useDisplayName()
  const { textSize, setTextSize } = useTextSize()
  const { avatar, setAvatar } = useAvatar()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [newAreaOpen, setNewAreaOpen] = useState(false)
  const [booting, setBooting] = useState(true)

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

  // Boot splash: hold for a minimum so the Draw animation has time to play,
  // then dismiss as soon as the first areas fetch resolves. Hard ceiling of
  // 4s so the user is never stuck if the backend is down.
  useEffect(() => {
    const MIN_SPLASH_MS = 1500
    const MAX_SPLASH_MS = 4000
    const startedAt = Date.now()
    let cancelled = false
    const finish = () => { if (!cancelled) setBooting(false) }
    const finishAfterMin = () => {
      const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt))
      setTimeout(finish, remaining)
    }
    const hardTimeout = setTimeout(finish, MAX_SPLASH_MS)
    areasApi.list()
      .catch(() => {})
      .finally(finishAfterMin)
    return () => { cancelled = true; clearTimeout(hardTimeout) }
  }, [])

  return (
    <ToastProvider>
      <SplashScreen visible={booting} />
      <BrowserRouter>
        <Shell
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onOpenNewArea={() => setNewAreaOpen(true)}
        />
        {/* Global top-right settings — same place on every page */}
        <SettingsMenu
          avatar={avatar}
          onChangeAvatar={setAvatar}
          displayName={displayName}
          onChangeDisplayName={setDisplayName}
          dark={dark}
          onToggleTheme={toggle}
          font={font}
          onChangeFont={setFont}
          textSize={textSize}
          onChangeTextSize={setTextSize}
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
function Shell({ onOpenSwitcher, onOpenNewArea }) {
  const [areas, setAreas] = useState([])
  const location = useLocation()

  const loadAreas = useCallback(() => {
    areasApi.list().then(setAreas).catch(() => {})
  }, [])

  useEffect(() => { loadAreas() }, [location.pathname, loadAreas])

  return (
    <div className="flex min-h-screen bg-white dark:bg-pitch-800">
      <Sidebar
        areas={areas}
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
