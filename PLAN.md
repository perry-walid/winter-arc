# WINTER_ARC.exe — Plan

60-day reset tracker for iPhone 17 Pro. Cyberpunk / pixel / software-engineer aesthetic. Personal use, no App Store.

## Platform decision
Installable PWA (Safari → Share → Add to Home Screen). Runs full-screen with an icon, offline, and data on device.
- Why not native: there's no Xcode on this machine, and free Apple ID signing expires every 7 days, which doesn't work for a 60-day arc.
- Hosting: GitHub Pages (static) at the `/winter-arc/` subpath.

## Stack
Vite + React + TypeScript, vite-plugin-pwa, IndexedDB (idb), Vitest, Playwright (WebKit, iPhone viewport).

## Agent roles
1. Market research: competitor apps (75 Hard, Habitica, Streaks, Duolingo, winter-arc trackers) and articles. Output: docs/research/market.md
2. UX/flow: screens, states, rules. Output: docs/research/ux-flow.md
3. Visual design: tokens and pixel-cyberpunk system. Output: docs/research/visual.md
4. Backend (data/game engine): local-first IndexedDB, pure date logic, derived XP/levels/badges, export/import
5. Mobile: PWA shell, safe areas, icons, offline, chiptune SFX
6. Tester: Vitest engine tests (fake clock, midnight, DST, day 60, backup round-trip) + Playwright WebKit e2e

## Phases
1. Research + design → design artifact → USER APPROVAL (single checkpoint)
2. Autonomous build → test → deploy → install instructions
