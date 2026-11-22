import { apiRoute, localeOf, OPTIONS_HANDLER } from '@/lib/api'
import { directionSummary } from '@/lib/apiViews'
import { getTree } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const OPTIONS = OPTIONS_HANDLER

export const GET = apiRoute(async (req) => {
  const tree = await getTree(localeOf(req))
  return {
    data: tree.chapters.map((c) => ({ number: c.number, title: c.title, description: c.description, progress: c.progress, directions: c.directions.map(directionSummary) })),
  }
})
