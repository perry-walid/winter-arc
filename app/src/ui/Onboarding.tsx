import { useState } from 'react'
import type { DateKey } from '../engine/types'
import { addDays } from '../engine/dates'
import { Scene } from './Scene'
import { HoldButton } from './HoldButton'
import { formatDate } from './format'
import { IconCheck } from './icons'

const PRESETS = [
  'Train for 60 minutes',
  'Read 10 pages',
  'No sugar',
  'Two hours of deep work',
  'Drink 3 litres of water',
  'Lights out by 23:00',
  'Cold shower',
  'No social media',
  'Solve one coding problem',
  'Walk 10,000 steps',
  'Journal for 5 minutes',
  'Meditate 10 minutes',
]
const MIN = 3
const MAX = 8

export function Onboarding({ todayKey, onSeal }: { todayKey: DateKey; onSeal: (a: { name: string; startDate: DateKey; tasks: string[] }) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Winter Arc')
  const [start, setStart] = useState<DateKey>(todayKey)
  const [tasks, setTasks] = useState<string[]>([])
  const [custom, setCustom] = useState('')

  const toggle = (t: string) =>
    setTasks((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= MAX ? cur : [...cur, t]))
  const addCustom = () => {
    const t = custom.trim().slice(0, 60)
    if (!t || tasks.some((x) => x.toLowerCase() === t.toLowerCase()) || tasks.length >= MAX) return
    setTasks((cur) => [...cur, t])
    setCustom('')
  }
  const customs = tasks.filter((t) => !PRESETS.includes(t))
  const maxStart = addDays(todayKey, 14)

  if (step === 0) {
    return (
      <div className="screen full" style={{ background: '#030714' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Scene variant="full" />
        </div>
        <div className="pad" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, minHeight: '100%' }}>
          <Steps step={0} />
          <span className="label">Article I of III</span>
          <h1 className="display gold-text" style={{ margin: 0, fontSize: 40, lineHeight: '44px' }}>
            Prepare the expedition
          </h1>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 15 }}>Sixty days. One march a day. Keep every order and the camp is made.</p>
          <label className="stack" style={{ gap: 8, marginTop: 8 }}>
            <span className="label">Expedition name</span>
            <input className="field-dark" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="stack" style={{ gap: 8 }}>
            <span className="label">Departure</span>
            <div className="pills">
              <button className="pill" aria-pressed={start === todayKey} onClick={() => setStart(todayKey)}>
                Today
              </button>
              <button className="pill" aria-pressed={start === addDays(todayKey, 1)} onClick={() => setStart(addDays(todayKey, 1))}>
                Tomorrow
              </button>
              <label className="pill" aria-pressed={start !== todayKey && start !== addDays(todayKey, 1)} style={{ position: 'relative' }}>
                {start !== todayKey && start !== addDays(todayKey, 1) ? formatDate(start) : 'Pick a date'}
                <input
                  type="date"
                  aria-label="Departure date"
                  min={todayKey}
                  max={maxStart}
                  value={start}
                  onChange={(e) => e.target.value && e.target.value >= todayKey && e.target.value <= maxStart && setStart(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0 }}
                />
              </label>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Day 60 falls on {formatDate(addDays(start, 59), true)}. A day closes at 03:00.
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-gold" disabled={!name.trim()} onClick={() => setStep(1)}>
            Choose the daily orders
          </button>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="screen full desk">
        <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
          <Steps step={1} light />
          <div className="parchment">
            <span className="label">Article II of III</span>
            <h1 className="display" style={{ margin: 0, fontSize: 30, lineHeight: '34px' }}>
              The daily orders
            </h1>
            <p className="lead">Choose {MIN} to {MAX}. Every one must be kept for the day’s march to count. Once sealed, they can’t be amended.</p>
            <div className="ledger-list">
              {[...PRESETS, ...customs].map((t) => {
                const on = tasks.includes(t)
                const isCustom = !PRESETS.includes(t)
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="ledger-row" aria-pressed={on} onClick={() => toggle(t)} style={{ flex: 1 }}>
                      <span className="box">{on && <IconCheck stroke="#A8261F" width={18} height={18} />}</span>
                      {t}
                    </button>
                    {isCustom && (
                      <button className="ledger-row x" aria-label={`Remove ${t}`} onClick={() => setTasks((c) => c.filter((x) => x !== t))} style={{ width: 'auto', borderBottom: '1px solid rgba(43,29,16,.22)', minHeight: 46 }}>
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                addCustom()
              }}
            >
              <input className="field" placeholder="Write your own order…" value={custom} maxLength={60} onChange={(e) => setCustom(e.target.value)} aria-label="Custom order" />
              <button type="submit" className="btn" disabled={!custom.trim() || tasks.length >= MAX} style={{ minHeight: 40, padding: '0 14px', background: 'var(--ink)', color: 'var(--parchment)', fontSize: 15, borderRadius: 10, opacity: !custom.trim() || tasks.length >= MAX ? 0.4 : 1 }}>
                Add
              </button>
            </form>
          </div>
          <div style={{ flex: 1 }} />
          <div className="stack" style={{ gap: 10 }}>
            <span style={{ textAlign: 'center', fontSize: 14, color: '#e8cf9f' }}>
              {tasks.length < MIN ? `Choose ${MIN - tasks.length} more` : `${tasks.length} orders entered${tasks.length >= MAX ? ' (maximum)' : ''}`}
            </span>
            <div className="row">
              <button className="btn btn-ghost" style={{ flex: 'none' }} onClick={() => setStep(0)}>
                Back
              </button>
              <button className="btn btn-gold" style={{ flex: 1 }} disabled={tasks.length < MIN} onClick={() => setStep(2)}>
                Continue to signing
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen full desk">
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
        <Steps step={2} light />
        <div className="parchment">
          <span className="label">Article III of III</span>
          <h1 className="display" style={{ margin: 0, fontSize: 30, lineHeight: '34px' }}>
            {name.trim()}
          </h1>
          <p className="lead">
            Departing {formatDate(start, true)}. Sixty days. These orders, every day:
          </p>
          <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, fontSize: 16 }}>
            {tasks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <p className="lead" style={{ fontSize: 13 }}>
            One supply cache to start. Every seven unbroken marches lays another (two at most). A cache is spent automatically to protect your streak when a day is missed.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <div className="stack" style={{ alignItems: 'center', gap: 10 }}>
          <HoldButton label="Hold to seal the articles" onComplete={() => onSeal({ name: name.trim(), startDate: start, tasks })} />
          <span className="display" style={{ fontSize: 18, color: 'var(--gold-hi)' }}>
            Hold to seal
          </span>
          <button className="btn" style={{ minHeight: 44, color: '#c9ae85', fontSize: 15 }} onClick={() => setStep(1)}>
            Back to orders
          </button>
        </div>
      </div>
    </div>
  )
}

function Steps({ step, light }: { step: number; light?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--amber)' : light ? 'rgba(255,220,170,.2)' : 'var(--surface-3)' }} />
      ))}
    </div>
  )
}
