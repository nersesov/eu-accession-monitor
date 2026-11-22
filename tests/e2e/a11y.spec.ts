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

// Масштаб сторінки: при ширині вікна 1280 px масштаб 200 % дає 640 CSS-пікселів, 400 % — 320 (WCAG 1.4.10).
for (const [width, label] of [[640, 'масштаб 200 %'], [360, 'мобільний екран'], [320, 'масштаб 400 %']] as const) {
  test(`${width} px (${label}): жоден шаблон не має горизонтальної прокрутки`, async ({ page, request }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: 740 })
    for (const tpl of await templates(request)) {
      for (const locale of ['uk', 'en'] as const) {
        await page.goto(withLocale(locale, tpl.path))
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${locale} ${tpl.name}`).toBeLessThanOrEqual(0)
      }
    }
  })
}

test('текст, збільшений до 200 %, не обрізається і не створює горизонтальної прокрутки (WCAG 1.4.4)', async ({ page, request }) => {
  test.setTimeout(120_000)
  for (const tpl of await templates(request)) {
    await page.goto(tpl.path)
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    const result = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
      // Елементи з текстом, який не вміщається у власний блок і при цьому обрізаний
      const clipped = [...document.querySelectorAll<HTMLElement>('main *, header *, footer *')].filter((el) => {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) return false
        const st = getComputedStyle(el)
        if (st.position === 'absolute' && el.clientWidth <= 1) return false // sr-only
        const hidden = st.overflowX === 'hidden' || st.overflowX === 'clip' || st.overflowY === 'hidden' || st.overflowY === 'clip'
        return hidden && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
      })
      return { overflow, clipped: clipped.map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80)) }
    })
    expect(result.overflow, tpl.name).toBeLessThanOrEqual(0)
    expect(result.clipped, tpl.name).toEqual([])
  }
})

test('режим примусових кольорів (forced-colors): статус і прогрес лишаються видимими', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'емуляція forced-colors доступна лише в Chromium')
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/glava-23/sudova-reforma')
  await page.getByRole('button', { name: 'Розгорнути всі' }).click()
  await expect(page.locator('div[role="region"]:visible').getByText('Виконано', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('progressbar').first()).toBeVisible()
  // Текст підвалу має лишатися читабельним: у цьому режимі браузер сам підставляє системні кольори,
  // тому перевіряється фактичний (обчислений) контраст, а не кольори з CSS.
  const footer = page.getByRole('contentinfo')
  await footer.scrollIntoViewIfNeeded()
  const colors = await footer.locator('p').first().evaluate((el) => {
    const bg = (n: Element | null): string => {
      for (; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c
      }
      return 'rgb(255, 255, 255)'
    }
    return { color: getComputedStyle(el).color, background: bg(el) }
  })
  expect(colors.color).not.toBe(colors.background)
  if (process.env.FC_SHOT) await footer.screenshot({ path: process.env.FC_SHOT })
})
