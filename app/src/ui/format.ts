import type { DateKey } from '../engine/types'
import { parseKey } from '../engine/dates'

export function formatDate(k: DateKey, long = false) {
  return parseKey(k).toLocaleDateString(undefined, long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' })
}

export function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const miles = (xp: number) => {
  const m = xp / 10
  return Number.isInteger(m) ? m.toLocaleString() : m.toFixed(1)
}

/** Flavor: it gets colder the closer you get to the Pole. */
export const temperature = (dayIndex: number) => -18 - Math.round(Math.max(0, Math.min(dayIndex, 60)) * 0.45)
