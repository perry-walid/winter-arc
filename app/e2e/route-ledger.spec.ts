import { addDays } from '../src/engine/dates'
import { test, expect, at, DAY1, TASKS, dismissBoot, makeState, readState, seed } from './helpers'

const DAY5 = addDays(DAY1, 4)

test('Route renders 60 camps; a past camp opens its day sheet', async ({ page }) => {
  await seed(page, makeState({ completeDays: [1, 2], partial: { 3: 2 }, celebrateAll: true }), at(DAY5, '14:00'))
  await page.getByRole('button', { name: 'Route' }).click()
  await expect(page.getByRole('button', { name: 'Route' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Route to the Pole' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Route map: camp 5 of 60' })).toBeVisible()

  const camps = page.getByRole('button', { name: /^Camp \d+: / })
  await expect(camps).toHaveCount(60)
  await expect(page.getByRole('button', { name: 'Camp 1: Camp made' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Camp 3: Blizzard · cache spent' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Camp 4: Blizzard · march lost' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Camp 5: Today' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Camp \d+: Ahead$/ })).toHaveCount(55)

  // Future camps don't open.
  await page.getByRole('button', { name: 'Camp 30: Ahead' }).press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // A complete past camp shows its tasks with tick times.
  await page.getByRole('button', { name: 'Camp 2: Camp made' }).press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Camp 2', exact: true })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Camp 02', { exact: true })).toBeVisible()
  for (const t of TASKS) await expect(sheet.getByText(t, { exact: true })).toBeVisible()
  await expect(sheet.getByText(/^5\/5 orders kept · [\d.]+ mi marched/)).toBeVisible()
  await expect(sheet.getByText('20:00')).toBeVisible()
  await sheet.getByRole('button', { name: 'Close' }).click()
  await expect(sheet).toBeHidden()

  // The partial day shows what was kept.
  await page.getByRole('button', { name: 'Camp 3: Blizzard · cache spent' }).press('Enter')
  await expect(page.getByRole('dialog', { name: 'Camp 3', exact: true }).getByText(/^2\/5 orders kept/)).toBeVisible()
})

test('tapping each past camp marker opens that camp, not its neighbour', async ({ page }) => {
  const DAY20 = addDays(DAY1, 19)
  await seed(page, makeState({ completeDays: Array.from({ length: 19 }, (_, i) => i + 1), celebrateAll: true }), at(DAY20, '14:00'))
  await page.getByRole('button', { name: 'Route' }).click()
  const camps = page.getByRole('button', { name: /^Camp \d+: / })
  await expect(camps).toHaveCount(60)

  for (let n = 1; n <= 20; n++) {
    // Centre of the camp's marker (its first circle is the hit circle, concentric with the dot).
    const c = await page.getByRole('button', { name: new RegExp(`^Camp ${n}: `) }).evaluate((g) => {
      const r = g.querySelector('circle')!.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    })
    await page.touchscreen.tap(c.x, c.y)
    const sheet = page.getByRole('dialog', { name: /^Camp \d+$/ })
    await expect(sheet, `tap on camp ${n}`).toHaveAccessibleName(`Camp ${n}`)
    await sheet.getByRole('button', { name: 'Close' }).click()
    await expect(sheet).toBeHidden()
  }

  // A click without a pointer position (assistive tech) opens the camp it targets.
  await page.getByRole('button', { name: 'Camp 7: Camp made' }).evaluate((g) => g.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await expect(page.getByRole('dialog', { name: /^Camp \d+$/ })).toHaveAccessibleName('Camp 7')
  await page.getByRole('dialog', { name: 'Camp 7', exact: true }).getByRole('button', { name: 'Close' }).click()

  // Tapping a future camp does nothing; tapping the backdrop closes an open sheet.
  const c40 = await page.getByRole('button', { name: 'Camp 40: Ahead' }).evaluate((g) => {
    const r = g.querySelector('circle')!.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.touchscreen.tap(c40.x, c40.y)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Camp 3: Camp made' }).press('Enter')
  await expect(page.getByRole('dialog', { name: 'Camp 3', exact: true })).toBeVisible()
  await page.mouse.click(200, 80)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Ledger: rank, medals, medal sheet, settings and sound toggle', async ({ page }) => {
  await seed(page, makeState({ completeDays: [1, 2, 3, 4], celebrateAll: true, sound: true }), at(DAY5, '14:00'))
  await page.getByRole('button', { name: 'Ledger' }).click()
  await expect(page.getByRole('heading', { name: 'Service record' })).toBeVisible()
  // 4 perfect days = 650 XP (+ up to 200 from crits): Stoker (450) but short of Able Seaman (1200).
  await expect(page.getByText('Grade II of X', { exact: false })).toBeVisible()
  await expect(page.getByText('Stoker', { exact: true })).toBeVisible()

  // Medals: Articles Sealed + First Camp (+ possibly Fair Winds from a deterministic crit).
  const earned = page.getByRole('button', { name: /, earned$/ })
  const locked = page.getByRole('button', { name: /, locked$/ })
  const n = await earned.count()
  expect(n).toBeGreaterThanOrEqual(2)
  await expect(locked).toHaveCount(15 - n)
  await expect(page.getByText(`${n} of 15`, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'First Camp, earned' }).click()
  const medal = page.getByRole('dialog', { name: 'First Camp' })
  await expect(medal).toBeVisible()
  await expect(medal.getByText('Awarded at camp 1')).toBeVisible()
  await expect(medal.getByText('Made camp with every task done for the first time.')).toBeVisible()
  await medal.getByRole('button', { name: 'Close' }).click()
  await expect(medal).toBeHidden()

  await page.getByRole('button', { name: 'Flawless, locked' }).click()
  await expect(page.getByRole('dialog', { name: 'Flawless' }).getByText('Not yet awarded')).toBeVisible()
  await page.getByRole('dialog', { name: 'Flawless' }).getByRole('button', { name: 'Close' }).click()

  // Settings
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings).toBeVisible()
  const sound = settings.getByRole('switch', { name: 'Sound' })
  await expect(sound).toHaveAttribute('aria-checked', 'true')
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  await expect.poll(async () => (await readState(page))?.settings.sound).toBe(false)

  await page.reload()
  await dismissBoot(page)
  await page.getByRole('button', { name: 'Ledger' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('switch', { name: 'Sound' }).click()
  await expect.poll(async () => (await readState(page))?.settings.sound).toBe(true)
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden()
})
