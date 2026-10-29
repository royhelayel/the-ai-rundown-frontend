# Unified briefing experience — 2026-10-29

## Behavior

- Main entry opens `/listen`, cued but silent; playback requires Play.
- Quick brief uses the existing daily topic recap. Full brief uses existing complete headline summaries in order. Weekly/monthly keep their existing records.
- Animation off shows complete text with audio; it never owns or restarts playback.
- Read pauses narration, hides the transport, and enables vertical update navigation. Listen restores the animation preference and exact paused position, or seeks to a deliberately selected update.
- Topic/date/brief changes keep text-only mode silent. Settings/history and existing recap links remain reachable. Old `/recaps` links become unified reading.
- Source attribution must match the actual update. Unmatched maps retain a clearly labelled topic source list. Reading short recaps does not mark their full source stories read.
- Unique audio coverage and the 70% completion threshold remain in the programme engine. Reading and seeking must not manufacture played intervals.

## Automated regression coverage

82 tests pass across 18 suites. Integration coverage includes the four brief choices, topic retention, unavailable recaps, default entry, persisted summary and animation preferences, old reading preferences, old recap links, text-only navigation across stories/topics, no player in reading, and matching sources. Component/engine suites cover exact pause/resume, seeking without played credit, speed retention, late audio loading, device voice seeking, native interruptions, 70% unique coverage, correction signatures, source-map mismatch, media session and wake lock.

Production build succeeds with existing unrelated lint warnings. No new runtime dependencies, paid generation, or backend changes.

## Browser checks

- Phone-sized iframe layouts: 390×844, 320×568 and 700×390 (landscape).
- Animated card, full text/audio transcript and text-only card.
- Upward pointer swipe advances the update and its source outlets.
- Update pills select the matching text/source.
- Player and utility footer remain independent of the text card.
- Compact landscape content scrolls inside the body region rather than cropping source controls.

## Practical limits

These checks use desktop browser viewports and automated media fixtures. Physical iPhone silent-switch behavior, OS lock-screen integration and device-specific speech voices require a real device; they cannot be certified by desktop emulation. Existing audio infrastructure is retained.
