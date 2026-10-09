# WINTER_ARC — Visual Design Spec

Direction: **"ICE TERMINAL"** — a frozen CRT running a 60-day boot sequence. Near-black OLED base, ice-cyan as the one dominant neon, magenta used sparingly for "hot" moments (level-up, streak fire), pixel chrome for structure, a readable mono for everything you actually read. Rule of thumb: **pixel font for labels/numbers ≤ 3 words, mono for sentences.** Glow and effects are seasoning, never on body text.

## 1. Color tokens (contrast measured, WCAG 2.x)

```css
:root {
  color-scheme: dark;
  /* layers: true black base so OLED pixels switch off */
  --bg-0: #000000;   /* app background */
  --bg-1: #0A0E14;   /* sections, tab bar */
  --surface: #111925; /* cards */
  --surface-hi: #18233A; /* pressed / selected card */
  --border: #22344A;  /* pixel border, decorative (1.7:1) */
  --border-hi: #35557A; /* focused/active border (2.7:1, non-text UI) */
  /* text */
  --text: #E6F1FF;    /* 18.4 on bg-0, 15.5 on surface */
  --text-2: #9DB0C6;  /* 9.5 / 8.0 */
  --text-dim: #74889F;/* 5.8 / 4.8 — timestamps, hints; never < 12px */
  /* neon */
  --ice: #5CE1FF;     /* primary: 13.7 / 11.5 */
  --ice-deep: #1C7FA6;/* bar fills behind text, frost shadows */
  --hot: #FF4FB0;     /* secondary magenta: 7.0 / 5.9 */
  --ok: #3DFF8B;      /* matrix green, done: 15.9 / 13.3 */
  --warn: #FFB547;    /* 12.0 / 10.0 */
  --danger: #FF5468;  /* 6.7 / 5.6 */
  --xp: #FFD447;      /* XP gold: 14.8 / 12.4 */
  --on-neon: #03141A; /* text on filled neon buttons: 12.2 on --ice */
  --glow-ice: 0 0 6px rgb(92 225 255 / .45);
  --px: 2px;          /* the pixel unit; all chrome snaps to it (=6 device px @3x) */
}
```
All text tokens pass AA (≥4.5) on every layer; neons pass AAA on bg-0 except `--hot`/`--danger` (AA). Never put `--text-dim` on `--surface-hi`. Status is never color-only: pair with a glyph (✓ / ! / ×).

## 2. Typography

