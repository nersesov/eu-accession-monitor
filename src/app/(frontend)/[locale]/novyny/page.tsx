import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Breadcrumbs, NewsCard, PageHeader } from '@/components/ui'
import { Link } from '@/i18n/navigation'
import { getNews } from '@/lib/data'
import { buildMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tag?: string | string[] }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'News' })
  return buildMeta({ locale, path: '/novyny', title: t('title'), description: t('lead') })
}

export default async function NewsPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const news = await getNews(locale)
  const raw = (await searchParams).tag
  const tags = [...new Set(news.flatMap((n) => n.tags))].sort((a, b) => a.localeCompare(b, locale))
  const tag = tags.includes(Array.isArray(raw) ? raw[0] : (raw ?? '')) ? (Array.isArray(raw) ? raw[0] : raw!) : ''
  const list = tag ? news.filter((n) => n.tags.includes(tag)) : news

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-[0.9375rem] font-medium transition-colors duration-150 ${active ? 'border-brand-strong bg-brand-strong text-white' : 'nav-link border-line bg-surface text-ink'}`

  return (
    <div>
      <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { label: t('News.title') }]} />
      <PageHeader title={t('News.title')} lead={t('News.lead')} />

      {tags.length ? (
        <nav aria-label={t('News.tags')} className="mb-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/novyny" aria-current={!tag ? 'true' : undefined} className={chip(!tag)}>
                {t('News.allTags')}
              </Link>
            </li>
            {tags.map((x) => (
              <li key={x}>
                <Link href={{ pathname: '/novyny', query: { tag: x } }} aria-current={tag === x ? 'true' : undefined} className={chip(tag === x)}>
                  {x}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => (
            <NewsCard key={n.id} item={n} locale={locale} headingLevel="h2" />
          ))}
        </div>
      ) : (
        <p className="text-muted">{t('News.empty')}</p>
      )}
    </div>
  )
}
