/**
 * Trace logo mark — the fork.
 *
 * The mark itself is always mono (ink, paper, or currentColor). The mint
 * dot only appears in full lockup contexts where the wordmark is shown
 * — never on the mark alone, never in favicons or app icons.
 *
 * The mark also has an opt-in **hover redraw**: when the Logo (or any
 * `group` ancestor that's hovered) is hovered, the three fork strokes
 * redraw themselves in sequence — same motion as the splash, just
 * triggered on demand. Set `spinOnHover={false}` to disable.
 *
 * Props:
 *   size         — pixel dimensions for the mark (default 32)
 *   variant      — 'auto' (currentColor), 'ink' (#14130F), 'paper' (#F7F4ED)
 *   withText     — when true, renders the wordmark "Trace" with the mint dot
 *   spinOnHover  — animate the strokes on hover (default true)
 *   className    — optional extra classes (applied to outer wrapper if withText)
 */
export default function Logo({
  size = 32,
  variant = 'auto',
  withText = false,
  spinOnHover = true,
  className = '',
}) {
  const stroke = variant === 'ink'
    ? '#14130F'
    : variant === 'paper'
      ? '#F7F4ED'
      : 'currentColor'

  // Slightly thicker stroke for very small renderings so the form survives.
  const strokeWidth = size <= 24 ? 14 : 11

  // Three separate paths (stem / top branch / bottom branch) so each can be
  // independently animated for the hover redraw. Equivalent visually to the
  // single-path version at rest.
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Trace"
      className={spinOnHover ? 'trace-logo-mark' : undefined}
    >
      <path
        className={spinOnHover ? 'trace-logo-stem' : undefined}
        d="M 22 50 L 50 50"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={spinOnHover ? 'trace-logo-top' : undefined}
        d="M 50 50 L 78 26"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={spinOnHover ? 'trace-logo-bot' : undefined}
        d="M 50 50 L 78 74"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (!withText) return (
    <>
      <HoverRedrawStyles />
      {mark}
    </>
  )

  // Lockup: mark + wordmark "Trace" + mint dot.
  // Font size scales with the mark size; mint dot is sized to baseline.
  const wordFontSize = Math.round(size * 0.95)
  const dotSize = Math.round(size * 0.13)

  return (
    <>
      <HoverRedrawStyles />
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
    </>
  )
}

/**
 * Inline keyframes for the hover redraw. Same motion family as the splash's
 * fork-draws — staggered stem → top → bot — but short (~1s) and triggered
 * by `:hover` on the SVG or any ancestor with `group`.
 *
 * Each path uses stroke-dasharray to "draw on" by animating dashoffset
 * from full-length to 0. The redraw runs once per hover (forwards), then
 * the strokes hold visible until the cursor leaves and re-enters.
 *
 * prefers-reduced-motion suppresses the animation entirely — strokes
 * just stay visible like a static logo.
 *
 * The component renders the <style> tag inline so the Logo is fully
 * self-contained — no external CSS dependency.
 */
function HoverRedrawStyles() {
  return (
    <style>{`
      .trace-logo-mark .trace-logo-stem,
      .trace-logo-mark .trace-logo-top,
      .trace-logo-mark .trace-logo-bot {
        stroke-dasharray: 40;
        stroke-dashoffset: 0;
      }
      @keyframes traceLogoStem {
        0%   { stroke-dashoffset: 30; }
        33%  { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes traceLogoTop {
        0%, 33% { stroke-dashoffset: 38; }
        66%     { stroke-dashoffset: 0; }
        100%    { stroke-dashoffset: 0; }
      }
      @keyframes traceLogoBot {
        0%, 50% { stroke-dashoffset: 38; }
        85%     { stroke-dashoffset: 0; }
        100%    { stroke-dashoffset: 0; }
      }
      .trace-logo-mark:hover .trace-logo-stem,
      .group:hover .trace-logo-mark .trace-logo-stem {
        stroke-dasharray: 30;
        animation: traceLogoStem 1s cubic-bezier(0.65, 0, 0.35, 1) forwards;
      }
      .trace-logo-mark:hover .trace-logo-top,
      .group:hover .trace-logo-mark .trace-logo-top {
        stroke-dasharray: 38;
        animation: traceLogoTop 1s cubic-bezier(0.65, 0, 0.35, 1) forwards;
      }
      .trace-logo-mark:hover .trace-logo-bot,
      .group:hover .trace-logo-mark .trace-logo-bot {
        stroke-dasharray: 38;
        animation: traceLogoBot 1s cubic-bezier(0.65, 0, 0.35, 1) forwards;
      }
      @media (prefers-reduced-motion: reduce) {
        .trace-logo-mark:hover .trace-logo-stem,
        .trace-logo-mark:hover .trace-logo-top,
        .trace-logo-mark:hover .trace-logo-bot,
        .group:hover .trace-logo-mark .trace-logo-stem,
        .group:hover .trace-logo-mark .trace-logo-top,
        .group:hover .trace-logo-mark .trace-logo-bot {
          animation: none;
        }
      }
    `}</style>
  )
}
