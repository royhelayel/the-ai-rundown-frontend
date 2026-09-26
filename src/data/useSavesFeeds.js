import { useEffect } from 'react';
import { BACKEND_URL } from '../lib/backend';

export default function useSavesFeeds({
  user, setMySaves, setInterestingStories,
}) {
  // ── My Saves: fetch this user's saved stories (with snapshots) for the feed ──
  useEffect(() => {
    if (!user?.id) { setMySaves([]); return; }
    fetch(`${BACKEND_URL}/api/saves?userId=${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setMySaves(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [user?.id, setMySaves]);

  // ── Interesting: fetch global most-saved stories across all users ────────────
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/saves/interesting`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setInterestingStories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [setInterestingStories]);
}
