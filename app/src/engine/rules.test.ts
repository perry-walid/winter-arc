import { describe, expect, it } from 'vitest'
import type { Arc } from './types'
import { addDays } from './dates'
import {
  ARC_DAYS,
  MEDALS,
  fnv1a,
  isCrit,
  rankFor,
  shouldCelebrate,
  summarize,
  xpFor,
} from './rules'
import { ARC_ID, at, completeDay, completeDays, makeArc, range, stateWith } from './testUtils'

// Jan 5 .. Mar 5 2026: no DST transition inside the arc.
const START = '2026-01-05'
const dayKey = (i: number) => addDays(START, i - 1)
const run = (arc: Arc, now: Date) => summarize(stateWith(arc), arc, now)
const medal = (s: ReturnType<typeof run>, id: string) => s.medals.find((m) => m.id === id)!

describe('ranks and XP curve', () => {
  it('xpFor spans 0..11600 rounded to 50', () => {
    expect(xpFor(1)).toBe(0)
    expect(xpFor(10)).toBe(11600)
    for (let L = 1; L <= 10; L++) expect(xpFor(L) % 50).toBe(0)
    for (let L = 2; L <= 10; L++) expect(xpFor(L)).toBeGreaterThan(xpFor(L - 1))
    expect(xpFor(2)).toBe(450) // 11600 * (1/9)^1.5 = 429.6
  })

  it('rankFor picks the highest reached level', () => {
    expect(rankFor(0)).toEqual({ level: 1, title: 'Deckhand', minXp: 0, nextXp: xpFor(2) })
    expect(rankFor(xpFor(2) - 1).level).toBe(1)
    expect(rankFor(xpFor(2)).title).toBe('Stoker')
    expect(rankFor(xpFor(5)).title).toBe('Dog Driver')
    expect(rankFor(11599).title).toBe('Lieutenant')
    expect(rankFor(11600)).toEqual({ level: 10, title: 'Commander', minXp: 11600, nextXp: null })
    expect(rankFor(99999).level).toBe(10)
  })
})

describe('crit', () => {
  it('uses standard 32-bit FNV-1a', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
    expect(fnv1a('foobar')).toBe(0xbf9cf968)
  })

  it('is deterministic per arc id and day, with a plausible rate', () => {
    for (const i of range(1, 60)) expect(isCrit(ARC_ID, i)).toBe(isCrit(ARC_ID, i))
    expect(isCrit(ARC_ID, 7)).toBe(fnv1a(`${ARC_ID}:7`) % 1000 < 150)
    let hits = 0
    for (let i = 0; i < 2000; i++) if (isCrit(`arc-${i}`, 1)) hits++
    expect(hits / 2000).toBeGreaterThan(0.1)
    expect(hits / 2000).toBeLessThan(0.2)
  })

  it('applies only to complete days and adds 50', () => {
    const critDay = range(1, 60).find((i) => isCrit(ARC_ID, i))!
    const arc = completeDays(makeArc(START), range(1, critDay))
    const s = run(arc, at(dayKey(critDay), 21))
    const d = s.days[critDay - 1]
    expect(d.crit).toBe(true)
    expect(d.xpBreakdown.crit).toBe(50)
    expect(medal(s, 'fair-winds')).toMatchObject({ earned: true, earnedOn: range(1, 60).find((i) => isCrit(ARC_ID, i)) })

    const partial = { ...makeArc(START), completions: { [dayKey(critDay)]: { t1: at(dayKey(critDay), 9).getTime() } } }
    const p = run(partial, at(dayKey(critDay), 21)).days[critDay - 1]
    expect(p.crit).toBe(false)
    expect(p.xp).toBe(33)
  })
})

