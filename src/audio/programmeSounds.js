import { wavUrl } from './narrationPlayer';

// Option A: the same quiet two-note mark as the approved comparison.
// Generated once on the device; no fetch, narration credits or music underneath speech.
const urls = new Map();
export function programmeCueUrl(kind = 'opening') {
  if (urls.has(kind)) return urls.get(kind);
  const rate = 22050;
  const closing = kind === 'closing';
  const samples = new Float32Array(Math.round(rate * (closing ? 1.1 : .95)));
  const notes = closing ? [[659.25, .3, .4, .07], [440, .47, .5, .07]] : [[440, 0, .4, .1], [659.25, .14, .4, .075]];
  for (const [hz, start, duration, gain] of notes) {
    for (let i = 0; i < Math.round(duration * rate); i++) {
      const at = Math.round(start * rate) + i;
      if (at >= samples.length) break;
      const t = i / rate;
      const envelope = Math.min(1, t / .015) * Math.exp(-9 * t) * Math.min(1, (duration - t) / .06);
      samples[at] += gain * envelope * (Math.sin(2 * Math.PI * hz * t) + .12 * Math.sin(4 * Math.PI * hz * t));
    }
  }
  const url = wavUrl(samples, rate);
  urls.set(kind, url);
  return url;
}
