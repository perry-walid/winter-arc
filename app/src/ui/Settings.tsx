import { useRef, useState } from 'react'
import type { AppState, ArcSummary } from '../engine/types'
import { exportJson, importJson } from '../engine/store'
import { HoldButton } from './HoldButton'
import { Portal } from './Portal'
import { IconClose } from './icons'
import { formatDate } from './format'
import { isStandalone } from './InstallGate'

type Props = {
  state: AppState
  s: ArcSummary | null
  onClose: () => void
  onSound: (on: boolean) => void
  onBackedUp: () => void
  onImport: (next: AppState) => void
  onAbandon: () => void
  toast: (msg: string) => void
}

export function Settings({ state, s, onClose, onSound, onBackedUp, onImport, onAbandon, toast }: Props) {
  const file = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<AppState | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)

  const doExport = async () => {
    const json = exportJson(state)
    const d = new Date()
    const name = `winter-arc-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
    const f = new File([json], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: 'Winter Arc backup' })
      } else {
        const url = URL.createObjectURL(f)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
      onBackedUp()
      toast('Backup saved')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Backup failed')
    }
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setPending(importJson(await f.text()))
    } catch (err) {
      toast((err as Error).message || 'That file is not a Winter Arc backup')
    }
  }

  const last = state.lastBackupAt ? new Date(state.lastBackupAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'never'

  return (
    <Portal>
      <div className="backdrop" onClick={onClose} />
      <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="grabber" />
        <div className="between" style={{ marginBottom: 14 }}>
          <span className="display" style={{ fontSize: 26, color: 'var(--cream)' }}>Settings</span>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="setting">
            <span style={{ fontWeight: 600 }}>Sound</span>
            <button className="toggle" role="switch" aria-checked={state.settings.sound} aria-label="Sound" onClick={() => onSound(!state.settings.sound)} />
          </div>
          <div className="setting">
            <div className="stack">
              <span style={{ fontWeight: 600 }}>Day closes at</span>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Yesterday stays open until noon</span>
            </div>
            <span className="num muted">03:00</span>
          </div>
        </div>

        <span className="label" style={{ display: 'block', margin: '0 4px 8px' }}>Backup</span>
        <div className="card" style={{ padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>
            Your log lives only on this phone. Save a backup to Files or iCloud now and then. Last backup: <b style={{ color: 'var(--text)' }}>{last}</b>.
          </span>
          <button className="btn btn-gold" onClick={doExport}>Save backup</button>
          <button className="btn btn-ghost" onClick={() => file.current?.click()}>Restore from backup…</button>
          <input ref={file} type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} aria-label="Backup file" />
          {pending && (
            <div className="notice" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span>
                Replace your current log with this backup ({pending.arcs.length} {pending.arcs.length === 1 ? 'expedition' : 'expeditions'})? This can’t be undone.
              </span>
              <div className="row">
                <button className="btn btn-ghost" style={{ flex: 1, minHeight: 44 }} onClick={() => setPending(null)}>Cancel</button>
                <button
                  className="btn btn-danger" style={{ flex: 1, minHeight: 44 }}
                  onClick={() => {
                    onImport(pending)
                    setPending(null)
                    toast('Backup restored')
                    onClose()
                  }}
                >
                  Replace
                </button>
              </div>
            </div>
          )}
        </div>

        {s && (
          <>
            <span className="label" style={{ display: 'block', margin: '0 4px 8px' }}>Expedition</span>
            <div className="card" style={{ padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{s.arc.name}</span>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>
                Departed {formatDate(s.arc.startDate, true)} · ends {formatDate(s.days[59].dateKey, true)}. The sealed orders can’t be amended.
              </span>
              {!confirmAbandon ? (
                <button className="btn btn-danger" style={{ marginTop: 6 }} onClick={() => setConfirmAbandon(true)}>Abandon expedition…</button>
              ) : (
                <div className="stack" style={{ alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 14, color: '#ff9b9b', textAlign: 'center' }}>Hold the seal to abandon. Your progress on this arc will be archived and you’ll start over.</span>
                  <HoldButton label="Hold to abandon the expedition" glyph="×" ms={2200} onComplete={onAbandon} />
                  <button className="btn" style={{ minHeight: 44, color: 'var(--text-2)' }} onClick={() => setConfirmAbandon(false)}>Keep marching</button>
                </div>
              )}
            </div>
          </>
        )}

        {!isStandalone() && (
          <div className="notice ice" style={{ marginBottom: 14 }}>
            You’re in Safari. Add Winter Arc to your Home Screen (Share → Add to Home Screen) and restore a backup there to keep one log.
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', margin: '6px 0 0' }}>Winter Arc · v1.0 · stored on this device only</p>
      </div>
    </Portal>
  )
}
