import { Scene } from './Scene'
import { unlock } from './sound'

/** Cold-launch title card. The app dismisses it after a beat; a tap skips it (and unlocks audio). */
export function Boot({ line, onDone }: { line: string | null; onDone: () => void }) {
  return (
    <button
      className="overlay"
      style={{ all: 'unset', position: 'absolute', inset: 0, zIndex: 50, background: '#030714', cursor: 'pointer' }}
      onClick={() => {
        unlock()
        onDone()
      }}
      aria-label="Open the log"
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <Scene variant="full" />
      </div>
      <BootTitle />
      {line && (
        <div className="num" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--safe-bottom) + 48px)', textAlign: 'center', fontSize: 12, letterSpacing: '0.1em', color: '#c9d6f2', fontWeight: 600 }}>
          {line}
        </div>
      )}
    </button>
  )
}

export function BootTitle({ top = '34%' }: { top?: string }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
      <span className="label" style={{ letterSpacing: '0.4em' }}>Vol. I · Sixty days</span>
      <span className="display gold-text" style={{ fontSize: 58, lineHeight: '64px', filter: 'drop-shadow(0 4px 18px rgba(255,181,74,.35))' }}>
        Winter Arc
      </span>
      <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 19, color: '#dce6fa' }}>A journal of the southern journey</span>
    </div>
  )
}
