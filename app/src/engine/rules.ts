// Game rules and the pure derivation of everything the UI shows from AppState + now.
import type {
  AppState,
  Arc,
  ArcSummary,
  DayResult,
  DayStatus,
  MedalDef,
  MedalState,
  Rank,
} from './types'
import { addDays, currentDayKey, diffDays, isYesterdayEditable } from './dates'

export const ARC_DAYS = 60
export const START_CACHES = 1
export const MAX_CACHES = 2
export const CACHE_EVERY = 7
export const POLE_THRESHOLD = 54
export const CRIT_CHANCE = 0.15
export const XP_PER_MILE = 10

export const XP_PERFECT = 50
export const XP_STREAK_PER_DAY = 5
export const XP_STREAK_CAP = 50
export const XP_CRIT = 50

// ---------------------------------------------------------------- ranks

export const RANK_TITLES = [
  'Deckhand',
  'Stoker',
  'Able Seaman',
  'Sledger',
  'Dog Driver',
  'Quartermaster',
  'Surveyor',
  'Navigator',
  'Lieutenant',
  'Commander',
] as const

export const MAX_LEVEL = RANK_TITLES.length

/** XP needed to reach level L (1..10), rounded to the nearest 50. */
export function xpFor(level: number): number {
  const raw = 11600 * Math.pow((level - 1) / 9, 1.5)
  return Math.round(raw / 50) * 50
}

export function rankFor(xp: number): Rank {
  let level = 1
  for (let L = MAX_LEVEL; L >= 1; L--) {
    if (xp >= xpFor(L)) {
      level = L
      break
    }
  }
  return {
    level,
    title: RANK_TITLES[level - 1],
    minXp: xpFor(level),
    nextXp: level < MAX_LEVEL ? xpFor(level + 1) : null,
  }
}

// ---------------------------------------------------------------- crit

/** 32-bit FNV-1a. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Deterministic crit roll for a day; only applied to complete days. */
export function isCrit(arcId: string, dayIndex: number): boolean {
  return fnv1a(`${arcId}:${dayIndex}`) % 1000 < CRIT_CHANCE * 1000
}

// ---------------------------------------------------------------- medals

export const MEDALS: readonly MedalDef[] = [
  { id: 'articles-sealed', name: 'Articles Sealed', description: 'Signed on for the expedition.', glyph: 'AS' },
  { id: 'first-camp', name: 'First Camp', description: 'Made camp with every task done for the first time.', glyph: 'I' },
  { id: 'week-on-ice', name: 'Week on the Ice', description: 'Reached a 7-day perfect streak.', glyph: 'VII' },
  { id: 'fortnight', name: 'Fortnight', description: 'Reached a 14-day perfect streak.', glyph: 'XIV' },
  { id: 'one-ton-depot', name: 'One Ton Depot', description: 'Held the line through day 15.', glyph: 'XV' },
  { id: 'beardmore', name: 'Beardmore Glacier', description: 'Held the line through day 30.', glyph: 'XXX' },
  { id: 'plateau', name: 'Polar Plateau', description: 'Held the line through day 45.', glyph: 'XLV' },
  { id: 'the-pole', name: 'The Pole', description: `Finished with at least ${POLE_THRESHOLD} days held.`, glyph: 'NP' },
  { id: 'flawless', name: 'Flawless', description: 'All 60 days complete. Not a single slip.', glyph: 'LX' },
  { id: 'blizzard-survived', name: 'Blizzard Survived', description: 'A supply cache saved your streak.', glyph: 'BZ' },
  { id: 'hotfix', name: 'Hotfix', description: 'Made a full camp the day after a slip.', glyph: 'HF' },
  { id: 'fair-winds', name: 'Fair Winds', description: 'Caught a critical bonus on a perfect day.', glyph: 'FW' },
  { id: 'early-riser', name: 'Early Riser', description: 'Finished a day before 09:00.', glyph: 'ER' },
  { id: 'night-march', name: 'Night March', description: 'Finished a day at 23:00 or later.', glyph: 'NM' },
  { id: 'iron-will', name: 'Iron Will', description: '30 complete days without spending a cache.', glyph: 'IW' },
]

