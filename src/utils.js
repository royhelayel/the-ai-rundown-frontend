// ── readTime / formatDuration ─────────────────────────────────────────────────
// formatDuration: converts a total-seconds value to a concise human string.
//   < 60s  →  "45s"
//   ≥ 60s  →  "1m 30s"  (or "3m" when seconds is 0)
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

// readTime: counts words across all story text fields and returns an exact
// duration string using formatDuration.  Reading speed: 200 wpm.
export function readTime(story) {
  if (!story) return '30s';
  const fields = [
    ...(story.allBullets || story.tightBullets || []),
    story.perspectives,
    story.why,
    story.headline,
  ].filter(Boolean);

  const wordCount = fields.join(' ').trim().split(/\s+/).length;
  const totalSeconds = Math.max(10, Math.round((wordCount / 200) * 60));
  return formatDuration(totalSeconds);
}

// centrePill: scroll a horizontal pill strip so `pill` sits centred within it.
//
// Deliberately not element.scrollIntoView(). That walks *every* scrollable ancestor
// including the document, and starting a programmatic smooth scroll on the document
// cancels the user's in-flight momentum scroll — so a strip auto-centring in response to
// scrolling would stop the very scroll that triggered it. Setting scrollLeft on the strip
// touches nothing else on the page.
export function centrePill(strip, pill, smooth = true) {
  if (!strip || !pill) return;
  const max = strip.scrollWidth - strip.clientWidth;
  if (max <= 0) return;
  const target = pill.offsetLeft - (strip.clientWidth - pill.offsetWidth) / 2;
  const left = Math.max(0, Math.min(max, target));
  if (Math.abs(strip.scrollLeft - left) < 2) return;
  strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
}

// ── Ranked-feed ordering ─────────────────────────────────────────────────────
//
// stableHash: FNV-1a, 32-bit. A deterministic number from a string — same result on every
// device, for every user, on every refresh, with nothing stored anywhere.
export function stableHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const rankCache = new Map();
function rankOf(key) {
  let v = rankCache.get(key);
  if (v === undefined) { v = stableHash(key); rankCache.set(key, v); }
  return v;
}

/**
 * The one ordering used by the ranked feeds (Popular, Interesting).
 *
 * Ties are the common case here, not the edge case: most stories sit at a count of 1, so
 * the tiebreaks decide most of the list rather than just its edges. Left unbroken, ties
 * fell back to insertion order — which meant the first category in the hardcoded list won
 * every tie, every day.
 *
 * The final tiebreak is a hash of the story's own headline. That reads as random, but it
 * is fixed: the same story sits in the same place on every refresh and for every user,
 * because the ordering is derived from the content rather than drawn at runtime. No seed to
 * store, nothing to keep in sync, and no category is systematically favoured.
 *
 * Items need: listenCount, interestCount, rankKey (a stable per-story string).
 */
export function rankStories(items, primary = 'reads') {
  const first  = primary === 'interest' ? 'interestCount' : 'listenCount';
  const second = primary === 'interest' ? 'listenCount'   : 'interestCount';
  return [...items].sort((a, b) =>
    (b[first]  || 0) - (a[first]  || 0) ||
    (b[second] || 0) - (a[second] || 0) ||
    rankOf(a.rankKey || '') - rankOf(b.rankKey || '')
  );
}
