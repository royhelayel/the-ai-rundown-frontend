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
