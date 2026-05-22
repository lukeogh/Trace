import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        p-2 rounded-md
        text-paper-500 hover:text-pitch-500 dark:text-paper-500 dark:hover:text-paper-200
        hover:bg-paper-200 dark:hover:bg-pitch-700
        transition-colors duration-150
      "
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
