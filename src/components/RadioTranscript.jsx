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
export default function RadioTranscript({ text, progress, charOffset = -1, active, before = null, after = null, label = 'Recap transcript', highlight = true, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [cropped, setCropped] = useState(false);
  const [visibleHeight, setVisibleHeight] = useState(null);
  const [visibleWords, setVisibleWords] = useState(null);
  const moreInline = useRef(null);
  const manualCollapse = useRef(false);
  const textBox = useRef(null);
  const paragraph = useRef(null);
  const firstHidden = useRef(-1);
  const collapsed = compact && !expanded;
  const words = useMemo(() => transcriptWords(text), [text]);
  const index = active ? wordAtProgress(words, progress, charOffset) : -1;
  const current = useRef(null);
  const viewport = useRef(null);
  const resumeTimer = useRef(null);
  const scrollTarget = useRef(null);
  const [follow, setFollow] = useState(true);
  useEffect(() => () => clearTimeout(resumeTimer.current), []);
  useLayoutEffect(() => {
    if (!collapsed) return;
    const measure = () => {
      const box = textBox.current, p = paragraph.current;
      if (!box?.clientHeight || !p) return;
      const lineHeight = parseFloat(window.getComputedStyle(p).lineHeight) || 25.575;
      const height = Math.floor(box.clientHeight / lineHeight) * lineHeight;
      setVisibleHeight(height);
      const overflow = p.scrollHeight > height + 1;
      setCropped(overflow);
      firstHidden.current = -1;
      if (overflow) {
        const bottom = box.getBoundingClientRect().top + height;
        const bounds = box.getBoundingClientRect();
        const reserve = moreInline.current?.getBoundingClientRect().width || 72;
        firstHidden.current = [...p.querySelectorAll('[data-radio-index]')].findIndex(word => {
          const line = word.getBoundingClientRect();
          return line.bottom > bottom + 1 || (line.bottom > bottom - lineHeight + 1 && line.right > bounds.right - reserve);
        });
        setVisibleWords(firstHidden.current < 0 ? words.length : firstHidden.current);
      }
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    [viewport.current, textBox.current, paragraph.current].forEach(el => el && observer?.observe(el));
    return () => observer?.disconnect();
  }, [collapsed, text, cropped]);
  useLayoutEffect(() => {
    if (collapsed && !manualCollapse.current && active && cropped && firstHidden.current >= 0 && index >= firstHidden.current) setExpanded(true);
  }, [collapsed, active, cropped, index]);
  const pauseFollow = () => {
    scrollTarget.current = null;
    const box = viewport.current;
    box?.scrollTo?.({ top: box.scrollTop, behavior: 'instant' });
    setFollow(false);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setFollow(true), 5000);
  };
  useLayoutEffect(() => {
    if (collapsed || !follow || !active) return;
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
  }, [index, follow, active, collapsed]);
  const moreButton = collapsed && cropped ? <span ref={moreInline} style={{ whiteSpace: 'nowrap' }}> … <button className="rn-btn" onClick={() => { manualCollapse.current = false; setExpanded(true); }} aria-expanded="false"
    style={{ fontSize: 14, lineHeight: 'inherit', fontWeight: 500, color: 'var(--card-sub)' }}>more</button></span> : null;
  const footer = typeof after === 'function' ? after({ moreButton: null }) : after;
  const content = (
    <div ref={viewport} aria-label={label} data-collapsed={collapsed} style={{ overflowY: collapsed ? 'hidden' : 'auto', overscrollBehavior: 'contain', minHeight: 0, flex: 1,
      ...(collapsed ? { display: 'flex', flexDirection: 'column' } : {}) }} onWheel={pauseFollow} onTouchMove={pauseFollow}>
      <div style={collapsed ? { flexShrink: 0 } : undefined}>{before}</div>
      <div ref={textBox} style={collapsed ? { position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' } : undefined}>
      {/* Set exactly as Read mode's paragraph (Swipe's card: 16.5px, 1.55), and the words are plain
          inline text, so lines and word gaps read the same in both (Roy, 2026-10-25). Each word
          used to be its own inline grid, sized to its bold width so turning bold did not reflow
          the line — which spaced the words unevenly and the lines further apart. The narrated
          word is now emboldened with an outline instead, which leaves its width as it is. */}
      {collapsed && <p ref={paragraph} aria-hidden="true" dir="auto" style={{ position: 'absolute', inset: '0 0 auto', visibility: 'hidden', margin: 0, fontSize: 16.5, lineHeight: 1.55 }}>
        {words.map((w, i) => <span key={w.start} data-radio-index={i}>{w.text}{i < words.length - 1 ? ' ' : ''}</span>)}
      </p>}
      <p ref={collapsed ? undefined : paragraph} dir="auto" style={{ ...(collapsed ? { maxHeight: visibleHeight ?? undefined, overflow: 'hidden' } : {}), margin: 0, fontSize: 16.5, lineHeight: 1.55, color: 'var(--card-body)' }}>
        {(collapsed && cropped && visibleWords !== null ? words.slice(0, visibleWords) : words).map((w, i) => <span key={w.start} data-radio-index={i} ref={i === index ? current : null}>
          <span data-narrated-word={highlight && i === index ? 'true' : undefined} style={highlight && i === index ? {
            color: 'var(--tp-chip, var(--accent))', WebkitTextStroke: '0.04em currentColor',
          } : undefined}>{w.text}</span>
        </span>).reduce((out, word, i) => { if (i) out.push(' '); out.push(word); return out; }, [])}
        {moreButton}
        {compact && expanded && cropped && <> <button className="rn-btn" aria-expanded="true"
          onClick={() => { manualCollapse.current = true; viewport.current?.scrollTo?.({ top: 0, behavior: 'instant' }); setExpanded(false); }}
          style={{ fontSize: 14, fontWeight: 500, color: 'var(--card-sub)' }}>less</button></>}
      </p>
      </div>
      <div style={collapsed ? { flexShrink: 0 } : undefined}>{footer}</div>
    </div>
  );
  return content;
}
