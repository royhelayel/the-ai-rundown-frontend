import { useEffect, useMemo, useRef, useState } from 'react';

export function transcriptWords(text) {
  return [...text.matchAll(/\S+/g)].map(m => ({ text: m[0], start: m.index, end: m.index + m[0].length }));
}
export function wordAtProgress(words, progress, charOffset = -1) {
  if (!words.length) return -1;
  if (charOffset >= 0) {
    const found = words.findIndex(w => w.end > charOffset);
    return found < 0 ? words.length - 1 : found;
  }
  const weights = words.map(w => Math.max(2, w.text.length) + (/[.!?؟]$/.test(w.text) ? 7 : /[,;:،]$/.test(w.text) ? 3 : 0));
  const target = Math.max(0, Math.min(99.99, progress)) / 100 * weights.reduce((a, b) => a + b, 0);
  let sum = 0;
  return weights.findIndex(w => (sum += w) > target);
}
export default function RadioTranscript({ text, progress, charOffset = -1, active, phoneVoice }) {
  const words = useMemo(() => transcriptWords(text), [text]);
  const index = active ? wordAtProgress(words, progress, charOffset) : -1;
  const current = useRef(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => { if (follow && active) current.current?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' }); }, [index, follow, active]);
  return <>
    <style>{`.rn-radio-word { display: inline-grid; vertical-align: baseline; }
      .rn-radio-word::after { content: attr(data-word); font-weight: 700; visibility: hidden; grid-area: 1 / 1; pointer-events: none; }
      .rn-radio-word > span { grid-area: 1 / 1; }`}</style>
    <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0, flex: 1 }} onWheel={() => setFollow(false)} onTouchMove={() => setFollow(false)}>
      <p dir="auto" style={{ margin: 0, fontSize: 17, lineHeight: 1.85, color: 'var(--card-body)' }}>
        {words.map((w, i) => <span key={w.start} className="rn-radio-word" data-word={w.text} ref={i === index ? current : null}>
          <span data-narrated-word={i === index ? 'true' : undefined} style={{
            color: i === index ? 'var(--tp-chip, var(--accent))' : undefined,
            fontWeight: i === index ? 700 : 400,
          }}>{w.text}</span>
        </span>).reduce((out, word, i) => { if (i) out.push(' '); out.push(word); return out; }, [])}
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--card-sub)', marginTop: 8 }}>
      <span>{phoneVoice && charOffset >= 0 ? 'Word tracking' : 'Estimated word sync'}</span>
      <button className="rn-btn" aria-pressed={follow} onClick={() => setFollow(v => !v)} style={{ fontSize: 11, minHeight: 32 }}>{follow ? 'Following narration ✓' : 'Follow narration'}</button>
    </div>
  </>;
}
