import { useId } from 'react'

type Variant = 'hero' | 'full' | 'celebrate'

const STARS: [number, number, number][] = [
  [30, 40, 1], [72, 22, 0.8], [118, 58, 1.2], [160, 18, 0.7], [205, 44, 1], [248, 16, 1.3], [290, 36, 0.8],
  [332, 20, 1], [368, 52, 1.1], [54, 96, 0.7], [182, 88, 0.8], [350, 98, 0.7], [96, 130, 0.6], [226, 120, 0.9],
  [14, 150, 0.7], [312, 140, 0.6], [140, 170, 0.5], [270, 190, 0.6],
]

/** Illustrated polar-night landscape: aurora, stars, ice ridges and a lantern-lit tent. */
export function Scene({ variant = 'hero', tent = true }: { variant?: Variant; tent?: boolean }) {
  const raw = useId()
  const id = (name: string) => `${raw.replace(/[^a-zA-Z0-9]/g, '')}-${name}`
  const u = (name: string) => `url(#${id(name)})`

  const full = variant !== 'hero'
  const H = full ? 844 : 300
  // Vertical anchor of the horizon; the hero crops the sky tighter.
  const y0 = full ? 470 : 132
  const bright = variant === 'celebrate'

  return (
    <svg viewBox={`0 0 390 ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#02040c" />
          <stop offset={full ? 0.45 : 0.55} stopColor="#0a1a46" />
          <stop offset={full ? 0.75 : 1} stopColor="#1c3a7a" />
          {full && <stop offset="1" stopColor="#0c1631" />}
        </linearGradient>
        <linearGradient id={id('aurG')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#46F0B5" stopOpacity="0" />
          <stop offset="0.58" stopColor="#46F0B5" stopOpacity={bright ? 0.95 : 0.85} />
          <stop offset="1" stopColor="#2BD4E0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('aurV')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF6FD8" stopOpacity="0" />
          <stop offset="0.5" stopColor="#9B7BFF" stopOpacity={bright ? 0.9 : 0.75} />
          <stop offset="1" stopColor="#46F0B5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E4E94" />
          <stop offset="1" stopColor="#0F1E48" />
        </linearGradient>
        <linearGradient id={id('mid')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B3168" />
          <stop offset="1" stopColor="#0B1738" />
        </linearGradient>
        <linearGradient id={id('snow')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#163064" />
          <stop offset="1" stopColor="#0C1631" />
        </linearGradient>
        <linearGradient id={id('tent')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE0A0" />
          <stop offset="1" stopColor="#E0742C" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0" stopColor="#FFB54A" stopOpacity="0.75" />
          <stop offset="0.4" stopColor="#FF8A3D" stopOpacity="0.25" />
          <stop offset="1" stopColor="#FF8A3D" stopOpacity="0" />
        </radialGradient>
        <filter id={id('b')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={full ? 10 : 7} />
        </filter>
        <filter id={id('b2')}>
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      <rect width="390" height={H} fill={u('sky')} />
      <g fill="#EAF2FF">
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={full ? y * 1.4 : y} r={r} className="twinkle" style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
        ))}
      </g>

      <g transform={`translate(0 ${y0 - (full ? 300 : 150)})`}>
        <g filter={u('b')} className="aurora">
          <path d="M-40 150 C 40 50, 130 200, 205 100 S 350 30, 440 110 L 440 185 C 340 120, 265 230, 185 170 S 40 225, -40 215 Z" fill={u('aurG')} />
          <path d="M20 60 C 100 10, 170 120, 250 55 S 370 10, 430 45 L 430 110 C 350 75, 285 150, 215 115 S 90 110, 20 135 Z" fill={u('aurV')} opacity="0.85" />
        </g>
        <g filter={u('b2')} opacity="0.45" fill={u('aurG')}>
          {[88, 120, 146, 190, 232, 270, 310].map((x, i) => (
            <rect key={x} x={x} y={60 + (i % 3) * 10} width={i % 2 ? 2 : 3} height={full ? 140 : 90} />
          ))}
        </g>
      </g>

      <g transform={`translate(0 ${y0 - 132})`}>
        <polygon points="0,215 38,182 66,198 108,150 146,190 182,166 218,188 258,132 298,180 334,156 390,196 390,600 0,600" fill={u('far')} />
        <polyline points="0,215 38,182 66,198 108,150 146,190 182,166 218,188 258,132 298,180 334,156 390,196" fill="none" stroke="#9FE7FF" strokeOpacity="0.45" strokeWidth="1" />
        <path d="M108 150 L98 162 L104 160 L110 166 L116 159 L121 163 Z M258 132 L247 146 L254 143 L260 150 L266 142 L272 147 Z" fill="#DDF4FF" fillOpacity="0.75" />
        {full && <path d="M0 250 L60 222 L110 240 L170 208 L230 238 L300 214 L390 244 V600 H0 Z" fill={u('mid')} />}
        <path d="M0 262 Q 80 222 168 248 T 330 236 T 390 244 V600 H0 Z" fill={u('snow')} />
        <path d="M20 330 C 110 300, 200 276, 292 252" fill="none" stroke="#9FE7FF" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 5" />
        {tent && (
          <g className="tent">
            <circle cx="304" cy="244" r={full ? 70 : 40} fill={u('glow')} className="lantern" />
            <polygon points="290,252 304,230 318,252" fill={u('tent')} />
            <path d="M304 230 L304 252" stroke="#7A3510" strokeWidth="1.2" />
            <path d="M304 230 L304 221" stroke="#E3B860" strokeWidth="1.2" />
            <path d="M304 221 L313 224 L304 227 Z" fill="#C9302C" />
          </g>
        )}
      </g>
    </svg>
  )
}
