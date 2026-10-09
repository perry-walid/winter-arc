# WINTER_ARC.exe — UX flow spec

Scope: screens, navigation, interaction rules, state machines, open decisions, micro-copy. Visual tokens live in `visual.md`, so colors here are named by role (accent, success, warn, danger, dim).
Hard platform facts this spec designs around:
- **There's no background execution.** The app is a static PWA on GitHub Pages with no server and no push, so nothing happens at midnight unless the app is open. All day and arc state is **derived lazily** from `history + now` on launch, on `visibilitychange`, and from a minute timer while the app is open. **v1 has no reminders.**
- **Safari tab storage is not the home-screen app's storage.** The arc can only be created in standalone mode. On first run the app calls `navigator.storage.persist()` and nudges the user to export a backup.
- **Standalone mode has no browser back and no swipe-back.** Every non-tab view needs an explicit `[x]` or `< back`. Bottom sheets are preferred over pushed screens.
- **There are no haptics.** Feedback is visual first, sound second. Sound is decoration only and is unlocked by the first user gesture (the commit ceremony). The app honours device mute and `prefers-reduced-motion`.
- **Layout:** content stays inside `env(safe-area-inset-*)`. Nothing interactive goes in the Dynamic Island band. Primary actions sit in the bottom 40% of the screen, the thumb zone. Tap targets are at least 44pt.

## 1. Screen inventory
| Screen | Purpose | Key elements |
|---|---|---|
| **BOOT / install gate** | Shown when not in `display-mode: standalone` | Fake boot log, then "Add to Home Screen" steps (Share → Add). It never creates an arc in a Safari tab. |
| **ONBOARD 1 — name** | Name the arc | Terminal prompt `arc_name:`, default `WINTER_ARC_2026`, blinking caret, [next] |
| **ONBOARD 2 — tasks** | Pick 3–8 daily tasks | Preset chips (gym, read 10p, no sugar, deep work 2h, 3L water, no social, sleep 23:00, walk 10k), `+ new task` (label + glyph), reorder by drag handle, live count `tasks: 5/8` |
| **ONBOARD 3 — start** | Set the start date | Today (default), tomorrow, or a pick within 14 days. Shows the end date (start + 59) and the rules summary (grace window, failure rule). |
| **ONBOARD 4 — commit** | The ceremony and audio unlock | Manifest printout (`tasks.lock`), **hold-to-commit 1.5s** button with a filling bar and a chiptune riser. On release, a "compiling…" sequence, then TODAY. The tap also unlocks audio and requests persistent storage. |
| **TODAY** (tab 1) | Daily checklist | Header: `DAY 07/60`, date, streak flame, XP chip. Progress bar segmented per task. Task rows (full width, glyph, label, checkbox `[ ]`/`[x]`). Grace banner when yesterday is still editable. Countdown if the arc is `scheduled`. |
| **DAY COMPLETE** (overlay) | Reward | Full-screen scanline flash, `day_07 compiled successfully`, +XP count-up, any new badge or rank-up card, [continue]. Fires **once per day key**. |
| **ARC MAP** (tab 2) | 60-day overview | 6×10 grid of nodes (GitHub-graph style). Node colors: complete (success), partial (warn), missed (danger), today (accent pulse), locked (dim). Legend, current streak, longest streak. Tapping a node opens the DAY DETAIL sheet. |
| **DAY DETAIL** (sheet) | View a past day, or edit yesterday | Task list for that day. Read-only unless it's within the grace window. `[x]` close. |
| **STATS** (tab 3) | Profile and progress | Rank badge + title, XP bar to the next level, current/best streak, completion %, per-task completion % bars (weakest task highlighted), badge grid (locked badges shown as `???`), gear icon to SETTINGS. |
| **SETTINGS** (sheet from STATS) | Data and preferences | Sound on/off + volume, reduced motion (follows the OS by default), day rollover hour, **export backup** (JSON download/share), **import backup** (hold-to-confirm, auto-backup first), last-backup age, **reset arc** (hold 3s, type the arc name), version/build. |
| **ARC COMPLETE** | Day 60 is complete | Long ceremony: the map fills node by node, then final stats, the "release" badge and a shareable summary card. Actions: [archive & start new arc] / [keep viewing]. |
| **ARC FAILED** | The failure rule was triggered | Post-mortem: the day of failure, days survived, best streak, weakest task. Actions: [restart: new arc, same tasks] / [edit tasks & restart]. Stats are archived, not deleted. |
| **Empty and edge states** | — | No arc → onboarding. `scheduled` → TODAY shows a countdown and the task preview, with checkboxes disabled. Locked node → "not yet compiled". No badges yet → `0/N unlocked`, showing the first 3 as hints. |

