import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { ArrowRight } from '@/components/icons'
import { Breadcrumbs, DemoBadge, ExternalLink, SectionTitle, UpdateBody } from '@/components/ui'
import { Link } from '@/i18n/navigation'
import { allMeasures, getTree, getUpdates } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { buildMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; id: string }> }

async function find(locale: string, id: string) {
  if (!/^\d+$/.test(id)) return null
  return allMeasures(await getTree(locale)).find((m) => m.id === Number(id)) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const m = await find(locale, id)
  if (!m) return {}
  return buildMeta({ locale, path: `/zakhid/${id}`, title: m.title, description: `${m.benchmark.code}. ${m.benchmark.text}`, type: 'article' })
}

export default async function MeasurePage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const measure = await find(locale, id)
  if (!measure) notFound()
  const t = await getTranslations()
  const history = await getUpdates(locale, { measureId: measure.id, limit: 100 })
  const directionHref = `/${measure.chapter.slug}/${measure.direction.slug}`

  const rows: { term: string; value: React.ReactNode }[] = [
    { term: t('Measure.responsible'), value: measure.responsibleBody ?? '—' },
    {
      term: t('Measure.deadline'),
      value: (
        <>
          <span className="num">{measure.deadline ? formatDate(locale, measure.deadline) : t('Common.noDeadline')}</span>
          {measure.displayStatus === 'overdue' ? <span className="mt-1 block text-sm font-medium text-overdue">{t('Measure.overdueNote')}</span> : null}
        </>
      ),
    },
    {
      term: t('Measure.direction'),
      value: (
        <Link href={directionHref} className="link">
          {measure.direction.title}
        </Link>
      ),
    },
    {
      term: t('Measure.benchmark'),
      value: (
        <>
          <span className="num font-semibold">{measure.benchmark.code}.</span> {measure.benchmark.text}
        </>
      ),
    },
  ]
  if (measure.tags.length) rows.push({ term: t('Measure.tags'), value: measure.tags.join(', ') })
  if (measure.notes) rows.push({ term: t('Measure.notes'), value: measure.notes })

  return (
    <article>
      <Breadcrumbs
        label={t('Nav.breadcrumbs')}
        items={[
          { href: '/', label: t('Site.home') },
          { href: `/${measure.chapter.slug}`, label: t('Common.chapterN', { number: measure.chapter.number }) },
          { href: directionHref, label: measure.direction.title },
          { label: measure.externalId ?? `#${measure.id}` },
        ]}
      />

      <header className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold tracking-wide text-brand-strong uppercase">
            {t('Measure.eyebrow')}
            {measure.externalId ? <span className="num"> · {measure.externalId}</span> : null}
          </p>
          <DemoBadge label={t('Site.demoData')} />
        </div>
        <h1 className="mt-3 max-w-4xl text-2xl font-bold text-ink sm:text-3xl">{measure.title}</h1>
        <p className="mt-4 flex flex-wrap items-center gap-3">
          <span className="sr-only">{t('Measure.status')}:</span>
          <StatusBadge status={measure.displayStatus} size="lg" />
          {measure.displayStatus === 'overdue' ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted">
              ({t(`Status.${measure.status}`)})
            </span>
          ) : null}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="details-title">
            <SectionTitle id="details-title">{t('Measure.details')}</SectionTitle>
            <dl className="card divide-y divide-line">
              {rows.map((r) => (
                <div key={r.term} className="grid gap-1 px-5 py-4 sm:grid-cols-[13rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-muted">{r.term}</dt>
                  <dd className="text-ink">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="evidence-title">
            <SectionTitle id="evidence-title">{t('Measure.evidence')}</SectionTitle>
            {measure.evidenceLinks.length ? (
              <div className="card p-5">
                <ul className="space-y-2">
                  {measure.evidenceLinks.map((e) => (
                    <li key={e.url}>
                      <ExternalLink href={e.url}>{e.label || e.url}</ExternalLink>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-muted">{t('Measure.evidenceDemo')}</p>
              </div>
            ) : (
              <p className="text-muted">{t('Measure.noEvidence')}</p>
            )}
          </section>
        </div>

        <section aria-labelledby="history-title">
          <SectionTitle id="history-title">{t('Measure.history')}</SectionTitle>
          {history.length ? (
            <ol className="relative space-y-3 border-l-2 border-line pl-5">
              {history.map((u) => (
                <li key={u.id} className="relative">
                  <span className="absolute top-5 -left-[1.72rem] h-3 w-3 rounded-full border-2 border-surface bg-brand" aria-hidden />
                  <div className="card p-4">
                    <UpdateBody update={u} locale={locale} showMeasure={false} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">{t('Measure.noHistory')}</p>
          )}
        </section>
      </div>

      <p className="mt-10">
        <Link href={directionHref} className="btn btn-secondary">
          <ArrowRight className="rotate-180" />
          {t('Measure.back', { title: measure.direction.title })}
        </Link>
      </p>
    </article>
  )
}
