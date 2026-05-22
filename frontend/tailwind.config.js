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
        // ── Light surfaces ──────────────────────────────────────────────────
        paper: {
          DEFAULT: '#F7F4ED',
          50:  '#FBFAF6',
          100: '#F7F4ED',  // page bg
          200: '#EFECE3',  // card
          300: '#E5E1D6',  // sub-card / hover
          400: '#D4CFC2',  // stone — borders
          500: '#A8A49E',  // soft text on dark
          600: '#8A877F',  // ink-muted
          700: '#4A4845',  // ink-soft
          800: '#1F1D1A',
          900: '#14130F',  // ink
        },
        // ── Dark surfaces ───────────────────────────────────────────────────
        pitch: {
          DEFAULT: '#0F0E0C',
          50:  '#EDEAE3',  // paper-d (text on dark)
          100: '#A8A49E',  // paper-soft-d
          200: '#6B6862',  // paper-muted-d
          300: '#4A4845',
          400: '#38352F',  // border on dark
          500: '#2A2826',
          600: '#232220',  // pitch-3
          700: '#181714',  // pitch-2
          800: '#0F0E0C',  // pitch (base)
          900: '#080706',
          950: '#050402',
        },
        // ── Primary accent ──────────────────────────────────────────────────
        accent: {
          DEFAULT: '#5B5BD6',
          50:  '#F4F4FC',
          100: '#E8E8F8',
          200: '#C5C5EE',
          300: '#A2A2E4',
          400: '#7F7FDD',
          500: '#5B5BD6',
          600: '#4F4FC7',
          700: '#4343B0',
          800: '#373798',
          900: '#2B2B80',
        },
        // ── Status colours (muted) ──────────────────────────────────────────
        sage:        '#7A9579',  // stable, resolved
        'sky-muted': '#6B8AB8',  // active, open
        'amber-muted': '#C99A5C', // on-hold
        mustard:     '#C9A85C',  // in-progress
        terracotta:  '#B86A5C',  // blocked
        lavender:    '#8A7BB8',  // parked
      },
      fontFamily: {
        // Geist: brand voice and product UI
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        // Lexend: ADHD-friendly opt-in body alternative
        lexend: ['Lexend', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Geist Mono: timestamps, IDs, code, technical labels
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        // Keep "display" for backwards compatibility — now points to Geist
        display: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        tighter: '-0.035em',
        snug: '-0.02em',
        soft: '-0.005em',
      },
      spacing: {
        // Named spacing tokens (in addition to Tailwind defaults)
        '1px': '1px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      transitionTimingFunction: {
        trace: 'cubic-bezier(0.65, 0, 0.35, 1)',
        'trace-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      transitionDuration: {
        snap: '120ms',
        base: '200ms',
        slow: '400ms',
      },
      animation: {
        // legacy support
        'fade-in': 'fadeIn 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slide-in': 'slideIn 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        // new
        'rise': 'rise 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'draw-stem': 'drawStem 3s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'draw-top':  'drawTop  3s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'draw-bot':  'drawBot  3s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'spin-stem': 'drawStem 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'spin-top':  'drawTop  1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'spin-bot':  'drawBot  1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
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
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // ─── The Draw loading animation ──────────────────────────────────
        drawStem: {
          '0%':   { strokeDashoffset: '30' },
          '20%':  { strokeDashoffset: '0' },
          '65%':  { strokeDashoffset: '0' },
          '85%':  { strokeDashoffset: '-30' },
          '100%': { strokeDashoffset: '-30' },
        },
        drawTop: {
          '0%':   { strokeDashoffset: '38' },
          '20%':  { strokeDashoffset: '38' },
          '40%':  { strokeDashoffset: '0' },
          '65%':  { strokeDashoffset: '0' },
          '80%':  { strokeDashoffset: '-38' },
          '100%': { strokeDashoffset: '-38' },
        },
        drawBot: {
          '0%':   { strokeDashoffset: '38' },
          '35%':  { strokeDashoffset: '38' },
          '55%':  { strokeDashoffset: '0' },
          '65%':  { strokeDashoffset: '0' },
          '75%':  { strokeDashoffset: '-38' },
          '100%': { strokeDashoffset: '-38' },
        },
      },
    },
  },
  plugins: [],
}
