import { useTranslations } from 'next-intl'
import type { DisplayStatus } from '@/lib/status'
import { StatusIcon } from './icons'

/** Статус = іконка + текст + колір. */
export function StatusBadge({ status, size = 'md' }: { status: DisplayStatus; size?: 'md' | 'lg' }) {
  const t = useTranslations('Status')
  return (
    <span
      style={{ background: `var(--color-${status}-soft)`, color: `var(--color-${status})` }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${size === 'lg' ? 'px-3.5 py-1.5 text-base' : 'px-2.5 py-1 text-sm'}`}
    >
      <StatusIcon status={status} className="shrink-0" />
      {t(status)}
    </span>
  )
}
