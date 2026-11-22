import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Blocks } from '@/components/Blocks'
import { ArrowRight } from '@/components/icons'
import { Breadcrumbs } from '@/components/ui'
import { Link } from '@/i18n/navigation'
import { getNews } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { buildMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

const find = async (locale: string, slug: string) => (await getNews(locale)).find((n) => n.slug === slug) ?? null

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const n = await find(locale, slug)
  if (!n) return {}
  return buildMeta({ locale, path: `/novyny/${slug}`, title: n.meta.title || n.title, description: n.meta.description || n.excerpt || undefined, type: 'article' })
}

export default async function NewsItemPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const item = await find(locale, slug)
  if (!item) notFound()
  const t = await getTranslations()

  return (
    <article>
      <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { href: '/novyny', label: t('News.title') }, { label: item.title }]} />
      <header className="mb-8">
        <p className="num text-sm text-muted">
          {t('News.published')}: <time dateTime={item.date}>{formatDate(locale, item.date)}</time>
        </p>
        <h1 className="mt-2 max-w-4xl text-3xl font-bold text-ink sm:text-4xl">{item.title}</h1>
        {item.excerpt ? <p className="prose-measure mt-4 text-lg text-muted">{item.excerpt}</p> : null}
        {item.tags.length ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('Measure.tags')}>
            {item.tags.map((tag) => (
              <li key={tag}>
                <Link href={{ pathname: '/novyny', query: { tag } }} className="nav-link inline-flex min-h-9 items-center rounded-full border border-line bg-surface px-3 text-sm text-ink">
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <Blocks blocks={item.blocks} />
      <p className="mt-10">
        <Link href="/novyny" className="btn btn-secondary">
          <ArrowRight className="rotate-180" />
          {t('News.back')}
        </Link>
      </p>
    </article>
  )
}
