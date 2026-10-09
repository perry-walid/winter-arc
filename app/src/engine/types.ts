// Contract between the game engine (src/engine) and the UI (src/ui).
// Everything the UI shows is derived from AppState + `now` by pure functions in the engine.

/** Local calendar date, 'YYYY-MM-DD'. */
export type DateKey = string

export interface Task {
  id: string
  label: string
}

export interface Arc {
  id: string
  name: string
  /** First day of the arc (day 1), local calendar date. */
  startDate: DateKey
  tasks: Task[]
  /** epoch ms */
  createdAt: number
  /** dateKey -> taskId -> epoch ms when ticked */
  completions: Record<DateKey, Record<string, number>>
  /** Set when the arc has been archived after finishing or abandoning. */
  endedAt?: number
  endReason?: 'finished' | 'abandoned'
}

export interface Settings {
  sound: boolean
  /** Hour (0-23) at which a new day begins. Fixed at 3 for v1. */
  rolloverHour: number
}

export interface AppState {
  version: 1
  activeArcId: string | null
  arcs: Arc[]
  settings: Settings
  /** Day keys whose "camp made" celebration has already been shown, per arc: `${arcId}:${dateKey}` */
  celebrated: string[]
  /** epoch ms of the last export, for backup nudges */
  lastBackupAt?: number
}

export type DayStatus =
  | 'future' // not reached yet
  | 'today' // the current day, still open
  | 'grace' // yesterday, incomplete, still editable until noon
  | 'complete' // every task ticked
  | 'shielded' // missed, but a supply cache was spent to protect the streak
  | 'missed' // missed, streak broken

export interface DayResult {
  /** 1..60 */
  index: number
  dateKey: DateKey
  status: DayStatus
  done: number
  total: number
  /** XP earned this day (0 for future). 1 mile = 10 XP. */
  xp: number
  xpBreakdown: { tasks: number; perfect: number; streak: number; crit: number }
  crit: boolean
  /** Streak after this day is settled. */
  streakAfter: number
  /** Caches available after this day is settled. */
  cachesAfter: number
  /** Whether the user may tick/untick tasks for this day right now. */
  editable: boolean
}

export interface Rank {
  level: number // 1..10
  title: string
  /** XP threshold to reach this level */
  minXp: number
  /** XP threshold of the next level, null at max */
  nextXp: number | null
}

export interface MedalDef {
  id: string
  name: string
  description: string
  glyph: string
}

export interface MedalState extends MedalDef {
  earned: boolean
  /** day index at which it was earned */
  earnedOn?: number
}

export interface ArcSummary {
  arc: Arc
  days: DayResult[] // always 60 entries
  /** index of the current day (1..60), or 61+ if the arc's 60 days have passed, 0 if not started */
  todayIndex: number
  today: DayResult | null
  /** yesterday, if it is in grace */
  grace: DayResult | null
  streak: number
  bestStreak: number
  caches: number
  cachesUsed: number
  totalXp: number
  miles: number
  rank: Rank
  medals: MedalState[]
  completeDays: number
  /** complete / settled days (0..1) */
  uptime: number
  perTask: { task: Task; done: number; possible: number }[]
  phase: 'scheduled' | 'active' | 'finished'
  /** when finished: reached the pole (>= 54 complete+shielded), perfect (60 complete) */
  outcome: null | 'perfect' | 'pole' | 'short'
}
