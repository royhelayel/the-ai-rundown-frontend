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

## Daily listening programme (2026-10-25)

Listen defaults to `Daily` for first-time listeners and remembers the summary choice for returning users.
Headlines retain the same complete story summaries as Read, played in topic order through a snapshot queue. The shared summary selector is a compact, horizontally scrollable text strip with a
topic-colored selected underline. It offers Headlines, Daily recap, Last week and Last month in both
Listen and Read. Read recaps use /recaps with continuous text and a two-choice Listen/Read
bar; Headlines retain Swipe/Scroll. Latest/Popular/Interesting is a dropdown for Headlines
only. Daily recaps are generated and checked separately in the backend. Session introductions and category transitions
are separate clips, never embedded in story summaries; manual mid-topic starts do not get a
false category transition. Do not impose the browsing batch limit on the programme queue.

## Audio programme progress (2026-10-27)

`useAudioProgramme` persists edition/topic/content-signature position, unique played intervals and speed.
`HTMLMediaElement.played` supplies recorded-audio coverage; seek position alone never earns credit.
Browser speech uses delivered word boundaries (or completion of the actual utterance). A recap is
completed at **70% unique coverage**. Replays union intervals rather than adding duplicate time.
A Daily mix qualifies when all its available topics meet that threshold. Listening is stored separately
from headline reads and can satisfy a day in the six-day weekly challenge. Missing topics are disclosed.
Guest progress stays on the device. Signed-in progress syncs to the backend `/api/audio-progress`
using the verified Supabase session. Account scopes stay separate. `Continue listening` restores the
saved edition, topic, speed and position; changed recap text starts from the beginning with a message.
Media Session maps native play/pause/next/previous/seek where supported; external pauses update the UI.
Programme openings include the selected edition date. The approved Option A sound mark is enabled
at the start and end of a radio mix via `programmeSounds.js`. It is synthesized locally, plays
at its original pitch/speed through the existing unlocked audio element, and never counts
toward recap coverage. Optional cue failures continue into the narration. Resuming skips the
opening; category transitions remain spoken. No background music or per-story chime.

## Animated Listen recaps (2026-10-29)

Listen renders `AnimatedRecap` for Daily/Weekly/Monthly recaps; Read keeps the complete text.
The illustrations are native vector/CSS scenes driven by the existing narration progress and
speech character boundaries, not independently streamed MP4s. No extra TTS, model or video
rendering calls are needed. `recapScenes.js` uses only literal recap facts and source maps
whose full text matches the recording. Corrected text invalidates old maps; do not guess
sentence-level attributions. Unknown content uses a neutral editorial illustration.

Animation on/off persists as `radionews_recap_animation`. Data-saving/reduced-motion device
preferences are respected by default; background/disabled scenes do not run a visual clock.
The toggle never owns or restarts audio. Speed, seeking, 70% coverage, topic transitions and
the end-of-mix completion stay with the existing programme. Recaps start with the news,
without a repeated spoken introduction. Same-length text corrections change the programme
signature, stop the old recording and ask the listener to play the latest version.

The card's outlet button snapshots the current update into `RecapSourcesSheet`; `more` opens
its complete text. Missing mappings retain a clearly labelled all-topic sources list. Daily
Interesting actions resolve the original headline back to the actual story, not the recap
pseudo-story. Keep sources and player controls visible at compact phone heights.

## Unified briefing experience (2026-10-29)

The main entry now opens the unified `/listen` experience, without the bottom Listen/Read
selector. `BottomNav` uses `utilitiesOnly` with the transport in its center slot; account and
challenge remain at the ends. Default audio is cued silently, and Play starts it.
`Headlines` remains the storage/engine value but is labelled **Full brief**; `Daily` is labelled
**Quick brief**, followed by Last week and Last month. Do not rename persisted engine values.

`AnimatedRecap` supports three presentations: animated audio, complete transcript/audio when
animation is off, and vertically swipeable text when Read is chosen. Read pauses the existing
engine; Listen restores the same position unless the reader deliberately selects a different
update. Animation preferences remain independent of reading. Date/topic/brief changes must
not start audio while reading. Old `/recaps` URLs redirect to this page in reading mode.
Reading quick/period recaps does not mark all their full headline summaries as read.

## Contextual recap graphics (2026-10-29)

Generic number scenes must always retain the complete reported sentence that explains the
figure. Never display an isolated extracted number as the entire graphic. Short-height cards
prioritise the factual context over large numerals. Qualitative stories use the actual
reported sentence with a quiet transition instead of a decorative newspaper. Waxcap discoveries
with an explicit species count use a labelled fungi motif; its three mushroom shapes are
illustrative, not a quantitative count. Keep qualifiers and uncertainty; do not invent charts,
changes, locations or comparisons from limited source material.

## Home typography hierarchy (2026-10-30)

Roy clarified that streamlining means a clear hierarchy and removing unnecessary near-
duplicate sizes, not forcing all elements into four sizes. `HomeTypography.css` and
`homeTypography.js` define roles: 12px metadata, 14px secondary controls/sources, 16px primary
navigation and short audio captions, 18px sustained reading copy, 20px sheet titles,
24px compact animated-card headlines, and 28px reading/transcript headlines. 40px is for
illustrated statistics only. A given home presentation uses only the roles it needs.
The approved 17px wordmark remains independent. Use rem so Normal/Large settings scale
content together. Keep 44px action targets even for small supporting labels. Source and
more buttons must retain their role against the later `.rn-btn { font: inherit }` reset;
use scoped specificity rather than changing the global reset or adding `!important`.

## Generated per-update drawings (2026-10-29)

`useStoryAnimations` performs read-only cached lookups by exact normalized narration text.
It loads the current/next update only while animation is enabled and visible. Off, Read,
and hidden pages make no animation lookups. `GeneratedStoryAnimation` renders only
bounded vector primitives and numeric keyframes, never model code or external images.
Device reduced-motion freezes the drawing; seeking forwards/backwards uses audio phase.

The backend supplies an editorially authored October 27 English edition: 162 quick
updates and 183 full summaries. No paid generation API was used. On a valid exact-text
plan the new renderer replaces the previous illustration. Older editions, other languages,
period recaps, missing records and network failures retain their existing visual behavior
so a partial art rollout cannot blank working cards. Do not claim those older visuals are
newly generated. Future news needs new reviewed drawings; paid Anthropic generation remains
disabled. Keep the role-based typography hierarchy described above.
