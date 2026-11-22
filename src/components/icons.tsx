import type { DisplayStatus } from '@/lib/status'

type P = { className?: string }
const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, focusable: false } as const

/** Іконка статусу: форма відрізняється для кожного статусу (не лише колір). */
export function StatusIcon({ status, className }: { status: DisplayStatus } & P) {
  switch (status) {
    case 'done':
      return (
        <svg {...base} className={className}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.8 8.2l2.2 2.2 4.2-4.6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'partial':
      return (
        <svg {...base} className={className}>
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 1.75a6.25 6.25 0 010 12.5z" fill="currentColor" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg {...base} className={className}>
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5V8l2.4 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'overdue':
      return (
        <svg {...base} className={className}>
          <path d="M8 1.6l6.6 11.8H1.4z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M8 6.2v3.3M8 11.4v.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg {...base} className={className}>
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.6 2.3" />
        </svg>
      )
  }
}

const big = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const

export function DirectionIcon({ name, className }: { name: string } & P) {
  switch (name) {
    case 'shield':
      return (
        <svg {...big} className={className}>
          <path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z" />
          <path d="M8.8 12.2l2.3 2.3 4.2-4.6" />
        </svg>
      )
    case 'people':
      return (
        <svg {...big} className={className}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.8 19.5c.5-3.4 3-5.3 6.2-5.3s5.7 1.9 6.2 5.3" />
          <path d="M15.6 5.2a3.2 3.2 0 010 5.8M17.6 14.6c2 .7 3.3 2.4 3.6 4.9" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...big} className={className}>
          <circle cx="12" cy="12" r="8.7" />
          <path d="M3.3 12h17.4M12 3.3c2.6 2.4 3.9 5.3 3.9 8.7s-1.3 6.3-3.9 8.7c-2.6-2.4-3.9-5.3-3.9-8.7s1.3-6.3 3.9-8.7z" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...big} className={className}>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8 10.5V7.8a4 4 0 018 0v2.7M12 14.6v2.2" />
        </svg>
      )
    default:
      return (
        <svg {...big} className={className}>
          <path d="M12 3.5v17M7 20.5h10M5 7.5h14" />
          <path d="M5 7.5l-2.7 6a2.9 2.9 0 005.4 0zM19 7.5l-2.7 6a2.9 2.9 0 005.4 0z" />
        </svg>
      )
  }
}

export function Chevron({ className }: P) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden focusable={false} className={className}>
      <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowRight({ className }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden focusable={false} className={className}>
      <path d="M3 8h9.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ExternalIcon({ className }: P) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden focusable={false} className={className}>
      <path d="M5.5 2.5h-3v9h9v-3M8 2.5h3.5V6M11.2 2.8L6.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className }: P) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden focusable={false} className={className}>
      <rect width="36" height="36" rx="9" fill="#1e3a8a" />
      <circle cx="18" cy="18" r="9.5" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="4" />
      <path d="M18 8.5a9.5 9.5 0 018.2 14.3" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="26.2" cy="22.8" r="3" fill="#f59e0b" />
    </svg>
  )
}
