// WCAG 2.1 AA: axe-core на всіх шаблонах в обох мовах. Будь-яке порушення блокує CI.
import { expect, test } from '@playwright/test'
import { DISCLAIMER, expectNoAxeViolations, templates, withLocale } from './helpers'

for (const locale of ['uk', 'en'] as const) {
  test.describe(`axe · ${locale}`, () => {
    test('усі шаблони без порушень', async ({ page, request }) => {
      test.setTimeout(120_000)
      for (const tpl of await templates(request)) {
        await test.step(tpl.name, async () => {
          await page.goto(withLocale(locale, tpl.path))
          await expect(page.locator('h1')).toHaveCount(1)
          await expect(page.locator('html')).toHaveAttribute('lang', locale)
          // Дисклеймер — на кожній сторінці
          await expect(page.getByRole('contentinfo')).toContainText(DISCLAIMER[locale])
          await expectNoAxeViolations(page)
        })
      }
    })

    test('напрям із розгорнутими орієнтирами без порушень', async ({ page }) => {
      await page.goto(withLocale(locale, '/glava-23/sudova-reforma'))
      await page.getByRole('button', { name: locale === 'uk' ? 'Розгорнути всі' : 'Expand all' }).click()
      await expect(page.locator('div[role="region"]:visible')).toHaveCount(2)
      await expectNoAxeViolations(page)
    })

    test('мобільне меню (360 px) без порушень', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(withLocale(locale, '/'))
      await page.getByRole('button', { name: locale === 'uk' ? 'Меню' : 'Menu' }).click()
      await expect(page.getByRole('navigation', { name: locale === 'uk' ? 'Головна навігація' : 'Main navigation' })).toBeVisible()
      await expectNoAxeViolations(page)
    })
  })
}

test('360 px: жоден шаблон не має горизонтальної прокрутки', async ({ page, request }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 360, height: 740 })
  for (const tpl of await templates(request)) {
    for (const locale of ['uk', 'en'] as const) {
      await page.goto(withLocale(locale, tpl.path))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${locale} ${tpl.name}`).toBeLessThanOrEqual(0)
    }
  }
})
