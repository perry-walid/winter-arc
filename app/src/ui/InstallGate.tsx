import { Scene } from './Scene'
import { BootTitle } from './Boot'

export function isStandalone() {
  return (
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  )
}

export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Safari tabs and home-screen apps keep separate storage on iOS, so an arc started
 * in a tab would vanish after installing. Nudge to install before the first arc.
 */
export function InstallGate({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="overlay" style={{ background: '#030714' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Scene variant="full" />
      </div>
      <BootTitle top="14%" />
      <div style={{ position: 'absolute', left: 'var(--gutter)', right: 'var(--gutter)', bottom: 'calc(var(--safe-bottom) + 24px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: 18, background: 'rgba(12,22,49,.88)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="display" style={{ fontSize: 21, color: 'var(--cream)' }}>Install before you depart</span>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, color: 'var(--text-2)' }}>
            <li>
              Tap <b style={{ color: 'var(--text)' }}>Share</b>{' '}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9FE7FF" strokeWidth="2" style={{ display: 'inline', verticalAlign: '-3px' }} aria-hidden="true">
                <path d="M12 3v12M8 7l4-4 4 4M5 12v8h14v-8" />
              </svg>{' '}
              in Safari’s toolbar
            </li>
            <li>
              Choose <b style={{ color: 'var(--text)' }}>Add to Home Screen</b>
            </li>
            <li>Open Winter Arc from your home screen</li>
          </ol>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Your log is stored on this phone, and Safari keeps it separate from the installed app.</span>
        </div>
        <button className="btn btn-ghost" onClick={onContinue}>
          Continue in Safari anyway
        </button>
      </div>
    </div>
  )
}
