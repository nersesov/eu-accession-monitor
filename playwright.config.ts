import { defineConfig, devices } from '@playwright/test'

// Тести запускаються проти вже запущеного контейнера застосунку (BASE_URL).
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    // Анімації вимкнено, щоб axe не аналізував проміжні кадри
    contextOptions: { reducedMotion: 'reduce' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Публічна частина додатково перевіряється у Firefox і WebKit (рушій Safari).
    // Тести адмінки змінюють дані, тому виконуються лише в одному браузері.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /admin\.spec\.ts/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /admin\.spec\.ts/ },
  ],
})
