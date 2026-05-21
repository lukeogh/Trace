export default function Logo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Department Log"
    >
      {/* Navy background */}
      <rect width="32" height="32" rx="5" fill="#0C1828" />
      {/* Signal blue vertical bar */}
      <rect x="3" y="3" width="4" height="26" rx="1.5" fill="#38BDF8" />
      {/* Log entry lines — dot + rule at 100%, 65%, 38% opacity */}
      <circle cx="11" cy="11" r="1.5" fill="#0EA5E9" />
      <line x1="14" y1="11" x2="28" y2="11" stroke="#0EA5E9" strokeWidth="1.5" />
      <circle cx="11" cy="17" r="1.5" fill="#0EA5E9" opacity="0.65" />
      <line x1="14" y1="17" x2="28" y2="17" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.65" />
      <circle cx="11" cy="23" r="1.5" fill="#0EA5E9" opacity="0.38" />
      <line x1="14" y1="23" x2="28" y2="23" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.38" />
    </svg>
  )
}
