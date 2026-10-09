import { test, expect, at, DAY1, TASKS, dismissBoot, makeState, order, persistedTicks, seed } from './helpers'

test('tick all → Camp made overlay once per day; ticks persist across reload', async ({ page }) => {
  await seed(page, makeState({}), at(DAY1, '18:00'))
  await expect(page.getByText('Camp 01', { exact: true })).toBeVisible()

  for (const t of TASKS.slice(0, 4)) {
    await order(page, t).click()
    await expect(order(page, t)).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await order(page, TASKS[4]).click()

  const dlg = page.getByRole('dialog', { name: 'Camp 1 made' })
  await expect(dlg).toBeVisible()
  await expect(dlg.getByText('Camp 01 made', { exact: true })).toBeVisible()
  await expect(dlg.getByText('Telegram', { exact: true })).toBeVisible()
  await expect(dlg.getByText(/CAMP 01 MADE STOP ALL FIVE ORDERS KEPT STOP/)).toBeVisible()
  await expect(dlg.getByText('Orders kept 5/5')).toBeVisible()
  await expect(dlg.getByText('Medal awarded')).toBeVisible()
  await expect(dlg.getByText('First Camp', { exact: true })).toBeVisible()
  await dlg.getByRole('button', { name: 'Rest until dawn' }).click()
  await expect(dlg).toBeHidden()

  await expect(page.getByLabel('5 of 5 kept')).toBeVisible()
  await expect(page.getByLabel('1 unbroken marches')).toBeVisible()
  await expect(page.getByText(/^Camp made\. [\d.]+ mi marched/)).toBeVisible()

  await expect.poll(() => persistedTicks(page, DAY1)).toBe(5)
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Overlay never auto-shows on load; boot splash then the Log.
  await dismissBoot(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const t of TASKS) await expect(order(page, t)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('5 of 5 kept')).toBeVisible()

  // Once per day: untick and re-tick → no second celebration.
  await order(page, TASKS[2]).click()
  await expect(page.getByLabel('4 of 5 kept')).toBeVisible()
  await order(page, TASKS[2]).click()
  await expect(page.getByLabel('5 of 5 kept')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('untick works and the partial counter is right', async ({ page }) => {
  await seed(page, makeState({}), at(DAY1, '10:00'))
  await expect(page.getByLabel('0 of 5 kept')).toBeVisible()
  await expect(page.getByText('The day is young. Light fails at 03:00.')).toBeVisible()

  for (const t of TASKS.slice(0, 4)) await order(page, t).click()
  await expect(page.getByLabel('4 of 5 kept')).toBeVisible()
  await expect(page.getByText('4/5', { exact: true })).toBeVisible()

  await order(page, TASKS[1]).click()
  await expect(order(page, TASKS[1])).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByLabel('3 of 5 kept')).toBeVisible()
  await expect(page.getByText('3/5', { exact: true })).toBeVisible()
  await expect(page.getByText('2 orders outstanding. Light fails at 03:00. Press on.')).toBeVisible()
  // The tick time is shown on ticked orders (10:00 local); unticked shows the mile reward.
  await expect(order(page, TASKS[0])).toContainText('10:00')
  await expect(order(page, TASKS[1])).toContainText('+2 mi')

  await expect.poll(() => persistedTicks(page, DAY1)).toBe(3)
  await page.reload()
  await dismissBoot(page)
  await expect(page.getByLabel('3 of 5 kept')).toBeVisible()
  await expect(order(page, TASKS[1])).toHaveAttribute('aria-pressed', 'false')
})
