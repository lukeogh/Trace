/** @type {import('tailwindcss').Config} */
export default {
  // Toggle dark mode by adding/removing the 'dark' class on <html>
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy palette — light values for light mode, dark values for dark mode
        navy: {
          50:  '#EFF3F8',
          100: '#E1EAF2',
          200: '#C8D8E8',
          300: '#A3BDD4',
          400: '#7499B8',
          500: '#4A7096',
          600: '#325678',
          700: '#1D3A58',
          800: '#102540',
          850: '#0B1A30',
          900: '#07101F',
          950: '#040C18',
        },
        // Signal blue — the primary accent
        signal: {
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
        },
      },
      fontFamily: {
        // Oxanium: geometric, technical, slightly military — used for headings and labels
        display: ['Oxanium', 'ui-monospace', 'monospace'],
        // Barlow: clean, slightly condensed — used for body text and UI
        sans: ['Barlow', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // JetBrains Mono: timestamps, IDs, code content in entries
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
