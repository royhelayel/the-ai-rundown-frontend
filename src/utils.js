// ── readTime ──────────────────────────────────────────────────────────────────
// Counts words across all story text fields and returns a "X min read" string.
// Average reading speed: 200 wpm. Minimum: 1 min.

export function readTime(story) {
  if (!story) return '1 min read';
  const fields = [
    ...(story.allBullets || story.tightBullets || []),
    story.perspectives,
    story.why,
    story.headline,
  ].filter(Boolean);

  const wordCount = fields.join(' ').trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(wordCount / 200));
  return `${mins} min read`;
}
