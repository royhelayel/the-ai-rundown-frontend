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

**Entry point:** `src/App.js` — a single large component (`TheAIRundown`) that owns all global state and passes props down. Routing is handled by react-router-dom; there is only one `<Route path="/*">` entry that renders `TheAIRundown`, plus `/verify-email`.

**URL structure:**
- `/` — All Feed (BriefingFeed + CategoryRow list)
- `/my-feed` — MyFeedTab (personalized feed + reading challenge)
- `/popular` — PopularTab
- `/customize` — CustomizeTab
- `/settings` — settings panel (rendered inline, not a separate page)
- `/category/:name` — CategoryView
- `/category/:name/story/:index` — StoryReader
- `/feed/:id` — FeedPage (named user feeds)

**Data flow:** `App.js` fetches all news data from Supabase (`news_summaries` table) and passes `briefingData` (keyed by category name) down to every tab component. Audio narration is also orchestrated in `App.js` via a `<audio>` ref and `/api/tts-stream` on the backend.

**Listening/gamification:** `src/hooks/useListenHistory.js` tracks per-story listen history in `localStorage` (key: `rundown_listen_history[_userId]`). `computeGamifiedStats()` is a pure function that derives streaks, category progress, and badge tiers from that history — it is called in `App.js` via `useMemo` and the results are passed down to tabs as `gamifiedStats`.

**Read tracking:** `handleMarkRead` in `App.js` fires when a user opens a story card. It posts to `/api/metrics/track` with `eventType: 'story_read'` for analytics, separate from the listen history.

**Auth:** Magic-link / password auth via Supabase. User object is stored in `localStorage` as `newsdigest_user` and rehydrated on load. Guest users (no auth) can access all tabs; some features (custom categories, saved feeds) require login.

**Design tokens:** `src/theme.js` exports `CATEGORY_COLORS`, `CATEGORY_IMAGES`, and gradient helpers. `src/utils.js` exports `readTime()` and `formatDuration()`. Components define their own local color objects (usually named `light` or `dark`) inline rather than importing a shared design system.

**Wireframes:** `public/wireframes-v3.html` is an interactive HTML mockup used to prototype UI states. It is not part of the React app build — open it directly in a browser for design reference.

## Current design direction (My Feed)

- The reading challenge widget lives on **My Feed only** — not on Popular or Important. Popular/Important are discovery tabs; My Feed is the daily habit tab. Do not suggest splitting the challenge to a separate page.
- My Feed has two states:
  - **Default (expanded):** Challenge cards + Today's Briefing progress card, then stories below.
  - **Scrolled (compact sticky bar):** Collapses to a slim bar showing **Today's Briefing only** — a mini ring (X of 8) + segmented progress bar. No challenge badge pills in the compact state.
- Section B of `public/wireframes-v3.html` shows both states side by side.
