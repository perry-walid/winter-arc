import type { ArcSummary, DayResult, MedalState, Rank } from '../engine/types'
import { Scene } from './Scene'
import { formatTime, miles, pad2 } from './format'

export function CampMade({
  s, day, newMedals, promoted, onClose,
}: { s: ArcSummary; day: DayResult; newMedals: MedalState[]; promoted: Rank | null; onClose: () => void }) {
  const b = day.xpBreakdown
  const ticks = Object.values(s.arc.completions[day.dateKey] ?? {})
  const last = ticks.length ? Math.max(...ticks) : Date.now()
  const r = s.rank
  const rankPct = r.nextXp == null ? 100 : ((s.totalXp - r.minXp) / (r.nextXp - r.minXp)) * 100
  const words = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT']

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Camp ${day.index} made`} style={{ background: '#050a1c' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Scene variant="celebrate" tent={false} />
      </div>
      <div style={{ position: 'relative', minHeight: '100%', padding: 'calc(var(--safe-top) + 26px) var(--gutter) calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 2 }}>
          <span className="label" style={{ color: '#a9f5d6', letterSpacing: '0.3em' }}>
            All orders kept
          </span>
          <span className="display gold-text" style={{ fontSize: 44, lineHeight: '52px', filter: 'drop-shadow(0 4px 20px rgba(255,181,74,.45))' }}>
            Camp {pad2(day.index)} made
          </span>
        </div>

        <div className="telegram" style={{ margin: '0 8px' }}>
          <div className="between" style={{ borderBottom: '2px solid var(--ink)', paddingBottom: 6 }}>
            <span className="label" style={{ color: 'var(--ink)', fontSize: 13 }}>
              Telegram
            </span>
            <span className="num" style={{ fontSize: 11, color: '#5a4428', marginRight: 44 }}>
              No. {String(day.index).padStart(3, '0')} · {formatTime(last)}
            </span>
          </div>
          <div className="wire">
            CAMP {pad2(day.index)} MADE STOP ALL {words[day.total] ?? day.total} ORDERS KEPT STOP{' '}
            {s.streak >= 7 ? `${s.streak} MARCHES UNBROKEN STOP` : 'SPIRITS HIGH STOP'}
          </div>
          <div className="rows">
            <div><span>Orders kept {day.done}/{day.total}</span><span>{miles(b.tasks)} mi</span></div>
            <div><span>Full march</span><span>{miles(b.perfect)} mi</span></div>
            {b.streak > 0 && <div><span>{day.streakAfter} {day.streakAfter === 1 ? 'march' : 'marches'} unbroken</span><span>{miles(b.streak)} mi</span></div>}
            {day.crit && <div style={{ color: '#1f5f8b', fontWeight: 700 }}><span>Fair winds! ×2</span><span>{miles(b.crit)} mi</span></div>}
          </div>
          <div className="between" style={{ alignItems: 'baseline', borderTop: '2px solid var(--ink)', paddingTop: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Marched today</span>
            <span className="display num" style={{ fontSize: 36, lineHeight: '40px', color: '#8a2a1f' }}>
              {miles(day.xp)} mi
            </span>
          </div>
          <div className="wax" style={{ position: 'absolute', right: -10, top: -26, width: 64, height: 64, transform: 'rotate(14deg)' }}>
            <span style={{ width: 42, height: 42, fontSize: 16 }}>WA</span>
          </div>
        </div>

        {promoted && (
          <div className="card-gold row" style={{ padding: 14, marginTop: 8 }}>
            <div className="insignia lg">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFD27A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 6l7 4 7-4M5 11l7 4 7-4M5 16l7 4 7-4" /></svg>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span className="label" style={{ color: 'var(--gold-hi)' }}>Promoted</span>
              <span className="display" style={{ fontSize: 24, color: '#ffe7b0' }}>{promoted.title}</span>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>Grade {roman(promoted.level)} of X</span>
            </div>
          </div>
        )}

        {newMedals.map((m) => (
          <div key={m.id} className="card-gold row" style={{ padding: 14, marginTop: promoted ? 0 : 8 }}>
            <MedalArt glyph={m.glyph} />
            <div className="stack" style={{ gap: 3, flex: 1 }}>
              <span className="label" style={{ color: 'var(--gold-hi)' }}>Medal awarded</span>
              <span className="display" style={{ fontSize: 22, lineHeight: '26px', color: 'var(--cream)' }}>{m.name}</span>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{m.description}</span>
            </div>
          </div>
        ))}

        <div className="stack" style={{ gap: 6 }}>
          <div className="between num" style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, letterSpacing: '0.06em' }}>
            <span>{r.title.toUpperCase()}</span>
            <span>{r.nextXp == null ? 'HIGHEST RANK' : `${miles(r.nextXp - s.totalXp)} MI TO NEXT RANK`}</span>
          </div>
          <div className="bar"><i style={{ width: `${Math.max(2, Math.min(100, rankPct))}%` }} /></div>
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn btn-gold" onClick={onClose} autoFocus>
          Rest until dawn
        </button>
      </div>
    </div>
  )
}

export function MedalArt({ glyph }: { glyph: string }) {
  return (
    <svg width="56" height="78" viewBox="0 0 56 78" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <radialGradient id="medal-g" cx=".38" cy=".32" r=".7">
          <stop offset="0" stopColor="#FFF0C0" />
          <stop offset=".5" stopColor="#E3B860" />
          <stop offset="1" stopColor="#8C6A1F" />
        </radialGradient>
      </defs>
      <path d="M14 0h12l4 30H18z" fill="#1F5F8B" />
      <path d="M30 0h12l-4 30H26z" fill="#F4F7FF" />
      <path d="M20 0h4l2 30h-4zM34 0h4l-4 30h-4z" fill="#C9302C" />
      <circle cx="28" cy="52" r="22" fill="url(#medal-g)" />
      <circle cx="28" cy="52" r="16" fill="none" stroke="#7A5A14" strokeWidth="1.5" />
      <text x="28" y="57.5" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontWeight="700" fontSize={glyph.length > 2 ? 11 : 15} fill="#5A3F0A">
        {glyph}
      </text>
    </svg>
  )
}

export function roman(n: number) {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n)
}
