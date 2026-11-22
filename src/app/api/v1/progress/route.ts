import { apiRoute, localeOf, OPTIONS_HANDLER } from '@/lib/api'
import { directionSummary } from '@/lib/apiViews'
import { allDirections, getTree } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const OPTIONS = OPTIONS_HANDLER

export const GET = apiRoute(async (req) => {
  const tree = await getTree(localeOf(req))
  return {
    generatedAt: tree.generatedAt,
    overall: tree.progress,
    chapters: tree.chapters.map((c) => ({ number: c.number, title: c.title, progress: c.progress })),
    directions: allDirections(tree).map(directionSummary),
  }
})
