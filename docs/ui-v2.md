# RadioNews UI v2 preview

V2 is isolated at `/preview/v2` on branch `codex/ui-v2-preview`. The default routes, including `/my-feed`, continue to render v1. No production cutover is included. V2 preferences use a separate local storage key; authentication, interests and listening history use the existing services.

## Included
Listen with a snapshot queue and automatic topic transitions; vertical Swipe; continuous Scroll; source links; category colors with light/dark contrast variants; date selection for today and seven preceding days; generated daily/weekly/monthly recaps; reading challenge; settings for appearance, text size, language, opening mode, speed and reduced motion.

## Validation
53 automated tests pass, including the existing v1 smoke test. Tests cover partial requests, stale responses, queue cancellation, automatic category transitions, playback controls, missing Arabic voice, preferences, date limits, vertical gestures and category contrast. V2 lint passes. Production build passes with pre-existing v1 lint warnings. Mobile browser layout checked using a local fixture server, with simulated audio.

## Acceptance checks still requiring real devices/services
Test physical iPhone Safari audio activation, lock-screen playback, background transitions and installed Arabic voices. Generated English audio uses the existing backend; Arabic uses an installed device voice and displays an explicit error when unavailable. Preview authentication needs an allowed Supabase redirect URL. Popular currently uses existing local reading activity, not an unavailable global reads ranking. Recaps appear only when generated; source links depend on supplied article URLs.

Vercel builds from its configured Preview environment. Never deploy local fixture configuration. Keep this branch separate until the user chooses a production cutover.
