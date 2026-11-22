// Дрібні серверні компоненти, спільні для сторінок.
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import type { ChapterView, DirectionView, MeasureView, NewsView, UpdateView } from '@/lib/data'
import { formatDate } from '@/lib/format'
import type { Progress } from '@/lib/status'
import { ArrowRight, DirectionIcon, ExternalIcon } from './icons'
import { ProgressBar } from './Progress'
import { StatusBadge } from './StatusBadge'

export function DemoBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f2c66d] bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-ink">
      <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
      {label}
    </span>
  )
}

export function Breadcrumbs({ items, label }: { items: { href?: string; label: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-5 text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <Link href={item.href} className="link inline-flex min-h-8 items-center">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHeader({ eyebrow, title, lead, children }: { eyebrow?: ReactNode; title: string; lead?: string | null; children?: ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow ? <p className="mb-2 text-sm font-semibold tracking-wide text-brand-strong uppercase">{eyebrow}</p> : null}
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      {lead ? <p className="prose-measure mt-3 text-lg text-muted">{lead}</p> : null}
      {children}
    </div>
  )
}

export function SectionTitle({ id, children, action }: { id?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="text-2xl font-bold text-ink">
        {children}
      </h2>
      {action}
    </div>
  )
}

export async function ProgressSummary({ progress }: { progress: Progress }) {
  const t = await getTranslations('Common')
  return (
    <p className="num mt-2 text-sm text-muted">
      {t('doneOf', { done: progress.counts.done, total: progress.total })} · {t('measuresCount', { count: progress.total })}
    </p>
  )
}

export async function ChapterCard({ chapter }: { chapter: ChapterView }) {
  const t = await getTranslations('Common')
  return (
    <article className="card card-link flex flex-col p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-brand-strong uppercase">{t('chapterN', { number: chapter.number })}</p>
      <h3 className="mt-1 text-xl font-bold text-ink">
        <Link href={`/${chapter.slug}`} className="stretched rounded">
          {chapter.title}
        </Link>
      </h3>
      {chapter.description ? <p className="mt-2 text-[0.9375rem] text-muted">{chapter.description}</p> : null}
      <div className="mt-auto pt-5">
        <ProgressBar percent={chapter.progress.percent} label={`${t('chapterN', { number: chapter.number })}: ${t('progressOf', { percent: chapter.progress.percent })}`} />
        <p className="num mt-2 text-sm text-muted">
          {t('directionsCount', { count: chapter.directions.length })} · {t('measuresCount', { count: chapter.progress.total })}
        </p>
      </div>
    </article>
  )
}

export async function DirectionCard({ direction, showChapter = true }: { direction: DirectionView; showChapter?: boolean }) {
  const t = await getTranslations('Common')
  return (
    <article className="card card-link flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <DirectionIcon name={direction.icon} />
        </span>
        <div className="min-w-0">
          {showChapter ? <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t('chapterN', { number: direction.chapter.number })}</p> : null}
          <h3 className="text-[1.0625rem] leading-snug font-bold text-ink">
            <Link href={`/${direction.chapter.slug}/${direction.slug}`} className="stretched rounded">
              {direction.title}
            </Link>
          </h3>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <ProgressBar percent={direction.progress.percent} label={`${direction.title}: ${t('progressOf', { percent: direction.progress.percent })}`} />
        <p className="num mt-2 text-sm text-muted">
          {t('doneOf', { done: direction.progress.counts.done, total: direction.progress.total })}
        </p>
      </div>
    </article>
  )
}

export async function MeasureRow({ measure, locale }: { measure: MeasureView; locale: string }) {
  const t = await getTranslations('Common')
  return (
    <li className="card card-link p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h4 className="min-w-0 text-base font-semibold text-ink">
          <Link href={`/zakhid/${measure.id}`} className="stretched rounded">
            {measure.title}
          </Link>
        </h4>
        <StatusBadge status={measure.displayStatus} />
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-muted">{t('responsible')}:</dt>
          <dd className="text-ink">{measure.responsibleBody ?? '—'}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-muted">{t('deadline')}:</dt>
          <dd className="num text-ink">{measure.deadline ? formatDate(locale, measure.deadline) : t('noDeadline')}</dd>
        </div>
      </dl>
    </li>
  )
}

export async function UpdateBody({ update, locale, showMeasure = true }: { update: UpdateView; locale: string; showMeasure?: boolean }) {
  const t = await getTranslations()
  return (
    <>
      <p className="num text-sm text-muted">
        <time dateTime={update.date}>{formatDate(locale, update.date)}</time>
        {showMeasure && update.measure ? ` · ${t('Common.chapterN', { number: update.measure.chapterNumber })} · ${update.measure.direction}` : ''}
      </p>
      {showMeasure && update.measure ? (
        <p className="mt-1 font-semibold text-ink">
          <Link href={`/zakhid/${update.measure.id}`} className="link">
            {update.measure.title}
          </Link>
        </p>
      ) : null}
      <p className="mt-2 flex flex-wrap items-center gap-2">
        {update.fromStatus ? (
          <>
            <span className="sr-only">{t('Measure.from')}:</span>
            <StatusBadge status={update.fromStatus} />
            <ArrowRight className="shrink-0 text-muted" />
            <span className="sr-only">{t('Measure.to')}:</span>
          </>
        ) : (
          <span className="text-sm text-muted">{t('Measure.initial')}:</span>
        )}
        <StatusBadge status={update.toStatus} />
      </p>
      {update.comment ? <p className="mt-2 text-[0.9375rem] text-ink">{update.comment}</p> : null}
      {update.source && /^https?:\/\//.test(update.source) ? (
        <p className="mt-1 text-sm">
          <ExternalLink href={update.source}>{t('Common.source')}</ExternalLink>
        </p>
      ) : null}
    </>
  )
}

export function UpdateItem(props: { update: UpdateView; locale: string; showMeasure?: boolean }) {
  return (
    <li className="card p-4">
      <UpdateBody {...props} />
    </li>
  )
}

export async function NewsCard({ item, locale, headingLevel: H = 'h3' }: { item: NewsView; locale: string; headingLevel?: 'h2' | 'h3' }) {
  return (
    <article className="card card-link flex flex-col p-5">
      <p className="num text-sm text-muted">
        <time dateTime={item.date}>{formatDate(locale, item.date)}</time>
      </p>
      <H className="mt-1 text-lg leading-snug font-bold text-ink">
        <Link href={`/novyny/${item.slug}`} className="stretched rounded">
          {item.title}
        </Link>
      </H>
      {item.excerpt ? <p className="mt-2 text-[0.9375rem] text-muted">{item.excerpt}</p> : null}
      {item.tags.length ? (
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {item.tags.map((tag) => (
            <li key={tag} className="rounded-full px-2.5 py-0.5 text-sm" style={{ background: '#eaecf0', color: '#344054' }}>
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

export async function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const t = await getTranslations('Common')
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
      {children}
      <ExternalIcon className="shrink-0" />
      <span className="sr-only">{t('externalLink')}</span>
    </a>
  )
}
