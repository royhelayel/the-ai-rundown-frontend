import { storyLedFor, storyLedPhase } from './storyLedAnimations';
import stories from '../components/storyLed/approvedStories.json';

test('Quick and Full share one illustration per approved story with narration-specific cues', () => {
  for (const story of ['devices','phobos','election','lockdown']) {
    const variants = stories.filter(s => s.story === story);
    expect(variants).toHaveLength(2);
    const [quick, full] = variants.map(s => storyLedFor(s.text));
    expect(quick.story).toBe(full.story);
    expect(quick.index).toBe(full.index);
    expect(quick.anchors).not.toEqual(full.anchors);
    for (const art of [quick, full]) {
      let previous = -1;
      for (let i=0; i<=100; i++) {
        const phase = storyLedPhase(art,i/100);
        expect(phase).toBeGreaterThanOrEqual(previous);
        expect(phase).toBeLessThanOrEqual(1);
        previous = phase;
      }
      art.anchors.forEach(cue => expect(storyLedPhase(art,cue.audio)).toBeCloseTo(cue.phase));
      expect(storyLedPhase(art,0)).toBe(0);
      expect(storyLedPhase(art,1)).toBe(1);
      expect(storyLedPhase(art,.2)).toBeLessThan(storyLedPhase(art,.8));
    }
  }
});

test('corrected text and unrelated stories cannot inherit an approved illustration', () => {
  const row=stories.find(s=>s.story==='devices');
  expect(storyLedFor(row.text.replace('18,835','19,835'))).toBeNull();
  expect(storyLedFor('A different spacecraft mission will launch.')).toBeNull();
  expect(storyLedFor('')).toBeNull();
  expect(storyLedFor(row.text.replaceAll(' ','  ')).story).toBe('devices');
});
