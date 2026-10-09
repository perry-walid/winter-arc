import type { ArcSummary } from '../engine/types'
import { Scene } from './Scene'
import { Snowflake } from './Snowflake'
import { miles } from './format'
import { roman } from './CampMade'

const COPY = {
  perfect: { kicker: 'Sixty of sixty', title: 'Flawless. The Pole, unbroken.', body: 'Every order, every day. Few have marched like this.' },
  pole: { kicker: 'Expedition complete', title: 'You reached the Pole.', body: 'Through blizzards and long nights, the flag is planted.' },
  short: { kicker: 'The expedition returns', title: 'The ice held you back.', body: 'Not every journey reaches the Pole. The next one starts closer.' },
} as const

export function Finished({ s, onNew }: { s: ArcSummary; onNew: () => void }) {
  const c = COPY[s.outcome ?? 'short']
  return (
    <div className="fade-in" style={{ position: 'relative', minHeight: '100%', background: '#050a1c' }}>
      <div style={{ position: 'absolute', inset: 0, height: 420, overflow: 'hidden' }}>
        <Scene variant="celebrate" />
      </div>
      <div className="pad" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <span className="label" style={{ color: '#a9f5d6', letterSpacing: '0.3em', marginTop: 20 }}>{c.kicker}</span>
        <h1 className="display gold-text" style={{ margin: 0, fontSize: 38, lineHeight: '44px' }}>{c.title}</h1>
        <p style={{ margin: 0, color: '#dce6fa', fontSize: 16 }}>{c.body}</p>
        <div style={{ margin: '8px 0', filter: 'drop-shadow(0 0 30px rgba(159,231,255,.35))' }}>
          <Snowflake days={s.days} seed={s.arc.id} size={240} />
        </div>
        <div className="stat-grid" style={{ width: '100%' }}>
          <div className="stat"><span className="display num" style={{ color: 'var(--gold-hi)' }}>{s.completeDays}</span><span>camps made</span></div>
          <div className="stat"><span className="display num" style={{ color: 'var(--amber)' }}>{s.bestStreak}</span><span>longest march</span></div>
          <div className="stat"><span className="display num" style={{ color: 'var(--cream)' }}>{miles(s.totalXp)}</span><span>miles</span></div>
        </div>
        <div className="card-gold" style={{ width: '100%', padding: 16 }}>
          <span className="label" style={{ color: 'var(--gold-hi)' }}>Final rank</span>
          <div className="display" style={{ fontSize: 26, color: '#ffe7b0' }}>{s.rank.title}</div>
          <div className="num" style={{ fontSize: 13, color: 'var(--text-2)' }}>Grade {roman(s.rank.level)} of X · {s.medals.filter((m) => m.earned).length} medals</div>
        </div>
        <button className="btn btn-gold" style={{ width: '100%', marginTop: 8 }} onClick={onNew}>
          Archive & plan a new expedition
        </button>
      </div>
    </div>
  )
}
