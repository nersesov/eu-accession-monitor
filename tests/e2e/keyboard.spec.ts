// Клавіатурна доступність: skip link, акордеон, фільтри зі станом в URL.
import { expect, test } from '@playwright/test'

test('skip link — перший у порядку табуляції і переводить фокус до вмісту', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Перейти до вмісту' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('акордеон керується з клавіатури (Enter, Space, стрілки, Home/End)', async ({ page }) => {
  await page.goto('/glava-23/sudova-reforma')
  const headers = page.locator('h3 > button[aria-controls]')
  await expect(headers).toHaveCount(2)
  const first = headers.nth(0)
  const second = headers.nth(1)

  // Перший орієнтир розгорнуто за замовчуванням, другий згорнуто
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await expect(second).toHaveAttribute('aria-expanded', 'false')
  const secondPanel = page.locator(`[id="${await second.getAttribute('aria-controls')}"]`)
  await expect(secondPanel).toBeHidden()

  await first.focus()
  await page.keyboard.press('ArrowDown')
  await expect(second).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(second).toHaveAttribute('aria-expanded', 'true')
  await expect(secondPanel).toBeVisible()
  await expect(secondPanel).toHaveAttribute('role', 'region')
  await expect(secondPanel).toHaveAttribute('aria-labelledby', (await second.getAttribute('id'))!)

  await page.keyboard.press('Space')
  await expect(second).toHaveAttribute('aria-expanded', 'false')
  await expect(secondPanel).toBeHidden()

  await page.keyboard.press('ArrowDown') // з останнього — на перший
  await expect(first).toBeFocused()
  await page.keyboard.press('End')
  await expect(second).toBeFocused()
  await page.keyboard.press('Home')
  await expect(first).toBeFocused()

  // Посилання всередині розгорнутої панелі досяжні табуляцією, у згорнутій — ні
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveAttribute('href', /\/zakhid\/\d+/)
})

test('фільтри працюють із клавіатури, стан зберігається в URL', async ({ page }) => {
  await page.goto('/glava-23/sudova-reforma')
  const status = page.getByLabel('Статус')
  await status.focus()
  await status.selectOption('done')
  await expect(page).toHaveURL(/\?status=done$/)
  await expect(page.getByRole('status')).toContainText('Показано 2 заходи із 6')
  // Статус на картках: текст, а не лише колір
  const badges = page.locator('div[role="region"]:visible li').getByText('Виконано', { exact: true })
  await expect(badges).toHaveCount(2)

  await page.getByLabel('Відповідальний орган').selectOption({ label: 'Вища рада правосуддя' })
  await expect(page).toHaveURL(/status=done/)
  await expect(page).toHaveURL(/body=/)
  await expect(page.getByRole('status')).toContainText('Показано 1 захід із 6')

  // Стан відновлюється з URL після перезавантаження
  await page.reload()
  await expect(page.getByLabel('Статус')).toHaveValue('done')
  await expect(page.getByRole('status')).toContainText('Показано 1 захід із 6')

  await page.getByRole('button', { name: 'Скинути фільтри' }).click()
  await expect(page).toHaveURL(/\/glava-23\/sudova-reforma$/)
  await expect(page.getByRole('status')).toContainText('Показано 6 заходів із 6')
})

test('фільтр без результатів показує пояснення', async ({ page }) => {
  await page.goto('/glava-23/sudova-reforma?status=not_started&body=' + encodeURIComponent('Вища рада правосуддя'))
  await expect(page.getByText('За обраними фільтрами заходів немає')).toBeVisible()
})

test('некоректні параметри фільтрів ігноруються', async ({ page }) => {
  await page.goto('/glava-23/sudova-reforma?status=%3Cscript%3E&body=nope')
  await expect(page.getByRole('status')).toContainText('Показано 6 заходів із 6')
})
