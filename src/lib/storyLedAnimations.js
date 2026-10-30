import approved from '../components/storyLed/approvedStories.json';
import { cleanForTTS } from '../audio/narrationText';
import { narrationWeight } from './narrationTiming';

const normalize = text => cleanForTTS(String(text || '')).replace(/\s+/g, ' ').trim();
const kinds = ['devices', 'phobos', 'election', 'lockdown'];
const titles = { devices: 'Keystone key breach', phobos: 'Mission to Phobos', election: 'Brazil’s runoff result', lockdown: 'iPhone Lockdown Mode' };
const records = new Map(approved.map(record => {
  const text = normalize(record.text), total = narrationWeight(text) || 1;
  let previous = 0;
  const anchors = record.anchors.map(anchor => {
    const at = text.indexOf(anchor.phrase);
    const end = at + (anchor.edge === 'end' ? anchor.phrase.length : 0);
    const audio = narrationWeight(text.slice(0, end)) / total;
    if (at < 0 || audio <= previous || audio >= 1) throw new Error('Invalid approved animation cue');
    previous = audio;
    return { audio, phase: anchor.phase };
  });
  return [text, { type: 'story-led', story: record.story, title: titles[record.story], index: kinds.indexOf(record.story),
    anchors: [{ audio: 0, phase: 0 }, ...anchors, { audio: 1, phase: 1 }] }];
}));

// Match reviewed versions exactly. A corrected story cannot inherit stale figures
// or outcomes. Quick and Full resolve to the same illustration, with different cues.
export const storyLedFor = text => records.get(normalize(text)) || null;
export function storyLedPhase(art, audioPhase) {
  const p = Math.max(0, Math.min(1, Number(audioPhase) || 0));
  const i = art.anchors.findIndex(anchor => anchor.audio >= p);
  const b = art.anchors[i < 0 ? art.anchors.length - 1 : i];
  const a = art.anchors[Math.max(0, i - 1)];
  if (a === b) return b.phase;
  return a.phase + (b.phase - a.phase) * (p - a.audio) / (b.audio - a.audio);
}
