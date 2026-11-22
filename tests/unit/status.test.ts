import { describe, expect, it } from 'vitest'
import { computeProgress, displayStatus, isOverdue, parseStatus } from '@/lib/status'

const NOW = new Date('2026-11-22T10:00:00Z')

describe('isOverdue / displayStatus', () => {
  it('прострочено, якщо строк минув і статус не «виконано»', () => {
    expect(isOverdue('in_progress', '2026-11-21', NOW)).toBe(true)
    expect(isOverdue('not_started', '2026-01-01', NOW)).toBe(true)
    expect(isOverdue('partial', '2026-11-21', NOW)).toBe(true)
  })
  it('виконаний захід ніколи не прострочений', () => {
    expect(isOverdue('done', '2020-01-01', NOW)).toBe(false)
  })
  it('у день строку захід ще не прострочений', () => {
    expect(isOverdue('in_progress', '2026-11-22T00:00:00.000Z', NOW)).toBe(false)
    expect(isOverdue('in_progress', '2026-11-23', NOW)).toBe(false)
  })
  it('без строку або з некоректною датою — не прострочено', () => {
    expect(isOverdue('in_progress', null, NOW)).toBe(false)
    expect(isOverdue('in_progress', 'не дата', NOW)).toBe(false)
  })
  it('displayStatus підміняє статус лише для прострочених', () => {
    expect(displayStatus('in_progress', '2026-01-01', NOW)).toBe('overdue')
    expect(displayStatus('in_progress', '2027-01-01', NOW)).toBe('in_progress')
    expect(displayStatus('done', '2026-01-01', NOW)).toBe('done')
  })
})

describe('computeProgress', () => {
  it('порожній список — 0%', () => {
    expect(computeProgress([], NOW)).toMatchObject({ total: 0, percent: 0, score: 0 })
  })
  it('виконано = 1, частково = 0,5, решта = 0', () => {
    const p = computeProgress([{ status: 'done' }, { status: 'partial' }, { status: 'in_progress' }, { status: 'not_started' }], NOW)
    expect(p.score).toBe(1.5)
    expect(p.percent).toBe(38) // 1.5 / 4 = 37.5 → 38
    expect(p.total).toBe(4)
  })
  it('усе виконано — 100%', () => {
    expect(computeProgress([{ status: 'done' }, { status: 'done' }], NOW).percent).toBe(100)
  })
  it('прострочений захід рахується за фактичним статусом, але потрапляє в лічильник overdue', () => {
    const p = computeProgress([{ status: 'partial', deadline: '2026-01-01' }, { status: 'done', deadline: '2026-01-01' }], NOW)
    expect(p.score).toBe(1.5)
    expect(p.percent).toBe(75)
    expect(p.counts).toEqual({ done: 1, partial: 0, in_progress: 0, not_started: 0, overdue: 1 })
  })
  it('сума лічильників дорівнює кількості заходів', () => {
    const list = [
      { status: 'done' as const },
      { status: 'in_progress' as const, deadline: '2026-01-01' },
      { status: 'in_progress' as const, deadline: '2027-01-01' },
      { status: 'not_started' as const },
    ]
    const p = computeProgress(list, NOW)
    expect(Object.values(p.counts).reduce((a, b) => a + b, 0)).toBe(list.length)
  })
})

describe('parseStatus', () => {
  it('приймає коди та українські назви', () => {
    expect(parseStatus('done')).toBe('done')
    expect(parseStatus('Виконано')).toBe('done')
    expect(parseStatus('  у   процесі ')).toBe('in_progress')
    expect(parseStatus('виконано частково')).toBe('partial')
    expect(parseStatus('не розпочато')).toBe('not_started')
  })
  it('невідоме значення — null («прострочено» не можна задати вручну)', () => {
    expect(parseStatus('прострочено')).toBeNull()
    expect(parseStatus('')).toBeNull()
    expect(parseStatus(undefined)).toBeNull()
  })
})
