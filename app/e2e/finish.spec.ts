import { addDays } from '../src/engine/dates'
import { summarize } from '../src/engine/rules'
import { test, expect, at, DAY1, TASKS, makeState, order, readState, seed, travelTo } from './helpers'

const DAY60 = addDays(DAY1, 59)
const DAY61 = addDays(DAY1, 60)
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

test('full arc, 60/60: Flawless and Commander', async ({ page }) => {
  await seed(page, makeState({ completeDays: range(1, 60), celebrateAll: true }), at(DAY61, '13:00'))
  await expect(page.getByRole('heading', { name: 'Flawless. The Pole, unbroken.' })).toBeVisible()
  await expect(page.getByText('Sixty of sixty')).toBeVisible()
  await expect(page.getByText('Commander', { exact: true })).toBeVisible()
  await expect(page.getByText(/^Grade X of X · \d+ medals$/)).toBeVisible()
  // No more orders to keep.
  await expect(page.getByRole('button', { name: new RegExp(`^${TASKS[0]}`) })).toHaveCount(0)

  // Route and Ledger still work on a finished arc.
  await page.getByRole('button', { name: 'Route' }).click()
  await expect(page.getByRole('button', { name: /^Camp \d+: Camp made$/ })).toHaveCount(60)
  await page.getByRole('button', { name: 'Ledger' }).click()
  await expect(page.getByRole('button', { name: 'Flawless, earned' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'The Pole, earned' })).toBeVisible()
  await expect(page.getByText('Highest rank attained')).toBeVisible()

  // Archive → back to planning a new expedition.
  await page.getByRole('button', { name: 'Log' }).click()
  await page.getByRole('button', { name: 'Archive & plan a new expedition' }).click()
  // The install nudge is only for the very first expedition; planning the next one goes straight to onboarding.
  await expect(page.getByRole('heading', { name: 'Prepare the expedition' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue in Safari anyway' })).toHaveCount(0)
  await expect.poll(async () => {
    const s = await readState(page)
    return [s?.activeArcId, s?.arcs[0]?.endReason]
  }).toEqual([null, 'finished'])
})

test('full arc with misses, 54 complete: You reached the Pole', async ({ page }) => {
  const state = makeState({ completeDays: range(1, 54), celebrateAll: true })
  await seed(page, state, at(DAY61, '13:00'))
  const expected = summarize(state, state.arcs[0], at(DAY61, '13:00'))
  expect(expected.outcome).toBe('pole')
  await expect(page.getByRole('heading', { name: 'You reached the Pole.' })).toBeVisible()
  await expect(page.getByText('Expedition complete')).toBeVisible()
  await expect(page.getByText(expected.rank.title, { exact: true })).toBeVisible()
  await expect(page.getByText('camps made')).toBeVisible()
  await page.getByRole('button', { name: 'Route' }).click()
  await expect(page.getByRole('button', { name: /^Camp \d+: Camp made$/ })).toHaveCount(54)
  await expect(page.getByRole('button', { name: /^Camp \d+: Blizzard · cache spent$/ })).toHaveCount(2)
  await expect(page.getByRole('button', { name: /^Camp \d+: Blizzard · march lost$/ })).toHaveCount(4)
})

test('day-61 morning: the final camp is still open and completing it finishes the arc', async ({ page }) => {
  await seed(page, makeState({ completeDays: range(1, 59), celebrateAll: true }), at(DAY61, '09:00'))
  await expect(page.getByText('The final camp')).toBeVisible()
  await expect(page.getByText('Camp 60', { exact: true })).toBeVisible()
  await expect(page.getByText('Camp 60 stays open until 12:00. Finish it to keep your streak and caches.')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Which day' })).toHaveCount(0)
  await expect(page.getByLabel('0 of 5 kept')).toBeVisible()

  for (const t of TASKS) {
    await expect(order(page, t)).toBeEnabled()
    await order(page, t).click()
  }
  const dlg = page.getByRole('dialog', { name: 'Camp 60 made' })
  await expect(dlg).toBeVisible()
  await dlg.getByRole('button', { name: 'Rest until dawn' }).click()
  await expect(page.getByRole('heading', { name: 'Flawless. The Pole, unbroken.' })).toBeVisible()
  await expect(page.getByText('Commander', { exact: true })).toBeVisible()
  await expect.poll(async () => Object.keys((await readState(page))?.arcs[0].completions[DAY60] ?? {}).length).toBe(5)
})

test('day-61 morning left alone: at noon the final camp is shielded and the arc finishes', async ({ page }) => {
  await seed(page, makeState({ completeDays: range(1, 59), celebrateAll: true }), at(DAY61, '11:30'))
  await expect(page.getByText('The final camp')).toBeVisible()
  await travelTo(page, at(DAY61, '12:01'))
  await expect(page.getByRole('heading', { name: 'You reached the Pole.' })).toBeVisible()
})
