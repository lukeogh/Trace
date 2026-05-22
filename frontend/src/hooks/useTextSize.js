import { useState, useEffect } from 'react'

export const TEXT_SIZES = [
  { key: 'sm', label: 'Small',   px: '14px' },
  { key: 'md', label: 'Default', px: '16px' },
  { key: 'lg', label: 'Large',   px: '18px' },
]

const DEFAULT_SIZE = 'md'

/**
 * Scales the root font-size, which propagates to every Tailwind rem-based
 * utility (text-*, p-*, gap-*, etc.). Acts like a global "comfort zoom" the
 * user controls from the settings menu. Persists to localStorage.
 */
export function useTextSize() {
  const [textSize, setTextSizeState] = useState(() => {
    const stored = localStorage.getItem('textSize')
    if (stored && TEXT_SIZES.some((s) => s.key === stored)) return stored
    return DEFAULT_SIZE
  })

  useEffect(() => {
    const option = TEXT_SIZES.find((s) => s.key === textSize) ?? TEXT_SIZES[1]
    document.documentElement.style.fontSize = option.px
    localStorage.setItem('textSize', textSize)
  }, [textSize])

  return { textSize, setTextSize: setTextSizeState }
}
