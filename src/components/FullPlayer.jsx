import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Repeat, Play, Pause, SkipBack, SkipForward, Loader } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, categoryGlow } from '../theme';

// ── Speed cycle helper ─────────────────────────────────────────────────────────
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ── FullPlayer ────────────────────────────────────────────────────────────────
export default function FullPlayer({
  visible,
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
}) {
  const color  = CATEGORY_COLORS[category] || colors.accent;
  const image  = CATEGORY_IMAGES[category];
  const glow   = categoryGlow(color);

  // Sheet slide-in animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (visible) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [visible]);

  // Swipe-down-to-minimize gesture
  const sheetRef = useRef(null);
  const dragRef  = useRef(null);
  const [dragY, setDragY] = useState(0);

  const onTouchStart = (e) => {
    dragRef.current = { startY: e.touches[0].clientY, dragging: true };
    setDragY(0);
  };
  const onTouchMove = (e) => {
    if (!dragRef.current?.dragging) return;
    const dy = e.touches[0].clientY - dragRef.current.startY;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (!dragRef.current?.dragging) return;
    dragRef.current.dragging = false;
    if (dragY > 80) onMinimize();
    setDragY(0);
  };

  const translateY = mounted ? dragY : '100%';

  const headline   = story?.headline || '';
  const bullets    = depthLevel === 'deep' ? (story?.allBullets || story?.tightBullets || []) : (story?.tightBullets || story?.allBullets || []);
  const excerpt    = bullets[0] || '';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={onMinimize} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 'auto',
          maxHeight: '88dvh',
          background: colors.bg,
          borderRadius: '20px 20px 0 0',
          transform: `translateY(${typeof translateY === 'number' ? translateY + 'px' : translateY})`,
          transition: dragY === 0 ? 'transform 0.38s cubic-bezier(0.32,0.72,0,1)' : 'none',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          willChange: 'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Glow overlay */}
        <div style={{ position: 'absolute', inset: 0, background: glow, pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Top bar ── */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.5rem' }}>
          <button onClick={onMinimize} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronDown size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Playing Now</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', fontWeight: '700', color: colors.textSub }}>
              {category} · {storyIndex + 1} of {storyCount}
            </p>
          </div>
          <div style={{ width: '36px' }} />
        </div>

        {/* ── Story dots ── */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '4px', padding: '0.5rem 1.25rem', justifyContent: 'center' }}>
          {stories?.map((_, i) => (
            <button key={i} onClick={() => onGoToStory?.(i)}
              style={{ flex: 1, maxWidth: '40px', height: '3px', border: 'none', borderRadius: '99px', cursor: 'pointer', padding: 0, background: i === storyIndex ? 'white' : i < storyIndex ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }} />
          ))}
        </div>

        {/* ── Hero image ── */}
        <div style={{ position: 'relative', zIndex: 1, flex: '0 0 200px', overflow: 'hidden', margin: '0 1.25rem', borderRadius: '16px' }}>
          {image && (
            <img src={image} alt={category} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.65))' }} />
          {/* Category badge */}
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
            <span style={{ padding: '0.25rem 0.7rem', background: color, borderRadius: '999px', fontSize: '0.65rem', fontWeight: '800', color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {category}
            </span>
          </div>
        </div>

        {/* ── Story info ── */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem 1.25rem 0', overflow: 'hidden' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: '900', color: colors.text, lineHeight: 1.25, letterSpacing: '-0.02em', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {headline}
          </h2>
          {excerpt && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: colors.textSub, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {excerpt}
            </p>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0.75rem 1.25rem 0.5rem' }}>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, borderRadius: '99px', transition: isNarrating && !isPaused ? 'width 0.1s linear' : 'width 0.25s ease' }} />
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 1.25rem', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
          {/* Main controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            {/* Prev */}
            <button onClick={onPrev} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <SkipBack size={22} />
            </button>

            {/* Play / Pause / Loader */}
            <button
              onClick={isLoading ? undefined : (isPaused ? onResume : (isNarrating ? onPause : onPlay))}
              style={{ width: '70px', height: '70px', borderRadius: '50%', background: color, border: 'none', color: 'white', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 24px ${color}55`, transition: 'transform 0.15s', flexShrink: 0 }}>
              {isLoading
                ? <Loader size={26} style={{ animation: 'spin 0.8s linear infinite' }} />
                : (isNarrating && !isPaused
                  ? <Pause size={26} fill="white" />
                  : <Play size={26} fill="white" style={{ marginLeft: '3px' }} />
                )
              }
            </button>

            {/* Next */}
            <button onClick={onNext} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              <SkipForward size={22} />
            </button>
          </div>

          {/* Secondary controls: Speed + Depth toggle + Repeat */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Speed */}
            <button onClick={onSpeedCycle}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>
              {playbackSpeed}×
            </button>

            {/* Depth toggle: Headlines / Summary */}
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '3px' }}>
              {[['headlines', 'Headlines'], ['deep', 'Summary']].map(([level, label]) => (
                <button key={level} onClick={() => onSetDepth(level)}
                  style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', border: 'none', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: depthLevel === level ? color : 'transparent', color: depthLevel === level ? 'white' : colors.textMuted }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Repeat */}
            <button onClick={onRepeatToggle}
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: repeatMode ? `${color}33` : 'rgba(255,255,255,0.08)', border: 'none', color: repeatMode ? color : colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Repeat size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