describe('daily XP', () => {
  it('complete day: tasks + perfect + streak (+crit)', () => {
    const arc = completeDays(makeArc(START), range(1, 3))
    const s = run(arc, at(dayKey(3), 21))
    const d3 = s.days[2]
    expect(d3.status).toBe('complete')
    expect(d3.xpBreakdown).toEqual({ tasks: 100, perfect: 50, streak: 15, crit: isCrit(ARC_ID, 3) ? 50 : 0 })
  })

  it('today incomplete shows live tasks part; future earns 0', () => {
    const arc = { ...makeArc(START), completions: { [dayKey(1)]: { t1: 1, t2: 2 } } }
    const s = run(arc, at(dayKey(1), 15))
    expect(s.today?.status).toBe('today')
    expect(s.today?.xp).toBe(67)
    expect(s.days[1]).toMatchObject({ status: 'future', xp: 0 })
  })

  it('shielded and missed days earn only the tasks part', () => {
    const arc: Arc = { ...makeArc(START), completions: { [dayKey(1)]: { t1: 1 }, [dayKey(2)]: { t1: 1, t2: 2 } } }
    const s = run(arc, at(dayKey(3), 15))
    expect(s.days[0]).toMatchObject({ status: 'shielded', xp: 33 })
    expect(s.days[1]).toMatchObject({ status: 'missed', xp: 67 })
  })

  it('a perfect 60-day run totals 11775 + 50 per crit and ranks Commander', () => {
    const arc = completeDays(makeArc(START), range(1, 60))
    const s = run(arc, at(dayKey(62), 12))
    const crits = range(1, 60).filter((i) => isCrit(ARC_ID, i)).length
    // 60*(100+50) + streak bonus (5+10+...+45 for days 1..9, then 50 x 51 days) + crits
    expect(s.totalXp).toBe(9000 + 225 + 2550 + 50 * crits)
    expect(s.totalXp).toBe(11775 + 50 * crits)
    expect(s.miles).toBe(Math.round(s.totalXp) / 10)
    expect(s.rank.title).toBe('Commander')
    expect(s.days.filter((d) => d.crit).length).toBe(crits)
  })
})

describe('rollover and grace', () => {
  it('02:30 still counts as the previous day', () => {
    const s = run(makeArc(START), at(dayKey(2), 2, 30))
    expect(s.todayIndex).toBe(1)
    expect(s.today?.dateKey).toBe(dayKey(1))
    expect(run(makeArc(START), at(dayKey(2), 3, 0)).todayIndex).toBe(2)
  })

  it('yesterday is editable at 11:59 and settles at 12:00 (shielded)', () => {
    const arc = completeDays(makeArc(START), range(1, 4))
    const before = run(arc, at(dayKey(6), 11, 59))
    expect(before.days[4]).toMatchObject({ status: 'grace', editable: true, streakAfter: 4, cachesAfter: 1 })
    expect(before.grace?.index).toBe(5)
    expect(before.streak).toBe(4)
    expect(before.caches).toBe(1)

    const after = run(arc, at(dayKey(6), 12, 0))
    expect(after.days[4]).toMatchObject({ status: 'shielded', editable: false, streakAfter: 4, cachesAfter: 0 })
    expect(after.grace).toBeNull()
    expect(after.streak).toBe(4)
    expect(after.caches).toBe(0)
    expect(after.cachesUsed).toBe(1)
  })

  it('an incomplete grace day settles as missed at noon when no cache is left', () => {
    // day 2 missed -> shielded (cache 1 -> 0); days 3..5 complete; day 6 open in grace.
    const arc = completeDays(makeArc(START), [1, 3, 4, 5])
    const before = run(arc, at(dayKey(7), 9))
    expect(before.days[5].status).toBe('grace')
    expect(before.streak).toBe(4)
    const after = run(arc, at(dayKey(7), 12))
    expect(after.days[5]).toMatchObject({ status: 'missed', streakAfter: 0 })
    expect(after.streak).toBe(0)
    expect(after.bestStreak).toBe(4)
  })

  it('a complete yesterday stays editable until noon but counts as complete', () => {
    const arc = completeDays(makeArc(START), range(1, 5))
    const s = run(arc, at(dayKey(6), 10))
    expect(s.days[4]).toMatchObject({ status: 'complete', editable: true, streakAfter: 5 })
    expect(s.grace).toBeNull()
    expect(s.streak).toBe(5)
    expect(s.days[3].editable).toBe(false)
  })

  it("today's incomplete state never breaks the streak", () => {
    const arc = completeDays(makeArc(START), range(1, 3))
    const s = run(arc, at(dayKey(4), 23))
    expect(s.today?.status).toBe('today')
    expect(s.streak).toBe(3)
    const done = run(completeDay(arc, 4), at(dayKey(4), 23))
    expect(done.today?.status).toBe('complete')
    expect(done.today?.editable).toBe(true)
    expect(done.streak).toBe(4)
  })
})

