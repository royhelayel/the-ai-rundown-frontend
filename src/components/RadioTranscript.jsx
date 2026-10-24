import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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
// `after` is shown at the end of the text, inside the scrolling transcript — Stories & sources
// comes after the recap rather than docked under it (Roy, 2026-10-18).
export default function RadioTranscript({ text, progress, charOffset = -1, active, before = null, after = null }) {
  const words = useMemo(() => transcriptWords(text), [text]);
  const index = active ? wordAtProgress(words, progress, charOffset) : -1;
  const current = useRef(null);
  const viewport = useRef(null);
  const resumeTimer = useRef(null);
  const scrollTarget = useRef(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => () => clearTimeout(resumeTimer.current), []);
  const pauseFollow = () => {
    scrollTarget.current = null;
    const box = viewport.current;
    box?.scrollTo?.({ top: box.scrollTop, behavior: 'instant' });
    setFollow(false);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setFollow(true), 5000);
  };
  useLayoutEffect(() => {
    if (!follow || !active) return;
    const keepVisible = () => {
      const box = viewport.current;
      const word = current.current;
      if (!box || !word || !box.clientHeight) return;
      const bounds = box.getBoundingClientRect();
      const line = word.getBoundingClientRect();
      const padding = Math.min(48, box.clientHeight / 4);
      if (line.bottom > bounds.bottom - padding || line.top < bounds.top + padding) {
        const target = Math.max(0, Math.min(box.scrollHeight - box.clientHeight,
          box.scrollTop + line.top - bounds.top - padding));
        // Words on the same line share a destination; don't restart an in-flight glide.
        if (scrollTarget.current !== null && Math.abs(target - scrollTarget.current) < 2) return;
        scrollTarget.current = target;
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        box.scrollTo({ top: target, behavior: reducedMotion ? 'instant' : 'smooth' });
      }
    };
    keepVisible();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(keepVisible);
    if (viewport.current) observer?.observe(viewport.current);
    return () => observer?.disconnect();
  }, [index, follow, active]);
  return <>
    <style>{`.rn-radio-word { display: inline-grid; vertical-align: baseline; }
      .rn-radio-word::after { content: attr(data-word); font-weight: 700; visibility: hidden; grid-area: 1 / 1; pointer-events: none; }
      .rn-radio-word > span { grid-area: 1 / 1; }`}</style>
    <div ref={viewport} aria-label="Recap transcript" style={{ overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0, flex: 1 }} onWheel={pauseFollow} onTouchMove={pauseFollow}>
      {before}
      <p dir="auto" style={{ margin: 0, fontSize: 17, lineHeight: 1.85, color: 'var(--card-body)' }}>
        {words.map((w, i) => <span key={w.start} className="rn-radio-word" data-word={w.text} ref={i === index ? current : null}>
          <span data-narrated-word={i === index ? 'true' : undefined} style={{
            color: i === index ? 'var(--tp-chip, var(--accent))' : undefined,
            fontWeight: i === index ? 700 : 400,
          }}>{w.text}</span>
        </span>).reduce((out, word, i) => { if (i) out.push(' '); out.push(word); return out; }, [])}
      </p>
      {after}
    </div>
  </>;
}
