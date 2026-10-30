// Shared with recap scene/coverage spans. Keep this weighting unchanged.
export const narrationWeight = text => [...String(text).matchAll(/\S+/g)].reduce((sum, word) =>
  sum + Math.max(2, word[0].length) + (/[.!?؟]$/.test(word[0]) ? 7 : /[,;:،]$/.test(word[0]) ? 3 : 0), 0);
