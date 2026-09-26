# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # dev server at http://localhost:3000
npm run build    # production build → /build
npm test         # Jest in watch mode
npm test -- --watchAll=false  # single test run (CI)
```

## Environment variables

Copy these into `src/.env.local` (already gitignored):

```
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_BACKEND_URL=http://localhost:3001
```

`REACT_APP_BACKEND_URL` defaults to `http://localhost:3001` if absent. The backend is a separate service — this repo is frontend only.

## Architecture

**Entry point:** `src/App.js` — a single large component (`TheAIRundown`) that owns all global state and passes props down. Routing uses react-router-dom with a single `<Route path="/*">` that renders `TheAIRundown`; the component matches `location.pathname` itself to decide what to show.

**URL structure:**
- `/` — All News (BriefingFeed + CategoryRow list)
- `/my-feed` — MyFeedTab (personalized feed + reading challenge)
- `/popular` — PopularTab
- `/important` — ImportantTab (the "Interesting" picks)
- `/saved` — MySavesTab
- `/listen` — Listen mode
- `/settings` — settings panel (rendered inline, not a separate page)
- `/profile/:username` — ProfilePage
- `/category/:name` — CategoryView
- `/category/:name/briefing` — CategoryBriefing
- `/category/:name/story/:index` — StoryReader

**Data flow:** `App.js` fetches news from the Supabase `news_summaries` table, mostly through `/api/news` (`api/news.js`, a Vercel serverless function that edge-caches the reads), though a few reads still query Supabase directly. It passes `briefingData` (keyed by category name) down to every tab component. Audio narration is also orchestrated in `App.js` via a `<audio>` ref and `/api/tts-stream` on the backend.

**Listening/gamification:** `src/hooks/useListenHistory.js` tracks per-story listen history in `localStorage` (key: `rundown_listen_history[_userId]`). `computeGamifiedStats()` is a pure function that derives streaks, category progress, and badge tiers from that history — it is called in `App.js` via `useMemo` and the results are passed down to tabs as `gamifiedStats`.

**Read tracking:** `handleMarkRead` in `App.js` fires when a user opens a story card. It posts to `/api/metrics/track` with `eventType: 'story_read'` for analytics, separate from the listen history.

**Auth:** Magic-link / password auth via Supabase. User object is stored in `localStorage` as `newsdigest_user` and rehydrated on load. Guest users (no auth) can access all tabs; some features (custom categories, saved feeds) require login.

**Design tokens:** `src/theme.js` exports `CATEGORY_COLORS`, `CATEGORY_IMAGES`, and gradient helpers. `src/utils.js` exports `readTime()` and `formatDuration()`. Components define their own local color objects (usually named `light` or `dark`) inline rather than importing a shared design system.

**Mockups:** `category-mock.html`, `panels-mock.html` and `right-pane-mock.html` in the repo root are static HTML mockups used to prototype UI states. They are not part of the React app build — open them directly in a browser for design reference.

**Tests:** unit tests sit next to the code they cover (`src/utils.test.js`, `src/hooks/useListenHistory.test.js`) and exercise the pure helpers. `App.js` has no render test because it needs Supabase and the backend.

## Current design direction (My Feed)

- The reading challenge widget lives on **My Feed only** — not on Popular or Important. Popular/Important are discovery tabs; My Feed is the daily habit tab. Do not suggest splitting the challenge to a separate page.
- My Feed has two states:
  - **Default (expanded):** Challenge cards + Today's Briefing progress card, then stories below.
  - **Scrolled (compact sticky bar):** Collapses to a slim bar showing **Today's Briefing only** — a mini ring (X of 8) + segmented progress bar. No challenge badge pills in the compact state.
