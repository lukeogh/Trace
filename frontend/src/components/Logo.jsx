/**
 * Trace logo mark — the fork.
 *
 * Props:
 *   size      — pixel dimensions (default 32)
 *   variant   — 'auto' (currentColor), 'ink' (#14130F), 'paper' (#F7F4ED)
 *   className — optional extra Tailwind classes
 *
 * Stroke weight scales subtly inversely with size so the mark stays
 * legible at favicon scale (≤24px) and elegant at hero scale.
 */
export default function Logo({ size = 32, variant = 'auto', className = '' }) {
  const stroke = variant === 'ink'
    ? '#14130F'
    : variant === 'paper'
      ? '#F7F4ED'
      : 'currentColor'

  // Slightly thicker stroke for very small renderings so the form survives
  const strokeWidth = size <= 24 ? 14 : 11

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Trace"
      className={className}
    >
      <path
        d="M 22 50 L 50 50 L 78 26 M 50 50 L 78 74"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
