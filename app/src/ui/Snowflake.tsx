import { useId } from 'react'
import type { DayResult } from '../engine/types'

/**
 * Generative crystal: each of the 60 days adds a ring along the six arms.
 * A complete day grows a branch pair whose length depends on a per-day seed;
 * partial days grow a shorter, fainter branch; missed days leave a gap; shielded days a blue bead.
 */
export function Snowflake({ days, size = 180, seed = 'arc' }: { days: DayResult[]; size?: number; seed?: string }) {
  const raw = useId()
  const gid = `${raw.replace(/[^a-zA-Z0-9]/g, '')}-glow`
  const reached = days.filter((d) => d.status !== 'future')
  const R = 86 // arm length at day 60
  const step = R / 62
  const armLen = 16 + Math.max(reached.length, 1) * step

  const branches: { r: number; len: number; op: number; color: string; w: number }[] = []
  const beads: { r: number }[] = []
  for (const d of reached) {
    const r = 6 + d.index * step
    const frac = d.total ? d.done / d.total : 0
    const h = hash(`${seed}:${d.index}`)
    if (d.status === 'shielded') {
      beads.push({ r })
      continue
    }
    if (d.status === 'missed' && frac === 0) continue
    const maxLen = 6 + (h % 1000) / 1000 * 16 * (1 - d.index / 90)
    const complete = d.status === 'complete'
    branches.push({
      r,
      len: maxLen * (complete ? 1 : 0.35 + 0.4 * frac),
      op: complete ? 1 : 0.45,
      color: complete ? (d.crit ? '#FFD27A' : '#E8FAFF') : '#9FE7FF',
      w: complete ? 1.8 : 1.2,
    })
  }

  const arm = (
    <g>
      <path d={`M0 0V${-armLen}`} />
      {branches.map((b, i) => {
        const dx = b.len * Math.sin(Math.PI / 3)
        const dy = b.len * Math.cos(Math.PI / 3)
        return (
          <path key={i} d={`M0 ${-b.r}l${-dx} ${-dy}M0 ${-b.r}l${dx} ${-dy}`} stroke={b.color} strokeOpacity={b.op} strokeWidth={b.w} />
        )
      })}
      {beads.map((b, i) => (
        <circle key={`b${i}`} cy={-b.r} r="2.4" fill="#4E93C6" stroke="none" />
      ))}
    </g>
  )

  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" role="img" aria-label={`Snowflake grown over ${reached.length} of 60 days`}>
      <defs>
        <filter id={gid} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <circle r="96" fill="none" stroke="#9FE7FF" strokeOpacity="0.2" strokeDasharray="2 5" />
      {[0, 1].map((layer) => (
        <g
          key={layer}
          stroke={layer ? '#E8FAFF' : '#9FE7FF'}
          strokeWidth={layer ? 2 : 5}
          strokeLinecap="round"
          fill="none"
          opacity={layer ? 1 : 0.4}
          filter={layer ? undefined : `url(#${gid})`}
        >
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              {arm}
            </g>
          ))}
        </g>
      ))}
      <circle r="5" fill="#E8FAFF" />
    </svg>
  )
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
