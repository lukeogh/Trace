/**
 * SplashScreen — full-bleed launch overlay.
 *
 * Uses "The Draw" loading animation: stem first, then top branch, then
 * bottom branch. Holds briefly. Erases the same way. Loops until dismissed.
 *
 * Props:
 *   visible — when true, the splash is shown. Parent should set to false
 *             once the app has hydrated and initial data has loaded.
 *   tagline — optional override for the default "Stay across everything."
 *
 * Usage in App.jsx:
 *   const [booting, setBooting] = useState(true)
 *   useEffect(() => { initialise().then(() => setBooting(false)) }, [])
 *   return <>{booting && <SplashScreen visible={booting} />} ...</>
 */
export default function SplashScreen({ visible = true, tagline = 'Stay across everything.' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Trace"
      className={`
        fixed inset-0 z-[100]
        flex flex-col items-center justify-center gap-6
        bg-pitch text-paper-100
        transition-opacity duration-slow ease-trace-out
        ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* The Draw mark */}
      <svg
        width="96"
        height="96"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M 22 50 L 50 50"
          stroke="#F7F4ED"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            animation: 'drawStem 3s cubic-bezier(0.65, 0, 0.35, 1) infinite',
          }}
        />
        <path
          d="M 50 50 L 78 26"
          stroke="#F7F4ED"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 38,
            animation: 'drawTop 3s cubic-bezier(0.65, 0, 0.35, 1) infinite',
          }}
        />
        <path
          d="M 50 50 L 78 74"
          stroke="#F7F4ED"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 38,
            animation: 'drawBot 3s cubic-bezier(0.65, 0, 0.35, 1) infinite',
          }}
        />
      </svg>

      {/* Wordmark */}
      <div className="text-3xl font-medium tracking-tightest">Trace</div>

      {/* Tagline */}
      <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-paper-200/50">
        {tagline}
      </div>
    </div>
  )
}
