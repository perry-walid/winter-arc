import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, DateKey, DayResult, MedalState, Rank } from './engine/types'
import { currentDayKey } from './engine/dates'
import { shouldCelebrate, summarize } from './engine/rules'
import {
  abandonArc, activeArc, archiveFinished, createArc, loadState, markBackedUp, markCelebrated,
  requestPersistence, saveState, setSound, toggleTask,
} from './engine/store'
import { Boot } from './ui/Boot'
import { CampMade } from './ui/CampMade'
import { Finished } from './ui/Finished'
import { InstallGate, isIOS, isStandalone } from './ui/InstallGate'
import { Ledger } from './ui/Ledger'
import { Onboarding } from './ui/Onboarding'
import { Route } from './ui/Route'
import { Settings } from './ui/Settings'
import { Today } from './ui/Today'
import { IconLedger, IconLog, IconRoute } from './ui/icons'
import { setSoundEnabled, sfxCamp, sfxSeal, sfxTick, sfxUntick } from './ui/sound'
import { pad2 } from './ui/format'

type Tab = 'log' | 'route' | 'ledger'
type Celebration = { day: DayResult; newMedals: MedalState[]; promoted: Rank | null }

/** Re-render on a timer and whenever the app returns to the foreground, so days roll over on their own. */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 30_000)
    const vis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [])
  return [now, () => setNow(new Date())] as const
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [now, refreshNow] = useNow()
  const [booting, setBooting] = useState(true)
  const [tab, setTab] = useState<Tab>('log')
  const [settings, setSettings] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [gateDismissed, setGateDismissed] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<number>(undefined)

  useEffect(() => {
    loadState()
      .then((s) => {
        setState(s)
        setSoundEnabled(s.settings.sound)
      })
      .catch((e) => setLoadError(String(e?.message ?? e)))
    void requestPersistence()
  }, [])

  useEffect(() => {
    if (!state || !booting) return
    const t = setTimeout(() => setBooting(false), 1700)
    return () => clearTimeout(t)
  }, [state, booting])

  const commit = useCallback((next: AppState) => {
    setState(next)
    setSoundEnabled(next.settings.sound)
    saveState(next).catch(() => toast('Could not save. Is storage full?'))
  }, [])

  const toast = (msg: string) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2400)
  }

  const arc = state ? activeArc(state) : undefined
  const s = useMemo(() => (state && arc ? summarize(state, arc, now) : null), [state, arc, now])

  const onToggle = (dateKey: DateKey, taskId: string) => {
    if (!state || !arc || !s) return
    const tapAt = new Date()
    const next = toggleTask(state, arc.id, dateKey, taskId, tapAt)
    if (next === state) {
      refreshNow()
      return
    }
    const ticked = !!next.arcs.find((a) => a.id === arc.id)?.completions[dateKey]?.[taskId]
    const nextArc = activeArc(next)!
    const after = summarize(next, nextArc, tapAt)
    const day = after.days.find((d) => d.dateKey === dateKey)
    if (ticked && day && shouldCelebrate(next, arc.id, day)) {
      const before = new Set(s.medals.filter((m) => m.earned).map((m) => m.id))
      setCelebration({
        day,
        newMedals: after.medals.filter((m) => m.earned && !before.has(m.id) && m.id !== 'articles-sealed'),
        promoted: after.rank.level > s.rank.level ? after.rank : null,
      })
      commit(markCelebrated(next, arc.id, dateKey))
      sfxCamp()
    } else {
      commit(next)
      if (ticked) sfxTick()
      else sfxUntick()
    }
    refreshNow()
  }

  if (loadError) {
    return (
      <div className="app" id="app-root">
        <div className="pad">
          <h1 className="display" style={{ color: 'var(--cream)' }}>The log could not be opened</h1>
          <p className="muted">{loadError}</p>
          <button className="btn btn-gold" onClick={() => location.reload()}>Try again</button>
        </div>
      </div>
    )
  }

  const bootLine = s && s.phase === 'active' ? `CAMP ${pad2(Math.min(60, s.todayIndex))}  ·  ${s.streak} UNBROKEN  ·  ${s.rank.title.toUpperCase()}` : null
  const showGate = state && !arc && !gateDismissed && isIOS() && !isStandalone()

  return (
    <div className="app" id="app-root">
      {state && !arc && !showGate && (
        <Onboarding
          todayKey={currentDayKey(now, state.settings.rolloverHour)}
          onSeal={(input) => {
            try {
              commit(createArc(state, input, new Date()))
              sfxSeal()
              setTab('log')
              toast('Articles sealed. Godspeed.')
            } catch (e) {
              toast((e as Error).message)
            }
          }}
        />
      )}
      {showGate && <InstallGate onContinue={() => setGateDismissed(true)} />}

      {state && s && (
        <>
          <main className="screen" key={tab}>
            {tab === 'log' && (s.phase === 'finished' ? (
              <Finished s={s} onNew={() => commit(archiveFinished(state, s.arc.id, new Date()))} />
            ) : (
              <Today s={s} currentKey={currentDayKey(now, state.settings.rolloverHour)} onToggle={onToggle} />
            ))}
            {tab === 'route' && <Route s={s} />}
            {tab === 'ledger' && <Ledger s={s} onSettings={() => setSettings(true)} />}
          </main>
          <nav className="tabbar" aria-label="Sections">
            <button className="tab" aria-current={tab === 'log' ? 'page' : undefined} onClick={() => setTab('log')}>
              <IconLog />
              Log
            </button>
            <button className="tab" aria-current={tab === 'route' ? 'page' : undefined} onClick={() => setTab('route')}>
              <IconRoute />
              Route
            </button>
            <button className="tab" aria-current={tab === 'ledger' ? 'page' : undefined} onClick={() => setTab('ledger')}>
              <IconLedger />
              Ledger
            </button>
          </nav>
        </>
      )}

      {state && settings && (
        <Settings
          state={state}
          s={s}
          onClose={() => setSettings(false)}
          onSound={(on) => commit(setSound(state, on))}
          onBackedUp={() => commit(markBackedUp(state, new Date()))}
          onImport={(next) => {
            commit(next)
            setTab('log')
          }}
          onAbandon={() => {
            if (!arc) return
            commit(abandonArc(state, arc.id, new Date()))
            setSettings(false)
            toast('Expedition abandoned')
          }}
          toast={toast}
        />
      )}

      {celebration && s && (
        <CampMade s={s} day={celebration.day} newMedals={celebration.newMedals} promoted={celebration.promoted} onClose={() => setCelebration(null)} />
      )}

      {(booting || !state) && <Boot line={bootLine} onDone={() => state && setBooting(false)} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  )
}
