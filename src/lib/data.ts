// Шар читання даних для публічних сторінок і API v1.
import 'server-only'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import { CONTENT_TAG } from '../hooks/revalidate'
import { computeProgress, displayStatus, type DisplayStatus, type Progress, type Status } from './status'

export type MeasureView = {
  id: number
  externalId: string | null
  title: string
  status: Status
  displayStatus: DisplayStatus
  deadline: string | null
  responsibleBody: string | null
  evidenceLinks: { label: string | null; url: string }[]
  notes: string | null
  tags: string[]
  updatedAt: string
  benchmark: { code: string; text: string }
  direction: { slug: string; title: string }
  chapter: { number: number; slug: string; title: string }
}
export type BenchmarkView = {
  id: number
  code: string
  text: string
  source: { title: string | null; url: string | null }
  measures: MeasureView[]
  progress: Progress
}
export type DirectionView = {
  id: number
  slug: string
  title: string
  description: string | null
  icon: string
  chapter: { number: number; slug: string; title: string }
  benchmarks: BenchmarkView[]
  progress: Progress
}
export type ChapterView = {
  id: number
  number: number
  slug: string
  title: string
  description: string | null
  directions: DirectionView[]
  progress: Progress
}
export type Tree = { chapters: ChapterView[]; progress: Progress; counts: { directions: number; benchmarks: number; measures: number }; generatedAt: string }

type Loc = 'uk' | 'en'
const asLoc = (l: string): Loc => (l === 'en' ? 'en' : 'uk')
const relId = (v: unknown): number => (v && typeof v === 'object' ? (v as { id: number }).id : (v as number))
export const chapterSlug = (n: number) => `glava-${n}`

const payloadClient = () => getPayload({ config })

async function loadTree(locale: Loc): Promise<Tree> {
  const payload = await payloadClient()
  const base = { locale, depth: 0, limit: 1000, pagination: false } as const
  const [chapters, directions, benchmarks, measures] = await Promise.all([
    payload.find({ collection: 'chapters', sort: 'order', ...base }),
    payload.find({ collection: 'directions', sort: 'order', ...base }),
    payload.find({ collection: 'benchmarks', sort: 'order', ...base }),
    payload.find({ collection: 'measures', sort: 'externalId', where: { _status: { equals: 'published' } }, ...base }),
  ])
  const now = new Date()

  const chapterViews: ChapterView[] = chapters.docs.map((c) => {
    const chapterRef = { number: c.number, slug: chapterSlug(c.number), title: c.title }
    const dirs: DirectionView[] = directions.docs
      .filter((d) => relId(d.chapter) === c.id)
      .map((d) => {
        const directionRef = { slug: d.slug, title: d.title }
        const bms: BenchmarkView[] = benchmarks.docs
          .filter((b) => relId(b.direction) === d.id)
          .map((b) => {
            const ms: MeasureView[] = measures.docs
              .filter((m) => relId(m.benchmark) === b.id)
              .map((m) => ({
                id: m.id,
                externalId: m.externalId ?? null,
                title: m.title,
                status: m.status as Status,
                displayStatus: displayStatus(m.status as Status, m.deadline, now),
                deadline: m.deadline ?? null,
                responsibleBody: m.responsibleBody ?? null,
                evidenceLinks: (m.evidenceLinks ?? []).map((e) => ({ label: e.label ?? null, url: e.url })),
                notes: m.notes ?? null,
                tags: m.tags ?? [],
                updatedAt: m.updatedAt,
                benchmark: { code: b.code, text: b.text },
                direction: directionRef,
                chapter: chapterRef,
              }))
            return { id: b.id, code: b.code, text: b.text, source: { title: b.source?.title ?? null, url: b.source?.url ?? null }, measures: ms, progress: computeProgress(ms, now) }
          })
        return {
          id: d.id, slug: d.slug, title: d.title, description: d.description ?? null, icon: d.icon ?? 'scale',
          chapter: chapterRef, benchmarks: bms, progress: computeProgress(bms.flatMap((b) => b.measures), now),
        }
      })
    return {
      id: c.id, number: c.number, slug: chapterRef.slug, title: c.title, description: c.description ?? null,
      directions: dirs, progress: computeProgress(dirs.flatMap((d) => d.benchmarks.flatMap((b) => b.measures)), now),
    }
  })

  const all = allMeasures({ chapters: chapterViews })
  return {
    chapters: chapterViews,
    progress: computeProgress(all, now),
    counts: {
      directions: chapterViews.reduce((n, c) => n + c.directions.length, 0),
      benchmarks: chapterViews.reduce((n, c) => n + c.directions.reduce((k, d) => k + d.benchmarks.length, 0), 0),
      measures: all.length,
    },
    generatedAt: now.toISOString(),
  }
}

const cachedTree = unstable_cache(loadTree, ['tree'], { tags: [CONTENT_TAG], revalidate: 60 })
export const getTree = (locale: string) => cachedTree(asLoc(locale))

export const allDirections = (tree: Pick<Tree, 'chapters'>) => tree.chapters.flatMap((c) => c.directions)
export const allMeasures = (tree: Pick<Tree, 'chapters'>) => allDirections(tree).flatMap((d) => d.benchmarks.flatMap((b) => b.measures))

