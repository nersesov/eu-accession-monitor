/** Кільце прогресу: серверний SVG без JavaScript. */
export function ProgressRing({ percent, label, caption, size = 220 }: { percent: number; label: string; caption?: string; size?: number }) {
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(100, Math.max(0, percent)) / 100)
  return (
    <div role="img" aria-label={label} className="relative mx-auto aspect-square w-full" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden focusable={false}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e3e8f0" strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ ['--ring-circumference' as string]: c }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
        <span className="num text-5xl font-bold tracking-tight text-ink sm:text-6xl">
          {percent}
          <span className="text-3xl font-semibold text-muted">%</span>
        </span>
        {caption ? <span className="mt-1 max-w-[9rem] text-sm leading-tight text-muted">{caption}</span> : null}
      </div>
    </div>
  )
}

/** Лінійний індикатор прогресу з текстовим значенням поруч. */
export function ProgressBar({ percent, label, showValue = true }: { percent: number; label: string; showValue?: boolean }) {
  const p = Math.min(100, Math.max(0, percent))
  return (
    <div className="flex items-center gap-3">
      <div role="progressbar" aria-label={label} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e3e8f0]">
        <div className="bar-value h-full rounded-full bg-brand" style={{ width: `${p}%` }} />
      </div>
      {showValue ? (
        <span className="num w-12 shrink-0 text-right text-base font-bold text-ink" aria-hidden>
          {p}%
        </span>
      ) : null}
    </div>
  )
}
