import { test, expect } from './helpers'

test.use({ serviceWorkers: 'allow' })

test('PWA: manifest, icons, apple-touch-icon and service worker', async ({ page, request, baseURL }) => {
  await page.goto('./')

  // Manifest is linked and served with the right scope.
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('/winter-arc/manifest.webmanifest')
  const manifestUrl = new URL(manifestHref!, baseURL).toString()
  const res = await request.get(manifestUrl)
  expect(res.status()).toBe(200)
  const manifest = await res.json()
  expect(manifest).toMatchObject({ name: 'Winter Arc', start_url: '/winter-arc/', scope: '/winter-arc/', display: 'standalone' })

  const sizes = (manifest.icons as { src: string; sizes: string }[]).map((i) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  for (const icon of manifest.icons as { src: string; type: string }[]) {
    const r = await request.get(new URL(icon.src, manifestUrl).toString())
    expect(r.status(), icon.src).toBe(200)
    expect(r.headers()['content-type']).toContain('image/png')
  }

  // apple-touch-icon (iOS home screen) resolves under the base path.
  const touchHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  expect(touchHref).toBe('/winter-arc/apple-touch-icon.png')
  const touch = await request.get(new URL(touchHref!, baseURL).toString())
  expect(touch.status()).toBe(200)
  expect(touch.headers()['content-type']).toContain('image/png')

  // iOS standalone meta.
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')

  // Service worker registers and becomes ready, scoped to the app.
  const scope = await page.evaluate(async () => {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('serviceWorker.ready timed out')), 15_000)),
    ])
    return reg.scope
  })
  expect(scope).toBe(new URL('/winter-arc/', baseURL).toString())
})

test('PWA: works offline once the service worker has cached the app', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Install before you depart')).toBeVisible({ timeout: 10_000 })
  expect(await page.evaluate(() => document.fonts.check('600 40px "Fraunces Variable"'))).toBe(true)
  await page.getByRole('button', { name: 'Continue in Safari anyway' }).click()
  await expect(page.getByRole('heading', { name: 'Prepare the expedition' })).toBeVisible()
})
