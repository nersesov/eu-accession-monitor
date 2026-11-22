import { describe, expect, it, vi } from 'vitest'
import { can, rbac, resolveRole } from '@/access/rbac'
import { rateLimit } from '@/lib/api'
import { toCSV } from '@/lib/csv'

const editor = { id: 2, name: 'editor', permissions: { measures: { read: true, write: true }, news: { read: true } } }

describe('can', () => {
  it('роль admin має повний доступ до будь-якої колекції, навіть нової', () => {
    expect(can({ id: 1, name: 'admin', permissions: {} }, 'brand-new-collection', 'delete')).toBe(true)
  })
  it('інші ролі — строго за матрицею', () => {
    expect(can(editor, 'measures', 'write')).toBe(true)
    expect(can(editor, 'measures', 'delete')).toBe(false)
    expect(can(editor, 'news', 'write')).toBe(false)
    expect(can(editor, 'users', 'read')).toBe(false)
  })
  it('без ролі доступу немає', () => {
    expect(can(null, 'measures', 'read')).toBe(false)
    expect(can({ id: 3, name: 'x', permissions: null }, 'measures', 'read')).toBe(false)
  })
})

const req = (user: unknown, findByID = vi.fn()) => ({ user, context: {}, payload: { findByID } }) as any

describe('rbac() — єдина access-функція', () => {
  it('анонімне читання лише для публічних колекцій; чернетки приховані', async () => {
    expect(await rbac('users').read!({ req: req(null) } as any)).toBe(false)
    expect(await rbac('chapters', { publicRead: true }).read!({ req: req(null) } as any)).toBe(true)
    expect(await rbac('measures', { publicRead: true, drafts: true }).read!({ req: req(null) } as any)).toEqual({ _status: { equals: 'published' } })
  })
  it('анонімний запис і видалення заборонені завжди', async () => {
    const a = rbac('chapters', { publicRead: true })
    expect(await a.create!({ req: req(null) } as any)).toBe(false)
    expect(await a.update!({ req: req(null) } as any)).toBe(false)
    expect(await a.delete!({ req: req(null) } as any)).toBe(false)
  })
  it('права автентифікованого користувача беруться з матриці ролі', async () => {
    const r = req({ id: 10, role: editor })
    expect(await rbac('measures').update!({ req: r } as any)).toBe(true)
    expect(await rbac('measures').delete!({ req: r } as any)).toBe(false)
    expect(await rbac('roles').read!({ req: r } as any)).toBe(false)
  })
  it('користувач без права читання users бачить лише власний запис', async () => {
    const r = req({ id: 10, role: editor })
    expect(await rbac('users', { selfRead: true }).read!({ req: r } as any)).toEqual({ id: { equals: 10 } })
  })
  it('роль, задана ідентифікатором, завантажується один раз на запит', async () => {
    const findByID = vi.fn().mockResolvedValue(editor)
    const r = req({ id: 10, role: 2 }, findByID)
    expect((await resolveRole(r))?.name).toBe('editor')
    await resolveRole(r)
    expect(findByID).toHaveBeenCalledTimes(1)
  })
})

describe('rateLimit', () => {
  it('пропускає до ліміту і блокує після; вікно скидається', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 3; i++) expect(rateLimit('ip-a', t0, 3).ok).toBe(true)
    expect(rateLimit('ip-a', t0 + 1, 3).ok).toBe(false)
    expect(rateLimit('ip-b', t0 + 1, 3).ok).toBe(true)
    expect(rateLimit('ip-a', t0 + 60_001, 3).ok).toBe(true)
  })
})

describe('toCSV', () => {
  it('екранує лапки, коми, переноси рядків і формули', () => {
    const csv = toCSV(['a', 'b'], [['x,y', 'he said "hi"'], ['=SUM(A1)', { k: 1 }], [null, 'рядок\nдва']])
    expect(csv.startsWith('﻿a,b\r\n')).toBe(true)
    expect(csv).toContain('"x,y","he said ""hi"""')
    expect(csv).toContain("'=SUM(A1)")
    expect(csv).toContain('"{""k"":1}"')
    expect(csv).toContain('"рядок\nдва"')
  })
})
