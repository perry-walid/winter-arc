import { useEffect, useRef, useState } from 'react'
import { unlock } from './sound'

const C = 2 * Math.PI * 52

/** Press-and-hold wax seal. Irreversible actions use a hold rather than a tap. */
export function HoldButton({ label, onComplete, ms = 1400, glyph = 'WA' }: { label: string; onComplete: () => void; ms?: number; glyph?: string }) {
  const [p, setP] = useState(0)
  const raf = useRef(0)
  const startAt = useRef(0)
  const done = useRef(false)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const frame = () => {
    const v = Math.min(1, (performance.now() - startAt.current) / ms)
    setP(v)
    if (v >= 1) {
      if (!done.current) {
        done.current = true
        onComplete()
      }
      return
    }
    raf.current = requestAnimationFrame(frame)
  }
  const start = () => {
    if (done.current) return
    unlock()
    startAt.current = performance.now()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(frame)
  }
  const stop = () => {
    if (done.current) return
    cancelAnimationFrame(raf.current)
    setP(0)
  }

  return (
    <button
      className="hold-ring"
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        start()
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start()
      }}
      onKeyUp={stop}
    >
      <svg width="116" height="116" viewBox="0 0 116 116" aria-hidden="true">
        <circle cx="58" cy="58" r="52" fill="none" stroke="rgba(255,210,122,.18)" strokeWidth="4" />
        <circle
          cx="58" cy="58" r="52" fill="none" stroke="#FFD27A" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 58 58)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255,210,122,.8))' }}
        />
      </svg>
      <span className="wax" style={{ width: 86, height: 86, transform: `scale(${1 - p * 0.08})` }}>
        <span style={{ width: 58, height: 58, fontSize: 22 }}>{glyph}</span>
      </span>
    </button>
  )
}
