import { useState, useEffect, useRef, useMemo } from 'react';

export default function usePeriodRecaps({
  selectedCategory, selectedDay, newsLanguage, today,
}) {
  // ── Period recaps (the week, the month) ─────────────────────────────────────
  //
  // Generated on the backend and stored under the sentinel category `__period__`, keyed on
  // the period's LAST day — so they come back through the same read layer as everything
  // else, with no new endpoint. A chip only appears when its row exists, which means the
  // feature is invisible until the day it has something to say.
  const [periodRecaps, setPeriodRecaps] = useState({ Weekly: null, Monthly: null });

  const periodEnds = useMemo(() => {
    const base = selectedDay || today;
    const d = new Date(`${base}T00:00:00Z`);
    // The most recent Sunday on or before the day being viewed.
    const week = new Date(d);
    week.setUTCDate(week.getUTCDate() - week.getUTCDay());
    // The last day of the month being viewed — unless that is still ahead of today, in
    // which case the month isn't over and the one to offer is the month before.
    let month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    if (month.toISOString().slice(0, 10) > today) {
      month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
    }
    return { Weekly: week.toISOString().slice(0, 10), Monthly: month.toISOString().slice(0, 10) };
  }, [selectedDay, today]);

  // One request per period per session, misses included.
  //
  // selectedDay settles in stages on a cold load (unset → today → the latest generated day),
  // and each stage re-ran this effect. With nothing remembering the outcome, every stage
  // re-requested both periods — and because these rows mostly do not exist yet, each was a
  // miss being fetched again and again: fourteen of the eighteen requests a fresh Listen
  // page made were this. A miss is an answer, so it is cached like any other.
  // Which topic's week and month are on screen.
  //
  // Listen and Swipe show one topic at a time, and that topic is selectedCategory. Scroll
  // shows twelve on one page: its recap is docked under the header and follows whichever
  // section you have scrolled into, which is emphatically not selectedCategory — nothing in
  // the feed sets that. Without a second source the docked row would label itself "Business
  // recap" while its Last week / Last month opened World News. The feed reports its own and
  // clears it when it unmounts, so the other two modes keep using selectedCategory.
  const [feedPeriodCategory, setFeedPeriodCategory] = useState(null);
  const periodCategory = feedPeriodCategory || selectedCategory;

  const periodCache = useRef(new Map());
  useEffect(() => {
    let cancelled = false;
    const load = async (period) => {
      const day = periodEnds[period];
      if (!day || !periodCategory) return [period, null];
      const key = `${period}|${day}|${periodCategory}|${newsLanguage}`;
      // The promise is what's cached, not the value. Caching only the resolved value still
      // let every effect run that started before the first one came back miss the cache and
      // fire its own request — which is most of them, since they all start within a frame
      // or two of each other. Sharing the in-flight promise collapses them into one.
      if (!periodCache.current.has(key)) {
        const params = new URLSearchParams({ mode: 'one', category: periodCategory, day, timeSlot: period, language: newsLanguage });
        periodCache.current.set(key, fetch(`/api/news?${params}`)
          .then(res => res.ok ? res.json() : null)
          .then(row => {
            const text = (row?.briefing || row?.content || '').trim();
            return text ? { day, text } : null;
          })
          .catch(() => { periodCache.current.delete(key); return null; }));  // a network failure isn't an answer
      }
      try { return [period, await periodCache.current.get(key)]; }
      catch { return [period, null]; }
    };
    Promise.all([load('Weekly'), load('Monthly')]).then(pairs => {
      if (cancelled) return;
      const next = Object.fromEntries(pairs);
      // Same values, new object — setting it would re-render for nothing.
      setPeriodRecaps(prev => (prev.Weekly === next.Weekly && prev.Monthly === next.Monthly) ? prev : next);
    });
    return () => { cancelled = true; };
    // selectedCategory is a dependency now: these are the selected topic's week and month,
    // not the whole app's, so switching topic has to fetch that topic's pair. The cache key
    // carries the category for the same reason — without it, the first category's recap
    // would be served for every other one.
  }, [periodEnds, newsLanguage, periodCategory]);

  return {
    periodRecaps, periodCategory, setFeedPeriodCategory,
  };
}
