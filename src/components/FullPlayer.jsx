import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Repeat, Play, Pause, SkipBack, SkipForward, Loader, Sparkles } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT, categoryGlow } from '../theme';
import CategoryIcon from './CategoryIcon';
import { centrePill } from '../utils';

// ── Speed cycle helper ─────────────────────────────────────────────────────────
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ── Category strip (auto-scrolls active pill into view) ───────────────────────
function CatStrip({ contextCategories, category, onSelectCategory }) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // Fires when playback crosses into a new category. Strip-local for the same reason as the
  // other two strips — scrollIntoView would also scroll whatever is behind the player.
  useEffect(() => {
    centrePill(stripRef.current, activeRef.current);
  }, [category]);

  return (
    <div
      ref={stripRef}
      style={{
        position: 'relative', zIndex: 10,
        overflowX: 'auto', scrollbarWidth: 'none',
      }}
    >
      <style>{`.fp-cat-strip::-webkit-scrollbar { display: none; }`}</style>
      <div className="fp-cat-strip" style={{ display: 'flex', gap: 8, padding: '8px 16px', minWidth: 'max-content' }}>
        {/* Original player treatment restored — it works against the artwork. Only the
            type size is aligned with the other screens (0.76rem). */}
        {contextCategories.map(cat => {
          const c   = CATEGORY_COLORS[cat] || '#6366f1';
          const act = cat === category;
          return (
            <button
              key={cat}
              ref={act ? activeRef : null}
              onClick={() => { if (!act && onSelectCategory) onSelectCategory(cat); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 13px', borderRadius: '8px',
                border: `1px solid ${act ? c : 'rgba(255,255,255,0.22)'}`,
                background: act ? c : 'rgba(0,0,0,0.38)',
                backdropFilter: act ? 'none' : 'blur(6px)',
                WebkitBackdropFilter: act ? 'none' : 'blur(6px)',
                cursor: act ? 'default' : 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                fontSize: '0.76rem', fontWeight: act ? '800' : '600',
                color: act ? 'white' : 'rgba(255,255,255,0.8)',
              }}
            >
              <CategoryIcon category={cat} size={13} color={act ? 'white' : 'rgba(255,255,255,0.8)'} />
              {CATEGORY_SHORT[cat] || cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── FullPlayer ────────────────────────────────────────────────────────────────
export default function FullPlayer({
  visible,
  isExiting,
  onMinimize,
  onClose,
  // Current story data
  category,
  story,
  storyIndex,
  storyCount,
  stories,
  // Narration state
  isNarrating,
  isPaused,
  isLoading,
  narrationProgress,
  playbackSpeed,
  repeatMode,
  depthLevel,
  // Handlers
  onPlay,
  onPause,
  onResume,
  onStop,
  onNext,
  onPrev,
  onSpeedCycle,
  onRepeatToggle,
  onSetDepth,
  // Story navigation (tapping a dot)
  onGoToStory,
  // Category strip
  contextCategories = [],
  onSelectCategory,
  // Source feed name (e.g. "Popular", "My Feed")
  feedName,
  // Interesting toggle
  isInteresting,
  onToggleInteresting,
  // Switch to the reader (silent) for the current story / briefing
  onRead,
}) {
  const color  = CATEGORY_COLORS[category] || colors.accent;
  const image  = CATEGORY_IMAGES[category];
  const glow   = categoryGlow(color);

  // Sheet slide-in / slide-out animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (visible && !isExiting) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [visible, isExiting]);

  // Sync browser chrome color with player state
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = visible ? (colors.bg || '#0a0a14') : '#ffffff';
    return () => { meta.content = '#ffffff'; };
  }, [visible]);

  const sheetRef = useRef(null);
  const translateY = mounted ? 0 : '100%';

  const headline = story?.headline || '';
  const isRecap  = !!story?._isBriefing;
  const bullets  = depthLevel === 'deep' ? (story?.allBullets || story?.tightBullets || []) : (story?.tightBullets || story?.allBullets || []);
  const excerpt  = bullets[0] || '';

  // bg color as rgb for gradient stop
  const bgColor = colors.bg || '#0a0a14';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', opacity: isExiting ? 0 : 1, transition: isExiting ? 'opacity 0.38s ease' : 'none' }}
        onClick={onMinimize}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute',
          left: '50%', bottom: 0,
          width: '100%', maxWidth: '480px',
          height: '100dvh',
          background: bgColor,
          borderRadius: '20px 20px 0 0',
          transform: `translateX(-50%) translateY(${typeof translateY === 'number' ? translateY + 'px' : translateY})`,
          transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          willChange: 'transform',
        }}
      >
        {/* ── Full-bleed immersive image ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '58%', zIndex: 0 }}>
          {image ? (
            <img
              src={image}
              alt={category}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            />
          ) : (
            /* Fallback: color gradient if no image */
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}40 0%, ${color}10 100%)` }} />
          )}
          {/* Top vignette — subtle dark fade so top bar text is readable */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }} />
          {/* Bottom fade — image melts into the dark background */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: `linear-gradient(to bottom, transparent 0%, ${bgColor}cc 60%, ${bgColor} 100%)` }} />
          {/* Color glow tint */}
          <div style={{ position: 'absolute', inset: 0, background: glow, mixBlendMode: 'screen', opacity: 0.35 }} />
        </div>

        {/* ── Top bar (floats over image) ── */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '1rem 1.25rem 0.5rem', minHeight: '52px' }}>
          <button
            onClick={onMinimize}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <ChevronDown size={20} />
          </button>
          {/* Absolutely centered breadcrumb — unaffected by button widths */}
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{feedName || 'Playing Now'}</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
              {isRecap ? `${category} Recap` : `${category} · ${storyIndex + 1} of ${storyCount}`}
            </p>
          </div>
        </div>

        {/* ── Story progress dots (floats over image) ── */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '4px', padding: '0.4rem 1.25rem' }}>
          {stories?.map((_, i) => (
            <button
              key={i}
              onClick={() => onGoToStory?.(i)}
              style={{ flex: 1, height: '3px', border: 'none', borderRadius: '99px', cursor: 'pointer', padding: 0, background: i === storyIndex ? 'white' : i < storyIndex ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }}
            />
          ))}
        </div>

        {/* ── Category pills strip ── */}
        {contextCategories.length > 0 && (
          <CatStrip
            contextCategories={contextCategories}
            category={category}
            onSelectCategory={onSelectCategory}
          />
        )}

        {/* ── Spacer — pushes headline down into the gradient zone ── */}
        <div style={{ flex: 1, position: 'relative', zIndex: 10 }} />

        {/* ── Headline + Excerpt (overlaid on image gradient) ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: '0 1.5rem 0.75rem' }}>
          {/* Headline */}
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '1.35rem', fontWeight: '900', color: '#ffffff', lineHeight: 1.22, letterSpacing: '-0.025em' }}>
            {headline}
          </h2>
          {/* Excerpt */}
          {excerpt && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {excerpt}
            </p>
          )}
          {/* Takeaways / Summary depth toggle — centered, under the story (not for recaps) */}
          {!isRecap && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: '999px', padding: '3px', marginTop: '0.85rem', width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}>
            {[['takeaways', 'Takeaways'], ['deep', 'Summary']].map(([level, label]) => (
              <button
                key={level}
                onClick={() => onSetDepth(level)}
                style={{ padding: '0.3rem 0.7rem', borderRadius: '999px', border: 'none', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: depthLevel === level ? color : 'transparent', color: depthLevel === level ? 'white' : 'rgba(255,255,255,0.7)' }}>
                {label}
              </button>
            ))}
          </div>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: '0.6rem 1.5rem 0.5rem' }}>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, borderRadius: '99px', transition: isNarrating && !isPaused ? 'width 0.1s linear' : 'width 0.25s ease' }} />
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: '0.25rem 1.5rem', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
          {/* Main controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button
              onClick={onPrev}
              style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <SkipBack size={22} />
            </button>

            <button
              onClick={isLoading ? undefined : (isPaused ? onResume : (isNarrating ? onPause : onPlay))}
              style={{ width: '72px', height: '72px', borderRadius: '50%', background: color, border: 'none', color: 'white', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 28px ${color}60`, transition: 'transform 0.15s', flexShrink: 0 }}>
              {isLoading
                ? <Loader size={26} style={{ animation: 'spin 0.8s linear infinite' }} />
                : (isNarrating && !isPaused
                  ? <Pause size={26} fill="white" />
                  : <Play size={26} fill="white" style={{ marginLeft: '3px' }} />
                )
              }
            </button>

            <button
              onClick={onNext}
              style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <SkipForward size={22} />
            </button>
          </div>

          {/* Secondary: Speed + Depth toggle + Repeat */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={onSpeedCycle}
              style={{ display: 'flex', alignItems: 'center', padding: '0.4rem 0.8rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>
              {playbackSpeed}×
            </button>

            {isRecap ? <div /> : (
            <button
              onClick={onToggleInteresting}
              title={isInteresting ? 'Remove from Interesting' : 'Mark as Interesting'}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.45rem 1rem', borderRadius: '999px', cursor: 'pointer',
                background: isInteresting ? `${color}33` : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isInteresting ? color : 'transparent'}`,
                color: isInteresting ? color : colors.textSub,
                fontSize: '0.76rem', fontWeight: '800',
              }}>
              <Sparkles size={15} fill={isInteresting ? color : 'none'} />
              Interesting
            </button>
            )}

            <button
              onClick={onRepeatToggle}
              style={{ width: '42px', height: '42px', borderRadius: '50%', background: repeatMode ? `${color}33` : 'rgba(255,255,255,0.08)', border: 'none', color: repeatMode ? color : colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Repeat size={18} />
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
