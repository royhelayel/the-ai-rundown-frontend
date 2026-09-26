# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before you touch anything: sync

This repo is edited from **two places** — this local clone, and a Claude project with
GitHub access. Neither one knows about the other's work until git moves it. So at the
**start of every session, before reading or editing any file**:

```bash
git fetch --all --prune
git status -sb
git branch -r --sort=-committerdate | head
```

Then report to Roy, before doing the requested work:
- **Behind origin/main** → `git pull` (fast-forward only; see below) and say what arrived.
- **A remote branch newer than main** → the web project opens PRs rather than pushing to
  main, so work can be sitting on a branch while main looks clean. Name the branch and ask
  whether it should be merged first. Do not start work that might conflict with it.
- **Diverged, or local uncommitted changes on top of remote ones** → stop and say so. Do
  not improvise a merge.

`pull.ff = only` is set locally in this repo, so `git pull` **fails loudly** when the
histories have diverged instead of quietly creating a merge commit. That failure is the
signal to stop and ask, not something to work around with `--no-ff` or a rebase.

**The rule that prevents the mess:** leave this side clean — committed *and pushed* — at
the end of a session, so the other side always starts from the truth. Verify the push
landed (`git status -sb` showing no "ahead"); a commit is not a push.

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

**Entry point:** `src/App.js` holds only the router: a single `<Route path="/*">` renders `TheAIRundown` (`src/TheAIRundown.jsx`), which owns all global state, passes props down, and matches `location.pathname` itself to decide what to show. Its pieces live alongside it:
- `src/audio/`: the TTS narration engine (`narrationEngine.js`), player transport (`playbackControls.js`), play-from-a-feed actions (`playActions.js`) and narration text helpers
- `src/data/`: data-fetching hooks (completed slots, briefing feed, period recaps, saves feeds, heartbeat)
- `src/lib/`: pure helpers (story parsing, the day cache, UAE time, the Supabase client, `BACKEND_URL`)
- `src/views/`: large screens split out of the main render (Settings, sign-in modal, Swipe reader, category recap)

The `create*` functions in `src/audio/` are called once per render with that render's state, and the `src/data/` hooks are called where their code used to sit inline, so hook order is unchanged. When one of them needs a new piece of state, add it to both the call site and the function's parameters.

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

**Data flow:** `TheAIRundown` and the hooks in `src/data/` fetch news from the Supabase `news_summaries` table, mostly through `/api/news` (`api/news.js`, a Vercel serverless function that edge-caches the reads), though a few reads still query Supabase directly. It passes `briefingData` (keyed by category name) down to every tab component. Audio narration (`src/audio/`) plays through `Audio` elements fed by `/api/tts-stream` on the backend.

**Listening/gamification:** `src/hooks/useListenHistory.js` tracks per-story listen history in `localStorage` (key: `rundown_listen_history[_userId]`). `computeGamifiedStats()` is a pure function that derives streaks, category progress, and badge tiers from that history — it is called in `TheAIRundown.jsx` via `useMemo` and the results are passed down to tabs as `gamifiedStats`.

**Read tracking:** `handleMarkRead` in `TheAIRundown.jsx` fires when a user opens a story card. It posts to `/api/metrics/track` with `eventType: 'story_read'` for analytics, separate from the listen history.

**Auth:** Magic-link / password auth via Supabase. User object is stored in `localStorage` as `newsdigest_user` and rehydrated on load. Guest users (no auth) can access all tabs; some features (custom categories, saved feeds) require login.

**Design tokens:** `src/theme.js` exports `CATEGORY_COLORS`, `CATEGORY_IMAGES`, and gradient helpers. `src/utils.js` exports `readTime()` and `formatDuration()`. Components define their own local color objects (usually named `light` or `dark`) inline rather than importing a shared design system.

**Mockups:** `category-mock.html`, `panels-mock.html` and `right-pane-mock.html` in the repo root are static HTML mockups used to prototype UI states. They are not part of the React app build — open them directly in a browser for design reference.

**Tests:** unit tests sit next to the code they cover (`src/utils.test.js`, `src/hooks/useListenHistory.test.js`) and exercise the pure helpers. `src/App.test.js` renders the whole app as a guest with Supabase and `fetch` stubbed, as a smoke test. It also maps `react-router-dom` to its CommonJS build, because the Jest in react-scripts 5 can't resolve react-router v7.

## Current design direction (My Feed)

- The reading challenge widget lives on **My Feed only** — not on Popular or Important. Popular/Important are discovery tabs; My Feed is the daily habit tab. Do not suggest splitting the challenge to a separate page.
- My Feed has two states:
  - **Default (expanded):** Challenge cards + Today's Briefing progress card, then stories below.
  - **Scrolled (compact sticky bar):** Collapses to a slim bar showing **Today's Briefing only** — a mini ring (X of 8) + segmented progress bar. No challenge badge pills in the compact state.
