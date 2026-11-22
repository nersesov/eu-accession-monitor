import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Accordion } from '@/components/Accordion'
import { MeasureFilters } from '@/components/MeasureFilters'
import { ProgressBar } from '@/components/Progress'
import { DirectionIcon } from '@/components/icons'
import { Breadcrumbs, ExternalLink, MeasureRow, SectionTitle } from '@/components/ui'
import { getTree } from '@/lib/data'
import { applyRedirect } from '@/lib/redirects'
import { buildMeta } from '@/lib/seo'
import { DISPLAY_STATUSES, type DisplayStatus } from '@/lib/status'

type Props = {
  params: Promise<{ locale: string; slug: string; direction: string }>
  searchParams: Promise<{ status?: string | string[]; body?: string | string[] }>
}

async function find(locale: string, slug: string, directionSlug: string) {
  const tree = await getTree(locale)
  return tree.chapters.find((c) => c.slug === slug)?.directions.find((d) => d.slug === directionSlug) ?? null
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, direction } = await params
  const d = await find(locale, slug, direction)
  if (!d) return {}
  return buildMeta({ locale, path: `/${slug}/${direction}`, title: d.title, description: d.description ?? undefined })
}

export default async function DirectionPage({ params, searchParams }: Props) {
  const { locale, slug, direction: directionSlug } = await params
  setRequestLocale(locale)
  const direction = await find(locale, slug, directionSlug)
  if (!direction) {
    await applyRedirect(locale, `/${slug}/${directionSlug}`)
    notFound()
  }
  const t = await getTranslations()
  const sp = await searchParams

  const all = direction.benchmarks.flatMap((b) => b.measures)
  const bodies = [...new Set(all.map((m) => m.responsibleBody).filter((b): b is string => Boolean(b)))].sort((a, b) => a.localeCompare(b, locale))
  // Некоректні значення з URL ігноруються
  const status = (DISPLAY_STATUSES as string[]).includes(one(sp.status)) ? (one(sp.status) as DisplayStatus) : ''
  const body = bodies.includes(one(sp.body)) ? one(sp.body) : ''
  const filtered = Boolean(status || body)
  const match = (m: (typeof all)[number]) => (!status || m.displayStatus === status) && (!body || m.responsibleBody === body)

  const benchmarks = direction.benchmarks.map((b) => ({ ...b, visible: b.measures.filter(match) })).filter((b) => !filtered || b.visible.length > 0)
  const shown = benchmarks.reduce((n, b) => n + b.visible.length, 0)

  return (
    <div>
      <Breadcrumbs
        label={t('Nav.breadcrumbs')}
        items={[
          { href: '/', label: t('Site.home') },
          { href: `/${direction.chapter.slug}`, label: t('Common.chapterN', { number: direction.chapter.number }) },
          { label: direction.title },
        ]}
      />

      <section className="card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong sm:flex">
            <DirectionIcon name={direction.icon} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm font-semibold tracking-wide text-brand-strong uppercase">
              {t('Common.chapterN', { number: direction.chapter.number })} · {direction.chapter.title}
            </p>
            <h1 className="text-3xl font-bold text-ink sm:text-4xl">{direction.title}</h1>
            {direction.description ? <p className="prose-measure mt-3 text-lg text-muted">{direction.description}</p> : null}
          </div>
        </div>
        <div className="mt-6 max-w-xl">
          <ProgressBar percent={direction.progress.percent} label={`${direction.title}: ${t('Common.progressOf', { percent: direction.progress.percent })}`} />
          <p className="num mt-2 text-sm text-muted">
            {t('Common.doneOf', { done: direction.progress.counts.done, total: direction.progress.total })} · {t('Common.benchmarksCount', { count: direction.benchmarks.length })}
          </p>
        </div>
      </section>

      <section aria-labelledby="benchmarks-title" className="mt-10">
        <SectionTitle id="benchmarks-title">{t('Direction.benchmarks')}</SectionTitle>

        <MeasureFilters
          status={status}
          body={body}
          statusOptions={DISPLAY_STATUSES.map((s) => ({ value: s, label: t(`Status.${s}`) }))}
          bodyOptions={bodies.map((b) => ({ value: b, label: b }))}
          labels={{
            filters: t('Direction.filters'),
            status: t('Direction.status'),
            body: t('Direction.body'),
            all: t('Direction.all'),
            apply: t('Direction.apply'),
            reset: t('Direction.reset'),
          }}
          summary={t('Direction.shown', { count: shown, total: all.length })}
        />

        <div className="mt-5">
          {benchmarks.length === 0 ? (
            <p className="card p-6 text-muted">{t('Direction.empty')}</p>
          ) : (
            <Accordion
              // Зміна фільтрів скидає стан: за активних фільтрів розгорнуто всі орієнтири зі збігами
              key={`${status}|${body}`}
              defaultOpen={filtered ? benchmarks.map((b) => String(b.id)) : benchmarks.slice(0, 1).map((b) => String(b.id))}
              labels={{ expandAll: t('Direction.expandAll'), collapseAll: t('Direction.collapseAll') }}
              items={benchmarks.map((b) => ({
                id: String(b.id),
                header: (
                  <>
                    <span className="num mr-2 inline-block rounded-md bg-brand-soft px-2 py-0.5 text-sm font-bold text-brand-strong">{b.code}</span>
                    {b.text}
                  </>
                ),
                meta: (
                  <span className="num">
                    {t('Common.progressOf', { percent: b.progress.percent })} · {t('Common.measuresCount', { count: b.visible.length })}
                  </span>
                ),
                content: (
                  <>
                    <ul className="grid gap-3">
                      {b.visible.map((m) => (
                        <MeasureRow key={m.id} measure={m} locale={locale} />
                      ))}
                    </ul>
                    {b.source.title || b.source.url ? (
                      <p className="mt-4 text-sm text-muted">
                        {t('Direction.benchmarkSource')}:{' '}
                        {b.source.url && /^https?:\/\//.test(b.source.url) ? <ExternalLink href={b.source.url}>{b.source.title || b.source.url}</ExternalLink> : b.source.title}
                      </p>
                    ) : null}
                  </>
                ),
              }))}
            />
          )}
        </div>
      </section>
    </div>
  )
}
