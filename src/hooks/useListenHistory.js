import { useState, useCallback } from 'react';

const HISTORY_KEY = 'rundown_listen_history';
const PERFECT_KEY = 'rundown_perfect_days';
const MAX_HISTORY = 120;
const MAX_PERFECT = 120; // ~4 months

// ── Helpers ──────────────────────────────────────────────────────────────────

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m <  1)  return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  if (h < 48)  return 'Yesterday';
  return `${Math.floor(h / 24)}d ago`;
}

const BADGE_TIERS = [
  { name: 'platinum', label: 'Platinum', days: 90, color: '#7c3aed' },
  { name: 'gold',     label: 'Gold',     days: 30, color: '#d97706' },
  { name: 'silver',   label: 'Silver',   days: 7,  color: '#64748b' },
  { name: 'bronze',   label: 'Bronze',   days: 3,  color: '#b45309' },
];
export { BADGE_TIERS };

// ── Pure stats computation ────────────────────────────────────────────────────

export function computeGamifiedStats(history, perfectDays, briefingData, feedCategories) {
  const empty = { todayProgress: {}, allCaughtUp: false, caughtUpCount: 0, weeklyGrid: [], perfectStreak: 0, categoryBadges: {} };
  if (!feedCategories?.length) return empty;

  const today    = dayKey(Date.now());
  const perfectSet = new Set(perfectDays || []);

  // ── Today's listened per category ──────────────────────────────────────────
  const todayListened = {}; // {[cat]: Set<storyIndex>}
  history.forEach(h => {
    if (dayKey(h.timestamp) !== today) return;
    if (!todayListened[h.category]) todayListened[h.category] = new Set();
    todayListened[h.category].add(h.storyIndex);
  });

  // ── Per-category progress ──────────────────────────────────────────────────
  const todayProgress = {};
  feedCategories.forEach(cat => {
    const total    = briefingData?.[cat]?.storyCount || 0;
    const listened = todayListened[cat]?.size || 0;
    todayProgress[cat] = {
      listened,
      total,
      done: total > 0 && listened >= total,
      pct:  total > 0 ? Math.min(1, listened / total) : 0,
    };
  });

  const caughtUpCount = feedCategories.filter(c => todayProgress[c]?.done).length;
  const allCaughtUp   = feedCategories.length > 0 && caughtUpCount === feedCategories.length;

  // ── Weekly grid (last 7 days, oldest → newest) ─────────────────────────────
  const DAY_NAMES = ['S','M','T','W','T','F','S'];
  const weeklyGrid = Array.from({ length: 7 }, (_, i) => {
    const ts = Date.now() - (6 - i) * 86400000;
    const d  = new Date(ts);
    const k  = dayKey(ts);
    const isPerfect  = perfectSet.has(k);
    const hadListens = history.some(h => dayKey(h.timestamp) === k && feedCategories.includes(h.category));
    return {
      key: k,
      day: DAY_NAMES[d.getDay()],
      isToday: k === today,
      status: isPerfect ? 2 : hadListens ? 1 : 0, // 2=green(done) 1=yellow(partial) 0=gray
    };
  });

  // ── Perfect streak ─────────────────────────────────────────────────────────
  // Count consecutive perfect days going back; skip today if not yet perfect
  let perfectStreak = 0;
  const cur = new Date();
  if (!perfectSet.has(today)) cur.setDate(cur.getDate() - 1); // start from yesterday
  for (let i = 0; i < 365; i++) {
    if (perfectSet.has(dayKey(cur.getTime()))) {
      perfectStreak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }

  // ── Category badges (consecutive days with ≥1 listen in that category) ─────
  const categoryBadges = {};
  feedCategories.forEach(cat => {
    let streak = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1); // start from yesterday
    for (let i = 0; i < 365; i++) {
      const k = dayKey(d.getTime());
      if (history.some(h => dayKey(h.timestamp) === k && h.category === cat)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    categoryBadges[cat] = {
      streak,
      tier: BADGE_TIERS.find(t => streak >= t.days) || null,
    };
  });

  return { todayProgress, allCaughtUp, caughtUpCount, weeklyGrid, perfectStreak, categoryBadges };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export default function useListenHistory() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [perfectDays, setPerfectDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PERFECT_KEY) || '[]'); } catch { return []; }
  });

  const addToHistory = useCallback((story, category, storyIndex) => {
    if (!story?.headline || !category) return;
    setHistory(prev => {
      if (prev[0]?.headline === story.headline && prev[0]?.category === category
          && Date.now() - prev[0].timestamp < 10000) return prev;
      const entry = {
        id: Math.random().toString(36).slice(2, 10),
        headline: story.headline,
        category,
        storyIndex: storyIndex ?? 0,
        timestamp: Date.now(),
      };
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const markPerfectDay = useCallback(() => {
    const today = dayKey(Date.now());
    setPerfectDays(prev => {
      if (prev.includes(today)) return prev;
      const next = [today, ...prev].slice(0, MAX_PERFECT);
      try { localStorage.setItem(PERFECT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { history, perfectDays, addToHistory, markPerfectDay };
}
