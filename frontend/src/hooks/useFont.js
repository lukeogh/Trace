import { useState, useEffect } from 'react'

export const FONT_OPTIONS = [
  { key: 'geist',  label: 'Geist',  stack: "'Geist', system-ui, sans-serif",            hint: 'Brand default' },
  { key: 'lexend', label: 'Lexend', stack: "'Lexend', 'Geist', system-ui, sans-serif",  hint: 'ADHD-friendly' },
]

const DEFAULT_FONT = 'geist'

/**
 * Manages the body font choice.
 * Persists to localStorage and sets a CSS variable on <html> so the rule in
 * index.css (html { font-family: var(--font-body) }) picks it up.
 * Display headings (font-display) and code (font-mono) stay untouched.
 */
export function useFont() {
  const [font, setFontState] = useState(() => {
    const stored = localStorage.getItem('font')
    if (stored && FONT_OPTIONS.some((o) => o.key === stored)) return stored
    return DEFAULT_FONT
  })

  useEffect(() => {
    const option = FONT_OPTIONS.find((o) => o.key === font) ?? FONT_OPTIONS[0]
    document.documentElement.style.setProperty('--font-body', option.stack)
    localStorage.setItem('font', font)
  }, [font])

  return { font, setFont: setFontState }
}
