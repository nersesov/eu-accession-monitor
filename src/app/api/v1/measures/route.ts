import { ApiError, apiRoute, localeOf, OPTIONS_HANDLER } from '@/lib/api'
import { measureJson } from '@/lib/apiViews'
import { allDirections, allMeasures, getTree } from '@/lib/data'
import { DISPLAY_STATUSES } from '@/lib/status'

export const dynamic = 'force-dynamic'
export const OPTIONS = OPTIONS_HANDLER

export const GET = apiRoute(async (req) => {
  const locale = localeOf(req)
  const status = req.nextUrl.searchParams.get('status')
  const direction = req.nextUrl.searchParams.get('direction')
  if (status && !(DISPLAY_STATUSES as string[]).includes(status)) throw new ApiError(400, `Invalid "status": expected one of ${DISPLAY_STATUSES.join(', ')}`)
  const tree = await getTree(locale)
  if (direction && !allDirections(tree).some((d) => d.slug === direction)) throw new ApiError(400, `Unknown "direction": ${direction}`)
  const data = allMeasures(tree)
    // overdue — обчислюваний статус; решта порівнюється зі збереженим, щоб ?status=in_progress повертав і прострочені «у процесі»
    .filter((m) => !status || (status === 'overdue' ? m.displayStatus === 'overdue' : m.status === status))
    .filter((m) => !direction || m.direction.slug === direction)
    .map((m) => measureJson(m, locale))
  return { total: data.length, data }
})