describe('supply caches', () => {
  it('start at 1: first miss shielded, second miss resets the streak', () => {
    const arc = completeDays(makeArc(START), [1, 2, 3, 5])
    const s = run(arc, at(dayKey(7), 15))
    expect(s.days[3]).toMatchObject({ status: 'shielded', streakAfter: 3, cachesAfter: 0 })
    expect(s.days[4]).toMatchObject({ status: 'complete', streakAfter: 4 })
    expect(s.days[5]).toMatchObject({ status: 'missed', streakAfter: 0, cachesAfter: 0 })
    expect(s.streak).toBe(0)
    expect(s.cachesUsed).toBe(1)
    expect(medal(s, 'blizzard-survived')).toMatchObject({ earned: true, earnedOn: 4 })
  })

  it('earn one at every 7-day streak, capped at 2', () => {
    const arc = completeDays(makeArc(START), range(1, 21))
    const s = run(arc, at(dayKey(22), 15))
    expect(s.days[5].cachesAfter).toBe(1)
    expect(s.days[6].cachesAfter).toBe(2)
    expect(s.days[13].cachesAfter).toBe(2)
    expect(s.days[20].cachesAfter).toBe(2)
    expect(s.caches).toBe(2)
  })

  it('a shielded day keeps the streak count, so the next cache comes at the next multiple of 7', () => {
    // 1..3 complete, 4 shielded (caches 0), 5..8 complete -> streak 7 on day 8 earns a cache.
    const arc = completeDays(makeArc(START), [1, 2, 3, 5, 6, 7, 8])
    const s = run(arc, at(dayKey(9), 15))
    expect(s.days[7]).toMatchObject({ streakAfter: 7, cachesAfter: 1 })
  })
})

describe('DST', () => {
  const DST_START = '2026-03-01'

  it('day index is correct across spring forward', () => {
    const arc = makeArc(DST_START)
    expect(run(arc, new Date(2026, 2, 9, 2, 30)).todayIndex).toBe(8)
    const s = run(arc, new Date(2026, 2, 9, 3, 30))
    expect(s.todayIndex).toBe(9)
    expect(s.today?.dateKey).toBe('2026-03-09')
    expect(s.days[8].dateKey).toBe('2026-03-09')
    expect(s.days[59].dateKey).toBe('2026-04-29')
  })

  it('day index is correct after fall back (arc long finished)', () => {
    const s = run(makeArc(DST_START), new Date(2026, 10, 2, 12, 0))
    expect(s.todayIndex).toBe(247)
    expect(s.phase).toBe('finished')
    expect(s.today).toBeNull()
  })
})

