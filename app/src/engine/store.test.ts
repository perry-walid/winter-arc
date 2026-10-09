import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AppState } from './types'
import { addDays } from './dates'
import { summarize } from './rules'
import {
  abandonArc,
  archiveFinished,
  closeDb,
  createArc,
  exportJson,
  importJson,
  initialState,
  loadState,
  markBackedUp,
  markCelebrated,
  requestPersistence,
  saveState,
  setSound,
  toggleTask,
} from './store'
import { ARC_ID, at, completeDays, makeArc, range, stateWith } from './testUtils'

const START = '2026-01-05'
const dayKey = (i: number) => addDays(START, i - 1)

/** Recursively freezes so any in-place mutation by a reducer throws. */
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze)
    Object.freeze(o)
  }
  return o
}

describe('initialState', () => {
  it('is empty v1 state with the 03:00 rollover', () => {
    expect(initialState()).toEqual({
      version: 1,
      activeArcId: null,
      arcs: [],
      settings: { sound: true, rolloverHour: 3 },
      celebrated: [],
    })
  })
})

describe('createArc', () => {
  const now = at('2026-01-04', 20)

  it('trims, dedupes, assigns ids and activates the arc', () => {
    const s0 = deepFreeze(initialState())
    const s = createArc(s0, { name: '  Winter 26 ', startDate: START, tasks: [' Run ', 'Read', 'run', '', 'Cold  shower'] }, now)
    expect(s.arcs).toHaveLength(1)
    const arc = s.arcs[0]
    expect(s.activeArcId).toBe(arc.id)
    expect(arc).toMatchObject({ name: 'Winter 26', startDate: START, createdAt: now.getTime(), completions: {} })
    expect(arc.tasks.map((t) => t.label)).toEqual(['Run', 'Read', 'Cold shower'])
    expect(new Set([arc.id, ...arc.tasks.map((t) => t.id)]).size).toBe(4)
  })

  it('throws on invalid input', () => {
    const s = initialState()
    const ok = { name: 'A', startDate: START, tasks: ['a', 'b', 'c'] }
    expect(() => createArc(s, { ...ok, name: '   ' }, now)).toThrow(/name/)
    expect(() => createArc(s, { ...ok, startDate: '2026-02-30' }, now)).toThrow(/date/)
    expect(() => createArc(s, { ...ok, startDate: 'tomorrow' }, now)).toThrow(/date/)
    expect(() => createArc(s, { ...ok, tasks: ['a', 'b', 'A '] }, now)).toThrow(/3 and 8/)
    expect(() => createArc(s, { ...ok, tasks: range(1, 9).map(String) }, now)).toThrow(/3 and 8/)
    expect(createArc(s, { ...ok, tasks: range(1, 8).map(String) }, now).arcs[0].tasks).toHaveLength(8)
  })
})

describe('toggleTask', () => {
  const fresh = () => deepFreeze(stateWith(completeDays(makeArc(START), range(1, 3))))

  it('ticks and unticks today without mutating the input', () => {
    const s0 = fresh()
    const now = at(dayKey(4), 9)
    const s1 = toggleTask(s0, ARC_ID, dayKey(4), 't1', now)
    expect(s1).not.toBe(s0)
    expect(s1.arcs[0].completions[dayKey(4)]).toEqual({ t1: now.getTime() })
    expect(s0.arcs[0].completions[dayKey(4)]).toBeUndefined()
    const s2 = toggleTask(s1, ARC_ID, dayKey(4), 't1', now)
    expect(s2.arcs[0].completions[dayKey(4)]).toBeUndefined()
  })

  it('edits yesterday during grace, refuses it from noon', () => {
    const s0 = fresh()
    expect(toggleTask(s0, ARC_ID, dayKey(4), 't2', at(dayKey(5), 11, 59))).not.toBe(s0)
    expect(toggleTask(s0, ARC_ID, dayKey(4), 't2', at(dayKey(5), 12, 0))).toBe(s0)
  })

  it('completing the grace day turns it complete', () => {
    let s = fresh()
    const now = at(dayKey(5), 10)
    for (const t of ['t1', 't2', 't3']) s = toggleTask(s, ARC_ID, dayKey(4), t, now)
    const sum = summarize(s, s.arcs[0], now)
    expect(sum.days[3]).toMatchObject({ status: 'complete', editable: true })
    expect(sum.streak).toBe(4)
  })

  it('refuses non-editable days, unknown tasks and arcs', () => {
    const s0 = fresh()
    const now = at(dayKey(4), 15)
    expect(toggleTask(s0, ARC_ID, dayKey(2), 't1', now)).toBe(s0) // settled past
    expect(toggleTask(s0, ARC_ID, dayKey(5), 't1', now)).toBe(s0) // future
    expect(toggleTask(s0, ARC_ID, addDays(START, -1), 't1', now)).toBe(s0) // before the arc
    expect(toggleTask(s0, ARC_ID, dayKey(4), 'nope', now)).toBe(s0)
    expect(toggleTask(s0, 'other', dayKey(4), 't1', now)).toBe(s0)
    expect(toggleTask(s0, ARC_ID, dayKey(1), 't1', at(dayKey(0), 20))).toBe(s0) // scheduled
  })

  it('refuses everything once the arc is abandoned or the 60 days are over', () => {
    const now = at(dayKey(4), 15)
    const abandoned = abandonArc(fresh(), ARC_ID, now)
    expect(toggleTask(abandoned, ARC_ID, dayKey(4), 't1', now)).toBe(abandoned)
    const s0 = fresh()
    expect(toggleTask(s0, ARC_ID, dayKey(60), 't1', at(dayKey(61), 12))).toBe(s0)
    expect(toggleTask(s0, ARC_ID, dayKey(60), 't1', at(dayKey(61), 11))).not.toBe(s0)
  })
})

