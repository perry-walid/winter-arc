# WINTER_ARC — Market & Gamification Research

_Scope: 60-day personal "reset" tracker; fixed daily task list; a day only counts when every task is ticked. Researched 2026-10-09._
_Evidence caveat: most streak data comes from companies (Duolingo) or blogs. There are no independent controlled trials on streak freezes. Peer-reviewed anchors: Lally et al. on habit formation, and prospect theory on loss aversion._

## 1. Competitor table

| App | Core loop | Missed-day rule | Rewards / progression | Steal | Avoid |
|---|---|---|---|---|---|
| **75 Hard** (Frisella) | 5 fixed daily tasks for 75 days | Any miss restarts at Day 1, even on day 74 ([findyouredge](https://www.findyouredge.app/news/75-hard-challenge-explained-uk-2026)) | Only the finish | Fixed list set at the start, binary "day done", "non-negotiable" framing | Hard reset as the only option. It is the clearest trigger for the what-the-hell effect |
| **75 Soft / Medium** | Softer task list | No restart: miss day 15, carry on with 16. Some add a cap of about 3 misses ([superpower](https://superpower.com/guides/emerging-health-topics/75-soft-challenge-rules-comparison-75-hard), [sunnyhealthfitness](https://sunnyhealthfitness.com/blogs/health-wellness/75-soft-challenge-rules-checklist-get-better-results?page=2)) | None | "Miss budget" idea | No rules at all = no stakes |
| **Winter Arc – Grow in the Cold** (iOS) | Pick or write a "contract", tick tasks, quotes, share | Not stated | Progress pics, social share ([App Store](https://apps.apple.com/us/app/winter-arc-grow-in-the-cold/id6736709926)) | "Contract" signed at arc start; progress photos | Generic look and no progression. This is the gap WINTER_ARC fills |
| **Habitica** | RPG: dailies/habits/todos give XP, gold, drops | Missed dailies cost HP and reset that daily's streak. At 0 HP you lose a level, gold and gear ([wiki](https://habitica.fandom.com/wiki/Death)) | XP, levels, gold, random drops, crits, party bosses | Random drops/crits on check-off (variable reward); losing HP before losing progress | Losing a level plus gear is heavy punishment; too much complexity for a single-purpose app |
| **Streaks** (iOS) | Up to 12 tasks, tap to complete, consecutive-day counts | Streak breaks, but you can schedule skip days per task ([lifestack](https://lifestack.ai/blog/streaks-app)) | Streak number only | Planned skip/rest days don't count as misses; widgets | Bare numbers, no progression |
| **Duolingo** | Daily lesson keeps the streak alive | Streak freeze equipped in advance fills a missed day; paid Streak Repair afterwards ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)) | XP, leagues, gems | Freezes earned and **capped at 2**: raising the cap to 2 gave +0.38% DAU; a 7-day streak correlates with 3.6x course completion ([blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)); 600+ streak experiments ([Lenny's summary](https://www.recall.it/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team)) | Paid repair and guilt-trip notifications |
| **(Not Boring) Habits** | One habit at a time; each check builds a 3D trophy | "No streaks, no guilt": misses don't matter; the target is 60 repetitions ([TapSmart](https://www.tapsmart.com/apps/review-not-boring-habits/)) | Trophy built up piece by piece; year grid | Visible artifact that grows with each completion; strong design identity; uses 60 reps as the target, like us | Drops stakes entirely, which doesn't fit a challenge app |
| **Finch** | Self-care goals give energy to a pet bird that grows and goes on adventures | Gentle; nothing dies | Energy, outfits, trips ([YourStory](https://yourstory.com/2022/06/app-review-self-care-pet-finch-gamifies-mental-wellbeing)) | A companion that reacts to you (pixel robot/daemon?) | "All gamification, little utility" criticism ([Yoga Journal](https://www.yogajournal.com/lifestyle/finch-self-care-app/?scope=anon)) |
| **Forest** | Plant a tree for a focus session; it withers if you leave the app | That session's tree dies; finished trees are kept | Forest collection, coins, species unlocks ([Wikipedia](https://en.wikipedia.org/wiki/Forest_(application))) | Failure is visible but contained (one dead tree, the forest survives) | Not relevant beyond that |
| **CommitLife / HabitLog** (GitHub-graph style) | Habits logged as "commits" on a heatmap | CommitLife offers soft and hard streaks ([App Store](https://apps.apple.com/ca/app/commitlife/id6762560133)) | Heatmap, widget | Contribution grid as the home screen; soft/hard streak split | Thin, unpolished; no progression layer |

**Gap:** no app combines a challenge with a fixed task list, a dev/cyberpunk identity and real RPG progression. The Winter Arc apps are plain checklists, Habitica is generic fantasy, and the GitHub-graph apps have no game layer.

## 2. Missed-day rule

| Option | Evidence | Verdict |
|---|---|---|
| **Hard reset to Day 1** (75 Hard) | A hard reset after one bad day often triggers the what-the-hell / abstinence-violation effect: "the chain broke, so why bother" ([hab.it](https://hab.it.com/blog/what-the-hell-streaks), [Brainscape](https://brainscape.com/academy/what-the-hell-effect)). Losses feel about 2x as strong as gains, so a reset hurts more than progress motivates | Offer only as an opt-in `--hardcore` mode |
| **Streak-only loss** (arc continues, streak counter resets) | Lally et al.: missing one opportunity did not significantly affect habit formation, but repeated misses lowered peak automaticity ([BPS](https://bps.org.uk/research-digest/seven-ways-be-good-1-learn-healthier-habits), [spring.org.uk](https://www.spring.org.uk/2023/01/form-a-habit.php)) | Right baseline |
| **Limited shields / freeze** | Duolingo: "a little slack is more motivating than rigid rules"; cap of 2 gave a measurable lift ([blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Critique: a free repair cheapens the streak ([thoughtsbrewing](https://thoughtsbrewing.com/blog/book-brew-127-the-dirty-secret-behind-your-perfect-streak)), so shields must be **earned and scarce** | Add on top of streak-only |

**Recommendation: streak-only loss + earned, capped shields ("FIREWALL").**
- The arc is always 60 calendar days. A missed day shows as a red `FAILED_BUILD` cell on the grid and is never erased. The arc never restarts.
- At midnight, an incomplete day auto-consumes a FIREWALL if one is available. The streak survives, but the day earns **0 XP** and shows as a grey "patched" cell, so the record stays honest.
- Start with 1 FIREWALL. Earn +1 for every 7 consecutive perfect days. **Max held: 2**, matching Duolingo's cap.
- Success = completing ≥ 54/60 days (90%). That gives a 75 Soft-style "miss budget" ([sunnyhealthfitness](https://sunnyhealthfitness.com/blogs/health-wellness/75-soft-challenge-rules-checklist-get-better-results?page=2)) without letting the stakes disappear. Perfect 60/60 is the prestige outcome (see ROOT below).
- Opt-in `HARDCORE` toggle at arc start: no shields, any miss resets to Day 1 (75 Hard rules) and unlocks its own badge.
- After a break, show the rolling rate ("12 of last 14 days") alongside the streak. Rolling windows soften the reset sting ([Indie Hackers](https://www.indiehackers.com/post/im-removing-the-streak-counter-from-my-habit-app-here-s-why-7d2a6179dd)).

## 3. XP formula & level curve

Uses a polynomial curve with exponent 1.5: early levels come fast and later ones slow down, without the runaway steepness of an exponential curve ([Game Developer](https://www.gamedeveloper.com/design/quantitative-design---how-to-define-xp-thresholds-), [Aversa](https://davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/), [GameDev SE](https://backiee.wasmer.app/http_gamedev_stackexchange_com/q/18867)).

**Daily XP.** XP per day is normalized, so it doesn't depend on how many tasks the user set:
```
taskXP     = 100 * tasksDone / tasksTotal          // partial credit, but the day isn't "complete"
perfectXP  = 50  if all tasks done else 0          // COMMIT bonus
streakXP   = min(5 * streak, 50) if perfect else 0 // ramps to the cap at a 10-day streak
dayXP      = taskXP + perfectXP + streakXP         // perfect day = 155..200 XP; shielded day = 0
```
A perfect 60-day run totals **11,775 XP** (11,575 after day 59).

**Level threshold:** `xpFor(L) = round50( 11600 * ((L-1)/9)^1.5 )`, so L10 is reached exactly on day 60 of a perfect run.

| Lvl | Rank | Cum. XP | Reached on day (perfect run) |
|---|---|---|---|
| 1 | `INTERN` | 0 | 0 |
| 2 | `JUNIOR_DEV` | 450 | 3 |
| 3 | `DEV` | 1,200 | 8 |
| 4 | `SENIOR_DEV` | 2,250 | 13 |
| 5 | `TECH_LEAD` | 3,450 | 19 |
| 6 | `STAFF_ENG` | 4,800 | 26 |
| 7 | `ARCHITECT` | 6,300 | 33 |
| 8 | `NETRUNNER` | 7,950 | 41 |
| 9 | `PRINCIPAL` | 9,700 | 50 |
| 10 | `ROOT` | 11,600 | 60 |

Design notes:
- Levels are roughly a week apart, with early wins on day 3 and day 8.
- Every miss costs about 200 XP, so ROOT requires a flawless arc. A 1–2 miss run ends at PRINCIPAL. This is deliberate: ROOT is the prestige rank.
- If you'd rather let near-perfect runs reach ROOT, add a +500 XP `ARC_COMPLETE` bonus on day 60 for runs with ≥ 54 completed days.
- Variable reward: on each perfect day, roll a 15% "CRIT" chance for 2x perfectXP, as with Habitica's crits/drops ([wiki](https://habitica.fandom.com/wiki/Death)). Keep it cosmetic-scale so it doesn't feel like a slot machine: stacked variable rewards plus loss-framing is the pattern linked to compulsive play ([nerdbot](https://nerdbot.com/2026/08/18/the-psychology-behind-daily-rewards-in-video-games/)).

## 4. Achievements (dev-themed)

| Badge | Unlock |
|---|---|
| `HELLO_WORLD` | Complete day 1 |
| `GIT_INIT` | Sign the arc contract (set the task list) |
| `NO_BUGS_7` | 7-day perfect streak |
| `SPRINT_COMPLETE` | 14-day perfect streak |
| `UPTIME_99` | 30-day perfect streak |
| `HALF_LIFE` | Reach day 30 (any streak) |
| `HOTFIX` | Complete the day right after a FAILED_BUILD (comeback) |
| `FIREWALL_UP` | Earn your first shield |
| `ZERO_DAY` | Finish 60/60 with no shield used |
| `CI_GREEN` | Finish the arc with ≥ 54/60 completed |
| `CRITICAL_HIT` | Roll your first CRIT |
| `EARLY_DEPLOY` | Close the day before 09:00 |
| `NIGHT_OWL` | Close the day between 23:00 and 23:59 |
| `SUDO_HARDCORE` | Complete an arc in HARDCORE mode |
| `ROOT_ACCESS` | Reach level 10 |

## 5. Top 5 retention mechanics (ranked)

1. **Visible streak + contribution grid.** A 60-cell GitHub-style heatmap is the home screen. Duolingo ties early streaks to 3.6x completion ([blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)), and the grid makes misses contained, not total, as in Forest ([Wikipedia](https://en.wikipedia.org/wiki/Forest_(application))).
2. **Earned, capped FIREWALL shields.** These handle loss aversion and slip forgiveness while protecting against the what-the-hell effect ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit), [hab.it](https://hab.it.com/blog/what-the-hell-streaks)).
3. **XP + rank ladder with front-loaded early levels.** Level-ups on day 3 and day 8 hook the user before day 7, the window where Duolingo sees its retention step change.
4. **Commitment contract at arc start.** Task list locked, signed and timestamped (`git init`), as in Winter Arc's contracts and 75 Hard's non-negotiables ([App Store](https://apps.apple.com/us/app/winter-arc-grow-in-the-cold/id6736709926)).
5. **Time-boxed reminders + a comeback path.** An evening "build failing" nudge if tasks are open, and the `HOTFIX` badge and rolling-rate view after a miss. Recovery moments are where habits die ([theaudiencers](https://theaudiencers.com/subscription-models-live-off-habits-lessons-from-duolingos-retention-success/)).