describe('phase, finishing and outcome', () => {
  it('is scheduled before the start date', () => {
    const s = run(makeArc(START), at('2026-01-04', 20))
    expect(s).toMatchObject({ phase: 'scheduled', todayIndex: 0, today: null, outcome: null, streak: 0, caches: 1 })
    expect(s.days.every((d) => d.status === 'future' && !d.editable)).toBe(true)
  })

  it('day 60 is active on day 60 and editable during its grace on day 61', () => {
    const arc = completeDays(makeArc(START), range(1, 59))
    expect(run(arc, at(dayKey(60), 20))).toMatchObject({ phase: 'active', todayIndex: 60, outcome: null })

    const grace = run(arc, at(dayKey(61), 10))
    expect(grace).toMatchObject({ phase: 'active', todayIndex: 61, today: null, outcome: null })
    expect(grace.days[59]).toMatchObject({ status: 'grace', editable: true })
  })

  it('day 60 completed during its grace on day 61 finishes the arc as perfect', () => {
    const arc = completeDay(completeDays(makeArc(START), range(1, 59)), 60, 24 + 10) // ticked 10:00 on day 61
    const s = run(arc, at(dayKey(61), 10, 5))
    expect(s.days[59]).toMatchObject({ status: 'complete', editable: true })
    expect(s).toMatchObject({ phase: 'finished', outcome: 'perfect', completeDays: 60, streak: 60, uptime: 1 })
    expect(medal(s, 'flawless')).toMatchObject({ earned: true, earnedOn: 60 })
    expect(medal(s, 'the-pole').earned).toBe(true)

    const later = run(arc, at(dayKey(61), 12))
    expect(later.days[59].editable).toBe(false)
    expect(later.outcome).toBe('perfect')
  })

  it('day 60 unfinished settles at noon on day 61 (pole via a cache)', () => {
    const arc = completeDays(makeArc(START), range(1, 59))
    const s = run(arc, at(dayKey(61), 12))
    expect(s.days[59].status).toBe('shielded')
    expect(s).toMatchObject({ phase: 'finished', outcome: 'pole', completeDays: 59 })
    expect(medal(s, 'flawless').earned).toBe(false)
    expect(medal(s, 'the-pole')).toMatchObject({ earned: true, earnedOn: 60 })
  })

  it('pole threshold is 54 held days; fewer is short', () => {
    const missing = (n: number) => completeDays(makeArc(START), range(1, ARC_DAYS - n))
    // Last n days missed: the first is shielded (caches available), the rest are missed.
    const pole = run(missing(5), at(dayKey(62), 12)) // 55 complete + 2 shielded (caches 2 from streaks)
    expect(pole.outcome).toBe('pole')
    const s = run(missing(10), at(dayKey(62), 12)) // 50 complete + 2 shielded = 52
    expect(s.days.filter((d) => d.status === 'shielded').length).toBe(2)
    expect(s.outcome).toBe('short')
    expect(medal(s, 'the-pole').earned).toBe(false)

    // Exact boundary: 54 held -> pole, 53 held -> short.
    const held = (x: ReturnType<typeof run>) => x.days.filter((d) => d.status === 'complete' || d.status === 'shielded').length
    const at54 = run(missing(8), at(dayKey(62), 12))
    expect(held(at54)).toBe(54)
    expect(at54.outcome).toBe('pole')
    const at53 = run(missing(9), at(dayKey(62), 12))
    expect(held(at53)).toBe(53)
    expect(at53.outcome).toBe('short')
  })

  it('nothing is editable once an arc has ended', () => {
    const arc = { ...completeDays(makeArc(START), range(1, 3)), endedAt: 1, endReason: 'abandoned' as const }
    const s = run(arc, at(dayKey(4), 10))
    expect(s.days.some((d) => d.editable)).toBe(false)
  })
})

describe('stats', () => {
  it('uptime and perTask cover settled days plus today', () => {
    const base = completeDays(makeArc(START), [1, 2])
    // day 3 shielded with only t1, today (day 4) has t2 ticked
    const arc: Arc = {
      ...base,
      completions: { ...base.completions, [dayKey(3)]: { t1: 1 }, [dayKey(4)]: { t2: 2 } },
    }
    const s = run(arc, at(dayKey(4), 15))
    expect(s.completeDays).toBe(2)
    expect(s.uptime).toBeCloseTo(2 / 3)
    expect(s.perTask.map((p) => [p.task.id, p.done, p.possible])).toEqual([
      ['t1', 3, 4],
      ['t2', 3, 4],
      ['t3', 2, 4],
    ])
  })

  it('uptime never exceeds 1 when today is complete', () => {
    const s = run(completeDays(makeArc(START), [1]), at(dayKey(1), 21))
    expect(s.uptime).toBe(1)
    expect(s.perTask[0]).toMatchObject({ done: 1, possible: 1 })
  })

  it('uptime is 0 with nothing settled', () => {
    expect(run(makeArc(START), at(dayKey(1), 9)).uptime).toBe(0)
  })
})

