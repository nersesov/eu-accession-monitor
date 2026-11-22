import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseStatus } from '@/lib/status'
import { normalize, parseDate, parseList, parseSheet, required, same, SHEETS, type SheetName } from '@/sync/parse'

describe('parseSheet', () => {
  it('розбирає CSV із BOM, лапками та комами в полях', () => {
    const csv = '﻿number,title_uk,title_en\r\n23,"Судова влада, права",Judiciary\r\n\r\n'
    expect(parseSheet('chapters', csv)).toEqual([{ number: '23', title_uk: 'Судова влада, права', title_en: 'Judiciary' }])
  })
  it('повідомляє про відсутні обовʼязкові стовпці', () => {
    expect(() => parseSheet('measures', 'externalId,title_uk\nM-1,Назва')).toThrow(/benchmark, status/)
  })
  it('обрізає пробіли в заголовках і значеннях', () => {
    expect(parseSheet('chapters', ' number , title_uk \n 24 ,  Юстиція ')).toEqual([{ number: '24', title_uk: 'Юстиція' }])
  })
})

describe('parseDate', () => {
  it('приймає РРРР-ММ-ДД і ДД.ММ.РРРР', () => {
    expect(parseDate('2026-06-30')).toBe('2026-06-30T00:00:00.000Z')
    expect(parseDate('30.06.2026')).toBe('2026-06-30T00:00:00.000Z')
    expect(parseDate('1.2.2027')).toBe('2027-02-01T00:00:00.000Z')
  })
  it('порожнє значення — null', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate(undefined)).toBeNull()
  })
  it('некоректна дата — помилка', () => {
    expect(() => parseDate('31.02.2026')).toThrow()
    expect(() => parseDate('скоро')).toThrow()
  })
})

describe('допоміжні функції', () => {
  it('parseList', () => {
    expect(parseList('а, б ,,в')).toEqual(['а', 'б', 'в'])
    expect(parseList('')).toEqual([])
  })
  it('required', () => {
    expect(required({ a: 'x' }, 'a')).toBe('x')
    expect(() => required({ a: '' }, 'a')).toThrow(/«a»/)
  })
  it('same: порожні значення рівні, id вкладених рядків ігноруються', () => {
    expect(same(undefined, '')).toBe(true)
    expect(same(null, [])).toBe(true)
    expect(same([{ id: 'abc', url: 'https://x', label: 'x' }], [{ url: 'https://x', label: 'x' }])).toBe(true)
    expect(same({ title: null, url: '' }, { title: undefined, url: undefined })).toBe(true)
    expect(same('a', 'b')).toBe(false)
    expect(same(['a'], ['a', 'b'])).toBe(false)
  })
  it('normalize сортує ключі', () => {
    expect(JSON.stringify(normalize({ b: 1, a: 2 }))).toBe('{"a":2,"b":1}')
  })
})

describe('демонстраційні дані data/sheets', () => {
  const load = (name: SheetName) => parseSheet(name, fs.readFileSync(path.resolve(import.meta.dirname, '../../data/sheets', `${name}.csv`), 'utf8'))

  it('усі аркуші мають обовʼязкові стовпці', () => {
    for (const name of Object.keys(SHEETS) as SheetName[]) expect(load(name).length).toBeGreaterThan(0)
  })
  it('відповідають критеріям MVP: 2 глави, 5 напрямів, ≥10 орієнтирів, ≥30 заходів', () => {
    expect(load('chapters')).toHaveLength(2)
    expect(load('directions')).toHaveLength(5)
    expect(load('benchmarks').length).toBeGreaterThanOrEqual(10)
    expect(load('measures').length).toBeGreaterThanOrEqual(30)
  })
  it('посилання між аркушами цілісні, ключі унікальні, статуси й дати коректні', () => {
    const directions = new Set(load('directions').map((r) => r.slug))
    const benchmarks = load('benchmarks')
    const codes = new Set(benchmarks.map((r) => r.code))
    const measures = load('measures')
    const ids = new Set(measures.map((r) => r.externalId))
    expect(codes.size).toBe(benchmarks.length)
    expect(ids.size).toBe(measures.length)
    for (const b of benchmarks) expect(directions.has(b.direction)).toBe(true)
    for (const m of measures) {
      expect(codes.has(m.benchmark)).toBe(true)
      expect(parseStatus(m.status)).not.toBeNull()
      expect(() => parseDate(m.deadline)).not.toThrow()
      expect(m.title_en).toBeTruthy()
    }
    for (const u of load('updates')) {
      expect(ids.has(u.measure)).toBe(true)
      expect(parseStatus(u.to)).not.toBeNull()
    }
  })
  it('кожен орієнтир позначено як демонстраційні дані', () => {
    for (const b of load('benchmarks')) expect(b.source_title).toMatch(/Демонстраційні дані/)
  })
})
