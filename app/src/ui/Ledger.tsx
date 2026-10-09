import { useState } from 'react'
import type { ArcSummary, MedalState } from '../engine/types'
import { Snowflake } from './Snowflake'
import { Chevrons, IconClose, IconGear } from './icons'
import { MedalArt, roman } from './CampMade'
import { miles } from './format'
import { Portal } from './Portal'

const RINGS = ['#4E93C6', '#C9302C', '#46F0B5', '#9B7BFF', '#E3B860']

export function Ledger({ s, onSettings }: { s: ArcSummary; onSettings: () => void }) {
  const [medal, setMedal] = useState<MedalState | null>(null)
  const r = s.rank
  const pct = r.nextXp == null ? 100 : ((s.totalXp - r.minXp) / (r.nextXp - r.minXp)) * 100
  const earned = s.medals.filter((m) => m.earned).length
  const reached = s.days.filter((d) => d.status !== 'future').length

  return (
    <div className="pad fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'linear-gradient(180deg, #08112b, #0c1631 40%, #070d22)', minHeight: '100%' }}>
      <div className="between">
        <div className="stack">
          <span className="label">Ship’s ledger</span>
          <h1 className="display" style={{ margin: 0, fontSize: 30, lineHeight: '36px', color: 'var(--cream)' }}>Service record</h1>
        </div>
        <button className="icon-btn" aria-label="Settings" onClick={onSettings}><IconGear stroke="#C9D6F2" /></button>
      </div>

      <div className="card-gold row" style={{ padding: 16, gap: 14 }}>
        <div className="insignia lg"><Chevrons size={32} /></div>
        <div className="stack" style={{ flex: 1, gap: 6 }}>
          <span className="display" style={{ fontSize: 24, lineHeight: '28px', color: '#ffe7b0' }}>{r.title}</span>
          <span className="num" style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Grade {roman(r.level)} of X · {miles(s.totalXp)} mi marched
          </span>
          <div className="bar" style={{ height: 6, background: '#0a1430' }}><i style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} /></div>
          <span className="num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {r.nextXp == null ? 'Highest rank attained' : `${miles(r.nextXp - s.totalXp)} mi to the next rank`}
          </span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><span className="display num" style={{ color: 'var(--amber)' }}>{s.streak}</span><span>unbroken</span></div>
        <div className="stat"><span className="display num" style={{ color: 'var(--cream)' }}>{s.bestStreak}</span><span>longest march</span></div>
        <div className="stat"><span className="display num" style={{ color: 'var(--aurora)' }}>{Math.round(s.uptime * 100)}%</span><span>days kept</span></div>
      </div>

      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, minHeight: 214, display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px 12px 6px', background: 'radial-gradient(circle at 28% 50%, #1c3a7a, #0a1534 70%)', boxShadow: 'inset 0 0 0 1px rgba(159,231,255,.22)' }}>
        <div style={{ flex: 'none' }}>
          <Snowflake days={s.days} seed={s.arc.id} size={190} />
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="label" style={{ color: 'var(--ice)' }}>Specimen {String(reached).padStart(2, '0')}/60</span>
          <span className="display" style={{ fontSize: 22, lineHeight: '26px', color: '#f4f8ff' }}>Your crystal</span>
          <span style={{ fontSize: 13, lineHeight: '18px', color: 'var(--text-2)' }}>
            Grows a ring every camp, shaped by the orders you keep. Yours to keep at the Pole.
          </span>
        </div>
      </div>

      <div className="between" style={{ alignItems: 'baseline', marginTop: 4 }}>
        <span className="display" style={{ fontSize: 20, color: 'var(--cream)' }}>Medals</span>
        <span className="num" style={{ fontSize: 13, color: 'var(--text-2)' }}>{earned} of {s.medals.length}</span>
      </div>
      <div className="medals">
        {s.medals.map((m, i) => (
          <button key={m.id} className={`medal ${m.earned ? 'on' : ''}`} style={{ ['--ring' as string]: RINGS[i % RINGS.length] }} onClick={() => setMedal(m)} aria-label={`${m.name}${m.earned ? ', earned' : ', locked'}`}>
            <span className="disc">{m.earned ? m.glyph : '?'}</span>
            <span className="cap">{m.name}</span>
          </button>
        ))}
      </div>

      <span className="display" style={{ fontSize: 20, color: 'var(--cream)', marginTop: 4 }}>Record by order</span>
      <div className="card" style={{ padding: '6px 16px' }}>
        {s.perTask.map(({ task, done, possible }) => {
          const p = possible ? done / possible : 0
          return (
            <div key={task.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="between">
                <span style={{ fontSize: 15, fontWeight: 600 }}>{task.label}</span>
                <span className="num" style={{ fontSize: 13, color: 'var(--text-2)' }}>{done}/{possible}</span>
              </div>
              <div className="bar" style={{ height: 5 }}>
                <i style={{ width: `${p * 100}%`, background: p >= 0.8 ? 'linear-gradient(90deg,#2bd4e0,#46f0b5)' : 'linear-gradient(90deg,#b07d2a,#ffd27a)', boxShadow: 'none' }} />
              </div>
            </div>
          )
        })}
      </div>

      {medal && (
        <Portal>
          <div className="backdrop" onClick={() => setMedal(null)} />
          <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={medal.name}>
            <div className="grabber" />
            <div className="between" style={{ alignItems: 'flex-start' }}>
              <div className="row" style={{ gap: 14 }}>
                {medal.earned ? <MedalArt glyph={medal.glyph} /> : <span className="medal"><span className="disc" style={{ width: 64, height: 64, fontSize: 20 }}>?</span></span>}
                <div className="stack" style={{ gap: 4 }}>
                  <span className="label" style={{ color: medal.earned ? 'var(--gold-hi)' : undefined }}>
                    {medal.earned ? (medal.earnedOn ? `Awarded at camp ${medal.earnedOn}` : 'Awarded') : 'Not yet awarded'}
                  </span>
                  <span className="display" style={{ fontSize: 24, color: 'var(--cream)' }}>{medal.name}</span>
                  <span style={{ fontSize: 15, color: 'var(--text-2)' }}>{medal.description}</span>
                </div>
              </div>
              <button className="icon-btn" aria-label="Close" onClick={() => setMedal(null)}><IconClose /></button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