describe('medals', () => {
  it('defines 15 unique medals with glyphs', () => {
    expect(MEDALS).toHaveLength(15)
    expect(new Set(MEDALS.map((m) => m.id)).size).toBe(15)
    for (const m of MEDALS) {
      expect(m.name).toBeTruthy()
      expect(m.description).toBeTruthy()
      expect(m.glyph.length).toBeGreaterThanOrEqual(1)
      expect(m.glyph.length).toBeLessThanOrEqual(4)
    }
  })

  it('articles-sealed is always earned on day 0', () => {
    expect(medal(run(makeArc(START), at('2026-01-01', 9)), 'articles-sealed')).toMatchObject({ earned: true, earnedOn: 0 })
  })

  it('first-camp, week-on-ice, fortnight, one-ton-depot', () => {
    const arc = completeDays(makeArc(START), range(2, 16))
    const s = run(arc, at(dayKey(17), 15))
    expect(medal(s, 'first-camp').earnedOn).toBe(2)
    expect(medal(s, 'week-on-ice').earnedOn).toBe(8)
    expect(medal(s, 'fortnight').earnedOn).toBe(15)
    expect(medal(s, 'one-ton-depot').earnedOn).toBe(15)
    expect(medal(s, 'beardmore').earned).toBe(false)
  })

  it('early-riser: last tick before 09:00 on the day itself', () => {
    const arc = completeDay(makeArc(START), 1, 7, 30)
    expect(medal(run(arc, at(dayKey(1), 8)), 'early-riser')).toMatchObject({ earned: true, earnedOn: 1 })
    const late = completeDay(makeArc(START), 1, 9, 0)
    expect(medal(run(late, at(dayKey(1), 10)), 'early-riser').earned).toBe(false)
    // A grace-morning catch-up at 08:00 the next day does not count.
    const catchUp = completeDay(makeArc(START), 1, 24 + 8)
    const s = run(catchUp, at(dayKey(2), 8, 30))
    expect(s.days[0].status).toBe('complete')
    expect(medal(s, 'early-riser').earned).toBe(false)
  })

  it('night-march: last tick at 23:00+ or before the rollover', () => {
    expect(medal(run(completeDay(makeArc(START), 1, 23, 10), at(dayKey(1), 23, 30)), 'night-march').earned).toBe(true)
    const s = run(completeDay(makeArc(START), 1, 24 + 2, 30), at(dayKey(2), 2, 45))
    expect(medal(s, 'night-march')).toMatchObject({ earned: true, earnedOn: 1 })
    expect(medal(s, 'early-riser').earned).toBe(false)
  })

  it('hotfix: a complete day right after a slip', () => {
    const s = run(completeDays(makeArc(START), [1, 3]), at(dayKey(4), 15))
    expect(s.days[1].status).toBe('shielded')
    expect(medal(s, 'hotfix')).toMatchObject({ earned: true, earnedOn: 3 })
    expect(medal(run(completeDays(makeArc(START), [1, 2]), at(dayKey(3), 15)), 'hotfix').earned).toBe(false)
  })

  it('flawless, the-pole, iron-will, plateau on a perfect run', () => {
    const s = run(completeDays(makeArc(START), range(1, 60)), at(dayKey(62), 12))
    expect(s.outcome).toBe('perfect')
    expect(medal(s, 'flawless')).toMatchObject({ earned: true, earnedOn: 60 })
    expect(medal(s, 'iron-will')).toMatchObject({ earned: true, earnedOn: 30 })
    expect(medal(s, 'plateau').earnedOn).toBe(45)
    expect(medal(s, 'blizzard-survived').earned).toBe(false)
  })

  it('iron-will is lost once a cache was used first', () => {
    const s = run(completeDays(makeArc(START), [1, ...range(3, 40)]), at(dayKey(41), 15))
    expect(s.completeDays).toBe(39)
    expect(medal(s, 'iron-will').earned).toBe(false)
  })
})

describe('shouldCelebrate', () => {
  it('only for complete days not yet celebrated', () => {
    const arc = completeDay(makeArc(START), 1)
    const state = stateWith(arc)
    const s = summarize(state, arc, at(dayKey(1), 21))
    expect(shouldCelebrate(state, ARC_ID, s.days[0])).toBe(true)
    expect(shouldCelebrate({ ...state, celebrated: [`${ARC_ID}:${dayKey(1)}`] }, ARC_ID, s.days[0])).toBe(false)
    expect(shouldCelebrate(state, ARC_ID, s.days[1])).toBe(false)
  })
})
