import { useState } from 'react'
import type { ArcSummary, DateKey, DayResult } from '../engine/types'
import { xpFor } from '../engine/rules'
import { diffDays } from '../engine/dates'
import { Scene } from './Scene'
import { Chevrons, IconCache, IconCheck, IconLantern, IconSnow } from './icons'
import { formatDate, formatTime, miles, pad2, temperature } from './format'

const POLE_XP = xpFor(10)

export function Today({ s, currentKey, onToggle }: { s: ArcSummary; currentKey: DateKey; onToggle: (dateKey: DateKey, taskId: string) => void }) {
  const [view, setView] = useState<'today' | 'yesterday'>('today')
  // On the morning after day 60 there is no "today": only the final camp, open until noon.
  const finalMorning = !s.today && s.phase === 'active' && s.todayIndex > 60
  const yesterday = s.grace ?? (finalMorning ? s.days[59] : null)
  const showingGrace = (view === 'yesterday' || finalMorning) && !!yesterday
  const day: DayResult | null = showingGrace ? yesterday : s.today
  const scheduled = s.phase === 'scheduled'
  const dayIndex = scheduled ? 0 : (day?.index ?? Math.min(60, s.todayIndex))
  const toPole = Math.max(0, POLE_XP - s.totalXp)
  const r = s.rank
  const rankPct = r.nextXp == null ? 100 : ((s.totalXp - r.minXp) / (r.nextXp - r.minXp)) * 100
  const ticks = day ? (s.arc.completions[day.dateKey] ?? {}) : {}
  const firstOpen = s.arc.tasks.find((t) => !ticks[t.id])?.id
  const perTaskMiles = miles(Math.round(100 / s.arc.tasks.length))
  const daysUntil = scheduled ? diffDays(s.arc.startDate, currentKey) : 0

  return (
    <div className="fade-in">
      <div className="hero">
        <Scene variant="hero" />
        <div className="hero-top">
          <div className="stack">
            <span className="label">{s.arc.name}</span>
            {scheduled ? (
              <span className="display gold-text" style={{ fontSize: 44, lineHeight: '54px' }}>
                Departs in {daysUntil}d
              </span>
            ) : (
              <span className="display gold-text" style={{ fontSize: 58, lineHeight: '64px' }}>
                Camp {pad2(dayIndex)}
              </span>
            )}
            <span className="num" style={{ fontSize: 14, fontWeight: 500, color: '#c9d6f2', marginTop: 2 }}>
              {scheduled ? `Departure ${formatDate(s.arc.startDate, true)}` : `of sixty · ${miles(toPole)} mi to the Pole`}
            </span>
          </div>
          <span className="chip num" style={{ marginTop: 6 }}>
            <IconSnow stroke="#9FE7FF" />
            {temperature(dayIndex)}°C
          </span>
        </div>
        <div className="hero-chips">
          <span className="chip lantern" aria-label={`${s.streak} unbroken marches`}>
            <IconLantern />
            <b className="num">{s.streak}</b> unbroken
          </span>
          <span className="chip" aria-label={`Supply caches: ${s.caches} of 2`}>
            <IconCache full={s.caches >= 1} />
            <IconCache full={s.caches >= 2} />
            caches
          </span>
        </div>
      </div>

      <div className="sheet">
        <div className="row">
          <div className="insignia">
            <Chevrons />
          </div>
          <div className="stack" style={{ flex: 1, gap: 6 }}>
            <div className="between" style={{ alignItems: 'baseline' }}>
              <span className="display" style={{ fontSize: 19, color: 'var(--cream)' }}>
                {r.title}
              </span>
              <span className="num" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {r.nextXp == null ? `${miles(s.totalXp)} mi` : `${miles(s.totalXp - r.minXp)}/${miles(r.nextXp - r.minXp)} mi`}
              </span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={Math.round(rankPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next rank">
              <i style={{ width: `${Math.max(2, Math.min(100, rankPct))}%` }} />
            </div>
          </div>
        </div>

        {s.grace && s.today && !scheduled && (
          <div className="segmented" role="group" aria-label="Which day">
            <button aria-pressed={view === 'today'} onClick={() => setView('today')}>
              Today · Camp {pad2(s.today?.index ?? dayIndex)}
            </button>
            <button aria-pressed={view === 'yesterday'} onClick={() => setView('yesterday')}>
              Yesterday · {s.grace.total - s.grace.done} open
            </button>
          </div>
        )}
        {showingGrace && yesterday && yesterday.status !== 'complete' && (
          <div className="notice">Camp {pad2(yesterday.index)} stays open until 12:00. Finish it to keep your streak and caches.</div>
        )}

        <div className="between" style={{ marginTop: 2 }}>
          <span className="display" style={{ fontSize: 22, color: 'var(--cream)' }}>
            {scheduled ? 'Your orders' : finalMorning ? 'The final camp' : showingGrace ? 'Yesterday’s orders' : 'Today’s orders'}
          </span>
          {day && (
            <div className="segments" aria-label={`${day.done} of ${day.total} kept`}>
              {s.arc.tasks.map((t) => (
                <i key={t.id} className={ticks[t.id] ? 'on' : ''} />
              ))}
              <span className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--aurora)', marginLeft: 6 }}>
                {day.done}/{day.total}
              </span>
            </div>
          )}
        </div>

        <div className="orders">
          {s.arc.tasks.map((t) => {
            const at = ticks[t.id]
            const editable = !!day?.editable
            const cls = ['order', at ? 'done' : t.id === firstOpen && editable ? 'next' : '', editable ? '' : 'locked'].join(' ')
            return (
              <button
                key={t.id}
                className={cls}
                aria-pressed={!!at}
                disabled={!editable}
                onClick={() => day && editable && onToggle(day.dateKey, t.id)}
              >
                <span className="seal">{at && <IconCheck stroke="#FFE9D6" />}</span>
                <span className="txt">{t.label}</span>
                <span className="meta num">{at ? formatTime(at) : editable ? `+${perTaskMiles} mi` : ''}</span>
              </button>
            )
          })}
        </div>

        {day && !scheduled && <Footnote day={day} grace={!!showingGrace} />}
        {scheduled && (
          <div className="notice ice">The articles are sealed. Your first march begins {formatDate(s.arc.startDate, true)}.</div>
        )}
      </div>
    </div>
  )
}

function Footnote({ day, grace }: { day: DayResult; grace: boolean }) {
  const open = day.total - day.done
  let text: string
  if (day.status === 'complete') text = `Camp made. ${miles(day.xp)} mi marched${day.crit ? ' with fair winds' : ''}.`
  else if (grace) text = `${open} ${open === 1 ? 'order' : 'orders'} outstanding from yesterday.`
  else if (day.done === 0) text = 'The day is young. Light fails at 03:00.'
  else text = `${open} ${open === 1 ? 'order' : 'orders'} outstanding. Light fails at 03:00. Press on.`
  return <p style={{ margin: '2px 0 0', fontSize: 14, color: day.status === 'complete' ? 'var(--aurora)' : 'var(--text-2)' }}>{text}</p>
}
