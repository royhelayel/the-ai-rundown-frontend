import { useEffect } from 'react';
import { buildStories } from '../lib/stories';
import { readDayCache, writeDayCache } from '../lib/dayCache';

export default function useBriefingData({
  selectedDay, briefingCacheRef, feedCategories, completedSlots, slotsLoaded, newsLanguage,
  setBriefingData, setBriefingLoading, defaultCategories,
}) {
  // ── Briefing feed: fetch metadata for all categories ────────────────────────
  // Fetches all completed slots for selectedDay. Evening's digest already carries every
  // Morning story forward (updated in place or unchanged) plus new ones appended, so once
  // Evening exists its row is used on its own — see the `hasEvening` filter below.
  // Each story is tagged with generatedSlot ('Morning'|'Evening') for display/tracking.
  // Cache key includes which slots are present so it self-invalidates when Evening arrives.
  useEffect(() => {
    if (!selectedDay || !slotsLoaded) return;
    // Determine which slots have completed for this day
    const slotOrder = ['Evening', 'Daily', 'Morning'];
    const presentSlots = slotOrder.filter(t => completedSlots.has(`${selectedDay}|${t}`));
    // No completed slot for this day yet (generation running late, paused, or genuinely
    // no news for this day) — bail out of the loading state instead of leaving
    // briefingLoading stuck at its initial `true` forever, which reads as an infinite
    // skeleton with nothing ever telling the UI to stop waiting.
    //
    // Clear the data too. Bailing without clearing left the *previous* day's stories in
    // briefingData under the new day's date — Scroll happens to guard on its own and shows
    // "No stories available", but the player page read straight from briefingData and
    // cheerfully played Friday's news under a Wednesday header.
    if (presentSlots.length === 0) { setBriefingData({}); setBriefingLoading(false); return; }
    // Extra categories beyond the default 12 (subcategories picked into My News) change
    // what this fetch covers, so they have to be part of the key — otherwise adding one
    // would serve a stale cache entry from before it existed.
    const extraCats = feedCategories.filter(c => !defaultCategories.includes(c)).sort().join(',');
    const cacheKey = `${selectedDay}|${presentSlots.join(',')}|${newsLanguage}|${extraCats}`;
    // Serve from cache — avoids re-fetching when user switches back to an already-loaded day
    if (briefingCacheRef.current[cacheKey]) {
      setBriefingData(briefingCacheRef.current[cacheKey]);
      setBriefingLoading(false);
      return;
    }
    setBriefingLoading(true);
    // Subcategories (e.g. Football, AI) aren't in defaultCategories — All News stays
    // parent-level only — but a user can still pick one into My News. Without folding
    // feedCategories in here, briefingData would simply never have an entry for it and
    // My Feed would render it as empty every day, silently.
    const cats = [...new Set([...defaultCategories, ...feedCategories])];
    Promise.allSettled(cats.map(async (cat) => {
      try {
        // This is the heavy one: full article text for every category, on every load.
        // A generated day+slot is immutable, so a cache hit skips the request entirely.
        const slotKey = presentSlots.join('+');
        const cached = readDayCache('list', cat, selectedDay, slotKey, newsLanguage);
        let data = Array.isArray(cached) ? cached : null;  // never trust a non-array here
        if (!data) {
          // Same shared edge cache as the single-category fetch above — see api/news.js.
          const params = new URLSearchParams({ mode: 'list', category: cat, day: selectedDay, slots: presentSlots.join(','), language: newsLanguage });
          const res = await fetch(`/api/news?${params}`);
          data = res.ok ? await res.json() : null;
          if (data && data.length) writeDayCache('list', cat, selectedDay, slotKey, newsLanguage, data);
        }
        if (!data || data.length === 0) return [cat, null];
        // Sort Evening first so incremental stories appear on top
        let sorted = [...data].sort((a, b) => slotOrder.indexOf(a.time_slot) - slotOrder.indexOf(b.time_slot));
        // Evening's digest already reproduces every Morning story (updated in place or
        // carried over unchanged) plus any new ones appended — see generateEveningUpdate
        // on the backend. Showing Morning's row alongside it would duplicate every story
        // that Evening didn't touch, so once Evening exists it fully replaces Morning.
        if (sorted.some(r => r.time_slot === 'Evening')) sorted = sorted.filter(r => r.time_slot !== 'Morning');
        // Category briefing — prefer the newest slot's summary (Evening over Morning)
        const briefing = sorted.find(r => r.briefing && r.briefing.trim())?.briefing || null;
        // Merge stories across slots, tagging each with its source slot
        const s = sorted.flatMap(row => {
          const { stories } = buildStories(row.content, row.stories_content);
          return stories.map(story => ({ ...story, generatedSlot: row.time_slot }));
        });
        if (s.length === 0) return [cat, null];
        const totalWords = s.reduce((acc, story) => {
          const fields = [
            ...(story.allBullets || story.tightBullets || []),
            story.perspectives,
            story.why,
            story.headline,
          ].filter(Boolean);
          return acc + fields.join(' ').split(/\s+/).filter(Boolean).length;
        }, 0);
        const estimatedSec = Math.max(10, Math.round((totalWords / 200) * 60));
        return [cat, { storyCount: s.length, estimatedSec, previewStories: s.slice(0, 3), allStories: s, briefing }];
      } catch { return [cat, null]; }
    })).then(results => {
      const out = {};
      results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value[1]) out[cats[i]] = r.value[1]; });
      briefingCacheRef.current[cacheKey] = out; // store in cache for this session
      setBriefingData(out);
      setBriefingLoading(false);
    });
  }, [selectedDay, newsLanguage, slotsLoaded, completedSlots, feedCategories]); // eslint-disable-line react-hooks/exhaustive-deps
}
