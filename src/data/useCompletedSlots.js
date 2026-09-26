import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function useCompletedSlots({
  setCompletedSlots, setSlotsLoaded, newsLanguage,
}) {
  // Fetch completion markers — tells us which day+slot combos have finished generating
  // Re-runs when newsLanguage changes so Arabic/English slots are tracked separately
  const completedInFlight = useRef(false);
  const completedFailures = useRef(0);
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    // Content lands twice a day, at fixed times. A 30s interval meant ~2,880 requests per
    // open tab per day, all but a couple of them byte-identical — polling to catch a
    // predictable event. We fetch once, refetch when the user returns to the app (which is
    // both cheaper and more timely than any interval), and otherwise only retry on failure.
    // This is also the right shape for the native app, where foreground is the real signal.
    const schedule = (overrideMs) => {
      if (cancelled) return;
      const n = completedFailures.current;
      if (overrideMs == null && n === 0) return;   // healthy: wait for a focus event instead
      const delay = overrideMs != null ? overrideMs : Math.min(30000 * 2 ** n, 300000);
      timer = setTimeout(fetchCompleted, delay);
    };

    const fetchCompleted = async () => {
      if (cancelled) return;
      // Never stack these requests — but always leave a retry queued. Returning bare
      // here deadlocks: StrictMode (and any effect re-run) starts a second call while
      // the first is still in flight, the second bails, and the first — now cancelled —
      // schedules nothing. completedSlots then stays empty and the feed renders blank.
      if (completedInFlight.current) { schedule(250); return; } // retry shortly, not a full poll cycle
      if (typeof document !== 'undefined' && document.hidden) { schedule(); return; } // don't poll hidden tabs
      completedInFlight.current = true;
      try {
        let q = supabase
          .from('news_summaries')
          .select('day, time_slot')
          .eq('category', '__completed__')
          .is('user_id', null)
          .is('shared_key', null);
        // Filter by language if the column exists (graceful: missing column returns all rows)
        if (newsLanguage) q = q.eq('language', newsLanguage);
        // supabase-js resolves (it does not throw) on an HTTP error, so `error` must be
        // read explicitly — otherwise a 5xx looks like "no data yet" and the UI waits forever.
        const { data, error } = await q;
        if (cancelled) return;
        if (error || !data) {
          completedFailures.current += 1;
        } else {
          completedFailures.current = 0;
          // Use functional update so we only replace the Set when content actually changes.
          // A new Set reference (even with same entries) triggers the handleFetchNews effect
          // which would cancel narration — so we must return the same `prev` when unchanged.
          setCompletedSlots(prev => {
            const incoming = data.map(r => `${r.day}|${r.time_slot}`);
            if (prev.size === incoming.length && incoming.every(k => prev.has(k))) return prev;
            return new Set(incoming);
          });
        }
      } catch (_) {
        completedFailures.current += 1;
      } finally {
        completedInFlight.current = false;
        // Always unblock the UI. This flag gates the news fetch, so leaving it false on a
        // failed request is what turns a backend hiccup into an app that loads forever.
        if (!cancelled) setSlotsLoaded(true);
        schedule();
      }
    };

    fetchCompleted();
    // Retry promptly when the user comes back to a tab that failed while hidden.
    // Returning to the app is exactly when fresh data matters — and it's when a native
    // app would fire onResume. Refetch on focus, not on a timer.
    const onVisible = () => { if (!document.hidden) fetchCompleted(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [newsLanguage]); // eslint-disable-line react-hooks/exhaustive-deps
}
