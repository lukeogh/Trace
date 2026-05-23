/**
 * Trace logo mark — the fork.
 *
 * The mark itself is always mono (ink, paper, or currentColor). The mint
 * dot only appears in full lockup contexts where the wordmark is shown
 * — never on the mark alone, never in favicons or app icons.
 *
 * Props:
 *   size      — pixel dimensions for the mark (default 32)
 *   variant   — 'auto' (currentColor), 'ink' (#14130F), 'paper' (#F7F4ED)
 *   withText  — when true, renders the wordmark "Trace." with mint dot
 *   className — optional extra classes (applied to outer wrapper if withText)
 *
 * Examples:
 *   <Logo size={32} />                            // mark only
 *   <Logo size={28} variant="paper" />            // mark, light on dark
 *   <Logo size={40} withText />                   // mark + "Trace." with mint dot
 */
export default function Logo({ size = 32, variant = 'auto', withText = false, className = '' }) {
  const stroke = variant === 'ink'
    ? '#14130F'
    : variant === 'paper'
      ? '#F7F4ED'
      : 'currentColor'

  // Slightly thicker stroke for very small renderings so the form survives
  const strokeWidth = size <= 24 ? 14 : 11

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Trace"
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

  if (!withText) return mark

  // Lockup: mark + wordmark "Trace" + mint dot.
  // Font size scales with the mark size; mint dot is sized to baseline.
  const wordFontSize = Math.round(size * 0.95)
  const dotSize = Math.round(size * 0.13)

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${size * 0.3}px`,
        color: variant === 'paper' ? '#F7F4ED' : variant === 'ink' ? '#14130F' : 'currentColor',
      }}
    >
      {mark}
      <span
        style={{
          fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
          fontWeight: 500,
          fontSize: `${wordFontSize}px`,
          letterSpacing: '-0.045em',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'baseline',
        }}
      >
        Trace
        <span
          aria-hidden="true"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            background: '#10B981',
            display: 'inline-block',
            marginLeft: `${dotSize * 0.3}px`,
            flexShrink: 0,
          }}
        />
      </span>
    </span>
  )
}
