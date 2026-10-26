export const RECAP_COMPLETION = 0.70;
export const fraction = n => Math.max(0, Math.min(1, Number(n) || 0));
export function contentSignature(text) {
  let a = 2166136261, b = 5381;
  for (const c of text) { a = Math.imul(a ^ c.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ c.charCodeAt(0); }
  return `${text.length}-${(a >>> 0).toString(36)}-${(b >>> 0).toString(36)}`;
}
export const programmeKey = ({ day, period, language, category, text }) => `${day}|${period}|${language}|${category}|${contentSignature(text)}`;
export function mergeRanges(...groups) {
  const sorted = groups.flat().filter(r => Array.isArray(r) && r.length === 2 && Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[1] > r[0])
    .map(([a, b]) => [fraction(a), fraction(b)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const out = [];
  sorted.forEach(([a, b]) => { const tail = out[out.length - 1]; if (tail && a <= tail[1] + .00001) tail[1] = Math.max(tail[1], b); else out.push([a, b]); });
  return out;
}
export const coverage = ranges => mergeRanges(ranges || []).reduce((sum, [a, b]) => sum + b - a, 0);
export function mergeProgress(a = {}, b = {}) {
  const latest = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
  const ranges = mergeRanges(a.ranges || [], b.ranges || []);
  return { ...a, ...latest, ranges, completed: coverage(ranges) + 1e-8 >= RECAP_COMPLETION,
    mixCompleted: !!(a.mixCompleted || b.mixCompleted), finished: !!latest.finished };
}
export function queueKeys(snap) {
  return Object.entries(snap.map || {}).filter(([, v]) => v.allStories?.[0]?._isBriefing).map(([category, v]) => programmeKey({ day: snap.day, period: snap.period, language: snap.language, category, text: v.allStories[0].summary || '' }));
}
export function completedMixDays(records) {
  return [...new Set(Object.values(records).filter(r => r.mixCompleted && r.period === 'Daily').map(r => r.day))];
}
