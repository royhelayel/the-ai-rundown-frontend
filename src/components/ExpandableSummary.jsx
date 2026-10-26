import React, { useLayoutEffect, useRef, useState } from 'react';

// The same quiet inline controls in Swipe and Scroll. Measure the full paragraph so a
// short summary does not offer a redundant more/less toggle.
export default function ExpandableSummary({ text, expanded: controlled, onToggle, onExpand, onCard = false }) {
  const [local, setLocal] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const expanded = controlled ?? local;
  const measure = useRef(null);
  useLayoutEffect(() => {
    const update = () => {
      const el = measure.current;
      if (!el?.clientWidth) return;
      const line = parseFloat(getComputedStyle(el).lineHeight) || 25.6;
      setOverflows(el.scrollHeight > line * 3 + 1);
    };
    update();
    const observer = new ResizeObserver(update);
    if (measure.current) observer.observe(measure.current);
    return () => observer.disconnect();
  }, [text]);
  const toggle = e => {
    e.stopPropagation();
    if (!expanded) onExpand?.();
    if (onToggle) onToggle(!expanded); else setLocal(!expanded);
  };
  const link = { fontSize: 14, fontWeight: 500, color: onCard ? 'var(--card-sub)' : 'var(--sub)', lineHeight: '25.6px', fontFamily: 'inherit' };
  return <div style={{ position: 'relative', fontSize: 16, lineHeight: 1.6, color: onCard ? 'var(--card-body)' : 'var(--sub)' }}>
    <div ref={measure} aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto', visibility: 'hidden', pointerEvents: 'none' }}>{text}</div>
    {expanded ? <p style={{ margin: 0 }}>{text}{overflows && <> <button className="rn-btn" aria-expanded="true" onClick={toggle} style={link}>less</button></>}</p>
      : <div style={{ maxHeight: '4.8em', overflow: 'hidden' }}>
        {overflows && <><div style={{ float: 'right', width: 0, height: '3.2em' }} />
          <button className="rn-btn" aria-expanded="false" onClick={toggle} style={{ ...link, float: 'right', clear: 'right', paddingLeft: 6, background: onCard ? 'var(--tp-card)' : 'var(--story-panel)' }}>… more</button></>}
        {text}
      </div>}
  </div>;
}
