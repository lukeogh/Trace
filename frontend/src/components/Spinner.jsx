/**
 * Spinner — inline loading indicator using "The Draw" at button scale.
 *
 * Uses currentColor so it inherits its parent's text colour. Drop into
 * any button, input, or text run that needs a loading state.
 *
 * Props:
 *   size      — pixel dimensions (default 14)
 *   className — optional extra classes
 *
 * Usage:
 *   <button>{loading && <Spinner />} Save</button>
 */
export default function Spinner({ size = 14, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
      className={className}
    >
      <path
        d="M 22 50 L 50 50"
        stroke="currentColor"
        strokeWidth="15"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 30,
          animation: 'drawStem 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        }}
      />
      <path
        d="M 50 50 L 78 26"
        stroke="currentColor"
        strokeWidth="15"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 38,
          animation: 'drawTop 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        }}
      />
      <path
        d="M 50 50 L 78 74"
        stroke="currentColor"
        strokeWidth="15"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 38,
          animation: 'drawBot 1.6s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        }}
      />
    </svg>
  )
}
