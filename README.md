# Winter Arc

A 60-day "polar expedition" habit tracker, built as an installable web app for iPhone.

Each day you keep a fixed set of daily orders (tasks). Keeping all of them makes camp, which earns miles (XP), ranks and medals, and grows a snowflake. Your data stays on your phone.

**Install:** open https://perry-walid.github.io/winter-arc/ in Safari → Share → **Add to Home Screen**, then open it from the Home Screen.

## Develop

```sh
cd app
npm install
npm run dev      # local dev server
npm test         # engine unit tests (Vitest)
npm run e2e      # end-to-end tests (Playwright, WebKit at iPhone size)
npm run build    # production build → app/dist
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Layout

- `app/src/engine`: pure game rules (dates, streaks, caches, XP and ranks, medals) and IndexedDB persistence
- `app/src/ui`: screens (Today, Route, Ledger, onboarding, celebrations, settings)
- `docs/research`: market, UX and visual research behind the design