## 2. Navigation model
- **Bottom tab bar with 3 tabs:** `TODAY` · `MAP` · `STATS`. It sits above the home indicator (padded by `safe-area-inset-bottom`). The app always launches on TODAY.
- Settings is behind a gear on STATS. It's used rarely, so it doesn't get a tab.
- DAY DETAIL and SETTINGS are bottom sheets. Each closes with `[x]` and a drag-down, and the sheet's actions sit at the bottom.
- Overlays (Day Complete, Arc Complete/Failed) are modal, with one primary button in the thumb zone.
- The header is informational only. Nothing tappable sits within roughly 59pt of the top (the Dynamic Island band).

## 3. Interaction rules
Governing rule: **reversible actions are a tap, irreversible ones are a hold.**
- **Tick a task:** a tap toggles `[ ]` ↔ `[x]`. The row flashes accent, a 1-frame pixel "glitch" plays, a blip SFX sounds, and the segmented bar fills. Tapping again is the undo, so there's no toast.
- **Day completion:** ticking the last task fires DAY COMPLETE after 300ms. Unticking afterwards moves the day back to `partial` and **recomputes XP downward**. The celebration does not replay if the day is re-completed, because it is keyed by `dayKey`.
- **XP and badges are a pure function of history.** Nothing is stored as a ledger, so edits always stay consistent. The tester can assert `xp(history)`.
- **Hold actions:** commit arc (1.5s), import that overwrites (1.5s), reset arc (3s + typed name). Each shows a fill bar and cancels on release.
- **Long-press on a task row:** shows the task's lifetime completion % (read-only). There's no edit, see D3.
- **Day key:** the local calendar date `YYYY-MM-DD`, adjusted by the rollover hour (D2). `dayN = calendarDiff(startDate, dayKey) + 1`. Never use ms/86,400,000, because DST breaks it.
- **Midnight / rollover:**
  - If the app is open, a minute timer detects the new day key and re-renders TODAY with a quick "new day" boot line.
  - If the app is closed, the same thing happens on the next launch or focus.
  - Yesterday becomes `partial`/`pending` inside the grace window. It becomes `missed` only once the grace window closes.
- **Past days:** any day on the MAP opens read-only. **Only yesterday is editable, until the grace deadline (D2).** A banner on TODAY reads `> yesterday unresolved: 2 tasks · patch window closes 12:00` and tapping it opens the sheet.
- **Edge case:** day 60 completed during the grace window on the morning of day 61 triggers ARC COMPLETE at that moment.
- **Backup nudges:** after the commit, on day 7, after each badge, and whenever the last backup is more than 7 days old. Each nudge is one dismissible line on STATS, never a modal.

## 4. State machines
**Day** (derived, never stored as status):
| State | Meaning |
|---|---|
| `locked` | dayKey > today, or before the start date |
| `pending` | today or within grace, 0 ticks |
| `partial` | 1..n-1 ticks, still editable |
| `complete` | all n ticked |
| `missed` | grace closed and not complete (terminal) |

