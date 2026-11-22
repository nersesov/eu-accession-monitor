import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProgressRing } from '@/components/Progress'
import { StatusDonutLazy } from '@/components/StatusDonutLazy'
import { StatusIcon } from '@/components/icons'
import { ChapterCard, DemoBadge, DirectionCard, NewsCard, SectionTitle, UpdateItem } from '@/components/ui'
import { Link } from '@/i18n/navigation'
import { allDirections, getNews, getTree, getUpdates } from '@/lib/data'
import { buildMeta } from '@/lib/seo'
import { DISPLAY_STATUSES, STATUS_FILL } from '@/lib/status'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Site' })
  return buildMeta({ locale, path: '/', description: t('description') })
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [tree, updates, news] = await Promise.all([getTree(locale), getUpdates(locale, { limit: 3 }), getNews(locale)])
  const { progress } = tree
  const stats = [
    { value: tree.counts.measures, label: t('Home.statMeasures') },
    { value: tree.counts.benchmarks, label: t('Home.statBenchmarks') },
    { value: tree.counts.directions, label: t('Home.statDirections') },
  ]
  const distribution = DISPLAY_STATUSES.map((s) => ({ key: s, label: t(`Status.${s}`), value: progress.counts[s], color: STATUS_FILL[s] }))

  return (
    <div className="space-y-14">
      <section aria-labelledby="hero-title" className="card grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:p-10">
        <div>
          <DemoBadge label={t('Site.demoData')} />
          <h1 id="hero-title" className="mt-4 text-3xl font-bold text-ink sm:text-4xl lg:text-[2.75rem]">
            {t('Home.title')}
          </h1>
          <p className="prose-measure mt-4 text-lg text-muted">{t('Home.lead')}</p>
          <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-bg px-3 py-3 sm:px-4">
                <dt className="order-2 text-sm text-muted">{s.label}</dt>
                <dd className="num text-2xl font-bold text-ink sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="text-center">
          <h2 className="mb-4 text-base font-semibold text-muted">{t('Home.overall')}</h2>
          <ProgressRing percent={progress.percent} label={t('Home.overallLabel', { percent: progress.percent })} caption={t('Home.ringCaption')} />
          <p className="num mt-4 text-sm text-muted">{t('Common.doneOf', { done: progress.counts.done, total: progress.total })}</p>
        </div>
      </section>

      <section aria-labelledby="chapters-title">
        <SectionTitle id="chapters-title">{t('Home.chapters')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {tree.chapters.map((c) => (
            <ChapterCard key={c.id} chapter={c} />
          ))}
        </div>
      </section>

      <section aria-labelledby="directions-title">
        <SectionTitle id="directions-title">{t('Home.directions')}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allDirections(tree).map((d) => (
            <DirectionCard key={d.id} direction={d} />
          ))}
        </div>
      </section>

      <section aria-labelledby="distribution-title" className="card p-6 sm:p-8">
        <SectionTitle id="distribution-title">{t('Home.distribution')}</SectionTitle>
        <div className="grid items-center gap-8 md:grid-cols-[240px_1fr]">
          <StatusDonutLazy data={distribution} total={progress.total} totalLabel={t('Home.total')} ariaLabel={t('Home.distributionChart')} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {distribution.map((d) => (
              <li key={d.key} className="flex items-center gap-3 rounded-xl bg-bg px-4 py-3">
                <span style={{ color: d.color }} className="shrink-0">
                  <StatusIcon status={d.key} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">{d.label}</span>
                <span className="num text-lg font-bold text-ink">{d.value}</span>
                <span className="num w-11 text-right text-sm text-muted">{progress.total ? Math.round((d.value / progress.total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="updates-title">
        <SectionTitle id="updates-title">{t('Home.updates')}</SectionTitle>
        {updates.length ? (
          <ul className="grid gap-3 lg:grid-cols-3">
            {updates.map((u) => (
              <UpdateItem key={u.id} update={u} locale={locale} />
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t('Home.noUpdates')}</p>
        )}
      </section>

      <section aria-labelledby="news-title">
        <SectionTitle
          id="news-title"
          action={
            <Link href="/novyny" className="link inline-flex min-h-11 items-center font-semibold">
              {t('Common.allNews')}
            </Link>
          }
        >
          {t('Home.news')}
        </SectionTitle>
        {news.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {news.slice(0, 3).map((n) => (
              <NewsCard key={n.id} item={n} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="text-muted">{t('Home.noNews')}</p>
        )}
      </section>
    </div>
  )
}
