// Двомовність, SEO, службові адреси, відкритий API.
import { expect, test } from '@playwright/test'
import { firstMeasureId } from './helpers'

test('перемикач мови зберігає поточну сторінку', async ({ page }) => {
  await page.goto('/glava-23/sudova-reforma?status=done')
  await page.getByRole('link', { name: 'English', exact: true }).click()
  await expect(page).toHaveURL(/\/en\/glava-23\/sudova-reforma\?status=done$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Judicial reform')
  await page.getByRole('link', { name: 'Українська', exact: true }).click()
  await expect(page).toHaveURL(/\/glava-23\/sudova-reforma\?status=done$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Судова реформа')
})

test('головна показує прогрес, глави, напрями, оновлення і новини', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /Загальний прогрес: \d+%/ })).toBeVisible()
  await expect(page.locator('#chapters-title ~ div article, section[aria-labelledby="chapters-title"] article')).toHaveCount(2)
  await expect(page.locator('section[aria-labelledby="directions-title"] article')).toHaveCount(5)
  await expect(page.locator('section[aria-labelledby="updates-title"] li.card')).toHaveCount(3)
  await expect(page.locator('section[aria-labelledby="news-title"] article')).toHaveCount(3)
})

test('картка заходу: поля, підтвердження, історія статусів', async ({ page, request }) => {
  await page.goto(`/zakhid/${await firstMeasureId(request)}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Затвердити єдині показники оцінювання доброчесності суддів')
  await expect(page.getByText('Вища рада правосуддя')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Історія статусів' })).toBeVisible()
  await expect(page.locator('section[aria-labelledby="history-title"] ol > li')).toHaveCount(1)
  await expect(page.locator('section[aria-labelledby="evidence-title"] a')).toHaveAttribute('rel', /noopener/)
})

test('SEO: canonical, hreflang uk/en, Open Graph', async ({ page }) => {
  await page.goto('/en/glava-23')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/glava-23$/)
  await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveAttribute('href', /[^n]\/glava-23$/)
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/en\/glava-23$/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Chapter 23/)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_GB')
  await expect(page).toHaveTitle(/Chapter 23.*Reform Monitor/)
})

test('sitemap містить обидві мови, robots посилається на sitemap', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('/glava-23/sudova-reforma</loc>')
  expect(sitemap).toContain('/en/glava-23/sudova-reforma</loc>')
  expect(sitemap).toContain('hreflang="en"')
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Sitemap:')
  expect(robots).toContain('Disallow: /admin')
})

test('404 і редиректи з колекції redirects', async ({ request, page }) => {
  expect((await request.get('/nema-takoi', { maxRedirects: 0 })).status()).toBe(404)
  const permanent = await request.get('/about', { maxRedirects: 0 })
  expect(permanent.status()).toBe(308)
  expect(permanent.headers().location).toMatch(/\/pro-proiekt$/)
  const temporary = await request.get('/en/news', { maxRedirects: 0 })
  expect(temporary.status()).toBe(307)
  expect(temporary.headers().location).toMatch(/\/en\/novyny$/)
  await page.goto('/nema-takoi')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Сторінку не знайдено')
})

test('заголовки безпеки', async ({ request }) => {
  const h = (await request.get('/')).headers()
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['x-frame-options']).toBe('DENY')
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['x-powered-by']).toBeUndefined()
})

test('healthz', async ({ request }) => {
  const res = await request.get('/api/healthz')
  expect(res.status()).toBe(200)
  expect(await res.json()).toMatchObject({ status: 'ok', db: 'ok' })
})

test.describe('відкритий API v1', () => {
  test('progress: частково виконаний захід = 0,5', async ({ request }) => {
    const res = await request.get('/api/v1/progress')
    expect(res.status()).toBe(200)
    expect(res.headers()['x-ratelimit-limit']).toBe('60')
    expect(res.headers()['access-control-allow-origin']).toBe('*')
    const body = await res.json()
    expect(body.overall.total).toBeGreaterThanOrEqual(30)
    expect(body.chapters).toHaveLength(2)
    expect(body.directions).toHaveLength(5)
    const all = (await (await request.get('/api/v1/measures')).json()).data as { status: string }[]
    const score = all.reduce((s, m) => s + (m.status === 'done' ? 1 : m.status === 'partial' ? 0.5 : 0), 0)
    expect(body.overall.score).toBe(score)
    expect(body.overall.percent).toBe(Math.round((score / all.length) * 100))
  })

  test('measures: фільтри та валідація', async ({ request }) => {
    const done = await (await request.get('/api/v1/measures?status=done&direction=sudova-reforma&locale=en')).json()
    expect(done.total).toBe(2)
    expect(done.data.every((m: any) => m.status === 'done' && m.direction === 'sudova-reforma')).toBe(true)
    expect(done.data[0].title).toMatch(/[A-Za-z]/)
    const overdue = await (await request.get('/api/v1/measures?status=overdue')).json()
    expect(overdue.data.every((m: any) => m.displayStatus === 'overdue' && m.status !== 'done')).toBe(true)
    expect((await request.get('/api/v1/measures?status=bad')).status()).toBe(400)
    expect((await request.get('/api/v1/measures?direction=nope')).status()).toBe(400)
    expect((await request.get('/api/v1/progress?locale=de')).status()).toBe(400)
  })

  test('directions/{slug}, chapters, updates?since, openapi.json', async ({ request }) => {
    const d = await (await request.get('/api/v1/directions/sudova-reforma')).json()
    expect(d.benchmarks).toHaveLength(2)
    expect(d.benchmarks[0].measures).toHaveLength(3)
    expect((await request.get('/api/v1/directions/nope')).status()).toBe(404)
    expect((await (await request.get('/api/v1/chapters')).json()).data).toHaveLength(2)
    const all = await (await request.get('/api/v1/updates')).json()
    const recent = await (await request.get('/api/v1/updates?since=2026-10-01')).json()
    expect(recent.total).toBeGreaterThan(0)
    expect(recent.total).toBeLessThan(all.total)
    expect(recent.data.every((u: any) => u.date >= '2026-10-01')).toBe(true)
    expect((await request.get('/api/v1/updates?since=abc')).status()).toBe(400)
    const spec = await (await request.get('/api/v1/openapi.json')).json()
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toEqual(['/progress', '/chapters', '/directions/{slug}', '/measures', '/updates'])
  })
})
