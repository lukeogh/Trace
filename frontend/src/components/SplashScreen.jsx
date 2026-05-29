/**
 * SplashScreen - full-bleed launch overlay with "The Draw" animation.
 *
 * Four-beat sequence:
 *   1. Fork draws (stem → top branch → bottom branch)
 *   2. "Trace" wordmark fades up
 *   3. Mint dot pops in (with a small overshoot, like a deliberate full stop)
 *   4. Slogan fades up in mono caps
 *
 * Total run time before the hold: roughly 3 seconds.
 *
 * Self-contained: no external token or Tailwind dependencies. Drop in,
 * mount in App.jsx, control with a `visible` prop.
 *
 * Props:
 *   visible - when true, splash is shown. Set false once the app is ready.
 *   tagline - optional override for the default "Stay across everything".
 */
export default function SplashScreen({ visible = true, tagline = 'Stay across everything' }) {
  return (
    <>
      <style>{`
        @keyframes traceSplashStem {
          0%   { stroke-dashoffset: 30; }
          17%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes traceSplashTop {
          0%, 17% { stroke-dashoffset: 38; }
          33%     { stroke-dashoffset: 0; }
          100%    { stroke-dashoffset: 0; }
        }
        @keyframes traceSplashBot {
          0%, 27% { stroke-dashoffset: 38; }
          47%     { stroke-dashoffset: 0; }
          100%    { stroke-dashoffset: 0; }
        }
        @keyframes traceSplashWord {
          0%, 47%  { opacity: 0; transform: translateY(6px); }
          63%      { opacity: 1; transform: translateY(0); }
          100%     { opacity: 1; transform: translateY(0); }
        }
        @keyframes traceSplashDot {
          0%, 63%  { opacity: 0; transform: scale(0); }
          73%      { opacity: 1; transform: scale(1.3); }
          80%      { opacity: 1; transform: scale(1); }
          100%     { opacity: 1; transform: scale(1); }
        }
        @keyframes traceSplashSlogan {
          0%, 80%  { opacity: 0; transform: translateY(4px); }
          93%      { opacity: 0.55; transform: translateY(0); }
          100%     { opacity: 0.55; transform: translateY(0); }
        }
        .trace-splash-stem {
          stroke-dasharray: 30;
          animation: traceSplashStem 3s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .trace-splash-top {
          stroke-dasharray: 38;
          animation: traceSplashTop 3s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .trace-splash-bot {
          stroke-dasharray: 38;
          animation: traceSplashBot 3s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .trace-splash-word {
          opacity: 0;
          animation: traceSplashWord 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .trace-splash-dot {
          opacity: 0;
          transform: scale(0);
          animation: traceSplashDot 3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .trace-splash-slogan {
          opacity: 0;
          animation: traceSplashSlogan 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .trace-splash-stem,
          .trace-splash-top,
          .trace-splash-bot,
          .trace-splash-word,
          .trace-splash-dot,
          .trace-splash-slogan {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
            transform: none;
          }
          .trace-splash-slogan { opacity: 0.55; }
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-label="Loading Trace"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: '#0F0E0C',
          color: '#F7F4ED',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            className="trace-splash-stem"
            d="M 22 50 L 50 50"
            stroke="#F7F4ED"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="trace-splash-top"
            d="M 50 50 L 78 26"
            stroke="#F7F4ED"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="trace-splash-bot"
            d="M 50 50 L 78 74"
            stroke="#F7F4ED"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div
          className="trace-splash-word"
          style={{
            fontSize: '2.4rem',
            fontWeight: 500,
            letterSpacing: '-0.045em',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'baseline',
          }}
        >
          Trace
          <span
            className="trace-splash-dot"
            aria-hidden="true"
            style={{
              width: '0.20em',
              height: '0.20em',
              borderRadius: '50%',
              background: '#10B981',
              display: 'inline-block',
              marginLeft: '0.06em',
              flexShrink: 0,
              transformOrigin: 'center',
            }}
          />
        </div>

        <div
          className="trace-splash-slogan"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            fontFamily: "'Geist Mono', ui-monospace, monospace",
          }}
        >
          {tagline}
        </div>
      </div>
    </>
  )
}
