// Fixtures shared by the engine tests. Not imported by app code.
import type { AppState, Arc, DateKey } from './types'
import { addDays } from './dates'
import { initialState } from './store'

export const ARC_ID = 'arc-fixed'

/** Local wall-clock time on a given date key. */
export function at(key: DateKey, hour: number, minute = 0): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute)
}

export function makeArc(startDate: DateKey, id = ARC_ID): Arc {
  return {
    id,
    name: 'Test Expedition',
    startDate,
    tasks: [
      { id: 't1', label: 'Run' },
      { id: 't2', label: 'Read' },
      { id: 't3', label: 'Cold shower' },
    ],
    createdAt: at(startDate, 8).getTime(),
    completions: {},
  }
}

export function stateWith(arc: Arc): AppState {
  return { ...initialState(), arcs: [arc], activeArcId: arc.id }
}

/** Ticks every task of day `index` (1-based) at `hour` local on that date (hour may exceed 23). */
export function completeDay(arc: Arc, index: number, hour = 20, minute = 0): Arc {
  const key = addDays(arc.startDate, index - 1)
  const t = at(key, 0).getTime() + (hour * 60 + minute) * 60_000
  const ticks: Record<string, number> = {}
  arc.tasks.forEach((task, i) => (ticks[task.id] = t - (arc.tasks.length - 1 - i) * 60_000))
  return { ...arc, completions: { ...arc.completions, [key]: ticks } }
}

export function completeDays(arc: Arc, indices: Iterable<number>, hour = 20): Arc {
  let a = arc
  for (const i of indices) a = completeDay(a, i, hour)
  return a
}

export function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}
