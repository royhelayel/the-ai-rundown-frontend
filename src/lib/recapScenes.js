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

export function reportedFigures(text) {
  // Literal excerpts only. Never round values, invent units, infer currencies, or turn
  // a date into a trend. Qualifiers stay attached to the number on the illustration.
  const pattern = /(?:(?:about|roughly|nearly|over|under|at least|up to|more than|less than|approximately)\s+)?(?:[$€£]\s*)?\d(?:[\d,.]*\d)?(?:[-\s]?(?:%|percent|billion|million|trillion|minutes?|hours?|days?|years?|inch(?:es)?|degrees?))?/gi;
  return [...text.matchAll(pattern)].filter(m => !/^\d{4}$/.test(m[0]) && !/[\p{L}\p{N}]/u.test(text[m.index - 1] || ''))
    .map(m => ({ literal: m[0], at: m.index })).slice(0, 5);
}

const cueAt = (text, pattern, fallback) => {
  const at = text.search(pattern);
  return at < 0 ? fallback : narrationWeight(text.slice(0, at)) / Math.max(1, narrationWeight(text));
};

export function illustrationFor(text) {
  const sentences = recapSentences(text);
  let cursor = 0;
  const facts = sentences.map(literal => {
    const at = text.indexOf(literal, cursor); cursor = at + literal.length;
    return { literal, at, cue: narrationWeight(text.slice(0, at)) / Math.max(1, narrationWeight(text)) };
  });
  const figures = reportedFigures(text).map(figure => ({ ...figure,
    context: facts.find(fact => figure.at >= fact.at && figure.at < fact.at + fact.literal.length)?.literal || text,
    cue: narrationWeight(text.slice(0, figure.at)) / Math.max(1, narrationWeight(text)) }));
  const fungi = /((?:(?:about|roughly|nearly|over|under|at least|up to|more than|less than|approximately)\s+)?\d+)\s+waxcap(?:\s+fungal)?\s+species/i.exec(text);
  if (fungi && /identified|found|discover|survey/i.test(text)) {
    return { type: 'fungi', figures, literal: `${fungi[1]} waxcap species`,
      context: facts.find(f => f.literal.includes(fungi[0]))?.literal || text,
      cue: cueAt(text, /\d+\s+waxcap/i, .2) };
  }
  const percent = /((?:(?:about|roughly|approximately)\s+)?(\d+(?:\.\d+)?)\s*(?:percent|%))\s+of\s+(?:its|the|their)\s+workforce/i.exec(text);
  if (percent && Number(percent[2]) >= 0 && Number(percent[2]) <= 100) {
    return { type: 'workforce', figures, percent: Number(percent[2]), percentLiteral: percent[1], cue: cueAt(text, /\d+(?:\.\d+)?\s*(?:percent|%)/i, .4) };
  }
  if (/Instagram/i.test(text) && /horizontal/i.test(text) && /TV|television/i.test(text) && /test/i.test(text)) {
    return { type: 'video', figures, duration: figures.find(f => /minutes?/i.test(f.literal))?.literal,
      cue: cueAt(text, /horizontal/i, .35), durationCue: cueAt(text, /\d+\s*minutes?/i, .6) };
  }
  if (/sandbox/i.test(text) && /block/i.test(text) && /external server/i.test(text) && /model/i.test(text)) {
    return { type: 'sandbox', figures, model: /Qwen/i.test(text) ? text.match(/Qwen/i)[0] : '', cue: cueAt(text, /block/i, .8) };
  }
  if (/\b(?:iPhone|phone|handset|iPad|tablet)\b/i.test(text) && /\b(?:screen|display|device|handset|tablet)\b/i.test(text)) {
    return { type: 'device', figures, tablet: /iPad|tablet/i.test(text), crack: /crack/i.test(text), replacement: /replac/i.test(text) };
  }
  return { type: figures.length ? 'figures' : 'editorial', figures, facts };
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
    const illustration = illustrationFor(row.text);
    // A literal headline prefix can introduce the update while the graphic carries
    // the exact figures. Keep the complete original headline in the sources sheet.
    const displayHeadline = illustration.type === 'workforce'
      ? headline.match(/^(.+?\b(?:offers?|offering|offered)\s+(?:voluntary\s+)?buyouts)\b/i)?.[1] || headline : headline;
    return { ...row, stories, index, start, end: weight / total, charStart: Math.max(0, charStart), charEnd: cursor,
      headline, displayHeadline, phrases: captionPhrases(row.text), illustration };
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
