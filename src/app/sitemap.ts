import type { MetadataRoute } from 'next'
import { allDirections, allMeasures, getNews, getPageSlugs, getTree } from '@/lib/data'
import { localizedUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, news, pages] = await Promise.all([getTree('uk'), getNews('uk'), getPageSlugs()])
  const paths: { path: string; lastModified?: string; priority?: number }[] = [
    { path: '/', priority: 1 },
    ...tree.chapters.map((c) => ({ path: `/${c.slug}`, priority: 0.9 })),
    ...allDirections(tree).map((d) => ({ path: `/${d.chapter.slug}/${d.slug}`, priority: 0.8 })),
    ...allMeasures(tree).map((m) => ({ path: `/zakhid/${m.id}`, lastModified: m.updatedAt, priority: 0.6 })),
    { path: '/novyny', priority: 0.7 },
    ...news.map((n) => ({ path: `/novyny/${n.slug}`, lastModified: n.date, priority: 0.5 })),
    { path: '/metodolohiia', priority: 0.5 },
    { path: '/pro-proiekt', priority: 0.5 },
    { path: '/api-docs', priority: 0.3 },
    ...pages.map((slug) => ({ path: `/${slug}`, priority: 0.4 })),
  ]
  // Кожна адреса — в обох мовах, з hreflang-альтернативами
  return paths.flatMap(({ path, lastModified, priority }) =>
    (['uk', 'en'] as const).map((locale) => ({
      url: localizedUrl(locale, path),
      lastModified,
      priority,
      alternates: { languages: { uk: localizedUrl('uk', path), en: localizedUrl('en', path) } },
    })),
  )
}
