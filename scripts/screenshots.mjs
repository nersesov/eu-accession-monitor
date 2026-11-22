// Знімки екрана для README: docker compose --profile test run --rm e2e node scripts/screenshots.mjs
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = 'docs/screenshots'
const shots = [
  { name: 'home', path: '/', width: 1280, fullPage: true },
  { name: 'direction', path: '/glava-23/sudova-reforma', width: 1280, fullPage: true },
  { name: 'direction-filtered', path: '/glava-23/antykoruptsiina-polityka?status=overdue', width: 1280, fullPage: true },
  { name: 'measure', path: '/zakhid/1', width: 1280, fullPage: true },
  { name: 'methodology', path: '/metodolohiia', width: 1280, fullPage: true },
  { name: 'news-item', path: '/novyny/vidkrytyi-api', width: 1280, fullPage: true },
  { name: 'api-docs', path: '/api-docs', width: 1280, fullPage: false },
  { name: 'home-en', path: '/en', width: 1280, fullPage: false },
  { name: 'home-mobile', path: '/', width: 360, fullPage: true },
  { name: 'direction-mobile', path: '/glava-23/sudova-reforma', width: 360, fullPage: true },
]

const browser = await chromium.launch()
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.width, height: 800 }, deviceScaleFactor: s.width < 500 ? 2 : 1 })
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200) // анімація кільця та підвантаження діаграми
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: s.fullPage })
  await page.close()
  console.log('✓', s.name)
}

// Адмінка: редактор матриці прав і журнал аудиту
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${BASE}/admin`)
  await page.locator('input[name="email"]').fill(process.env.ADMIN_EMAIL)
  await page.locator('input[name="password"]').fill(process.env.ADMIN_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/admin\/?$/)
  const roles = await (await page.request.get(`${BASE}/api/roles?where[name][equals]=editor`, { headers: { Origin: BASE } })).json()
  for (const [name, path] of [
    ['admin-dashboard', '/admin'],
    ['admin-role-matrix', `/admin/collections/roles/${roles.docs[0].id}`],
    ['admin-audit-log', '/admin/collections/audit-log'],
    ['admin-sync-runs', '/admin/collections/sync-runs'],
  ]) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${OUT}/${name}.png` })
    console.log('✓', name)
  }
}
await browser.close()
