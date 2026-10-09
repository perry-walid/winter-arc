import { describe, expect, it } from 'vitest'
import {
  addDays,
  currentDayKey,
  diffDays,
  isValidDateKey,
  isYesterdayEditable,
  parseKey,
  toDateKey,
} from './dates'

describe('time zone of the test run', () => {
  it('runs in America/New_York (EST = UTC-5 in January, EDT in July)', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(300)
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(240)
  })
})

describe('toDateKey / parseKey', () => {
  it('uses local components, not UTC (23:30 local is already tomorrow in UTC)', () => {
    const d = new Date(2026, 0, 1, 23, 30)
    expect(d.toISOString().slice(0, 10)).toBe('2026-01-02')
    expect(toDateKey(d)).toBe('2026-01-01')
  })

  it('parseKey returns local midnight', () => {
    const d = parseKey('2026-03-08')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 2, 8, 0, 0])
    expect(toDateKey(parseKey('2026-11-01'))).toBe('2026-11-01')
  })

  it('rejects malformed keys', () => {
    expect(() => parseKey('2026-1-1')).toThrow()
    expect(isValidDateKey('2026-02-29')).toBe(false)
    expect(isValidDateKey('2028-02-29')).toBe(true)
    expect(isValidDateKey('2026-13-01')).toBe(false)
    expect(isValidDateKey(20260101)).toBe(false)
  })
})

describe('addDays / diffDays', () => {
  it('crosses month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-03-01', 59)).toBe('2026-04-29')
  })

  it('is exact across DST transitions', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02')
    expect(diffDays('2026-03-09', '2026-03-08')).toBe(1)
    expect(diffDays('2026-11-02', '2026-11-01')).toBe(1)
    expect(diffDays('2026-11-02', '2026-03-01')).toBe(246)
    expect(diffDays('2026-03-01', '2026-03-09')).toBe(-8)
  })
})

describe('currentDayKey (03:00 rollover)', () => {
  it('treats 02:30 as the previous day and 03:00 as the new day', () => {
    expect(currentDayKey(new Date(2026, 0, 10, 0, 0))).toBe('2026-01-09')
    expect(currentDayKey(new Date(2026, 0, 10, 2, 30))).toBe('2026-01-09')
    expect(currentDayKey(new Date(2026, 0, 10, 2, 59, 59))).toBe('2026-01-09')
    expect(currentDayKey(new Date(2026, 0, 10, 3, 0))).toBe('2026-01-10')
    expect(currentDayKey(new Date(2026, 0, 10, 23, 59))).toBe('2026-01-10')
  })

  it('handles the first of the month/year', () => {
    expect(currentDayKey(new Date(2026, 0, 1, 1, 0))).toBe('2025-12-31')
  })

  it('is DST-safe on spring-forward and fall-back nights', () => {
    // 2026-03-08: 02:00 jumps to 03:00 in New York.
    expect(currentDayKey(new Date(2026, 2, 8, 1, 59))).toBe('2026-03-07')
    expect(currentDayKey(new Date(2026, 2, 8, 3, 0))).toBe('2026-03-08')
    // 2026-11-01: 01:00-02:00 happens twice.
    const firstPass = new Date(2026, 10, 1, 1, 30)
    const secondPass = new Date(firstPass.getTime() + 3600_000)
    expect(secondPass.getHours()).toBe(1)
    expect(currentDayKey(firstPass)).toBe('2026-10-31')
    expect(currentDayKey(secondPass)).toBe('2026-10-31')
    expect(currentDayKey(new Date(2026, 10, 1, 3, 0))).toBe('2026-11-01')
  })

  it('honours a custom rollover hour', () => {
    expect(currentDayKey(new Date(2026, 0, 10, 0, 30), 0)).toBe('2026-01-10')
    expect(currentDayKey(new Date(2026, 0, 10, 4, 30), 5)).toBe('2026-01-09')
  })
})

describe('isYesterdayEditable', () => {
  it('is open from the rollover until 11:59 and closed from 12:00', () => {
    expect(isYesterdayEditable(new Date(2026, 0, 10, 3, 0))).toBe(true)
    expect(isYesterdayEditable(new Date(2026, 0, 10, 11, 59, 59))).toBe(true)
    expect(isYesterdayEditable(new Date(2026, 0, 10, 12, 0))).toBe(false)
    expect(isYesterdayEditable(new Date(2026, 0, 10, 23, 0))).toBe(false)
  })

  it('is closed before the rollover (still the previous game day, past its noon)', () => {
    expect(isYesterdayEditable(new Date(2026, 0, 10, 2, 30))).toBe(false)
  })
})
