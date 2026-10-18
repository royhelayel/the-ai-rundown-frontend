import { useEffect, useRef } from 'react';
import { BACKEND_URL } from '../lib/backend';

export default function useSavesFeeds({
  user, setMySaves, setInterestingStories, setSavedStories, interestingVersion = 0, onInteresting = false,
}) {
  // ── My Saves: fetch this user's saved stories (with snapshots) for the feed ──
  // The server's list is also what lights the stars on this phone. They used to come from this
  // phone's storage alone, so a story starred on another device showed unstarred here, and a
  // star lost on this one stayed lost (Roy, 2026-10-18).
  useEffect(() => {
    if (!user?.id) { setMySaves([]); return; }
    fetch(`${BACKEND_URL}/api/saves?userId=${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!Array.isArray(d)) return;
        setMySaves(d);
        if (setSavedStories) {
          const stars = d.filter(s => s.headline).map(s => ({
            category: s.category, storyIndex: s.story_index, headline: s.headline, preview: s.preview || '', day: s.day || null,
          }));
          setSavedStories(stars);
          try { localStorage.setItem('rundown_saved_stories', JSON.stringify(stars)); } catch {}
        }
      })
      .catch(() => {});
  }, [user?.id, setMySaves, setSavedStories]);

  // ── Interesting: everyone's most-saved stories ──
  // Read when the app opens, again whenever Interesting is opened, and again after a star is
  // saved — so it is never the list from when the app started. The newest request wins.
  const latest = useRef(0);
  useEffect(() => {
    const ask = ++latest.current;
    fetch(`${BACKEND_URL}/api/saves/interesting`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (ask === latest.current && Array.isArray(d)) setInterestingStories(d); })
      .catch(() => {});
  }, [setInterestingStories, interestingVersion, onInteresting]);
}
