import React from 'react';

/**
 * ProgressRail — story progress as a vertical column of dots on the right edge.
 *
 * Replaces the horizontal segmented bar, which read as Instagram Stories and so implied
 * horizontal tapping. Rotating it 90° maps position on the rail to the actual gesture.
 *
 * Dots rather than stretched segments, matching Listen's rail: the current story is an
 * elongated pill, ones behind you are dim, ones ahead dimmer. The old version lit every
 * segment up to `filled` and left them all identical, so it showed how far through you were
 * but never which one was current — the boundary between lit and unlit was the only clue.
 *
 * The column sizes to its content now instead of stretching to 44% of the viewport, so three
 * stories make a short rail and eighteen make a long one, rather than both filling the same
 * space at different densities.
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

  // Colours follow the app's light/dark tokens now; `theme` is kept for older callers.
  const on   = 'var(--ink)';
  const read = 'var(--sub)';
  const off  = 'var(--line)';

  // `filled` counts stories up to and including the current one, so the current index is
  // filled - 1 and everything below it has been passed.
  const currentIdx = filled - 1;

  return (
    <div
      aria-hidden={!onSelect}
      style={{
        position, right: 2, top: '50%',
        // translateZ promotes the rail to its own compositor layer, so a fixed element
        // sitting over a scrolling list doesn't force the list to repaint beneath it.
        transform: 'translateY(-50%) translateZ(0)',
        willChange: 'transform',
        zIndex: 6,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: onSelect ? 'auto' : 'none',
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isCurrent = i === currentIdx;
        // The dot is 5px; the box around it is not. Transparent padding gives each a ~15px
        // target, since tapping one to jump to that story is the point of making them
        // buttons at all.
        const dot = {
          display: 'block', width: 5, height: isCurrent ? 16 : 5, borderRadius: 999,
          background: isCurrent ? on : i < currentIdx ? read : off,
          transition: 'height 0.2s ease, background 0.2s ease',
        };
        const box = {
          border: 'none', background: 'transparent', padding: '3px 5px', margin: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: onSelect ? 'pointer' : 'default',
        };
        return onSelect
          ? <button key={i} onClick={() => onSelect(i)} aria-label={`Story ${i + 1} of ${total}`}
              aria-current={isCurrent ? 'true' : undefined} style={box}><span style={dot} /></button>
          : <div key={i} style={box}><span style={dot} /></div>;
      })}
    </div>
  );
}
