import { useState, useEffect } from 'react'

/**
 * Manages the dark/light theme.
 * Reads from localStorage on mount; defaults to dark.
 * Applies/removes the 'dark' class on <html> to drive Tailwind's darkMode: 'class'.
 */
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    // Default to dark — matches the product aesthetic
    return true
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  const toggle = () => setDark((d) => !d)

  return { dark, toggle }
}
