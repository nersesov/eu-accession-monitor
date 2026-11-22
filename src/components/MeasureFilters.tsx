'use client'
// Фільтри заходів. Стан зберігається в URL (?status=&body=), тож посиланням можна поділитися.
// Без JavaScript форма працює як звичайний GET із кнопкою «Застосувати».
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type Option = { value: string; label: string }
type Props = {
  statusOptions: Option[]
  bodyOptions: Option[]
  status: string
  body: string
  labels: { filters: string; status: string; body: string; all: string; apply: string; reset: string }
  /** Текст для aria-live: «Показано N заходів із M» */
  summary: string
}

export function MeasureFilters({ statusOptions, bodyOptions, status, body, labels, summary }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = (key: 'status' | 'body', value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    const qs = next.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const active = Boolean(status || body)

  return (
    <form method="get" className="card p-4 sm:p-5" aria-label={labels.filters} onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="filter-status" className="mb-1.5 block text-sm font-semibold">
            {labels.status}
          </label>
          <select id="filter-status" name="status" className="field" value={status} onChange={(e) => update('status', e.target.value)}>
            <option value="">{labels.all}</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-body" className="mb-1.5 block text-sm font-semibold">
            {labels.body}
          </label>
          <select id="filter-body" name="body" className="field" value={body} onChange={(e) => update('body', e.target.value)}>
            <option value="">{labels.all}</option>
            {bodyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {/* Без JavaScript форма надсилається кнопкою; з JavaScript кнопка не потрібна і не займає місця */}
          <noscript>
            <button type="submit" className="btn btn-primary">
              {labels.apply}
            </button>
          </noscript>
          {active ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            >
              {labels.reset}
            </button>
          ) : null}
        </div>
      </div>
      <p role="status" aria-live="polite" className={`num mt-3 text-sm text-muted ${pending ? 'opacity-60' : ''}`}>
        {summary}
      </p>
    </form>
  )
}
