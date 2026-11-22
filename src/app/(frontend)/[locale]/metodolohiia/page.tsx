import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProgressBar } from '@/components/Progress'
import { StatusBadge } from '@/components/StatusBadge'
import { Breadcrumbs, ExternalLink, PageHeader } from '@/components/ui'
import { Link } from '@/i18n/navigation'
import { getLastSync, getTree } from '@/lib/data'
import { formatDateTime } from '@/lib/format'
import { buildMeta } from '@/lib/seo'
import { STATUS_WEIGHT, type Status } from '@/lib/status'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Methodology' })
  return buildMeta({ locale, path: '/metodolohiia', title: t('title'), description: t('lead') })
}

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 mb-3 text-2xl font-bold text-ink">{children}</h2>

export default async function MethodologyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [tree, sync] = await Promise.all([getTree(locale), getLastSync()])
  const fmt = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'uk-UA')
  const weights: Status[] = ['done', 'partial', 'in_progress', 'not_started']

  return (
    <div>
      <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { label: t('Methodology.title') }]} />
      <PageHeader title={t('Methodology.title')} lead={t('Methodology.lead')} />

      <div className="max-w-3xl">
        <H2>{t('Methodology.structureTitle')}</H2>
        <p className="prose-measure">{t('Methodology.structure')}</p>

        <H2>{t('Methodology.formulaTitle')}</H2>
        <p className="prose-measure">{t('Methodology.formula')}</p>
        <div className="card mt-4 overflow-hidden">
          <table className="w-full text-left">
            <caption className="sr-only">{t('Methodology.weightsCaption')}</caption>
            <thead className="bg-bg text-sm text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  {t('Methodology.weightStatus')}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  {t('Methodology.weightValue')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {weights.map((s) => (
                <tr key={s}>
                  <th scope="row" className="px-5 py-3 font-normal">
                    <StatusBadge status={s} />
                  </th>
                  <td className="num px-5 py-3 text-right text-lg font-bold">{fmt.format(STATUS_WEIGHT[s])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="card mt-4 border-l-4 border-l-accent p-5 font-semibold text-ink">{t('Methodology.formulaText')}</p>
        <p className="prose-measure mt-4">{t('Methodology.levels')}</p>

        <H2>{t('Methodology.overdueTitle')}</H2>
        <p className="mb-3">
          <StatusBadge status="overdue" />
        </p>
        <p className="prose-measure">{t('Methodology.overdue')}</p>

        <H2>{t('Methodology.currentTitle')}</H2>
        <ul className="card divide-y divide-line">
          <li className="px-5 py-4">
            <p className="mb-2 font-semibold">{t('Home.overall')}</p>
            <ProgressBar percent={tree.progress.percent} label={t('Home.overallLabel', { percent: tree.progress.percent })} />
          </li>
          {tree.chapters.map((c) => (
            <li key={c.id} className="px-5 py-4">
              <p className="mb-2 font-semibold">
                <Link href={`/${c.slug}`} className="link">
                  {t('Common.chapterN', { number: c.number })}. {c.title}
                </Link>
              </p>
              <ProgressBar percent={c.progress.percent} label={`${t('Common.chapterN', { number: c.number })}: ${t('Common.progressOf', { percent: c.progress.percent })}`} />
            </li>
          ))}
        </ul>

        <H2>{t('Methodology.sourcesTitle')}</H2>
        <p className="card mb-4 border-l-4 border-l-accent p-5 text-ink">{t('Site.demoDataNote')}</p>
        <p className="prose-measure">{t('Methodology.sources')}</p>
        <p className="prose-measure mt-4">{t('Methodology.official')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <ExternalLink href="https://enlargement.ec.europa.eu/">enlargement.ec.europa.eu</ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://www.kmu.gov.ua/">kmu.gov.ua</ExternalLink>
          </li>
        </ul>

        <H2>{t('Methodology.syncTitle')}</H2>
        {sync ? (
          <dl className="card divide-y divide-line">
            {[
              [t('Methodology.syncAt'), <time key="t" dateTime={sync.finishedAt ?? undefined}>{formatDateTime(locale, sync.finishedAt)}</time>],
              [t('Methodology.syncSource'), sync.source ?? '—'],
              [t('Methodology.syncResult'), t('Methodology.syncCounts', { created: sync.created, updated: sync.updated, unchanged: sync.unchanged, skipped: sync.skipped })],
            ].map(([term, value], i) => (
              <div key={i} className="grid gap-1 px-5 py-4 sm:grid-cols-[13rem_1fr] sm:gap-4">
                <dt className="text-sm font-semibold text-muted">{term}</dt>
                <dd className="num text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted">{t('Methodology.syncNone')}</p>
        )}

        <H2>{t('Methodology.apiTitle')}</H2>
        <p className="prose-measure">{t('Methodology.api')}</p>
        <p className="mt-4">
          <Link href="/api-docs" className="btn btn-secondary">
            {t('Methodology.apiLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
