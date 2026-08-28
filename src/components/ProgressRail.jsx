import React from 'react';

/**
 * ProgressRail — story progress as a vertical rail on the right edge.
 *
 * Replaces the horizontal segmented bar, which read as Instagram Stories and so implied
 * horizontal tapping. Rotating it 90° maps position on the rail to the actual gesture.
 *
 * position: 'fixed'    — Scroll mode, pinned to the viewport beside the feed.
 *           'absolute' — Swipe mode, inside the reader (its own positioned container).
 */
export default function ProgressRail({
  filled = 0,           // how many segments are lit, from the top
  total = 0,
  theme = 'light',
  position = 'fixed',
  onSelect,             // optional — tap a segment to jump to that story
}) {
  if (total < 2) return null;

  const dark = theme === 'dark';
  const on   = dark ? '#ffffff' : '#0a0a0f';
  const off  = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)';

  return (
    <div
      aria-hidden={!onSelect}
      style={{
        position, right: 7, top: '50%',
        // translateZ promotes the rail to its own compositor layer, so a fixed element
        // sitting over a scrolling list doesn't force the list to repaint beneath it.
        transform: 'translateY(-50%) translateZ(0)',
        willChange: 'transform',
        height: '44%', width: 3, zIndex: 6,
        display: 'flex', flexDirection: 'column', gap: 3,
        pointerEvents: onSelect ? 'auto' : 'none',
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const lit = i < filled;
        const seg = { flex: 1, width: 3, borderRadius: 2, background: lit ? on : off, transition: 'background 0.2s' };
        return onSelect
          ? <button key={i} onClick={() => onSelect(i)} aria-label={`Story ${i + 1}`} style={{ ...seg, border: 'none', padding: 0, cursor: 'pointer' }} />
          : <div key={i} style={seg} />;
      })}
    </div>
  );
}
