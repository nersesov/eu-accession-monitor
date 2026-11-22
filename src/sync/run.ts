// Імпорт («перенесення даних») із публічної Google Sheets або локальних CSV.
// Ідемпотентний: ключі — number (глава), slug (напрям), code (орієнтир), externalId (захід, оновлення).
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'
import { parseStatus } from '../lib/status'
import { parseDate, parseList, parseSheet, required, same, type Row, type SheetName } from './parse'

type SyncError = { sheet: string; row?: number; key?: string; message: string }
type Counters = { created: number; updated: number; unchanged: number; skipped: number }
type Options = { trigger: 'manual' | 'schedule' | 'cli' | 'seed'; user?: unknown }

let running = false

function sourceLabel(): string {
  const id = process.env.GOOGLE_SHEET_ID
  return id ? `google-sheets:${id}` : 'file:data/sheets'
}

async function loadSheet(name: SheetName): Promise<string> {
  const id = process.env.GOOGLE_SHEET_ID
  if (!id) return fs.readFile(path.join(process.cwd(), 'data', 'sheets', `${name}.csv`), 'utf8')
  // CSV-експорт аркуша за назвою, без API-ключа (таблиця має бути доступна за посиланням)
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} при завантаженні аркуша «${name}»`)
  if (!(res.headers.get('content-type') ?? '').includes('csv')) throw new Error(`Аркуш «${name}» недоступний публічно (відповідь не CSV)`)
  return res.text()
}

type UpsertArgs = {
  collection: string
  keyField: string
  keyValue: string | number
  shared: Record<string, unknown>
  uk: Record<string, unknown>
  en: Record<string, unknown>
  drafts?: boolean
}

export async function runSync(payload: Payload, opts: Options) {
  if (running) throw new Error('Синхронізація вже виконується')
  running = true
  const p = payload as any
  const startedAt = new Date().toISOString()
  const source = sourceLabel()
  const c: Counters = { created: 0, updated: 0, unchanged: 0, skipped: 0 }
  const errors: SyncError[] = []
  const context = { statusComment: 'Статус оновлено під час імпорту даних', statusSource: source }

  async function upsert(a: UpsertArgs): Promise<number | string> {
    const found = await p.find({ collection: a.collection, where: { [a.keyField]: { equals: a.keyValue } }, locale: 'all', depth: 0, limit: 1 })
    const existing = found.docs[0]
    const extra = a.drafts ? { _status: 'published' } : {}
    if (!existing) {
      const doc = await p.create({ collection: a.collection, locale: 'uk', data: { ...a.shared, ...a.uk, ...extra }, context })
      if (Object.keys(a.en).length) await p.update({ collection: a.collection, id: doc.id, locale: 'en', data: { ...a.en, ...extra }, context })
      c.created++
      return doc.id
    }
    const sharedSame = Object.entries(a.shared).every(([k, v]) => same(existing[k], v)) && (!a.drafts || existing._status === 'published')
    const ukSame = Object.entries(a.uk).every(([k, v]) => same(existing[k]?.uk, v))
    const enSame = Object.entries(a.en).every(([k, v]) => same(existing[k]?.en, v))
    if (sharedSame && ukSame && enSame) {
      c.unchanged++
      return existing.id
    }
    if (!sharedSame || !ukSame) await p.update({ collection: a.collection, id: existing.id, locale: 'uk', data: { ...a.shared, ...a.uk, ...extra }, context })
    if (!enSame) await p.update({ collection: a.collection, id: existing.id, locale: 'en', data: { ...a.en, ...extra }, context })
    c.updated++
    return existing.id
  }

  /** Обробляє аркуш порядково: помилковий рядок пропускається, імпорт триває. */
  async function eachRow(sheet: SheetName, keyCol: string, fn: (row: Row) => Promise<void>) {
    let rows: Row[]
    try {
      rows = parseSheet(sheet, await loadSheet(sheet))
    } catch (err) {
      errors.push({ sheet, message: (err as Error).message })
      return
    }
    for (const [i, row] of rows.entries()) {
      try {
        await fn(row)
      } catch (err) {
        c.skipped++
        errors.push({ sheet, row: i + 2, key: row[keyCol], message: (err as Error).message })
      }
    }
  }

  const chapterIds = new Map<string, number | string>()
  const directionIds = new Map<string, number | string>()
  const benchmarkIds = new Map<string, number | string>()
  const measureIds = new Map<string, number | string>()
  const ref = (map: Map<string, number | string>, key: string, what: string) => {
    const id = map.get(key)
    if (id === undefined) throw new Error(`Не знайдено ${what} «${key}»`)
    return id
  }
  const num = (v: string | undefined) => (v && !Number.isNaN(Number(v)) ? Number(v) : 0)

  try {
    await eachRow('chapters', 'number', async (r) => {
      const number = Number(required(r, 'number'))
      if (!Number.isInteger(number)) throw new Error(`Некоректний номер глави «${r.number}»`)
      const id = await upsert({
        collection: 'chapters', keyField: 'number', keyValue: number,
        shared: { number, order: num(r.order) },
        uk: { title: required(r, 'title_uk'), description: r.description_uk },
        en: { title: r.title_en, description: r.description_en },
      })
      chapterIds.set(String(number), id)
    })

    await eachRow('directions', 'slug', async (r) => {
      const slug = required(r, 'slug')
      const id = await upsert({
        collection: 'directions', keyField: 'slug', keyValue: slug,
        shared: { slug, chapter: ref(chapterIds, required(r, 'chapter'), 'главу'), icon: r.icon || 'scale', order: num(r.order) },
        uk: { title: required(r, 'title_uk'), description: r.description_uk },
        en: { title: r.title_en, description: r.description_en },
      })
      directionIds.set(slug, id)
    })

    await eachRow('benchmarks', 'code', async (r) => {
      const code = required(r, 'code')
      const id = await upsert({
        collection: 'benchmarks', keyField: 'code', keyValue: code,
        shared: { code, direction: ref(directionIds, required(r, 'direction'), 'напрям'), source: { title: r.source_title, url: r.source_url }, order: num(r.order) },
        uk: { text: required(r, 'text_uk') },
        en: { text: r.text_en },
      })
      benchmarkIds.set(code, id)
    })

    await eachRow('measures', 'externalId', async (r) => {
      const externalId = required(r, 'externalId')
      const status = parseStatus(r.status)
      if (!status) throw new Error(`Невідомий статус «${r.status}»`)
      const id = await upsert({
        collection: 'measures', keyField: 'externalId', keyValue: externalId, drafts: true,
        shared: {
          externalId,
          benchmark: ref(benchmarkIds, required(r, 'benchmark'), 'орієнтир'),
          status,
          deadline: parseDate(r.deadline),
          evidenceLinks: parseList(r.evidence, /\s*\|\s*|\s+/).map((url) => {
            if (!/^https?:\/\//.test(url)) throw new Error(`Некоректне посилання «${url}»`)
            return { url, label: new URL(url).hostname.replace(/^www\./, '') }
          }),
          tags: parseList(r.tags),
        },
        uk: { title: required(r, 'title_uk'), responsibleBody: r.responsible_uk, notes: r.notes_uk },
        en: { title: r.title_en, responsibleBody: r.responsible_en, notes: r.notes_en },
      })
      measureIds.set(externalId, id)
    })

    await eachRow('updates', 'externalId', async (r) => {
      const externalId = required(r, 'externalId')
      const toStatus = parseStatus(r.to)
      if (!toStatus) throw new Error(`Невідомий статус «${r.to}»`)
      await upsert({
        collection: 'status-updates', keyField: 'externalId', keyValue: externalId,
        shared: {
          externalId,
          measure: ref(measureIds, required(r, 'measure'), 'захід'),
          date: parseDate(required(r, 'date')),
          fromStatus: parseStatus(r.from),
          toStatus,
          source: r.source,
        },
        uk: { comment: r.comment_uk },
        en: { comment: r.comment_en },
      })
    })
  } catch (err) {
    errors.push({ sheet: '*', message: (err as Error).message })
  } finally {
    running = false
  }

  const run = await p.create({
    collection: 'sync-runs',
    data: { startedAt, finishedAt: new Date().toISOString(), source, trigger: opts.trigger, ...c, errors },
  })
  payload.logger.info({ msg: 'sync finished', source, trigger: opts.trigger, ...c, errors: errors.length })
  return run
}
