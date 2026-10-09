import { test as base, expect, type Page } from '@playwright/test'
import type { AppState, Arc, DateKey } from '../src/engine/types'
import { addDays } from '../src/engine/dates'

/**
 * Every test fails on an uncaught page error or a console error.
 * (Scenario 14 is enforced suite-wide through this fixture.)
 */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
      })
      await use(errors)
      expect(errors, 'page/console errors').toEqual([])
    },
    { auto: true },
  ],
})
export { expect }

/** All scenarios stay in EDT (UTC-4), clear of DST transitions. */
export const at = (dateKey: DateKey, hhmm: string) => new Date(`${dateKey}T${hhmm}:00-04:00`)

export const DAY1: DateKey = '2026-06-10'
export const TASKS = ['Train for 60 minutes', 'Read 10 pages', 'No sugar', 'Cold shower', 'Journal for 5 minutes']

/** Dismisses the boot splash. Taps are ignored until IndexedDB has loaded, so retry. */
export async function dismissBoot(page: Page) {
  const boot = page.getByRole('button', { name: 'Open the log' })
  await expect(async () => {
    if (await boot.isVisible()) await boot.click({ timeout: 1000 })
    await expect(boot).toBeHidden({ timeout: 500 })
  }).toPass({ timeout: 15_000 })
}

/** Installs the fake clock at `time` and opens the app. */
export async function open(page: Page, time: Date) {
  await page.clock.install({ time })
  await page.goto('./')
  await dismissBoot(page)
}

/** Builds a valid AppState with one active arc. `completeDays` lists day indexes (1-based) with every task ticked. */
export function makeState(opts: {
  startDate?: DateKey
  tasks?: string[]
  completeDays?: number[]
  partial?: Record<number, number> // day index -> number of tasks ticked
  celebrateAll?: boolean
  sound?: boolean
}): AppState {
  const startDate = opts.startDate ?? DAY1
  const tasks = (opts.tasks ?? TASKS).map((label, i) => ({ id: `t${i + 1}`, label }))
  const completions: Arc['completions'] = {}
  const tickDay = (day: number, n: number) => {
    const key = addDays(startDate, day - 1)
    const ts = at(key, '20:00').getTime()
    completions[key] = Object.fromEntries(tasks.slice(0, n).map((t, i) => [t.id, ts + i * 60_000]))
  }
  for (const d of opts.completeDays ?? []) tickDay(d, tasks.length)
  for (const [d, n] of Object.entries(opts.partial ?? {})) tickDay(Number(d), n)
  const arc: Arc = {
    id: 'arc-e2e',
    name: 'Winter Arc',
    startDate,
    tasks,
    createdAt: at(startDate, '08:00').getTime(),
    completions,
  }
  return {
    version: 1,
    activeArcId: arc.id,
    arcs: [arc],
    settings: { sound: opts.sound ?? false, rolloverHour: 3 },
    celebrated: opts.celebrateAll ? Object.keys(completions).map((k) => `${arc.id}:${k}`) : [],
  }
}

/** Writes `state` into IndexedDB the way the app stores it, then reloads into it. */
export async function seed(page: Page, state: AppState, time: Date) {
  await page.clock.install({ time })
  await page.goto('./')
  await page.evaluate(async (s) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('winter-arc', 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv')
      }
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(s, 'app')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, state)
  await page.reload()
  await dismissBoot(page)
}

/** Reads the persisted AppState (or undefined). */
export async function readState(page: Page): Promise<AppState | undefined> {
  return page.evaluate(
    () =>
      new Promise<AppState | undefined>((resolve, reject) => {
        const req = indexedDB.open('winter-arc', 1)
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv')
        }
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const get = db.transaction('kv').objectStore('kv').get('app')
          get.onsuccess = () => {
            db.close()
            resolve(get.result as AppState | undefined)
          }
          get.onerror = () => reject(get.error)
        }
      }),
  )
}

/** Number of tasks ticked on `dateKey` in persisted state. */
export async function persistedTicks(page: Page, dateKey: DateKey): Promise<number> {
  const s = await readState(page)
  const arc = s?.arcs.find((a) => a.id === s.activeArcId)
  return Object.keys(arc?.completions[dateKey] ?? {}).length
}

/** A daily-order button on the Log screen (name also carries "+N mi" / tick time). */
export const order = (page: Page, label: string) =>
  page.getByRole('button', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) })

/** Press-and-hold a HoldButton under clock control: pointer down, drive rAF for `ms`, pointer up. */
export async function hold(page: Page, label: string, ms = 1600) {
  const btn = page.getByRole('button', { name: label })
  await btn.scrollIntoViewIfNeeded()
  const box = await btn.boundingBox()
  if (!box) throw new Error(`no box for ${label}`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.clock.runFor(ms)
  await page.mouse.up()
}

/** Moves the fake clock forward to `time`, firing due timers (the app re-reads the time every 30 s). */
export async function travelTo(page: Page, time: Date) {
  await page.clock.fastForward(time.getTime() - (await page.evaluate(() => Date.now())))
  // Also nudge the app the way iOS does when it returns to the foreground.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
}
