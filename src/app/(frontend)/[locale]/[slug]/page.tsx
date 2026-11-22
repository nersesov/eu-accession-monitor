import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Blocks } from '@/components/Blocks'
import { ProgressRing } from '@/components/Progress'
import { Breadcrumbs, DirectionCard, PageHeader, SectionTitle } from '@/components/ui'
import { getPage, getTree } from '@/lib/data'
import { applyRedirect } from '@/lib/redirects'
import { buildMeta } from '@/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Один сегмент обслуговує і глави (/glava-23), і сторінки з колекції `pages`.
async function resolve(locale: string, slug: string) {
  const tree = await getTree(locale)
  const chapter = tree.chapters.find((c) => c.slug === slug)
  if (chapter) return { chapter }
  const page = await getPage(locale, slug)
  return page ? { page } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const found = await resolve(locale, slug)
  if (!found) return {}
  if (found.chapter) {
    const t = await getTranslations({ locale, namespace: 'Chapter' })
    return buildMeta({ locale, path: `/${slug}`, title: t('metaTitle', { number: found.chapter.number, title: found.chapter.title }), description: found.chapter.description ?? undefined })
  }
  return buildMeta({ locale, path: `/${slug}`, title: found.page.meta.title || found.page.title, description: found.page.meta.description ?? undefined })
}

export default async function ChapterOrPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const found = await resolve(locale, slug)
  if (!found) {
    await applyRedirect(locale, `/${slug}`)
    notFound()
  }
  const t = await getTranslations()

  if (found.page) {
    return (
      <article>
        <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { label: found.page.title }]} />
        <PageHeader title={found.page.title} />
        <Blocks blocks={found.page.blocks} />
      </article>
    )
  }

  const { chapter } = found
  return (
    <div>
      <Breadcrumbs label={t('Nav.breadcrumbs')} items={[{ href: '/', label: t('Site.home') }, { label: t('Common.chapterN', { number: chapter.number }) }]} />
      <section className="card grid items-center gap-8 p-6 sm:p-8 md:grid-cols-[1fr_200px]">
        <div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-brand-strong uppercase">{t('Common.chapterN', { number: chapter.number })}</p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{chapter.title}</h1>
          {chapter.description ? <p className="prose-measure mt-3 text-lg text-muted">{chapter.description}</p> : null}
          <p className="num mt-4 text-sm text-muted">
            {t('Common.directionsCount', { count: chapter.directions.length })} · {t('Common.measuresCount', { count: chapter.progress.total })} ·{' '}
            {t('Common.doneOf', { done: chapter.progress.counts.done, total: chapter.progress.total })}
          </p>
        </div>
        <ProgressRing size={180} percent={chapter.progress.percent} label={`${t('Common.chapterN', { number: chapter.number })}: ${t('Common.progressOf', { percent: chapter.progress.percent })}`} />
      </section>

      <section aria-labelledby="chapter-directions" className="mt-10">
        <SectionTitle id="chapter-directions">{t('Chapter.directions')}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chapter.directions.map((d) => (
            <DirectionCard key={d.id} direction={d} showChapter={false} />
          ))}
        </div>
      </section>
    </div>
  )
}
