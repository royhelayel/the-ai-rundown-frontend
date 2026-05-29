import React, { useEffect, useState } from 'react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, categoryGradient, categoryGlow } from '../theme';
import { formatDuration } from '../utils';

export default function CategoryTransition({ visible, category, storyCount, estimatedSec, nextStoryTitle, onDone }) {
  const color = CATEGORY_COLORS[category] || colors.accent;
  const image = CATEGORY_IMAGES[category];
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!visible) { setOpacity(0); return; }
    // Fade in
    requestAnimationFrame(() => setOpacity(1));
    // Auto-dismiss after 2.5 s
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.4s ease', opacity }}>
      {/* Background image */}
      {image && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src={image} alt={category} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.25) saturate(1.4)' }} />
        </div>
      )}
      {/* Dark gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.75))` }} />
      {/* Colour glow */}
      <div style={{ position: 'absolute', inset: 0, background: categoryGlow(color) }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '2rem' }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', fontWeight: '700', color: `${color}cc`, textTransform: 'uppercase', letterSpacing: '0.18em' }}>
          Now Entering
        </p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '2.6rem', fontWeight: '900', color: 'white', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {category}
        </h1>
        {storyCount > 0 && (
          <p style={{ margin: '0 0 2rem', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>
            {storyCount} {storyCount === 1 ? 'story' : 'stories'} · ~{formatDuration(estimatedSec)}
          </p>
        )}
        {nextStoryTitle && (
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0.75rem 1.25rem', maxWidth: '320px', margin: '0 auto' }}>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Up next</p>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {nextStoryTitle}
            </p>
          </div>
        )}
      </div>

      {/* Bottom progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ height: '100%', width: '100%', background: color, transformOrigin: 'left', animation: 'shrink 2.5s linear forwards' }} />
      </div>
      <style>{`@keyframes shrink { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
}
