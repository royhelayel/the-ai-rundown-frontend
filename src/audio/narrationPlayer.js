// One audio element for all narration, unlocked by the first tap anywhere in the app.
//
// iPhones only let a page play sound from an element that was started inside a tap. Narration
// fetched its audio first and then called play() on a brand-new element — seconds after the
// tap — so the first Play was refused, the engine stopped, and it took a second tap (whose audio
// was by then loaded, so it played inside the tap) (Roy, 2026-10-18). Playing a moment of silence
// on this element during the first tap unlocks it; every clip after reuses it.
let player = null;
let unlocked = false;

// A tenth of a second of silence, as a WAV made here rather than shipped.
function wavUrl(samples, rate = 22050) {
  const data = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) data[i] = Math.max(-1, Math.min(1, samples[i])) * 32767;
  const buf = new ArrayBuffer(44 + data.length * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data');
  v.setUint32(40, data.length * 2, true);
  new Int16Array(buf, 44).set(data);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
let silence = null;

export function narrationPlayer() {
  if (!player && typeof Audio !== 'undefined') { player = new Audio(); player.preload = 'auto'; }
  return player;
}

export function unlockNarrationAudio() {
  if (unlocked) return;
  const p = narrationPlayer();
  if (!p || (p.src && !p.paused)) return;          // already playing something: it is unlocked
  try {
    silence = silence || wavUrl(new Float32Array(2205));
    p.src = silence;
    const r = p.play();
    if (r && r.then) r.then(() => { unlocked = true; }).catch(() => {});
    else unlocked = true;
  } catch { /* try again on the next tap */ }
}

// The cue between two stories: a soft two-note chime, a podcast's sound mark rather than a voice
// saying "Up next" (Roy, 2026-10-18). Made once, here, so it costs nothing to record or fetch.
let chime = null;
export function storyChimeUrl() {
  if (chime) return chime;
  const rate = 22050, len = Math.round(rate * 0.55), out = new Float32Array(len);
  const note = (freq, start, dur, gain) => {
    const s0 = Math.round(start * rate), n = Math.round(dur * rate);
    for (let i = 0; i < n && s0 + i < len; i++) {
      const t = i / rate, env = Math.min(1, i / (0.01 * rate)) * Math.exp(-t * 7);
      out[s0 + i] += gain * env * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t));
    }
  };
  note(659.25, 0, 0.5, 0.16);      // E5
  note(987.77, 0.12, 0.43, 0.12);  // B5
  chime = wavUrl(out, rate);
  return chime;
}
