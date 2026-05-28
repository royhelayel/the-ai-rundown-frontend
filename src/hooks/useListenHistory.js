import { useState, useCallback } from 'react';

const STORAGE_KEY = 'rundown_listen_history';
const MAX_HISTORY = 60;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(h) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h)); } catch {}
}

function dayKey(ts) {
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

function computeStats(history) {
  const now   = Date.now();
  const daySet = new Set(history.map(h => dayKey(h.timestamp)));

  // Streak — consecutive days back from today
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 365; i++) {
    const k = dayKey(cur.getTime());
    if (daySet.has(k)) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }

  // Last 7 days
  const weekAgo   = now - 7 * 86400000;
  const weekItems = history.filter(h => h.timestamp >= weekAgo);
  const storiesThisWeek  = weekItems.length;
  const minutesThisWeek  = Math.round(storiesThisWeek * 2.5);

  // This calendar month
  const d = new Date(now);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const storiesThisMonth = history.filter(h => h.timestamp >= monthStart).length;

  // Top category
  const catCounts = {};
  history.forEach(h => { catCounts[h.category] = (catCounts[h.category] || 0) + 1; });
  const topEntry    = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  const topCategory    = topEntry?.[0] || null;
  const topCategoryPct = topCategory ? Math.round((topEntry[1] / history.length) * 100) : 0;

  // 7-day bar chart — most recent 7 days, oldest first
  const DAY_NAMES = ['S','M','T','W','T','F','S'];
  const bars = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * 86400000);
    const k   = dayKey(day.getTime());
    return { day: DAY_NAMES[day.getDay()], count: history.filter(h => dayKey(h.timestamp) === k).length };
  });

  return { streak, storiesThisWeek, minutesThisWeek, storiesThisMonth, topCategory, topCategoryPct, bars };
}

export default function useListenHistory() {
  const [history, setHistory] = useState(load);

  const addToHistory = useCallback((story, category, storyIndex) => {
    if (!story?.headline || !category) return;
    setHistory(prev => {
      // Debounce: skip if same story added in last 10 s
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
      save(next);
      return next;
    });
  }, []);

  return { history, stats: computeStats(history), addToHistory };
}
