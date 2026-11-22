import { ApiError, apiRoute, localeOf, OPTIONS_HANDLER } from '@/lib/api'
import { measureJson } from '@/lib/apiViews'
import { allDirections, getTree } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const OPTIONS = OPTIONS_HANDLER

export const GET = apiRoute<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const locale = localeOf(req)
  const { slug } = await params
  const d = allDirections(await getTree(locale)).find((x) => x.slug === slug)
  if (!d) throw new ApiError(404, `Direction "${slug}" not found`)
  return {
    slug: d.slug,
    title: d.title,
    description: d.description,
    chapter: d.chapter.number,
    progress: d.progress,
    benchmarks: d.benchmarks.map((b) => ({ code: b.code, text: b.text, source: b.source, progress: b.progress, measures: b.measures.map((m) => measureJson(m, locale)) })),
  }
})