| Role | Font | npm (self-hosted woff2, OFL) |
|---|---|---|
| Display: titles, rank, buttons, tab labels | Press Start 2P | `@fontsource/press-start-2p` → `import '@fontsource/press-start-2p/400.css'` |
| Body / task text / logs | JetBrains Mono (variable) | `@fontsource-variable/jetbrains-mono` (static alt: `@fontsource/jetbrains-mono/400.css`, `/700.css`) |
| Optional big numerals (XP counter, day #) | VT323 | `@fontsource/vt323/400.css` |

Use `latin` subset only (fontsource `latin-400.css`) to keep precache < 100 KB. `font-display: block` for Press Start 2P (avoid fallback reflow on a 50 ms load from cache), `swap` for mono.

**Pixel grid rule:** Press Start 2P is drawn on an 8×8 grid → sizes **8, 16, 24, 32 px only** (16 minimum for UI; 8 only for decorative badge captions). VT323 has a ~16-unit em → use **20, 32, 40, 64 px**. Pixel text gets `-webkit-font-smoothing: none; letter-spacing: 0; line-height: 1.5` and **uppercase**.

| Token | Font | Size / line-height |
|---|---|---|
| `--t-hero` | Press Start 2P | 32 / 40 (rank-up, splash) |
| `--t-h1` | Press Start 2P | 24 / 32 (screen title) |
| `--t-h2` | Press Start 2P | 16 / 24 (card titles, buttons, tabs) |
| `--t-micro` | Press Start 2P | 8 / 12 (badge captions only) |
| `--t-num` | VT323 | 40 / 40 (XP, day counter) |
| `--t-body` | JetBrains Mono | 16 / 24 (min 16 to stop iOS zoom on inputs) |
| `--t-small` | JetBrains Mono | 13 / 20 (meta, timestamps) |

## 3. Pixel UI components

```css
/* Stepped-corner pixel border: no border-radius, notched corners via box-shadow */
.px-box {
  --c: var(--border);
  background: var(--surface);
  box-shadow:
    0 calc(-1*var(--px)) 0 0 var(--c), 0 var(--px) 0 0 var(--c),
    calc(-1*var(--px)) 0 0 0 var(--c), var(--px) 0 0 0 var(--c);
  margin: var(--px);                 /* room for the shadow "border" */
}
.px-box.is-active { --c: var(--ice); }
/* Card = px-box + 2-px drop "shadow" block offset (bottom-right), no blur */
.card { padding: 16px; position: relative; }
.card::after { content:""; position:absolute; inset: 4px -4px -4px 4px; background: var(--bg-1); z-index:-1; }

/* Pixel checkbox: 24px square, check is an inline-SVG glyph (see §6) */
.chk { appearance:none; width:24px; height:24px; background:var(--bg-0);
  box-shadow: inset 0 0 0 var(--px) var(--border-hi); }
.chk:checked { background: var(--ok) var(--check-svg) center/16px no-repeat /* data:image/svg+xml URI of the §6 check glyph */;
  box-shadow: inset 0 0 0 var(--px) var(--ok), var(--glow-ice); }
/* Tap target: wrap the whole task row in the <label>, row min-height 48px */

/* Segmented XP bar: 20 blocks, fill via --pct, steps not gradient */
.xp-bar { height:16px; background:
  repeating-linear-gradient(90deg, transparent 0 10px, var(--bg-0) 10px 12px),
  linear-gradient(90deg, var(--xp) var(--pct), var(--surface-hi) var(--pct));
}
/* Snap --pct to whole segments in JS: pct = Math.floor(p*20)/20*100 + '%' */

/* Progress "ring" alternative: 10-block day bar (█ ▓ ░) as spans */
.blocks span { width:12px; height:12px; background:var(--surface-hi); }
.blocks span.on { background:var(--ice); } .blocks span.today { background:var(--hot); }

/* Button: chunky, pressed = shift down 2px and drop shadow (8-bit click) */
.btn { font: 16px/1 'Press Start 2P'; padding:16px; background:var(--ice); color:var(--on-neon);
  box-shadow: 0 4px 0 var(--ice-deep); transition: none; }
.btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--ice-deep); }

/* Tab bar: fixed bottom, respects home indicator */
.tabbar { position:fixed; inset:auto 0 0; display:grid; grid-template-columns:repeat(4,1fr);
  padding-bottom: env(safe-area-inset-bottom); background:var(--bg-1);
  box-shadow: 0 calc(-1*var(--px)) 0 var(--border); }
.tab[aria-current] { color:var(--ice); } .tab[aria-current]::before { content:"▸"; } /* cursor caret */

/* Toast: terminal line, slides from top, auto-dismiss 2.5s */
.toast { font: 13px/20px var(--mono); padding:12px 16px; background:var(--bg-1);
  border-left: 4px solid var(--ok); top: calc(env(safe-area-inset-top) + 8px); }
/* copy style: "> task.complete +25 XP" / "! streak at risk" */
```
Global: `image-rendering: pixelated` on raster sprites; `border-radius: 0` everywhere; spacing scale 4/8/16/24/32.

## 4. Effects (cheap, opt-out-able)

```css
/* Scanlines: one static fixed layer, compositor-only, no animation */
body::after { content:""; position:fixed; inset:0; pointer-events:none; z-index:999;
  background: repeating-linear-gradient(0deg, rgb(0 0 0 / .18) 0 1px, transparent 1px 3px); }
/* Glow: text-shadow only on --t-h1/hero + active states; never on body text */
.glow { text-shadow: 0 0 4px currentColor, 0 0 12px rgb(92 225 255 / .35); }

/* Glitch on level-up: 3 shots of 80ms, then stops (not looping) */
.glitch { position:relative; }
.glitch::before, .glitch::after { content: attr(data-text); position:absolute; inset:0; }
.glitch::before { color:var(--hot); animation: g 80ms steps(2) 3; clip-path: inset(0 0 55% 0); }
.glitch::after  { color:var(--ice); animation: g 80ms steps(2) 3 reverse; clip-path: inset(55% 0 0 0); }
@keyframes g { 0%{transform:translate(-2px,0)} 100%{transform:translate(2px,0)} }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .snow { display: none; }
}
```
**Snowfall:** a single `<canvas>` (not DOM nodes), ~40 flakes drawn as 2×2 / 4×4 `fillRect` squares in `--text-2` at 60% alpha, `imageSmoothingEnabled=false`, canvas sized at CSS px (not 3× DPR — chunky is the point). Throttle to **20 fps** via rAF time-check; pause on `visibilitychange` hidden; render only on Home + splash; skip entirely if `prefers-reduced-motion` or `navigator.getBattery` level < 20% (Safari lacks it → default on). User toggle in Settings: `FX: ON / LITE / OFF` (LITE = scanlines only). Animate only `transform`/`opacity`; never animate `box-shadow` or `filter`.

## 5. App icon + boot screen

**Icon (apple-touch-icon 180×180):** 16×16 grid scaled ×11 (=176, 2px padding) with `--bg-0` background, nearest-neighbor export. Glyph = `>_` prompt with an ice crystal cursor:
```
................
................
.##.............   # = --ice (#5CE1FF)
..##............   * = --text (#E6F1FF) snowflake highlight
...##.....*.....   + = --ice-deep (#1C7FA6) shading
..##.....*+*....   = = --hot (#FF4FB0) cursor underline
.##.....*+*+*...
.........*+*....
..........*.....
................
................
.....========...
................
................
................
................
```
Also ship 192/512 PNGs (manifest) and a maskable 512 with 20% safe zone. Export from a 16×16 SVG using `shape-rendering="crispEdges"` → sharp/resvg at integer scale.

**Boot screen** (iOS `apple-touch-startup-image` = static frame; in-app boot ~900 ms, skippable by tap, shown once per day):
```
WINTER_ARC BIOS v1.0  (c) 2026
MEM CHECK ........ OK
LOADING DISCIPLINE.SYS ..... OK
DAY 23/60   STREAK 11   RANK: FROSTBYTE
> _
```
Lines type in at 1 line / 120 ms (VT323 32px, `--ok` for OK, `--ice` for values), cursor blinks with `steps(1)`, then 1 glitch frame and cut to Home. Reduced motion: render all lines instantly, 400 ms hold.

## 6. Iconography

- All icons are **inline SVG on a 16×16 viewBox**, drawn with `<rect>`s or a single `<path>` of axis-aligned segments, `shape-rendering="crispEdges"`, `fill="currentColor"` so they inherit token colors.
- Render only at integer multiples: **16, 24 (×1.5 avoided), 32, 48 px** → prefer 32px in tab bar, 16px inline.
- Set: home (igloo), tasks (checklist), stats (bar blocks), badges (shield), streak (pixel flame — `--hot`), xp (coin — `--xp`), snowflake, lock (locked badge), check, cross, chevron, gear.
- Keep icons in one `icons.ts` map of path strings; author as 16×16 grids (same notation as §5) and convert via a tiny script (each `#` → `M x y h1 v1 h-1z`).
- Badges: 32×32 pixel art, locked state = same sprite at `opacity:.25` + `--border` silhouette, never grayscale filter (costly).
- Accessibility: decorative icons `aria-hidden="true"`; icon-only buttons get `aria-label`.
