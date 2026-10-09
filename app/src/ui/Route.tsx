import { useMemo, useState } from 'react'
import type { ArcSummary, DayResult } from '../engine/types'
import { IconCheck, IconClose } from './icons'
import { Portal } from './Portal'
import { formatDate, formatTime, miles, pad2 } from './format'

const W = 390
const H = 600
const POLE: [number, number] = [195, 92]
const CTRL: [number, number][] = [[64, 572], [384, 486], [-14, 270], POLE]
const LANDMARKS: Record<number, string> = { 1: 'Base Hut', 15: 'One Ton Depot', 30: 'Beardmore Glacier', 45: 'Polar Plateau', 60: 'The Pole' }

function bezier(t: number): [number, number] {
  const u = 1 - t
  const [a, b, c, d] = CTRL
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ]
}

const STATUS_LABEL: Record<DayResult['status'], string> = {
  future: 'Ahead',
  today: 'Today',
  grace: 'Open until noon',
  complete: 'Camp made',
  shielded: 'Blizzard · cache spent',
  missed: 'Blizzard · march lost',
}

export function Route({ s }: { s: ArcSummary }) {
  const [open, setOpen] = useState<DayResult | null>(null)
  const pos = useMemo(() => Array.from({ length: 60 }, (_, i) => bezier(i / 59)), [])
  const reachedIdx = Math.min(60, Math.max(0, s.todayIndex))
  const pathD = (n: number) => pos.slice(0, n).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const shielded = s.days.filter((d) => d.status === 'shielded').length
  const missed = s.days.filter((d) => d.status === 'missed').length

  return (
    <div className="fade-in" style={{ height: '100%', minHeight: 560, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 50% 22%, #1b3470 0%, #0c1a40 38%, #060c22 75%)' }}>
      <div style={{ padding: 'calc(var(--safe-top) + 14px) var(--gutter) 0' }}>
        <span className="label">Chart of the southern journey</span>
        <h1 className="display" style={{ margin: 0, fontSize: 30, lineHeight: '36px', color: 'var(--cream)' }}>
          Route to the Pole
        </h1>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', flex: 1, minHeight: 0 }} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Route map: camp ${reachedIdx} of 60`}>
        <defs>
          <radialGradient id="pole-glow">
            <stop offset="0" stopColor="#FFF6DC" />
            <stop offset=".25" stopColor="#FFD27A" stopOpacity=".8" />
            <stop offset="1" stopColor="#FFB54A" stopOpacity="0" />
          </radialGradient>
          <filter id="trail-glow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        <g fill="none" stroke="#9FE7FF" strokeOpacity=".13">
          {[70, 150, 230, 310, 390, 470, 550].map((r) => <circle key={r} cx={POLE[0]} cy={POLE[1]} r={r} />)}
          <path d={`M${POLE[0]} ${POLE[1]} L-60 ${H} M${POLE[0]} ${POLE[1]} L60 ${H} M${POLE[0]} ${POLE[1]} L195 ${H} M${POLE[0]} ${POLE[1]} L330 ${H} M${POLE[0]} ${POLE[1]} L450 ${H} M${POLE[0]} ${POLE[1]} L-100 400 M${POLE[0]} ${POLE[1]} L490 400`} />
        </g>
        <g fontSize="9" fill="#7C8DB0" letterSpacing="1" fontFamily="-apple-system, system-ui, sans-serif">
          <text x="268" y="162">85°S</text><text x="320" y="262">80°S</text><text x="358" y="364">75°S</text>
        </g>
        <path d={pathD(60)} fill="none" stroke="#9FE7FF" strokeOpacity=".35" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
        {reachedIdx > 1 && (
          <>
            <path d={pathD(reachedIdx)} fill="none" stroke="#FFB54A" strokeWidth="6" strokeOpacity=".35" filter="url(#trail-glow)" />
            <path d={pathD(reachedIdx)} fill="none" stroke="#FFD27A" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        <circle cx={POLE[0]} cy={POLE[1]} r="34" fill="url(#pole-glow)" />
        <path d={`M${POLE[0]} ${POLE[1] - 18} l3 12 12 3 -12 3 -3 12 -3 -12 -12 -3 12 -3z`} fill="#FFF6DC" />

        {s.days.map((d, i) => {
          const [x, y] = pos[i]
          return (
            <g key={d.index} role="button" tabIndex={d.status === 'future' ? -1 : 0} aria-label={`Camp ${d.index}: ${STATUS_LABEL[d.status]}`} onClick={() => d.status !== 'future' && setOpen(d)} onKeyDown={(e) => e.key === 'Enter' && d.status !== 'future' && setOpen(d)} style={{ cursor: d.status === 'future' ? 'default' : 'pointer' }}>
              <circle cx={x} cy={y} r="13" fill="transparent" />
              <Dot d={d} x={x} y={y} landmark={!!LANDMARKS[d.index]} />
            </g>
          )
        })}
        {Object.entries(LANDMARKS).map(([k, name]) => {
          const n = Number(k)
          const [x, y] = pos[n - 1]
          const text = n === 60 ? name : `${name} · ${n}`
          return <Pill key={k} x={n === 60 ? x - 40 : n === 1 ? x - 20 : x + 12} y={n === 60 ? y + 26 : n === 1 ? y + 14 : y - 10} text={text} strong={n === 60} />
        })}
        {s.phase === 'active' && s.todayIndex >= 1 && s.todayIndex <= 60 && (() => {
          const [x, y] = pos[s.todayIndex - 1]
          return <Pill x={x + 16} y={y - 12} text={`You · Camp ${pad2(s.todayIndex)}`} you />
        })()}
      </svg>

      <div className="stat-grid" style={{ padding: '0 16px 20px' }}>
        <div className="stat" style={{ background: 'rgba(12,22,49,.78)', boxShadow: 'inset 0 0 0 1px rgba(255,210,122,.25)' }}>
          <span className="display num" style={{ color: 'var(--gold-hi)' }}>{s.completeDays}</span>
          <span>camps made</span>
        </div>
        <div className="stat" style={{ background: 'rgba(12,22,49,.78)', boxShadow: 'inset 0 0 0 1px rgba(159,231,255,.25)' }}>
          <span className="display num" style={{ color: 'var(--ice)' }}>{shielded}{missed ? <span style={{ color: '#ff9b9b' }}> / {missed}</span> : null}</span>
          <span>{missed ? 'caches / lost' : 'caches used'}</span>
        </div>
        <div className="stat" style={{ background: 'rgba(12,22,49,.78)', boxShadow: 'inset 0 0 0 1px rgba(159,231,255,.15)' }}>
          <span className="display num" style={{ color: 'var(--cream)' }}>{Math.max(0, 60 - Math.max(s.todayIndex, 0))}</span>
          <span>camps to go</span>
        </div>
      </div>

      {open && <DaySheet s={s} d={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Dot({ d, x, y, landmark }: { d: DayResult; x: number; y: number; landmark: boolean }) {
  switch (d.status) {
    case 'complete':
      return <circle cx={x} cy={y} r="5" fill={d.crit ? '#FFF1C9' : '#FFD27A'} stroke="#0C1A40" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 5px rgba(255,181,74,.8))' }} />
    case 'shielded':
      return <rect x={x - 6} y={y - 6} width="12" height="12" rx="3" fill="#4E93C6" stroke="#0C1A40" strokeWidth="2" />
    case 'missed':
      return <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} stroke="#FF8A8A" strokeWidth="2.4" strokeLinecap="round" />
    case 'today':
    case 'grace':
      return (
        <g>
          <circle cx={x} cy={y} r="14" fill="rgba(255,181,74,.15)" className={d.status === 'today' ? 'pulse' : undefined} />
          <circle cx={x} cy={y} r="9" fill="#0C1A40" stroke={d.status === 'today' ? '#FFB54A' : '#FFD27A'} strokeWidth="3" strokeDasharray={d.status === 'grace' ? '3 3' : undefined} />
        </g>
      )
    default:
      return landmark ? <circle cx={x} cy={y} r="6" fill="#0C1A40" stroke="#E3B860" strokeWidth="2" /> : <circle cx={x} cy={y} r="2.6" fill="rgba(159,231,255,.45)" />
  }
}

function Pill({ x, y, text, strong, you }: { x: number; y: number; text: string; strong?: boolean; you?: boolean }) {
  const w = text.length * 6.1 + 18
  return (
    <g transform={`translate(${Math.min(Math.max(4, x), W - w - 4)} ${y})`} pointerEvents="none">
      <rect width={w} height="22" rx="11" fill={you ? '#FFB54A' : 'rgba(6,12,34,.86)'} stroke={you ? 'none' : strong ? 'rgba(255,210,122,.7)' : 'rgba(227,184,96,.35)'} />
      <text x={w / 2} y="15" textAnchor="middle" fontSize="11" fontWeight="600" fontFamily="-apple-system, system-ui, sans-serif" fill={you ? '#2A1A05' : strong ? '#FFF1C9' : '#E3D3AE'}>
        {text}
      </text>
    </g>
  )
}

function DaySheet({ s, d, onClose }: { s: ArcSummary; d: DayResult; onClose: () => void }) {
  const ticks = s.arc.completions[d.dateKey] ?? {}
  return (
    <Portal>
      <div className="backdrop" onClick={onClose} />
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={`Camp ${d.index}`}>
        <div className="grabber" />
        <div className="between">
          <div className="stack">
            <span className="label">{formatDate(d.dateKey, true)} · {STATUS_LABEL[d.status]}</span>
            <span className="display" style={{ fontSize: 28, color: 'var(--cream)' }}>Camp {pad2(d.index)}</span>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <div className="stack" style={{ gap: 8, marginTop: 14 }}>
          {s.arc.tasks.map((t) => (
            <div key={t.id} className={`order ${ticks[t.id] ? 'done' : ''} locked`} style={{ opacity: 1 }}>
              <span className="seal">{ticks[t.id] && <IconCheck stroke="#FFE9D6" />}</span>
              <span className="txt">{t.label}</span>
              <span className="meta num">{ticks[t.id] ? formatTime(ticks[t.id]) : '—'}</span>
            </div>
          ))}
        </div>
        <p className="num" style={{ margin: '14px 0 0', color: 'var(--text-2)', fontSize: 14 }}>
          {d.done}/{d.total} orders kept · {miles(d.xp)} mi marched{d.crit ? ' · fair winds' : ''}
        </p>
      </div>
    </Portal>
  )
}
