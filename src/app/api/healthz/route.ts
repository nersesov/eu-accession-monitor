import { NextResponse } from 'next/server'
import { dbHealthy } from '@/lib/data'

export const dynamic = 'force-dynamic'

/** Перевірка стану для docker healthcheck і Caddy: застосунок відповідає і база доступна. */
export async function GET() {
  try {
    await dbHealthy()
    return NextResponse.json({ status: 'ok', db: 'ok', time: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'healthz failed', err: String(err) }))
    return NextResponse.json({ status: 'error', db: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
