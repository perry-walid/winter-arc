import { addDays } from '../src/engine/dates'
import { test, expect, at, DAY1, TASKS, makeState, order, seed, travelTo } from './helpers'

const DAY2 = addDays(DAY1, 1)
const DAY3 = addDays(DAY1, 2)

test('rollover: the day closes at 03:00, not midnight', async ({ page }) => {
  await seed(page, makeState({}), at(DAY1, '23:30'))
  for (const t of TASKS) await order(page, t).click()
  const dlg = page.getByRole('dialog', { name: 'Camp 1 made' })
  await expect(dlg).toBeVisible()
  // Finished at 23:30 → Night March.
  await expect(dlg.getByText('Night March', { exact: true })).toBeVisible()
  await dlg.getByRole('button', { name: 'Rest until dawn' }).click()

  // 02:30 next calendar date: still day 1.
  await travelTo(page, at(DAY2, '02:30'))
  await expect(page.getByText('Camp 01', { exact: true })).toBeVisible()
  await expect(page.getByLabel('5 of 5 kept')).toBeVisible()
  await expect(page.getByText('Today’s orders')).toBeVisible()

  // 03:05: day 2 begins with fresh orders.
  await travelTo(page, at(DAY2, '03:05'))
  await expect(page.getByText('Camp 02', { exact: true })).toBeVisible()
  await expect(page.getByLabel('0 of 5 kept')).toBeVisible()
  await expect(page.getByLabel('1 unbroken marches')).toBeVisible()
  for (const t of TASKS) await expect(order(page, t)).toHaveAttribute('aria-pressed', 'false')
})

test.describe('grace morning', () => {
  test('yesterday is editable until noon, then shielded by a cache', async ({ page }) => {
    await seed(page, makeState({ completeDays: [1], celebrateAll: true }), at(DAY3, '09:00'))
    await expect(page.getByText('Camp 03', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Supply caches: 1 of 2')).toBeVisible()

    const which = page.getByRole('group', { name: 'Which day' })
    await expect(which).toBeVisible()
    await expect(which.getByRole('button', { name: 'Today · Camp 03' })).toHaveAttribute('aria-pressed', 'true')
    await which.getByRole('button', { name: 'Yesterday · 5 open' }).click()

    await expect(page.getByText('Yesterday’s orders')).toBeVisible()
    await expect(page.getByText('Camp 02 stays open until 12:00. Finish it to keep your streak and caches.')).toBeVisible()
    await order(page, TASKS[0]).click()
    await order(page, TASKS[1]).click()
    await expect(page.getByLabel('2 of 5 kept')).toBeVisible()
    await expect(which.getByRole('button', { name: 'Yesterday · 3 open' })).toBeVisible()
    await expect(page.getByText('3 orders outstanding from yesterday.')).toBeVisible()

    // Today's orders are separate.
    await which.getByRole('button', { name: /^Today/ }).click()
    await expect(page.getByLabel('0 of 5 kept')).toBeVisible()

    // Noon passes: the grace window closes and a cache is spent.
    await travelTo(page, at(DAY3, '12:01'))
    await expect(which).toHaveCount(0)
    await expect(page.getByLabel('Supply caches: 0 of 2')).toBeVisible()
    // Streak survives (day 1 complete, day 2 shielded).
    await expect(page.getByLabel('1 unbroken marches')).toBeVisible()

    await page.getByRole('button', { name: 'Route' }).click()
    const camp2 = page.getByRole('button', { name: 'Camp 2: Blizzard · cache spent' })
    await expect(camp2).toBeVisible()
    await camp2.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Camp 2', exact: true })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText(/Blizzard · cache spent/)).toBeVisible()
    await expect(sheet.getByText(/^2\/5 orders kept/)).toBeVisible()
  })

  test('catching up yesterday completes it and keeps the cache', async ({ page }) => {
    await seed(page, makeState({ completeDays: [1], celebrateAll: true }), at(DAY3, '10:00'))
    await page.getByRole('button', { name: 'Yesterday · 5 open' }).click()
    for (const t of TASKS) await order(page, t).click()
    const dlg = page.getByRole('dialog', { name: 'Camp 2 made' })
    await expect(dlg).toBeVisible()
    await dlg.getByRole('button', { name: 'Rest until dawn' }).click()
    await expect(page.getByLabel('2 unbroken marches')).toBeVisible()

    await travelTo(page, at(DAY3, '12:01'))
    await expect(page.getByRole('group', { name: 'Which day' })).toHaveCount(0)
    await expect(page.getByLabel('Supply caches: 1 of 2')).toBeVisible()
    await page.getByRole('button', { name: 'Route' }).click()
    await expect(page.getByRole('button', { name: 'Camp 2: Camp made' })).toBeVisible()
  })
})

test('missed day with no caches left resets the streak', async ({ page }) => {
  // Days 1-3 complete, 4 missed (cache spent), 5 complete, 6 missed (no cache), today = day 7.
  const day7 = addDays(DAY1, 6)
  await seed(page, makeState({ completeDays: [1, 2, 3, 5], celebrateAll: true }), at(day7, '09:00'))
  // Before noon day 6 is still in grace: the streak stands at 4.
  await expect(page.getByText('Camp 07', { exact: true })).toBeVisible()
  await expect(page.getByLabel('4 unbroken marches')).toBeVisible()
  await expect(page.getByLabel('Supply caches: 0 of 2')).toBeVisible()

  await travelTo(page, at(day7, '12:01'))
  await expect(page.getByLabel('0 unbroken marches')).toBeVisible()
  await expect(page.getByLabel('Supply caches: 0 of 2')).toBeVisible()

  await page.getByRole('button', { name: 'Route' }).click()
  await expect(page.getByRole('button', { name: 'Camp 4: Blizzard · cache spent' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Camp 6: Blizzard · march lost' })).toBeVisible()
})