export type UpdateView = {
  id: number
  date: string
  fromStatus: Status | null
  toStatus: Status
  comment: string | null
  source: string | null
  measure: { id: number; title: string; direction: string; chapterNumber: number } | null
}

async function loadUpdates(locale: Loc, since: string | null, measureId: number | null, limit: number): Promise<UpdateView[]> {
  const payload = await payloadClient()
  const and: any[] = []
  if (since) and.push({ date: { greater_than_equal: since } })
  if (measureId) and.push({ measure: { equals: measureId } })
  const [res, tree] = await Promise.all([
    payload.find({ collection: 'status-updates', locale, depth: 0, sort: '-date', limit, where: and.length ? { and } : {} }),
    getTree(locale),
  ])
  const byId = new Map(allMeasures(tree).map((m) => [m.id, m]))
  return res.docs
    .map((u) => {
      const m = byId.get(relId(u.measure))
      return {
        id: u.id,
        date: u.date,
        fromStatus: (u.fromStatus as Status) ?? null,
        toStatus: u.toStatus as Status,
        comment: u.comment ?? null,
        source: u.source ?? null,
        measure: m ? { id: m.id, title: m.title, direction: m.direction.title, chapterNumber: m.chapter.number } : null,
      }
    })
    .filter((u) => u.measure) // оновлення неопублікованих заходів не показуємо
}
const cachedUpdates = unstable_cache(loadUpdates, ['updates'], { tags: [CONTENT_TAG], revalidate: 60 })
export const getUpdates = (locale: string, o: { since?: string | null; measureId?: number | null; limit?: number } = {}) =>
  cachedUpdates(asLoc(locale), o.since ?? null, o.measureId ?? null, o.limit ?? 100)

export type NewsView = { id: number; slug: string; title: string; date: string; excerpt: string | null; tags: string[]; blocks: any[]; meta: { title?: string | null; description?: string | null } }
const toNews = (n: any): NewsView => ({ id: n.id, slug: n.slug, title: n.title, date: n.date, excerpt: n.excerpt ?? null, tags: n.tags ?? [], blocks: n.blocks ?? [], meta: n.meta ?? {} })

const cachedNews = unstable_cache(
  async (locale: Loc): Promise<NewsView[]> => {
    const payload = await payloadClient()
    const res = await payload.find({ collection: 'news', locale, depth: 1, sort: '-date', limit: 200, where: { _status: { equals: 'published' } } })
    return res.docs.map(toNews)
  },
  ['news'],
  { tags: [CONTENT_TAG], revalidate: 60 },
)
export const getNews = (locale: string) => cachedNews(asLoc(locale))

export type PageView = { id: number; slug: string; title: string; blocks: any[]; meta: { title?: string | null; description?: string | null }; updatedAt: string }
const cachedPage = unstable_cache(
  async (locale: Loc, slug: string): Promise<PageView | null> => {
    const payload = await payloadClient()
    const res = await payload.find({ collection: 'pages', locale, depth: 1, limit: 1, where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] } })
    const p = res.docs[0]
    return p ? { id: p.id, slug: p.slug, title: p.title, blocks: p.blocks ?? [], meta: p.meta ?? {}, updatedAt: p.updatedAt } : null
  },
  ['page'],
  { tags: [CONTENT_TAG], revalidate: 60 },
)
export const getPage = (locale: string, slug: string) => cachedPage(asLoc(locale), slug)

export async function getPageSlugs(): Promise<string[]> {
  const payload = await payloadClient()
  const res = await payload.find({ collection: 'pages', depth: 0, limit: 500, where: { _status: { equals: 'published' } }, select: { slug: true } })
  return res.docs.map((p) => p.slug)
}

export type SyncInfo = { finishedAt: string | null; source: string | null; created: number; updated: number; unchanged: number; skipped: number } | null
export async function getLastSync(): Promise<SyncInfo> {
  const payload = await payloadClient()
  const res = await payload.find({ collection: 'sync-runs', depth: 0, limit: 1, sort: '-startedAt' })
  const r = res.docs[0]
  if (!r) return null
  // Ідентифікатор таблиці не розкриваємо — лише тип джерела
  const source = r.source?.startsWith('google-sheets') ? 'Google Sheets' : r.source ? 'CSV' : null
  return { finishedAt: r.finishedAt ?? r.startedAt, source, created: r.created ?? 0, updated: r.updated ?? 0, unchanged: r.unchanged ?? 0, skipped: r.skipped ?? 0 }
}

export async function findRedirect(pathname: string): Promise<{ to: string; permanent: boolean } | null> {
  const payload = await payloadClient()
  const res = await payload.find({ collection: 'redirects', depth: 0, limit: 1, where: { from: { equals: pathname } } })
  const r = res.docs[0]
  return r ? { to: r.to, permanent: r.type === '301' } : null
}

export async function dbHealthy(): Promise<boolean> {
  const payload = await payloadClient()
  await payload.count({ collection: 'roles' })
  return true
}