describe('other reducers', () => {
  it('markCelebrated is idempotent', () => {
    const s0 = deepFreeze(initialState())
    const s1 = markCelebrated(s0, ARC_ID, START)
    expect(s1.celebrated).toEqual([`${ARC_ID}:${START}`])
    expect(markCelebrated(s1, ARC_ID, START)).toBe(s1)
  })

  it('abandonArc ends the arc and clears the active id', () => {
    const s0 = deepFreeze(stateWith(makeArc(START)))
    const now = at(dayKey(3), 10)
    const s1 = abandonArc(s0, ARC_ID, now)
    expect(s1.activeArcId).toBeNull()
    expect(s1.arcs[0]).toMatchObject({ endedAt: now.getTime(), endReason: 'abandoned' })
    expect(abandonArc(s1, ARC_ID, now)).toBe(s1)
  })

  it('archiveFinished only archives finished arcs', () => {
    const s0 = deepFreeze(stateWith(completeDays(makeArc(START), range(1, 60))))
    expect(archiveFinished(s0, ARC_ID, at(dayKey(60), 22))).toBe(s0)
    const now = at(dayKey(61), 9)
    const s1 = archiveFinished(s0, ARC_ID, now)
    expect(s1.activeArcId).toBeNull()
    expect(s1.arcs[0]).toMatchObject({ endedAt: now.getTime(), endReason: 'finished' })
    expect(summarize(s1, s1.arcs[0], now).outcome).toBe('perfect')
  })

  it('setSound and markBackedUp', () => {
    const s0 = deepFreeze(initialState())
    expect(setSound(s0, true)).toBe(s0)
    expect(setSound(s0, false).settings).toEqual({ sound: false, rolloverHour: 3 })
    expect(markBackedUp(s0, new Date(2026, 0, 1, 12)).lastBackupAt).toBe(new Date(2026, 0, 1, 12).getTime())
  })
})

describe('export / import', () => {
  const sample = (): AppState => {
    let s = stateWith(completeDays(makeArc(START), range(1, 5)))
    s = markCelebrated(s, ARC_ID, dayKey(1))
    s = setSound(s, false)
    s = markBackedUp(s, at(dayKey(6), 9))
    return { ...s, arcs: [...s.arcs, { ...makeArc('2025-10-01', 'old'), endedAt: 5, endReason: 'abandoned' }] }
  }

  it('round-trips', () => {
    const s = sample()
    const text = exportJson(s)
    expect(typeof text).toBe('string')
    expect(importJson(text)).toEqual(s)
    expect(importJson(exportJson(initialState()))).toEqual(initialState())
  })

  it('rejects garbage with a friendly error', () => {
    expect(() => importJson('not json')).toThrow(/valid JSON/)
    expect(() => importJson('[]')).toThrow(/Winter Arc backup/)
    expect(() => importJson('null')).toThrow(/Winter Arc backup/)
    expect(() => importJson('{}')).toThrow(/version/)
    expect(() => importJson(JSON.stringify({ ...sample(), version: 2 }))).toThrow(/newer version/)
    expect(() => importJson(JSON.stringify({ ...sample(), arcs: 'x' }))).toThrow(/expeditions/)
    expect(() => importJson(JSON.stringify({ ...sample(), activeArcId: 'ghost' }))).toThrow(/active/)

    const bad = (patch: Record<string, unknown>) => {
      const s = sample()
      return JSON.stringify({ ...s, arcs: [{ ...s.arcs[0], ...patch }] })
    }
    expect(() => importJson(bad({ startDate: '2026-13-01' }))).toThrow(/start date/)
    expect(() => importJson(bad({ tasks: [] }))).toThrow(/tasks/)
    expect(() => importJson(bad({ tasks: [{ id: 1 }] }))).toThrow(/task/)
    expect(() => importJson(bad({ completions: { 'not-a-date': {} } }))).toThrow(/check-in/)
    expect(() => importJson(bad({ completions: { [START]: { t1: 'yes' } } }))).toThrow(/check-in/)
    expect(() => importJson(bad({ endReason: 'bored' }))).toThrow(/end reason/)
  })
})

describe('IndexedDB adapter', () => {
  beforeEach(async () => {
    await closeDb()
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('winter-arc')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  })
  afterEach(closeDb)

  it('returns initialState when empty', async () => {
    expect(await loadState()).toEqual(initialState())
  })

  it('saves and loads state', async () => {
    const s = stateWith(completeDays(makeArc(START), range(1, 3)))
    await saveState(s)
    expect(await loadState()).toEqual(s)
    const s2 = setSound(s, false)
    await saveState(s2)
    await closeDb()
    expect(await loadState()).toEqual(s2)
  })

  it('requestPersistence never throws where unsupported', async () => {
    await expect(requestPersistence()).resolves.toBe(false)
  })
})
