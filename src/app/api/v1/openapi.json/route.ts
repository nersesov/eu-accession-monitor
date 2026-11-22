import { apiRoute, OPTIONS_HANDLER } from '@/lib/api'
import { openapi } from '@/lib/openapi'

export const dynamic = 'force-dynamic'
export const OPTIONS = OPTIONS_HANDLER
export const GET = apiRoute(async () => openapi())
