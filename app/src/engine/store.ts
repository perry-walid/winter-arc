// State mutations (pure reducers returning a new AppState) and IndexedDB persistence.
import { openDB, type IDBPDatabase } from 'idb'
import type { AppState, Arc, DateKey, Task } from './types'
import { addDays, isValidDateKey } from './dates'
import { ARC_DAYS, celebrationKey, summarize } from './rules'

export const MIN_TASKS = 3
export const MAX_TASKS = 8
export const MAX_TASK_LABEL = 80
export const MAX_ARC_NAME = 60

export function initialState(): AppState {
  return {
    version: 1,
    activeArcId: null,
    arcs: [],
    settings: { sound: true, rolloverHour: 3 },
    celebrated: [],
  }
}

export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

function updateArc(state: AppState, arcId: string, fn: (arc: Arc) => Arc): AppState {
  return { ...state, arcs: state.arcs.map((a) => (a.id === arcId ? fn(a) : a)) }
}

export function findArc(state: AppState, arcId: string | null): Arc | undefined {
  return arcId === null ? undefined : state.arcs.find((a) => a.id === arcId)
}

export function activeArc(state: AppState): Arc | undefined {
  return findArc(state, state.activeArcId)
}

export interface NewArcInput {
  name: string
  startDate: DateKey
  tasks: string[]
}

