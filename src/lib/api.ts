// Обгортка відкритого API v1: обмеження частоти (in-memory), CORS, єдиний формат помилок.
import { NextResponse, type NextRequest } from 'next/server'

export const RATE_LIMIT = 60
const WINDOW_MS = 60_000
const buckets = new Map<string, { count: number; reset: number }>()

export function rateLimit(key: string, now = Date.now(), limit = RATE_LIMIT) {
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k)
  let b = buckets.get(key)
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + WINDOW_MS }
    buckets.set(key, b)
  }
  b.count += 1
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count), reset: b.reset, limit }
}

function clientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<unknown>

export function apiRoute<C = unknown>(handler: Handler<C>) {
  return async (req: NextRequest, ctx: C) => {
    const rl = rateLimit(clientKey(req))
    const headers: Record<string, string> = {
      ...CORS,
      'X-RateLimit-Limit': String(rl.limit),
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset': String(Math.ceil(rl.reset / 1000)),
    }
    if (!rl.ok) {
      return NextResponse.json(
        { error: { status: 429, message: 'Too many requests' } },
        { status: 429, headers: { ...headers, 'Retry-After': String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))) } },
      )
    }
    try {
      const data = await handler(req, ctx)
      return NextResponse.json(data, { headers: { ...headers, 'Cache-Control': 'public, max-age=60' } })
    } catch (err) {
      if (err instanceof ApiError) return NextResponse.json({ error: { status: err.status, message: err.message } }, { status: err.status, headers })
      console.error(JSON.stringify({ level: 'error', msg: 'api v1 error', path: req.nextUrl.pathname, err: String(err) }))
      return NextResponse.json({ error: { status: 500, message: 'Internal server error' } }, { status: 500, headers })
    }
  }
}

export const OPTIONS_HANDLER = () => new NextResponse(null, { status: 204, headers: CORS })

export function localeOf(req: NextRequest): 'uk' | 'en' {
  const l = req.nextUrl.searchParams.get('locale')
  if (l && l !== 'uk' && l !== 'en') throw new ApiError(400, 'Invalid "locale": expected "uk" or "en"')
  return l === 'en' ? 'en' : 'uk'
}
