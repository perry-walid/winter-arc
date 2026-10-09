// Tiny WebAudio synth. iOS has no web vibration API, so sound is the tactile layer.
// The context must be created/resumed inside a user gesture, which `unlock()` does.

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function play(fn: () => void) {
  if (!enabled) return
  unlock()
  if (!ctx) return
  try {
    fn()
  } catch {
    /* audio is decoration; never let it break a tap */
  }
}

/** Wax seal press: soft low thud plus a high glint. */
export const sfxTick = () =>
  play(() => {
    tone(140, 0, 0.12, 'sine', 0.25)
    tone(1568, 0.02, 0.18, 'triangle', 0.05)
  })

export const sfxUntick = () => play(() => tone(330, 0, 0.1, 'sine', 0.08))

/** All orders kept: a rising bell arpeggio. */
export const sfxCamp = () =>
  play(() => {
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.09, 0.9, 'triangle', 0.09))
  })

/** Sealing the articles. */
export const sfxSeal = () =>
  play(() => {
    tone(98, 0, 0.35, 'sine', 0.3)
    tone(196, 0.05, 0.4, 'triangle', 0.08)
    ;[392, 587.33, 783.99].forEach((f, i) => tone(f, 0.25 + i * 0.12, 0.8, 'triangle', 0.07))
  })
