import fs from 'node:fs'
import { addDays } from '../src/engine/dates'
import type { AppState } from '../src/engine/types'
import { test, expect, at, DAY1, TASKS, dismissBoot, makeState, order, readState, seed } from './helpers'

const DAY4 = addDays(DAY1, 3)

/** The parts of the state a backup must round-trip (lastBackupAt is stamped on export). */
const core = (s: AppState | undefined) => s && { activeArcId: s.activeArcId, arcs: s.arcs, settings: s.settings, celebrated: s.celebrated }

test('export downloads a backup; importing it restores the log', async ({ page }, testInfo) => {
  // Safari on iOS has the Web Share API; force the <a download> path used where it can't share files.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true })
  })
  await seed(page, makeState({ completeDays: [1, 2], partial: { 4: 2 }, celebrateAll: true, sound: true }), at(DAY4, '15:00'))
  await expect(page.getByLabel('2 of 5 kept')).toBeVisible()
  const before = await readState(page)

  await page.getByRole('button', { name: 'Ledger' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings.getByText('Last backup:')).toContainText('never')

  const [download] = await Promise.all([page.waitForEvent('download'), settings.getByRole('button', { name: 'Save backup' }).click()])
  expect(download.suggestedFilename()).toBe(`winter-arc-backup-${DAY4}.json`)
  const file = testInfo.outputPath('backup.json')
  await download.saveAs(file)
  const exported = JSON.parse(fs.readFileSync(file, 'utf8')) as AppState
  expect(core(exported)).toEqual(core(before))
  await expect(page.getByText('Backup saved')).toBeVisible()
  await expect(settings.getByText('Last backup:')).not.toContainText('never')
  await expect.poll(async () => (await readState(page))?.lastBackupAt ?? 0).toBeGreaterThanOrEqual(at(DAY4, '15:00').getTime())

  // Change the log after the backup: flip sound off and tick a third task.
  await settings.getByRole('switch', { name: 'Sound' }).click()
  await expect(settings.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false')
  await settings.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Log' }).click()
  await order(page, TASKS[2]).click()
  await expect(page.getByLabel('3 of 5 kept')).toBeVisible()
  await expect.poll(async () => core(await readState(page))).not.toEqual(core(before))

  // A file that isn't a backup is rejected with a message, state untouched.
  await page.getByRole('button', { name: 'Ledger' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await settings.getByLabel('Backup file').setInputFiles({ name: 'nope.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await expect(page.getByText(/doesn't look like a Winter Arc backup/)).toBeVisible()
  await expect(settings.getByRole('button', { name: 'Replace' })).toHaveCount(0)

  // Import the real backup: confirm → Replace.
  await settings.getByLabel('Backup file').setInputFiles(file)
  await expect(settings.getByText(/Replace your current log with this backup \(1 expedition\)\?/)).toBeVisible()
  // Cancel first, then do it for real.
  await settings.getByRole('button', { name: 'Cancel' }).click()
  await expect(settings.getByRole('button', { name: 'Replace' })).toHaveCount(0)
  await settings.getByLabel('Backup file').setInputFiles(file)
  await settings.getByRole('button', { name: 'Replace' }).click()

  await expect(page.getByText('Backup restored')).toBeVisible()
  await expect(settings).toBeHidden()
  await expect(page.getByRole('button', { name: 'Log' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel('2 of 5 kept')).toBeVisible()
  await expect(order(page, TASKS[2])).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => core(await readState(page))).toEqual(core(before))

  // And it survives a reload.
  await page.reload()
  await dismissBoot(page)
  await expect(page.getByLabel('2 of 5 kept')).toBeVisible()
  await page.getByRole('button', { name: 'Ledger' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'true')
})