// ---------------------------------------------------------------- summarize

const HELD: ReadonlySet<DayStatus> = new Set(['complete', 'shielded'])
const SETTLED: ReadonlySet<DayStatus> = new Set(['complete', 'shielded', 'missed'])

/** Last tick of a day (epoch ms), or null if no ticks. */
function lastTick(ticks: Record<string, number> | undefined, taskIds: string[]): number | null {
  if (!ticks) return null
  let last: number | null = null
  for (const id of taskIds) {
    const t = ticks[id]
    if (typeof t === 'number' && (last === null || t > last)) last = t
  }
  return last
}

export function summarize(state: AppState, arc: Arc, now: Date): ArcSummary {
  const rollover = state.settings.rolloverHour
  const todayKey = currentDayKey(now, rollover)
  const todayIndex = Math.max(0, diffDays(todayKey, arc.startDate) + 1)
  const yesterdayWindow = isYesterdayEditable(now, rollover)
  const ended = arc.endedAt !== undefined
  const taskIds = arc.tasks.map((t) => t.id)
  const total = taskIds.length

  const earned = new Map<string, number>([['articles-sealed', 0]])
  const earn = (id: string, day: number) => {
    if (!earned.has(id)) earned.set(id, day)
  }

  const days: DayResult[] = []
  let streak = 0
  let bestStreak = 0
  let caches = START_CACHES
  let cachesUsed = 0
  let completeDays = 0
  let prevStatus: DayStatus | null = null

  for (let i = 1; i <= ARC_DAYS; i++) {
    const dateKey = addDays(arc.startDate, i - 1)
    const ticks = arc.completions[dateKey]
    const done = taskIds.reduce((n, id) => n + (ticks && typeof ticks[id] === 'number' ? 1 : 0), 0)
    const complete = total > 0 && done === total
    const isToday = i === todayIndex
    const isYesterday = i === todayIndex - 1 && yesterdayWindow

    let status: DayStatus
    if (i > todayIndex) status = 'future'
    else if (complete) status = 'complete'
    else if (isToday) status = 'today'
    else if (isYesterday) status = 'grace'
    else status = caches > 0 ? 'shielded' : 'missed'

    const breakdown = { tasks: 0, perfect: 0, streak: 0, crit: 0 }
    let crit = false
    if (status !== 'future') breakdown.tasks = total > 0 ? Math.round((100 * done) / total) : 0

    switch (status) {
      case 'complete': {
        streak++
        if (streak % CACHE_EVERY === 0) caches = Math.min(caches + 1, MAX_CACHES)
        completeDays++
        crit = isCrit(arc.id, i)
        breakdown.perfect = XP_PERFECT
        breakdown.streak = Math.min(XP_STREAK_PER_DAY * streak, XP_STREAK_CAP)
        breakdown.crit = crit ? XP_CRIT : 0
        break
      }
      case 'shielded':
        caches--
        cachesUsed++
        break
      case 'missed':
        streak = 0
        break
      default: // future, today, grace: nothing settles
        break
    }
    bestStreak = Math.max(bestStreak, streak)

    // Today is editable while the arc runs; yesterday stays editable until noon,
    // which also covers day 60 on day 61. Ended (archived/abandoned) arcs are frozen.
    const editable = !ended && i <= ARC_DAYS && (isToday || isYesterday)

    days.push({
      index: i,
      dateKey,
      status,
      done,
      total,
      xp: breakdown.tasks + breakdown.perfect + breakdown.streak + breakdown.crit,
      xpBreakdown: breakdown,
      crit,
      streakAfter: streak,
      cachesAfter: caches,
      editable,
    })

    // Medals earned as of this day.
    if (status === 'complete') {
      earn('first-camp', i)
      if (crit) earn('fair-winds', i)
      if (prevStatus === 'missed' || prevStatus === 'shielded') earn('hotfix', i)
      if (completeDays >= 30 && cachesUsed === 0) earn('iron-will', i)
      const last = lastTick(ticks, taskIds)
      if (last !== null) {
        // Only ticks made during the day's own game day count (not a grace-morning catch-up).
        const at = new Date(last)
        if (currentDayKey(at, rollover) === dateKey) {
          const h = at.getHours()
          if (h >= rollover && h < 9) earn('early-riser', i)
          if (h >= 23 || h < rollover) earn('night-march', i)
        }
      }
    }
    if (streak >= 7) earn('week-on-ice', i)
    if (streak >= 14) earn('fortnight', i)
    if (status === 'shielded') earn('blizzard-survived', i)
    if (HELD.has(status)) {
      if (i === 15) earn('one-ton-depot', i)
      if (i === 30) earn('beardmore', i)
      if (i === 45) earn('plateau', i)
    }
    prevStatus = status
  }

  const day60 = days[ARC_DAYS - 1]
  let phase: ArcSummary['phase']
  if (todayIndex < 1) phase = 'scheduled'
  else if (todayIndex > ARC_DAYS && day60.status !== 'grace') phase = 'finished'
  else phase = 'active'

  let outcome: ArcSummary['outcome'] = null
  if (phase === 'finished') {
    const held = days.filter((d) => HELD.has(d.status)).length
    if (completeDays === ARC_DAYS) outcome = 'perfect'
    else if (held >= POLE_THRESHOLD) outcome = 'pole'
    else outcome = 'short'
    if (outcome !== 'short') earn('the-pole', ARC_DAYS)
    if (outcome === 'perfect') earn('flawless', ARC_DAYS)
  }

  const today = todayIndex >= 1 && todayIndex <= ARC_DAYS ? days[todayIndex - 1] : null
  const graceDay = days.find((d) => d.status === 'grace') ?? null

  // Settled days: complete/shielded/missed. A complete today counts here too,
  // so uptime's numerator and denominator always cover the same days.
  const settled = days.filter((d) => SETTLED.has(d.status))
  const uptime = settled.length ? completeDays / settled.length : 0

  // perTask: settled days before today, plus today (ticked or not) while it is active.
  const taskDays = days.filter((d) => d.index < todayIndex && SETTLED.has(d.status))
  if (today) taskDays.push(today)
  const perTask = arc.tasks.map((task) => ({
    task,
    done: taskDays.reduce((n, d) => n + (typeof arc.completions[d.dateKey]?.[task.id] === 'number' ? 1 : 0), 0),
    possible: taskDays.length,
  }))

  const totalXp = days.reduce((n, d) => n + d.xp, 0)
  const lastActive = days[Math.min(todayIndex, ARC_DAYS) - 1]

  const medals: MedalState[] = MEDALS.map((m) => {
    const on = earned.get(m.id)
    return on === undefined ? { ...m, earned: false } : { ...m, earned: true, earnedOn: on }
  })

  return {
    arc,
    days,
    todayIndex,
    today,
    grace: graceDay,
    streak: lastActive ? lastActive.streakAfter : 0,
    bestStreak,
    caches: lastActive ? lastActive.cachesAfter : START_CACHES,
    cachesUsed,
    totalXp,
    miles: Math.round((totalXp / XP_PER_MILE) * 10) / 10,
    rank: rankFor(totalXp),
    medals,
    completeDays,
    uptime,
    perTask,
    phase,
    outcome,
  }
}

export function celebrationKey(arcId: string, dateKey: string): string {
  return `${arcId}:${dateKey}`
}

/** True if the "camp made" celebration for this day has not been shown yet. */
export function shouldCelebrate(state: AppState, arcId: string, day: DayResult): boolean {
  return day.status === 'complete' && !state.celebrated.includes(celebrationKey(arcId, day.dateKey))
}
