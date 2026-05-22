import { useState, useEffect } from 'react'

export const FONT_OPTIONS = [
  { key: 'lexend',   label: 'Lexend',                stack: "'Lexend', system-ui, sans-serif",                hint: 'ADHD-friendly' },
  { key: 'atkinson', label: 'Atkinson Hyperlegible', stack: "'Atkinson Hyperlegible', system-ui, sans-serif", hint: 'Accessibility-first' },
  { key: 'inter',    label: 'Inter',                 stack: "'Inter', system-ui, sans-serif",                 hint: 'Neutral UI' },
  { key: 'barlow',   label: 'Barlow',                stack: "'Barlow', system-ui, sans-serif",                hint: 'Original' },
]

const DEFAULT_FONT = 'lexend'

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
