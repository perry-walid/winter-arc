import { test, expect, at, DAY1, dismissBoot, hold, open, order, readState } from './helpers'

test.describe('fresh install', () => {
  test('gate → onboarding validation → seal → Camp 01', async ({ page }) => {
    await open(page, at(DAY1, '09:00'))

    // iPhone Safari (not standalone): the install gate comes first.
    await expect(page.getByText('Install before you depart')).toBeVisible()
    await page.getByRole('button', { name: 'Continue in Safari anyway' }).click()

    // Article I
    await expect(page.getByRole('heading', { name: 'Prepare the expedition' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Today', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Choose the daily orders' }).click()

    // Article II: validation
    await expect(page.getByRole('heading', { name: 'The daily orders' })).toBeVisible()
    const cont = page.getByRole('button', { name: 'Continue to signing' })
    await expect(cont).toBeDisabled()
    await expect(page.getByText('Choose 3 more')).toBeVisible()

    const pick = (label: string) => page.getByRole('button', { name: label, exact: true })
    await pick('Read 10 pages').click()
    await pick('No sugar').click()
    await expect(page.getByText('Choose 1 more')).toBeVisible()
    await expect(cont).toBeDisabled()

    // Toggle off and on again.
    await pick('No sugar').click()
    await expect(pick('No sugar')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Choose 2 more')).toBeVisible()
    await pick('No sugar').click()

    // Custom task add / remove.
    const custom = page.getByLabel('Custom order')
    const add = page.getByRole('button', { name: 'Add', exact: true })
    await expect(add).toBeDisabled()
    await custom.fill('Stretch 15 minutes')
    await add.click()
    await expect(pick('Stretch 15 minutes')).toHaveAttribute('aria-pressed', 'true')
    await expect(custom).toHaveValue('')
    await expect(page.getByText('3 orders entered', { exact: true })).toBeVisible()
    await expect(cont).toBeEnabled()

    // Duplicate (case-insensitive) is ignored.
    await custom.fill('stretch 15 MINUTES')
    await add.click()
    await expect(page.getByText('3 orders entered', { exact: true })).toBeVisible()
    await custom.fill('')

    await page.getByRole('button', { name: 'Remove Stretch 15 minutes' }).click()
    await expect(pick('Stretch 15 minutes')).toHaveCount(0)
    await expect(page.getByText('Choose 1 more')).toBeVisible()
    await expect(cont).toBeDisabled()

    // Fill up to the maximum of 8.
    for (const t of ['Train for 60 minutes', 'Cold shower', 'No social media', 'Walk 10,000 steps', 'Journal for 5 minutes']) {
      await pick(t).click()
    }
    await custom.fill('Stretch 15 minutes')
    await add.click()
    await expect(page.getByText('8 orders entered (maximum)')).toBeVisible()
    // A ninth preset can't be added, and the Add button is disabled.
    await pick('Meditate 10 minutes').click()
    await expect(pick('Meditate 10 minutes')).toHaveAttribute('aria-pressed', 'false')
    await custom.fill('One more')
    await expect(add).toBeDisabled()
    await custom.fill('')

    // Trim back to five.
    for (const t of ['No social media', 'Walk 10,000 steps', 'Journal for 5 minutes']) await pick(t).click()
    await page.getByRole('button', { name: 'Remove Stretch 15 minutes' }).click()
    await expect(page.getByText('4 orders entered', { exact: true })).toBeVisible()
    await pick('Journal for 5 minutes').click()
    await expect(page.getByText('5 orders entered', { exact: true })).toBeVisible()

    await cont.click()

    // Article III: sign with the wax seal.
    await expect(page.getByRole('heading', { name: 'Winter Arc' })).toBeVisible()
    for (const t of ['Read 10 pages', 'No sugar', 'Train for 60 minutes', 'Cold shower', 'Journal for 5 minutes']) {
      await expect(page.getByRole('listitem').filter({ hasText: t })).toBeVisible()
    }
    // A short press does not seal.
    await hold(page, 'Hold to seal the articles', 500)
    await expect(page.getByRole('button', { name: 'Hold to seal the articles' })).toBeVisible()
    await hold(page, 'Hold to seal the articles', 1600)

    await expect(page.getByText('Articles sealed. Godspeed.')).toBeVisible()
    await expect(page.getByText('Camp 01', { exact: true })).toBeVisible()
    await expect(page.getByText('Today’s orders')).toBeVisible()
    await expect(page.getByLabel('0 of 5 kept')).toBeVisible()
    await expect(page.getByLabel('0 unbroken marches')).toBeVisible()
    await expect(page.getByLabel('Supply caches: 1 of 2')).toBeVisible()
    await expect(order(page, 'Read 10 pages')).toBeEnabled()

    // Persisted.
    await expect.poll(async () => (await readState(page))?.arcs[0]?.tasks.length).toBe(5)
    await page.reload()
    await dismissBoot(page)
    // The gate does not return once an arc exists.
    await expect(page.getByText('Install before you depart')).toHaveCount(0)
    await expect(page.getByText('Camp 01', { exact: true })).toBeVisible()
  })
})

test('scheduled arc: departs tomorrow, tasks locked', async ({ page }) => {
  await open(page, at(DAY1, '10:00'))
  await page.getByRole('button', { name: 'Continue in Safari anyway' }).click()
  await page.getByRole('button', { name: 'Tomorrow' }).click()
  await expect(page.getByRole('button', { name: 'Tomorrow' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Choose the daily orders' }).click()
  for (const t of ['Read 10 pages', 'No sugar', 'Cold shower']) await page.getByRole('button', { name: t, exact: true }).click()
  await page.getByRole('button', { name: 'Continue to signing' }).click()
  await hold(page, 'Hold to seal the articles')

  await expect(page.getByText('Departs in 1d')).toBeVisible()
  await expect(page.getByText('Your orders')).toBeVisible()
  await expect(page.getByText(/The articles are sealed\. Your first march begins/)).toBeVisible()
  for (const t of ['Read 10 pages', 'No sugar', 'Cold shower']) await expect(order(page, t)).toBeDisabled()

  // Departure day arrives: Camp 01, tasks open.
  await page.clock.fastForward('24:00:00')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Camp 01', { exact: true })).toBeVisible()
  await expect(order(page, 'Read 10 pages')).toBeEnabled()
})
