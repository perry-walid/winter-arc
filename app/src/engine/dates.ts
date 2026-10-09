// Pure local-calendar date helpers. All arithmetic goes through calendar components
// (never ms offsets or ISO/UTC slicing), so DST transitions cannot shift a day.
import type { DateKey } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

function keyFromParts(y: number, m: number, d: number): DateKey {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`
}

function parts(k: DateKey): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k)
  if (!m) throw new Error(`Invalid date key: ${k}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** True if `k` is a well-formed, real calendar date ('2026-02-30' is not). */
export function isValidDateKey(k: unknown): k is DateKey {
  if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false
  const [y, m, d] = parts(k)
  const u = new Date(Date.UTC(y, m - 1, d))
  return u.getUTCFullYear() === y && u.getUTCMonth() === m - 1 && u.getUTCDate() === d
}

/** Date key of the local calendar date of `d`. */
export function toDateKey(d: Date): DateKey {
  return keyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** Local midnight of the given date key. */
export function parseKey(k: DateKey): Date {
  const [y, m, d] = parts(k)
  return new Date(y, m - 1, d)
}

export function addDays(k: DateKey, n: number): DateKey {
  const [y, m, d] = parts(k)
  const u = new Date(Date.UTC(y, m - 1, d + n))
  return keyFromParts(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate())
}

/** Calendar days from b to a (a - b). */
export function diffDays(a: DateKey, b: DateKey): number {
  const [ay, am, ad] = parts(a)
  const [by, bm, bd] = parts(b)
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000)
}

/** The "game day" for `now`: before `rolloverHour` local time it is still the previous date. */
export function currentDayKey(now: Date, rolloverHour = 3): DateKey {
  const k = toDateKey(now)
  return now.getHours() < rolloverHour ? addDays(k, -1) : k
}

/**
 * Yesterday (currentDayKey - 1) stays editable until 12:00 local on the current game day.
 * Before the rollover the game day is still the previous date, so it is past noon on it.
 */
export function isYesterdayEditable(now: Date, rolloverHour = 3): boolean {
  const k = currentDayKey(now, rolloverHour)
  return toDateKey(now) === k && now.getHours() < 12
}
