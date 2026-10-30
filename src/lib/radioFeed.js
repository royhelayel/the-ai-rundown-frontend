import { headlineKey } from './headlineKey';

// Reuse the existing read/interest signals. Never rewrite verified brief text or
// guess which recap segment belongs to a headline when its attribution is missing.
export function selectRadioFeed(map, lens, reads = {}, interests = {}, interestingData = {}) {
  if (lens === 'latest') return map;
  const counts = { ...interests };
  Object.values(interestingData).forEach(row => (row.allStories || []).forEach(story => {
    const key = headlineKey(story.headline || '');
    counts[key] = Math.max(counts[key] || 0, story._interestCount || 0);
  }));
  const score = story => {
    const headlines = story._quickRecap ? story._quickRecap.sources.map(s => s.headline) : [story.headline];
    return Math.max(0, ...headlines.map(h => Number((lens === 'popular' ? reads : counts)[headlineKey(h || '')]) || 0));
  };
  const rows = Object.entries(map).flatMap(([category, row]) => {
    // Weekly/monthly remain complete recordings; rank topics by their known stories.
    const period = row.allStories?.[0]?._recapPeriod;
    if (period === 'Weekly' || period === 'Monthly') {
      const known = row.rankingStories || [];
      const rank = Math.max(0, ...known.map(score));
      return rank ? [{ category, row, rank }] : [];
    }
    const ranked = (row.allStories || []).map((story, index) => ({ story, index, rank: score(story) }))
      .filter(item => item.rank > 0).sort((a, b) => b.rank - a.rank || a.index - b.index);
    return ranked.length ? [{ category, row: { ...row, allStories: ranked.map(item => item.story) }, rank: ranked[0].rank }] : [];
  });
  rows.sort((a, b) => b.rank - a.rank);
  return Object.fromEntries(rows.map(({ category, row }) => [category, row]));
}
