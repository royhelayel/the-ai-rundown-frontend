import React from 'react';
import { Play, X } from 'lucide-react';
import InterestingButton from './InterestingButton';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

/**
 * StorySummarySheet — the "Summary" bottom sheet for a single story.
 *
 * Used in two places, which is exactly why it lives here rather than inline:
 *   • Scroll mode — opened directly over the feed (fixed), with no reader beneath it.
 *   • Swipe mode  — opened over the full-page reader (absolute, inside that container).
 *
 * Order is deliberate: Takeaways, then the full picture, then perspectives / why / sources.
 */
export default function StorySummarySheet({
  open,
  story,
  category,
  onClose,
  onPlay,
  isInteresting = false,
  onToggleInteresting,
  fixed = false,          // true when it stands alone over a feed
}) {
  // In Scroll mode the sheet mounts already "open", so there'd be no transition to play.
  // Start it down and flip on the next frame so it slides up like Swipe mode's sheet.
  const [entered, setEntered] = React.useState(!fixed);
  React.useEffect(() => {
    if (!fixed) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(id);
  }, [fixed]);
  const shown = open && entered;

  // Lock the page while the sheet is over it. overscroll-behavior alone only stops the
  // chaining at the sheet's own top and bottom; on iOS a touch that starts on a fixed
  // overlay still scrolls the body underneath. Pinning the body and offsetting it by the
  // current scroll keeps the feed exactly where it was, and restores it on close.
  // Only in `fixed` mode — in Swipe mode the sheet sits inside the reader, which owns its
  // own gesture and has no page scroll to protect.
  //
  // Keyed on mount, not on `open`: the caller flips `open` to false the instant Close is
  // tapped, to start the 0.34s slide-down, but keeps this component mounted for a beat
  // longer (Scroll mode waits ~0.4s before it actually navigates away). Restoring here on
  // `open` used to run right then — unpinning the body and jumping the feed back to its
  // scroll position in the same frame the close was tapped, while the sheet was still
  // visibly sliding down over the strip of feed exposed above it. That instant reflow
  // underneath a still-animating sheet was the flicker. Waiting for unmount instead means
  // the restore lands only once the sheet (and whatever mounted it) is actually gone.
  React.useEffect(() => {
    if (!fixed) return;
    const y = window.scrollY;
    const { position, top, width, overflow } = document.body.style;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      document.body.style.overflow = overflow;
      window.scrollTo(0, y);
    };
  }, [fixed]);

  if (!story) return null;

  const color = CATEGORY_COLORS[category] || '#6366f1';
  const summaryBullets = story.allBullets?.length ? story.allBullets : (story.tightBullets || []);
  // Only repeat the takeaways when they're distinct from the full picture below —
  // i.e. punchy bullets exist, or the full picture is prose.
  const takeaways = story.tightBullets?.length
    ? story.tightBullets
    : (story.summary ? (story.allBullets || []).slice(0, 3) : []);
  const outlets = (story.storySources || []).filter(s => s.outlet);

  const pos = fixed ? 'fixed' : 'absolute';

  return (
    <>
      <div onClick={onClose}
        style={{ position: pos, inset: 0, zIndex: fixed ? 300 : 60, background: 'rgba(0,0,0,0.5)', opacity: shown ? 1 : 0, pointerEvents: shown ? 'auto' : 'none', transition: 'opacity 0.3s', willChange: 'opacity' }} />

      <div style={{
        position: pos, left: fixed ? '50%' : 0, right: fixed ? 'auto' : 0, bottom: 0,
        width: fixed ? '100%' : 'auto', maxWidth: fixed ? 560 : 'none',
        // 61 clears Swipe mode's bottom nav (z-index 45), which otherwise covers the Listen bar.
        zIndex: fixed ? 301 : 61, height: '92%',
        background: light.bg, borderRadius: '20px 20px 0 0',
        // translateZ promotes the panel to its own compositor layer. Without it, a
        // full-width opaque sheet sliding over a very long feed makes the browser repaint
        // the strip it uncovers on every frame of the animation — which is the flicker
        // across the lower half of the screen as the summary closes.
        transform: fixed
          ? `translateX(-50%) translateY(${shown ? '0' : '100%'}) translateZ(0)`
          : `translateY(${shown ? '0' : '100%'}) translateZ(0)`,
        transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)',
        willChange: 'transform', backfaceVisibility: 'hidden',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 18px 8px', borderBottom: `1px solid ${light.border}`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 10px' }} />
          {/* Category + actions on their own compact row, headline as a full-width block
              below it — not sharing the row with the buttons. A flex row keeps every item's
              column reserved for the row's full height, so with the buttons as headline
              siblings, a headline long enough to wrap kept getting squeezed into whatever
              was left of the row's width for every line, not just the first — the card's
              body text a few lines down used the full width, but the headline above it
              visibly didn't. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{CATEGORY_SHORT[category] || category}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Interesting sits immediately left of Close — the same top-right corner it
                  occupies on the story card and in Swipe mode. */}
              {onToggleInteresting && (
                <InterestingButton active={!!isInteresting} onClick={onToggleInteresting} />
              )}
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: light.bgSub, border: 'none', color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-label="Close summary"><X size={16} /></button>
            </div>
          </div>
          <h2 style={{ margin: '6px 0 0', fontSize: '1.05rem', fontWeight: 800, color: light.text, lineHeight: 1.25 }}>{story.headline}</h2>
        </div>

        {/* overscrollBehavior: contain stops the scroll chaining to the feed underneath once
            this reaches its top or bottom — without it, reading to the end of the summary
            carried on scrolling the page behind the sheet. */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '1rem 1.25rem 6rem' }}>
          {takeaways.length > 0 && (
            <div style={{ padding: '0.9rem 1rem', background: light.bgSub, borderRadius: 12, marginBottom: '1.4rem' }}>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: 800, color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Takeaways</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {takeaways.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.5rem' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: light.text, lineHeight: 1.6, fontWeight: 500 }}>{b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* The full picture — narrative for new stories, detailed bullets otherwise */}
          {story.summary ? (
            <>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.68rem', fontWeight: 800, color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>The full picture</p>
              <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.8 }}>{story.summary}</p>
            </>
          ) : summaryBullets.length > 0 ? (
            <>
              <p style={{ margin: '0 0 0.7rem', fontSize: '0.68rem', fontWeight: 800, color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>The full picture</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {summaryBullets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.58rem' }} />
                    <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.7 }}>{b}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {story.perspectives && (
            <div style={{ padding: '0.9rem 1rem', background: `${color}08`, borderRadius: 12, borderLeft: `3px solid ${color}`, marginTop: '1.4rem' }}>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perspectives differ</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: light.textSub, lineHeight: 1.65 }}>{story.perspectives}</p>
            </div>
          )}

          {story.why && (
            <div style={{ padding: '0.9rem 1rem', background: light.bgSub, borderRadius: 12, borderLeft: `3px solid ${light.border}`, marginTop: '0.85rem' }}>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: 800, color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why this matters</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: light.textSub, lineHeight: 1.65 }}>{story.why}</p>
            </div>
          )}

          {outlets.length > 0 && (
            <>
              <p style={{ margin: '1.6rem 0 0.55rem', fontSize: '0.68rem', fontWeight: 800, color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sources</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {outlets.map((s, i) => (
                  s.url ? (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      style={{ padding: '4px 10px', background: light.bgSub, borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>{s.outlet}</a>
                  ) : (
                    <span key={i} style={{ padding: '4px 10px', background: light.bgSub, borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>{s.outlet}</span>
                  )
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0.75rem 1.25rem', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 0.9rem)', background: light.bg, borderTop: `1px solid ${light.border}` }}>
          {/* Same treatment as Swipe mode's primary action: flat fill, 12px corners, no
              gradient — inverted for a light sheet, since white-on-white wouldn't read. */}
          <button onClick={() => { onClose?.(); onPlay?.(); }}
            style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid transparent', background: '#0a0a14', color: '#fff', fontSize: '0.86rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            <Play size={16} fill="#fff" color="#fff" /> Listen to this story
          </button>
        </div>
      </div>
    </>
  );
}
