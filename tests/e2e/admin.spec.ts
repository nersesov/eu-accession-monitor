// Ролі з правами в даних, журнал аудиту, імпорт. Потребує ADMIN_EMAIL / ADMIN_PASSWORD.
import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
test.skip(!email || !password, 'ADMIN_EMAIL / ADMIN_PASSWORD не задано')
test.describe.configure({ mode: 'serial' })

const stamp = Date.now()
// Паролі тестових користувачів генеруються на кожен запуск і ніде не зберігаються
const tempPassword = () => `Aa1-${stamp}-${Math.random().toString(36).slice(2, 12)}`
let admin: APIRequestContext
let baseURL: string

// API-клієнти автентифікуються заголовком Authorization: cookie без заголовка Origin
// Payload відхиляє навмисно (захист від CSRF).
async function login(mail: string, pass: string): Promise<APIRequestContext> {
  const anon = await pwRequest.newContext({ baseURL })
  const res = await anon.post('/api/users/login', { data: { email: mail, password: pass } })
  expect(res.status(), await res.text()).toBe(200)
  const { token } = await res.json()
  await anon.dispose()
  return pwRequest.newContext({ baseURL, extraHTTPHeaders: { Authorization: `JWT ${token}` } })
}
const roleId = async (name: string) => (await (await admin.get(`/api/roles?where[name][equals]=${name}`)).json()).docs[0].id

test.beforeAll(async ({}, info) => {
  baseURL = info.project.use.baseURL!
  admin = await login(email!, password!)
})
test.afterAll(async () => {
  // Прибираємо тестових користувачів і ролі (записи аудиту про це лишаються — так і має бути)
  const users = await (await admin.get(`/api/users?where[email][contains]=${stamp}&limit=20`)).json()
  for (const u of users.docs) await admin.delete(`/api/users/${u.id}`)
  const roles = await (await admin.get(`/api/roles?where[name][contains]=${stamp}&limit=20`)).json()
  for (const r of roles.docs) await admin.delete(`/api/roles/${r.id}`)
  await admin.dispose()
})

test('анонімний користувач не може писати і не бачить службових колекцій', async ({ request }) => {
  expect((await request.post('/api/measures', { data: { title: 'x' } })).status()).toBe(403)
  expect((await request.delete('/api/chapters/1')).status()).toBe(403)
  for (const slug of ['users', 'roles', 'audit-log', 'sync-runs']) expect((await request.get(`/api/${slug}`)).status(), slug).toBe(403)
  expect((await request.get('/api/audit-log/export')).status()).toBe(403)
  expect((await request.post('/api/sync-runs/run')).status()).toBe(403)
})

test('аналітик: лише читання та експорт', async () => {
  const mail = `analyst-${stamp}@example.com`
  const pass = tempPassword()
  const created = await admin.post('/api/users', { data: { email: mail, password: pass, role: await roleId('analyst') } })
  expect(created.status(), await created.text()).toBe(201)
  const analyst = await login(mail, pass)

  expect((await analyst.get('/api/measures?limit=1')).status()).toBe(200)
  expect((await analyst.get('/api/audit-log?limit=1')).status()).toBe(200)
  const csv = await analyst.get('/api/audit-log/export')
  expect(csv.status()).toBe(200)
  expect(csv.headers()['content-type']).toContain('text/csv')
  expect(await csv.text()).toContain('at,userEmail,userId,action,collection,docId,before,after')

  const m = (await (await analyst.get('/api/measures?limit=1')).json()).docs[0]
  expect((await analyst.patch(`/api/measures/${m.id}`, { data: { status: 'done' } })).status()).toBe(403)
  expect((await analyst.post('/api/news', { data: { title: 'x', date: new Date().toISOString() } })).status()).toBe(403)
  expect((await analyst.delete(`/api/measures/${m.id}`)).status()).toBe(403)
  expect((await analyst.get('/api/roles')).status()).toBe(403)
  expect((await analyst.post('/api/sync-runs/run')).status()).toBe(403)
  // Бачить лише власний запис користувача і не може підвищити собі роль
  const self = await (await analyst.get('/api/users')).json()
  expect(self.docs.map((u: any) => u.email)).toEqual([mail])
  await analyst.patch(`/api/users/${self.docs[0].id}`, { data: { role: await roleId('admin') } })
  expect((await analyst.get('/api/roles')).status()).toBe(403)
  await analyst.dispose()
})

test('права нової ролі задаються матрицею в даних і діють без зміни коду', async () => {
  const name = `news-only-${stamp}`
  const role = await admin.post('/api/roles', { data: { name, permissions: { news: { read: true, write: true } } } })
  expect(role.status(), await role.text()).toBe(201)
  const id = (await role.json()).doc.id
  const mail = `newsonly-${stamp}@example.com`
  const pass = tempPassword()
  await admin.post('/api/users', { data: { email: mail, password: pass, role: id } })
  const user = await login(mail, pass)

  const slug = `test-${stamp}`
  const post = await user.post('/api/news', { data: { title: 'Тестова новина', slug, date: new Date().toISOString(), _status: 'draft' } })
  expect(post.status(), await post.text()).toBe(201)
  const newsId = (await post.json()).doc.id
  expect((await user.delete(`/api/news/${newsId}`)).status()).toBe(403) // права delete немає
  expect((await user.post('/api/pages', { data: { title: 'x', slug: `p-${stamp}` } })).status()).toBe(403)

  // Адміністратор змінює матрицю в UI ролей → права змінюються одразу
  await admin.patch(`/api/roles/${id}`, { data: { permissions: { news: { read: true, write: true, delete: true } } } })
  expect((await user.delete(`/api/news/${newsId}`)).status()).toBe(200)
  await user.dispose()
})