| From | Trigger | To |
|---|---|---|
| locked | clock reaches dayKey | pending |
| pending | tick | partial (or complete if n=1) |
| partial | tick last task | complete (+ celebration once) |
| complete | untick | partial (XP recomputed) |
| partial / pending | untick all / tick | pending / partial |
| pending / partial | grace deadline passes | missed |
| complete | grace deadline passes | complete (frozen) |

**Arc:**
| From | Trigger | To |
|---|---|---|
| — | commit with startDate > today | `scheduled` |
| — / scheduled | commit with startDate = today / start date arrives | `active` |
| active | day 60 → complete | `completed` (ARC COMPLETE, archived) |
| active | failure rule met (D1) | `failed` (ARC FAILED, archived) |
| active / scheduled | reset from SETTINGS | `abandoned` (archived, not counted as a failure) |
| completed / failed / abandoned | start new arc | setup (onboarding, tasks prefilled) |

## 5. Open decisions (each has a buildable default)
| # | Decision | Options | **Default** |
|---|---|---|---|
| D1 | Failure strictness | (a) any miss = fail, 75 Hard style · (b) N "patches" that absorb a miss · (c) never fail, only streak resets | **(b) 2 patches per arc.** A third miss fails the arc. Patches show on TODAY as `hotfix x2`. |
| D2 | Grace window + rollover | Rollover hour 00:00–04:00; yesterday editable until X | **Rollover 03:00.** Yesterday is editable until **12:00** the next day. |
| D3 | Edit tasks after commit | locked · editable with per-day task snapshots | **Locked for the arc.** This keeps per-task % honest and the data simple. |
| D4 | Task type | binary only · quantity (e.g. 0/6 glasses) | **Binary only in v1.** Quantity is v1.1. |
| D5 | Min/max tasks | — | **3 to 8 tasks** |
| D6 | XP/rank across arcs | reset per arc · lifetime | **Lifetime XP and rank carry over.** Streak and map are per arc. |
| D7 | After day 60 | archive + new arc · "overtime" mode | **Archive + new arc**, with a read-only archive list on STATS |
| D8 | Start date | today only · up to 14 days ahead | **Today, or up to 14 days ahead (`scheduled`)** |
| D9 | Sound default | on · off | **On at 50%.** Mute follows the device's silent switch where the platform allows it. |
| D10 | Reminders | none · local notifications | **None in v1.** No server means no Web Push. Revisit if the hosting changes. |

## 6. Micro-copy (terminal voice)
| Moment | Copy |
|---|---|
| Install gate | `> runtime check: browser tab detected` / `> install to home screen to persist your arc` |
| Onboard name | `> init arc --name ▌` |
| Task pick | `> select daily routines [3..8]  // 5 loaded` |
| Commit button | `HOLD TO COMMIT` → `> git commit -m "60 days. no excuses."` |
| Commit done | `> tasks.lock written · arc scheduled · good luck, operator` |
| New day | `> day_08 initialized · 5 tasks pending` |
| Task ticked | `> gym ✓ resolved` |
| Partial | `> build in progress: 3/5 resolved` |
| Day complete | `> day_07 compiled successfully (+120xp)` |
| Grace banner | `> warning: day_06 unresolved (2) · patch window closes 12:00` |
| Missed (patch used) | `> build failed: 2 tasks unresolved · hotfix applied (1 left)` |
| Streak | `> streak: 12 consecutive builds` |
| Rank up | `> privilege escalated: JUNIOR_DEV → SYS_ADMIN` |
| Badge | `> achievement unlocked: NO_SUGAR.dll` |
| Backup nudge | `> last backup 9d ago · run export?` |
| Arc complete | `> release v60.0.0 shipped · 0 critical bugs · you did the thing` |
| Arc failed | `> fatal: arc terminated at day_23 · core dump saved` / `[ reboot arc ]` |
| Reset confirm | `> rm -rf arc/ · type arc name to confirm` |
| Empty badges | `> 0 achievements found · keep compiling` |
| Locked day | `> day_41: not yet compiled` |
