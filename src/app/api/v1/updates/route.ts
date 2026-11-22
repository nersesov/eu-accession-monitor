import { ApiError, apiRoute, localeOf, OPTIONS_HANDLER } from '@/lib/api'
import { getUpdates } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const OPTIONS = OPTIONS_HANDLER

export const GET = apiRoute(async (req) => {
  const locale = localeOf(req)
  const raw = req.nextUrl.searchParams.get('since')
  let since: string | null = null
  if (raw) {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) throw new ApiError(400, 'Invalid "since": expected an ISO 8601 date, e.g. 2026-09-01')
    since = d.toISOString()
  }
  const updates = await getUpdates(locale, { since, limit: 500 })
  const data = updates.map((u) => ({ id: u.id, date: u.date, fromStatus: u.fromStatus, toStatus: u.toStatus, comment: u.comment, source: u.source, measure: u.measure && { id: u.measure.id, title: u.measure.title } }))
  return { total: data.length, data }
})