/** Creates an arc and makes it active. Throws a user-facing Error on invalid input. */
export function createArc(state: AppState, input: NewArcInput, now: Date): AppState {
  const name = (input.name ?? '').trim()
  if (!name) throw new Error('Give your expedition a name.')
  if (name.length > MAX_ARC_NAME) throw new Error(`Keep the name under ${MAX_ARC_NAME} characters.`)
  if (!isValidDateKey(input.startDate)) throw new Error('Pick a valid start date.')

  const seen = new Set<string>()
  const labels: string[] = []
  for (const raw of input.tasks ?? []) {
    const label = String(raw).trim().replace(/\s+/g, ' ')
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  if (labels.length < MIN_TASKS || labels.length > MAX_TASKS) {
    throw new Error(`Choose between ${MIN_TASKS} and ${MAX_TASKS} distinct daily tasks.`)
  }
  if (labels.some((l) => l.length > MAX_TASK_LABEL)) {
    throw new Error(`Keep each task under ${MAX_TASK_LABEL} characters.`)
  }

  const tasks: Task[] = labels.map((label) => ({ id: newId(), label }))
  const arc: Arc = {
    id: newId(),
    name,
    startDate: input.startDate,
    tasks,
    createdAt: now.getTime(),
    completions: {},
  }
  return { ...state, arcs: [...state.arcs, arc], activeArcId: arc.id }
}

/** Ticks/unticks a task. Returns the same state object if the day is not editable now. */
export function toggleTask(state: AppState, arcId: string, dateKey: DateKey, taskId: string, now: Date): AppState {
  const arc = findArc(state, arcId)
  if (!arc || !arc.tasks.some((t) => t.id === taskId)) return state
  const day = summarize(state, arc, now).days.find((d) => d.dateKey === dateKey)
  if (!day || !day.editable) return state

  const prev = arc.completions[dateKey] ?? {}
  const next = { ...prev }
  if (typeof next[taskId] === 'number') delete next[taskId]
  else next[taskId] = now.getTime()

  const completions = { ...arc.completions }
  if (Object.keys(next).length) completions[dateKey] = next
  else delete completions[dateKey]
  return updateArc(state, arcId, (a) => ({ ...a, completions }))
}

export function markCelebrated(state: AppState, arcId: string, dateKey: DateKey): AppState {
  const key = celebrationKey(arcId, dateKey)
  if (state.celebrated.includes(key)) return state
  return { ...state, celebrated: [...state.celebrated, key] }
}

export function abandonArc(state: AppState, arcId: string, now: Date): AppState {
  const arc = findArc(state, arcId)
  if (!arc || arc.endedAt !== undefined) return state
  const next = updateArc(state, arcId, (a) => ({ ...a, endedAt: now.getTime(), endReason: 'abandoned' }))
  return { ...next, activeArcId: state.activeArcId === arcId ? null : state.activeArcId }
}

/** Archives an arc whose 60 days are settled. No-op otherwise. */
export function archiveFinished(state: AppState, arcId: string, now: Date): AppState {
  const arc = findArc(state, arcId)
  if (!arc || arc.endedAt !== undefined) return state
  if (summarize(state, arc, now).phase !== 'finished') return state
  const next = updateArc(state, arcId, (a) => ({ ...a, endedAt: now.getTime(), endReason: 'finished' }))
  return { ...next, activeArcId: state.activeArcId === arcId ? null : state.activeArcId }
}

export function setSound(state: AppState, sound: boolean): AppState {
  if (state.settings.sound === sound) return state
  return { ...state, settings: { ...state.settings, sound } }
}

/** Records that a backup was just exported (call after exportJson succeeds). */
export function markBackedUp(state: AppState, now: Date): AppState {
  return { ...state, lastBackupAt: now.getTime() }
}

/** Last day key of an arc (day 60). */
export function arcEndDate(arc: Arc): DateKey {
  return addDays(arc.startDate, ARC_DAYS - 1)
}

// ---------------------------------------------------------------- export / import

export function exportJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function fail(detail: string): never {
  throw new Error(`This doesn't look like a Winter Arc backup (${detail}).`)
}

function validateArc(v: unknown, i: number): Arc {
  if (!isObj(v)) fail(`expedition ${i + 1} is malformed`)
  const { id, name, startDate, tasks, createdAt, completions, endedAt, endReason } = v
  if (typeof id !== 'string' || !id) fail(`expedition ${i + 1} has no id`)
  if (typeof name !== 'string') fail(`expedition ${i + 1} has no name`)
  if (!isValidDateKey(startDate)) fail(`expedition ${i + 1} has a bad start date`)
  if (!isNum(createdAt)) fail(`expedition ${i + 1} has a bad creation time`)
  if (!Array.isArray(tasks) || tasks.length === 0) fail(`expedition ${i + 1} has no tasks`)
  const cleanTasks: Task[] = tasks.map((t) => {
    if (!isObj(t) || typeof t.id !== 'string' || typeof t.label !== 'string') fail(`expedition ${i + 1} has a bad task`)
    return { id: t.id, label: t.label }
  })
  if (!isObj(completions)) fail(`expedition ${i + 1} has bad check-ins`)
  const cleanCompletions: Arc['completions'] = {}
  for (const [k, day] of Object.entries(completions)) {
    if (!isValidDateKey(k) || !isObj(day)) fail(`expedition ${i + 1} has a bad check-in date`)
    const rec: Record<string, number> = {}
    for (const [tid, ts] of Object.entries(day)) {
      if (!isNum(ts)) fail(`expedition ${i + 1} has a bad check-in time`)
      rec[tid] = ts
    }
    cleanCompletions[k] = rec
  }
  if (endedAt !== undefined && !isNum(endedAt)) fail(`expedition ${i + 1} has a bad end time`)
  if (endReason !== undefined && endReason !== 'finished' && endReason !== 'abandoned') {
    fail(`expedition ${i + 1} has a bad end reason`)
  }
  const arc: Arc = { id, name, startDate, tasks: cleanTasks, createdAt, completions: cleanCompletions }
  if (endedAt !== undefined) arc.endedAt = endedAt
  if (endReason !== undefined) arc.endReason = endReason
  return arc
}

/** Parses and validates a backup. Throws a user-facing Error on anything unexpected. */
export function importJson(text: string): AppState {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error("This file isn't valid JSON, so it can't be a Winter Arc backup.")
  }
  if (!isObj(raw)) fail('not an object')
  if (raw.version !== 1) {
    if (isNum(raw.version) && raw.version > 1) {
      throw new Error('This backup was made by a newer version of Winter Arc. Update the app and try again.')
    }
    fail('missing or unknown version')
  }
  if (!Array.isArray(raw.arcs)) fail('no expeditions list')
  const arcs = raw.arcs.map(validateArc)
  const ids = new Set(arcs.map((a) => a.id))
  if (ids.size !== arcs.length) fail('duplicate expeditions')

  const activeArcId = raw.activeArcId ?? null
  if (activeArcId !== null && (typeof activeArcId !== 'string' || !ids.has(activeArcId))) {
    fail('the active expedition is missing')
  }

  const settings = isObj(raw.settings) ? raw.settings : {}
  const defaults = initialState().settings
  const celebrated = Array.isArray(raw.celebrated) ? raw.celebrated.filter((c): c is string => typeof c === 'string') : []

  const state: AppState = {
    version: 1,
    activeArcId,
    arcs,
    settings: {
      sound: typeof settings.sound === 'boolean' ? settings.sound : defaults.sound,
      rolloverHour: defaults.rolloverHour, // fixed in v1
    },
    celebrated,
  }
  if (isNum(raw.lastBackupAt)) state.lastBackupAt = raw.lastBackupAt
  return state
}

// ---------------------------------------------------------------- IndexedDB

const DB_NAME = 'winter-arc'
const STORE = 'kv'
const KEY = 'app'

let dbPromise: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available.'))
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE)
    },
  }).catch((e: unknown) => {
    dbPromise = null // allow a retry after a failed open
    throw e
  })
  return dbPromise
}

/** Loads persisted state, or a fresh initialState if nothing is stored. */
export async function loadState(): Promise<AppState> {
  const raw: unknown = await (await db()).get(STORE, KEY)
  if (raw === undefined) return initialState()
  // Round-trip through the importer so a corrupt record never reaches the UI unchecked.
  return importJson(JSON.stringify(raw))
}

export async function saveState(s: AppState): Promise<void> {
  await (await db()).put(STORE, s, KEY)
}

/** Closes the cached connection (for tests / teardown). */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return
  const d = await dbPromise.catch(() => null)
  d?.close()
  dbPromise = null
}

/** Asks the browser to keep our storage from eviction. Resolves false where unsupported. */
export async function requestPersistence(): Promise<boolean> {
  try {
    const nav = typeof navigator === 'undefined' ? undefined : navigator
    return (await nav?.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