test('журнал аудиту фіксує «до/після» і не змінюється навіть адміністратором', async () => {
  const m = (await (await admin.get('/api/measures?limit=1&sort=-externalId')).json()).docs[0]
  const before = m.notes
  await admin.patch(`/api/measures/${m.id}`, { data: { notes: `Аудит-тест ${stamp}` } })
  const log = await (await admin.get(`/api/audit-log?where[docId][equals]=${m.id}&where[collectionSlug][equals]=measures&sort=-at&limit=1`)).json()
  const entry = log.docs[0]
  expect(entry.action).toBe('update')
  expect(entry.userEmail).toBe(email)
  expect(entry.before.notes).toBe(before)
  expect(entry.after.notes).toBe(`Аудит-тест ${stamp}`)
  await admin.patch(`/api/measures/${m.id}`, { data: { notes: before } })

  expect((await admin.patch(`/api/audit-log/${entry.id}`, { data: { userEmail: 'hacker@example.com' } })).status()).toBe(403)
  expect((await admin.delete(`/api/audit-log/${entry.id}`)).status()).toBe(403)
  expect((await admin.post('/api/audit-log', { data: { action: 'create', collectionSlug: 'x', docId: '1', at: new Date().toISOString() } })).status()).toBe(403)
  const again = await (await admin.get(`/api/audit-log/${entry.id}`)).json()
  expect(again.userEmail).toBe(email)
  // Паролі та хеші в журнал не потрапляють
  const users = await (await admin.get('/api/audit-log?where[collectionSlug][equals]=users&limit=50')).json()
  for (const d of users.docs) expect(JSON.stringify(d)).not.toMatch(/"(hash|salt|password)"/)
})

test('останнього адміністратора не можна видалити чи позбавити ролі', async () => {
  const me = (await (await admin.get('/api/users/me')).json()).user
  const admins = await (await admin.get(`/api/users?where[role][equals]=${await roleId('admin')}`)).json()
  test.skip(admins.totalDocs !== 1, 'у базі більше одного адміністратора')
  expect((await admin.delete(`/api/users/${me.id}`)).status()).toBe(400)
  expect((await admin.patch(`/api/users/${me.id}`, { data: { role: await roleId('analyst') } })).status()).toBe(400)
  expect((await admin.delete(`/api/roles/${await roleId('admin')}`)).status()).toBe(400)
})

test('повторний імпорт не створює дублікатів; запуск видно в syncRuns', async () => {
  const count = async (slug: string) => (await (await admin.get(`/api/${slug}?limit=1&depth=0`)).json()).totalDocs
  const before = { measures: await count('measures'), benchmarks: await count('benchmarks'), updates: await count('status-updates'), runs: await count('sync-runs') }
  const run = await admin.post('/api/sync-runs/run')
  expect(run.status(), await run.text()).toBe(200)
  const result = await run.json()
  expect(result).toMatchObject({ created: 0, skipped: 0, trigger: 'manual' })
  expect(result.errors).toEqual([])
  expect(await count('measures')).toBe(before.measures)
  expect(await count('benchmarks')).toBe(before.benchmarks)
  expect(await count('status-updates')).toBe(before.updates)
  expect(await count('sync-runs')).toBe(before.runs + 1)
})

test('зміна статусу заходу автоматично створює запис в історії', async ({ page }) => {
  const m = (await (await admin.get('/api/measures?where[status][equals]=not_started&limit=1')).json()).docs[0]
  const before = (await (await admin.get(`/api/status-updates?where[measure][equals]=${m.id}`)).json()).totalDocs
  await admin.patch(`/api/measures/${m.id}`, { data: { status: 'in_progress' } })
  const after = await (await admin.get(`/api/status-updates?where[measure][equals]=${m.id}&sort=-date`)).json()
  expect(after.totalDocs).toBe(before + 1)
  expect(after.docs[0]).toMatchObject({ fromStatus: 'not_started', toStatus: 'in_progress' })
  // Публічна сторінка оновлюється одразу (кеш скидається хуком)
  await page.goto(`/zakhid/${m.id}`)
  await expect(page.locator('section[aria-labelledby="history-title"] ol > li')).toHaveCount(before + 1)
  // Повертаємо як було: наступний імпорт відновить статус із джерела
  await admin.post('/api/sync-runs/run')
})

test('панель адміністратора: вхід і редактор матриці прав', async ({ page }) => {
  await page.goto('/admin')
  await page.locator('input[name="email"]').fill(email!)
  await page.locator('input[name="password"]').fill(password!)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/admin\/?$/)
  await page.goto(`/admin/collections/roles/${await roleId('editor')}`)
  const matrix = page.getByRole('table', { name: 'Права доступу до колекцій' })
  await expect(matrix).toBeVisible()
  // Рядки матриці будуються з конфігурації: усі колекції, включно зі службовими
  for (const slug of ['chapters', 'measures', 'news', 'users', 'audit-log', 'sync-runs', 'roles']) await expect(matrix.getByText(slug, { exact: true })).toBeVisible()
  await expect(matrix.getByRole('checkbox', { name: 'Заходи: Запис' })).toBeChecked()
  await expect(matrix.getByRole('checkbox', { name: 'Користувачі: Читання' })).not.toBeChecked()
  await page.goto('/admin/collections/sync-runs')
  await expect(page.getByRole('button', { name: 'Синхронізувати' })).toBeVisible()
})
