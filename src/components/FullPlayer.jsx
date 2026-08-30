import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Repeat, Play, Pause, SkipBack, SkipForward, Loader, Sparkles, Calendar } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT, categoryGlow } from '../theme';
import CategoryIcon from './CategoryIcon';
import CorpusToggle from './CorpusToggle';
import RecapBar from './RecapBar';
import { centrePill } from '../utils';

function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

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
  asPage = false,
  // Rendered at the bottom of the page shell (the dark BottomNav). Page mode only — the
  // sheet covers the nav rather than carrying one.
  footer = null,
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
  // Page-mode header: same scope controls the other two tabs carry, so Listen isn't a
  // dead end you have to leave to change day or corpus.
  corpus = 'all',
  onChangeCorpus,
  selectedDay,
  availableDays = [],
  onSelectDay,
  onOpenRecap,
  onPlayRecap,
}) {
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const dayPickerRef = useRef(null);
  useEffect(() => {
    if (!dayPickerOpen) return;
    const handler = (e) => { if (dayPickerRef.current && !dayPickerRef.current.contains(e.target)) setDayPickerOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [dayPickerOpen]);
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

  // The story progress dots, defined once because they render in two different places:
  // floating over the artwork in the sheet, and as the page header's dividing rule.
  const dots = (stories || []).map((_, i) => (
    <button
      key={i}
      onClick={() => onGoToStory?.(i)}
      style={{ flex: 1, height: '3px', border: 'none', borderRadius: '99px', cursor: 'pointer', padding: 0, background: i === storyIndex ? 'white' : i < storyIndex ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', transition: 'all 0.2s' }}
    />
  ));

  // Two shells, one body.
  //
  // asPage is the Listen tab: the player IS the screen, so it sits in normal flow with no
  // overlay, no backdrop and no slide-up — the bottom nav stays put beneath it and you switch
  // away with the nav rather than by dismissing anything. Everything below this is shared, so
  // the page and the sheet can't drift apart.
  //
  // Without asPage it stays exactly what it was: a sheet over whatever you were reading,
  // which is still how a single story is played from Scroll or Swipe.
  const body = (
    <>
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
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.5rem', minHeight: '52px' }}>
          {/* Close — stops playback outright, distinct from minimize which keeps it
              running behind the mini player. Takes the left slot minimize used to
              occupy; minimize moves to the right so the two aren't easy to mistake
              for each other. Neither belongs on the page: there's nothing behind it to
              minimise onto and the nav is how you leave. */}
          {!asPage && (
          <button
            onClick={onClose}
            aria-label="Close player"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <X size={20} />
          </button>
          )}
          {/* Absolutely centered breadcrumb — unaffected by button widths, so it sits in the
              same place on the page (where the two buttons are absent) as in the sheet. */}
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{feedName || 'Playing Now'}</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
              {isRecap ? `${category} Recap` : storyCount === 0 ? category : `${category} · ${storyIndex + 1} of ${storyCount}`}
            </p>
          </div>
          {!asPage && (
          <button
            onClick={onMinimize}
            aria-label="Minimize player"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <ChevronDown size={20} />
          </button>
          )}
        </div>

        {/* ── Story progress dots (floats over image). Sheet only: on the page they move up
               into the header, where they double as its dividing rule. ── */}
        {!asPage && (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '4px', padding: '0.4rem 1.25rem' }}>
          {dots}
        </div>
        )}

        {/* ── Category pills strip. Sheet only, for the same reason — on the page the pills
               belong with the rest of the narrowing chain (corpus, day, topic) up in the
               header, and this slot carries the recap instead. ── */}
        {!asPage && contextCategories.length > 0 && (
          <CatStrip
            contextCategories={contextCategories}
            category={category}
            onSelectCategory={onSelectCategory}
          />
        )}

        {/* ── Category recap, page only. It sits against the artwork, directly above the
               story it summarises, rather than up among the scope controls — it's content,
               not scope, and it was the one piece of *reading* stranded in the header. ── */}
        {asPage && onOpenRecap && !isRecap && storyCount > 0 && (
          <div style={{ position: 'relative', zIndex: 10, padding: '0.5rem 1.25rem 0' }}>
            <RecapBar category={category} theme="dark" compact
              onOpen={() => onOpenRecap(category)} onPlay={onPlayRecap} />
          </div>
        )}

        {/* ── Spacer — pushes headline down into the gradient zone ── */}
        <div style={{ flex: 1, position: 'relative', zIndex: 10 }} />

        {/* ── Headline + Excerpt (overlaid on image gradient) ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: '0 1.5rem 0.75rem' }}>
          {/* Headline. With nothing to play — a day that was never generated, reached from the
              date picker — the card would otherwise be blank under a "1 of 0" breadcrumb,
              which reads as a failed load rather than an empty day. Says what the other tabs
              say in the same situation. */}
          <h2 style={{ margin: '0 0 0.55rem', fontSize: storyCount === 0 ? '1rem' : '1.35rem', fontWeight: storyCount === 0 ? '700' : '900', color: storyCount === 0 ? 'rgba(255,255,255,0.6)' : '#ffffff', lineHeight: 1.22, letterSpacing: '-0.025em' }}>
            {storyCount === 0 ? 'No stories available for this day.' : headline}
          </h2>
          {/* Excerpt */}
          {excerpt && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {excerpt}
            </p>
          )}
          {/* Takeaways / Summary depth toggle — centered, under the story (not for recaps) */}
          {!isRecap && storyCount > 0 && (
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
        {storyCount > 0 && (
        <div style={{ position: 'relative', zIndex: 10, padding: '0.6rem 1.5rem 0.5rem' }}>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, borderRadius: '99px', transition: isNarrating && !isPaused ? 'width 0.1s linear' : 'width 0.25s ease' }} />
          </div>
        </div>
        )}

        {/* ── Controls. Hidden with nothing cued: transport that can't transport anything
               invites taps that do nothing, and skip/next on an empty list is exactly how
               the player used to wander off into another category. ── */}
        {storyCount > 0 && (
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
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  // The Listen tab — a full page, laid out the same way the Swipe page is: its own
  // fixed container with the nav rendered inside it via `footer`, rather than relying on
  // the app's global bar (which would end up underneath this). No backdrop and no
  // transform: there's nothing behind it to dim, and a page that slid up every time you
  // tapped Listen would read as a modal you're supposed to dismiss.
  if (asPage) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 150,
        background: bgColor,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* ── Page header: wordmark, then scope — the same statement the other two tabs open
               with, so Listen isn't a dead end you must leave to change day or feed.

               It sits *above* the body rather than inside it. Inside, it was painted over the
               top of the full-bleed image: the toggle's translucent track and the muted date
               had no contrast against whatever photo happened to load, and it displaced the
               player's own spacing so the page and the sheet no longer matched. On its own
               opaque strip it always reads, and everything below is the sheet untouched. ── */}
        <div style={{ position: 'relative', zIndex: 20, flexShrink: 0, background: bgColor }}>
          <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto' }}>
            <div style={{ padding: '9px 16px 0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                <span style={{ color: 'rgba(255,255,255,0.58)' }}>Radio</span>
                <span style={{ color: 'rgba(255,255,255,0.32)' }}>News</span>
              </span>
            </div>
            <div style={{ position: 'relative', zIndex: 12, display: 'flex', alignItems: 'center', padding: '11px 16px 10px', gap: 10 }}>
              <CorpusToggle value={corpus} onChange={onChangeCorpus} theme="dark" />
              <div style={{ flex: 1 }} />
              <div style={{ position: 'relative' }} ref={dayPickerRef}>
                <button onClick={() => availableDays.length > 0 && setDayPickerOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 0, background: 'transparent', border: 'none', cursor: availableDays.length ? 'pointer' : 'default' }}>
                  <Calendar size={12} color="rgba(255,255,255,0.6)" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{formatHeaderDate(selectedDay)}</span>
                  {availableDays.length > 0 && <ChevronDown size={12} color="rgba(255,255,255,0.6)" />}
                </button>
                {dayPickerOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 30, width: 160, background: '#15151f', borderRadius: 14, boxShadow: '0 12px 36px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.10)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {availableDays.map(day => {
                      const active = day.fullDate === selectedDay;
                      return (
                        <button key={day.fullDate}
                          onClick={() => { onSelectDay?.(day.fullDate); setDayPickerOpen(false); }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 9, border: 'none', background: active ? 'rgba(165,180,252,0.16)' : 'transparent', color: active ? '#a5b4fc' : 'rgba(255,255,255,0.8)', fontSize: '0.78rem', fontWeight: active ? 800 : 500, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                          {formatHeaderDate(day.fullDate)}
                          {active && <span style={{ fontSize: '0.6rem' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* Topics close the header, the same order the other two tabs use: wordmark,
                scope, topic, rule. The recap moved down onto the artwork — it was the only
                piece of content sitting in a strip of controls. */}
            {contextCategories.length > 0 && (
              <CatStrip
                contextCategories={contextCategories}
                category={category}
                onSelectCategory={onSelectCategory}
              />
            )}

            {/* The rule under the topics IS the story progress — one 3px line doing both
                jobs, instead of a hairline border and a separate strip of dots twenty
                pixels apart. Tapping a segment still jumps to that story. Falls back to a
                plain border when there's nothing to be partway through. */}
            {dots.length > 0 ? (
              <div style={{ display: 'flex', gap: '3px', padding: '4px 16px 6px' }}>
                {dots}
              </div>
            ) : (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        </div>

        {/* Wrapped to --body-max, the same column Scroll and Swipe use. This is a page among
            those pages, so it wraps where they wrap; on a desktop window an unconstrained
            player stretched the image and the controls edge to edge while every other tab
            stayed in its column. Below this the layout is the sheet's, untouched. */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {body}
        </div>
        {footer}
      </div>
    );
  }

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
        {body}
      </div>
    </div>
  );
}
