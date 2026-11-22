// Розбір CSV-аркушів. Чисті функції — покриті unit-тестами.
import Papa from 'papaparse'

export type Row = Record<string, string>

export const SHEETS = {
  chapters: ['number', 'title_uk'],
  directions: ['slug', 'chapter', 'title_uk'],
  benchmarks: ['code', 'direction', 'text_uk'],
  measures: ['externalId', 'benchmark', 'title_uk', 'status'],
  updates: ['externalId', 'measure', 'date', 'to'],
} as const
export type SheetName = keyof typeof SHEETS

export function parseSheet(name: SheetName, csv: string): Row[] {
  const res = Papa.parse<Row>(csv.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  })
  const fields = res.meta.fields ?? []
  const missing = SHEETS[name].filter((c) => !fields.includes(c))
  if (missing.length) throw new Error(`Аркуш «${name}»: відсутні стовпці ${missing.join(', ')}`)
  return res.data
}

/** Приймає РРРР-ММ-ДД або ДД.ММ.РРРР; повертає ISO-рядок (північ UTC) або null. */
export function parseDate(raw: string | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  let y: number, m: number, d: number
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  else {
    match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v)
    if (!match) throw new Error(`Некоректна дата: «${v}»`)
    ;[d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])]
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error(`Некоректна дата: «${v}»`)
  return date.toISOString()
}

export function parseList(raw: string | undefined, sep: string | RegExp = ','): string[] {
  return (raw ?? '')
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function required(row: Row, col: string): string {
  const v = row[col]
  if (!v) throw new Error(`Порожнє обовʼязкове поле «${col}»`)
  return v
}

/** Нормалізація для порівняння «чи змінився запис»: порожні значення рівні, id вкладених рядків ігноруються. */
export function normalize(v: unknown): unknown {
  if (v === undefined || v === null || v === '') return null
  if (Array.isArray(v)) return v.length ? v.map(normalize) : null
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as object).sort()) {
      if (k === 'id') continue
      out[k] = normalize((v as Record<string, unknown>)[k])
    }
    return Object.values(out).every((x) => x === null) ? null : out
  }
  return v
}

export const same = (a: unknown, b: unknown) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
