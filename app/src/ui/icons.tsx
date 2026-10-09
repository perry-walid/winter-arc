import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p,
})

export const IconLog = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5c3-1.5 5.5-1.5 8 0v15c-2.5-1.5-5-1.5-8 0zM20 5c-3-1.5-5.5-1.5-8 0v15c2.5-1.5 5-1.5 8 0z" /></svg>
)
export const IconRoute = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>
)
export const IconLedger = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 2l4 6 4-6" /><circle cx="12" cy="15" r="6" /><path d="M12 12l1 2h2l-1.5 1.3.5 2.2-2-1.2-2 1.2.5-2.2L9 14h2z" /></svg>
)
export const IconGear = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 3, width: 16, height: 16, ...p })}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const IconLantern = (p: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path d="M9 3h6M12 3v2" stroke="#E3B860" strokeWidth="1.6" fill="none" />
    <rect x="7" y="6" width="10" height="13" rx="2" fill="none" stroke="#E3B860" strokeWidth="1.6" />
    <path d="M12 9c2 2.4 2 4.2 0 6-2-1.8-2-3.6 0-6z" fill="#FFB54A" />
    <path d="M8 21h8" stroke="#E3B860" strokeWidth="1.6" />
  </svg>
)
export const IconCache = ({ full = true }: { full?: boolean }) =>
  full ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8h18v12H3z" fill="#2B6C9E" /><path d="M3 8l2-4h14l2 4" fill="#4E93C6" />
      <path d="M12 8v12M3 13h18" stroke="#9FE7FF" strokeWidth="1.2" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A5F8E" strokeWidth="1.4" strokeDasharray="2 2" aria-hidden="true">
      <path d="M3 8h18v12H3z" />
    </svg>
  )
export const IconSnow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 2, ...p })}><path d="M12 2v20M4 6l16 12M20 6L4 18" /></svg>
)
export const Chevrons = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFD27A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 6l7 4 7-4M5 11l7 4 7-4M5 16l7 4 7-4" />
  </svg>
)
