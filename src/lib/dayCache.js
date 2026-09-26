// ── Day cache ──────────────────────────────────────────────────────────────
// A generated day+slot never changes once written, so it is safe to cache forever
// and serve without hitting the database. This is the client half of publishing the
// feed statically: repeat opens cost nothing, and it degrades gracefully offline —
// which is what the native app will need. Keyed so language and slot can't collide.
// `kind` namespaces the two shapes we cache: 'list' holds an array of slot rows for the
// feed, 'one' holds a single row for the selected category. They previously shared a key
// whenever a day had one slot, and the feed then read an object where it expected an
// array — silently dropping that category from the feed.
export const dayCacheKey = (kind, cat, day, slot, lang) => `rundown_feed:${kind}:${lang}:${day}:${slot}:${cat}`;
export const readDayCache = (kind, cat, day, slot, lang) => {
  try {
    const raw = localStorage.getItem(dayCacheKey(kind, cat, day, slot, lang));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
export const writeDayCache = (kind, cat, day, slot, lang, data) => {
  try {
    localStorage.setItem(dayCacheKey(kind, cat, day, slot, lang), JSON.stringify(data));
  } catch {
    // Quota reached — drop older days rather than silently failing every write.
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('rundown_feed:') && !k.includes(`:${day}:`))
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem(dayCacheKey(kind, cat, day, slot, lang), JSON.stringify(data));
    } catch {}
  }
};
