import React, { useState, useCallback } from 'react';

const HISTORY_KEY = 'rundown_listen_history';
const PERFECT_KEY  = 'rundown_perfect_days';

function historyKey(userId) { return userId ? `${HISTORY_KEY}_${userId}` : HISTORY_KEY; }
function perfectKey(userId) { return userId ? `${PERFECT_KEY}_${userId}`  : PERFECT_KEY;  }
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

export function computeGamifiedStats(history, perfectDays, briefingData, feedCategories, selectedTimeSlot = null, viewDay = null) {
  const empty = { todayProgress: {}, allCaughtUp: false, caughtUpCount: 0, weeklyGrid: [], perfectStreak: 0, categoryBadges: {}, morningAllDone: false, eveningAllDone: false };
  if (!feedCategories?.length) return empty;

  const today    = dayKey(Date.now());
  const activeDay = viewDay || today; // day whose progress is shown in category rows
  const perfectSet = new Set(perfectDays || []);

  // ── Listened per category for the active day (optionally filtered by time slot) ─
  // Use h.date (content date) when available; fall back to dayKey(h.timestamp) for old entries.
  const hDate = (h) => h.date || dayKey(h.timestamp);
  const todayListened = {}; // {[cat]: Set<storyIndex>}
  history.forEach(h => {
    if (hDate(h) !== activeDay) return;
    if (selectedTimeSlot && h.timeSlot && h.timeSlot !== selectedTimeSlot) return;
    if (!todayListened[h.category]) todayListened[h.category] = new Set();
    todayListened[h.category].add(h.storyIndex);
  });

  // ── Per-category progress ──────────────────────────────────────────────────
  const todayProgress = {};
  feedCategories.forEach(cat => {
    const total    = briefingData?.[cat]?.storyCount || 0;
    const rawSet   = todayListened[cat] || new Set();
    // Only count indices that exist in the current story list
    const listenedSet = total > 0 ? new Set([...rawSet].filter(idx => idx < total)) : new Set();
    const listened = listenedSet.size;
    todayProgress[cat] = {
      listened,
      total,
      done: total > 0 && listened >= total,
      pct:  total > 0 ? Math.min(1, listened / total) : 0,
      listenedIndices: listenedSet,
    };
  });

  const caughtUpCount = feedCategories.filter(c => todayProgress[c]?.done).length;
  const allCaughtUp   = feedCategories.length > 0 && caughtUpCount === feedCategories.length;

  // ── Per-slot completion for TODAY (used by banner + weekly grid) ───────────
  // Entries with no timeSlot are treated as Morning (backward compat with old data).
  const slotListened = { Morning: {}, Evening: {} };
  history.forEach(h => {
    if (hDate(h) !== today) return;
    if (!feedCategories.includes(h.category)) return;
    const slot = h.timeSlot === 'Evening' ? 'Evening' : 'Morning';
    if (!slotListened[slot][h.category]) slotListened[slot][h.category] = new Set();
    slotListened[slot][h.category].add(h.storyIndex);
  });

  const slotAllDone = (slot) => feedCategories.length > 0 && feedCategories.every(cat => {
    const total = briefingData?.[cat]?.storyCount || 0;
    if (total === 0) return true;
    const indices = slotListened[slot][cat] || new Set();
    return [...indices].filter(idx => idx < total).length >= total;
  });
  const morningAllDone = slotAllDone('Morning');
  const eveningAllDone = slotAllDone('Evening');

  // ── Weekly grid — two rows (morning + evening) per day ────────────────────
  // For today: use precise completion check against briefingData.
  // For past days: green = all feed cats had listens in that slot, amber = any, gray = none.
  const DAY_NAMES = ['S','M','T','W','T','F','S'];
  const weeklyGrid = Array.from({ length: 7 }, (_, i) => {
    const ts = Date.now() - (6 - i) * 86400000;
    const d  = new Date(ts);
    const k  = dayKey(ts);
    const isToday = k === today;

    const slotStatus = (slot) => {
      const slotEntries = history.filter(h =>
        hDate(h) === k &&
        feedCategories.includes(h.category) &&
        (slot === 'Morning' ? (!h.timeSlot || h.timeSlot === 'Morning') : h.timeSlot === 'Evening')
      );
      if (slotEntries.length === 0) return 0;
      if (isToday) {
        // exact: check all cats fully read
        const done = slotAllDone(slot);
        return done ? 2 : 1;
      }
      // past days: green = every feed cat had at least one listen, amber = some
      const catsWithListens = new Set(slotEntries.map(h => h.category));
      return catsWithListens.size >= feedCategories.length ? 2 : 1;
    };

    return {
      key: k,
      day: DAY_NAMES[d.getDay()],
      isToday,
      morningStatus: slotStatus('Morning'),
      eveningStatus: slotStatus('Evening'),
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
      if (history.some(h => hDate(h) === k && h.category === cat)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    categoryBadges[cat] = {
      streak,
      tier: BADGE_TIERS.find(t => streak >= t.days) || null,
    };
  });

  return { todayProgress, allCaughtUp, caughtUpCount, weeklyGrid, perfectStreak, categoryBadges, morningAllDone, eveningAllDone };
}

// ── Challenge stats (daily goal, streak, weekly) ─────────────────────────────

export function computeChallengeStats(history, dailyGoal = 10) {
  const today = dayKey(Date.now());

  // Count unique (category, storyIndex) pairs per content-day.
  // Use h.date (content date) when present; fall back to dayKey(h.timestamp) for old entries.
  const hDate2 = (h) => h.date || dayKey(h.timestamp);
  const dailyCounts = {};
  history.forEach(h => {
    const k = hDate2(h);
    if (!dailyCounts[k]) dailyCounts[k] = new Set();
    dailyCounts[k].add(`${h.category}|${h.storyIndex}`);
  });
  const dailyCountMap = {};
  Object.keys(dailyCounts).forEach(k => { dailyCountMap[k] = dailyCounts[k].size; });

  const todayCount = dailyCountMap[today] || 0;

  // Streak: consecutive days meeting goal (include today if goal met)
  let streakDays = 0;
  const cur = new Date();
  if (todayCount >= dailyGoal) {
    streakDays++;
    cur.setDate(cur.getDate() - 1);
  } else {
    cur.setDate(cur.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const k = dayKey(cur.getTime());
    if ((dailyCountMap[k] || 0) >= dailyGoal) {
      streakDays++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }

  // Weekly: how many of last 7 days met goal
  let weeklyDays = 0;
  const weekGrid = Array.from({ length: 7 }, (_, i) => {
    const ts  = Date.now() - (6 - i) * 86400000;
    const k   = dayKey(ts);
    const d   = new Date(ts);
    const DAY = ['S','M','T','W','T','F','S'];
    const cnt = dailyCountMap[k] || 0;
    const met = cnt >= dailyGoal;
    if (met) weeklyDays++;
    return { key: k, day: DAY[d.getDay()], isToday: k === today, count: cnt, met };
  });

  return {
    todayCount,
    dailyGoal,
    streakDays,
    weeklyDays,
    weeklyGoal: 6,
    weekGrid,
    dailyCountMap,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export default function useListenHistory(userId = null) {
  const hKey = historyKey(userId);
  const pKey = perfectKey(userId);

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(hKey) || '[]'); } catch { return []; }
  });
  const [perfectDays, setPerfectDays] = useState(() => {
    try { return JSON.parse(localStorage.getItem(pKey) || '[]'); } catch { return []; }
  });

  // Re-load from the correct key when userId changes (sign-in / sign-out)
  const prevUserIdRef = React.useRef(userId);
  React.useEffect(() => {
    if (prevUserIdRef.current === userId) return;
    prevUserIdRef.current = userId;
    try { setHistory(JSON.parse(localStorage.getItem(historyKey(userId)) || '[]')); } catch { setHistory([]); }
    try { setPerfectDays(JSON.parse(localStorage.getItem(perfectKey(userId)) || '[]')); } catch { setPerfectDays([]); }
  }, [userId]);

  // contentDate: the calendar date of the content being read (e.g. selectedDay = "2026-06-06").
  // Reads are attributed to this date so that reading yesterday's briefing today still
  // counts toward yesterday's streak goal.
  const addToHistory = useCallback((story, category, storyIndex, timeSlot = null, contentDate = null) => {
    if (!story?.headline || !category) return;
    setHistory(prev => {
      if (prev[0]?.headline === story.headline && prev[0]?.category === category
          && Date.now() - prev[0].timestamp < 10000) return prev;
      const entry = {
        id: Math.random().toString(36).slice(2, 10),
        headline: story.headline,
        category,
        storyIndex: storyIndex ?? 0,
        timeSlot: timeSlot || null,
        timestamp: Date.now(),
        // date = content date; fall back to device date for old callers without contentDate
        date: contentDate || dayKey(Date.now()),
      };
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(historyKey(userId), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [userId]);

  const markPerfectDay = useCallback(() => {
    const today = dayKey(Date.now());
    setPerfectDays(prev => {
      if (prev.includes(today)) return prev;
      const next = [today, ...prev].slice(0, MAX_PERFECT);
      try { localStorage.setItem(perfectKey(userId), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [userId]);

  return { history, perfectDays, addToHistory, markPerfectDay };
}
