import { defineConfig, devices } from '@playwright/test'

const PORT = 4174
const BASE_URL = `http://localhost:${PORT}/winter-arc/`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE_URL,
    timezoneId: 'America/New_York',
    locale: 'en-US',
    // Workbox caching and autoUpdate reloads would interfere with clock control and seeding.
    // The PWA spec opts back in with test.use({ serviceWorkers: 'allow' }).
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'iphone-17-pro',
      use: {
        ...devices['iPhone 15 Pro'],
        // iPhone 17 Pro CSS viewport.
        viewport: { width: 402, height: 874 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
