import { cleanForTTS } from '../audio/narrationText';

const normalized = text => cleanForTTS(String(text || '')).replace(/\s+/g, ' ').trim();
export const narrationWeight = text => [...String(text).matchAll(/\S+/g)].reduce((sum, word) =>
  sum + Math.max(2, word[0].length) + (/[.!?؟]$/.test(word[0]) ? 7 : /[,;:،]$/.test(word[0]) ? 3 : 0), 0);

export function recapSentences(text) {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(/[\u0600-\u06ff]/.test(text) ? 'ar' : 'en', { granularity: 'sentence' }).segment(text)].map(s => s.segment.trim()).filter(Boolean);
  }
  // Protect decimals and initials in the fallback. A joined sentence is safer than a
  // fabricated fragment when a browser does not have Intl.Segmenter.
  return text.split(/(?<=[.!?؟])\s+(?=[A-Z“"\u0600-\u06ff])/).reduce((out, sentence) => {
    if (out.length && /(?:\b[A-Z]\.|\b(?:Dr|Mr|Mrs|Ms|Prof)\.)$/.test(out[out.length - 1])) out[out.length - 1] += ` ${sentence}`;
    else out.push(sentence);
    return out;
  }, []).filter(Boolean);
}

export function captionPhrases(text) {
  const words = [...text.matchAll(/\S+/g)];
  const phrases = []; let from = 0;
  words.forEach((word, i) => {
    if (i === words.length - 1 || (i - from >= 5 && /[,;:—،.!?؟]$/.test(word[0])) || i - from >= 12) {
      const start = words[from].index, end = word.index + word[0].length;
      phrases.push({ text: text.slice(start, end), weight: narrationWeight(text.slice(start, end)) });
      from = i + 1;
    }
  });
  let used = 0;
  const total = phrases.reduce((n, p) => n + p.weight, 0) || 1;
  return phrases.map(p => { const start = used / total; used += p.weight; return { ...p, start, end: used / total }; });
}

export function buildRecapScenes(rawText, sourceMap) {
  const text = normalized(rawText);
  if (!text) return [];
  let parts = sourceMap;
  if (typeof parts === 'string') { try { parts = JSON.parse(parts); } catch { parts = null; } }
  // Old attribution maps must never label a corrected recording. Use a map only when
  // all its text still matches the actual narration, including punctuation and numbers.
  const mapped = Array.isArray(parts) && parts.length && parts.every(p => p && typeof p.text === 'string')
    && normalized(parts.map(p => p.text).join(' ')) === text;
  const rows = mapped ? parts.map(p => ({ text: normalized(p.text), stories: Array.isArray(p.stories) ? p.stories : [] }))
    : recapSentences(text).map(sentence => ({ text: sentence, stories: [] }));
  const total = rows.reduce((sum, row) => sum + narrationWeight(row.text), 0) || 1;
  let weight = 0, cursor = 0;
  return rows.filter(row => row.text).map((row, index) => {
    const start = weight / total; weight += narrationWeight(row.text);
    const charStart = text.indexOf(row.text, cursor);
    cursor = Math.max(cursor, charStart + row.text.length);
    const stories = row.stories.filter(story => story && typeof story.headline === 'string');
    const headline = stories[0]?.headline || row.text;
    const displayHeadline = headline;
    return { ...row, stories, index, start, end: weight / total, charStart: Math.max(0, charStart), charEnd: cursor,
      headline, displayHeadline, phrases: captionPhrases(row.text) };
  });
}

export function scenePosition(scenes, progress = 0, charOffset = -1) {
  const fraction = Math.max(0, Math.min(1, (Number(progress) || 0) / 100));
  const scene = charOffset >= 0
    ? scenes.find(s => s.charEnd > charOffset) || scenes[scenes.length - 1]
    : scenes.find(s => s.end > fraction) || scenes[scenes.length - 1];
  if (!scene) return null;
  const local = charOffset >= 0
    ? narrationWeight(scene.text.slice(0, Math.max(0, charOffset - scene.charStart))) / Math.max(1, narrationWeight(scene.text))
    : (fraction - scene.start) / Math.max(.00001, scene.end - scene.start);
  const phase = Math.max(0, Math.min(1, local));
  return { scene, phase, caption: (scene.phrases.find(p => p.end > phase) || scene.phrases[scene.phrases.length - 1])?.text || scene.text };
}
