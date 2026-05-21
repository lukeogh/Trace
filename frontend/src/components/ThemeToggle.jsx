import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        p-2 rounded-md
        text-navy-400 hover:text-navy-700 dark:text-navy-400 dark:hover:text-navy-100
        hover:bg-navy-100 dark:hover:bg-navy-800
        transition-colors duration-150
      "
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
