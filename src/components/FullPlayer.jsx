import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Repeat, Play, Pause, SkipBack, SkipForward, Loader, Calendar, SlidersHorizontal, FileText } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT } from '../theme';
import CategoryIcon from './CategoryIcon';
import CorpusToggle from './CorpusToggle';
import RecapBar from './RecapBar';
import InterestingButton from './InterestingButton';
import CircleAction from './CircleAction';
import LensToggle from './LensToggle';
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

// Lift a category colour toward white so it stays legible over the dark photo — the same
// helper Swipe mode uses for its pills, copied so the two strips tint identically.
function tintForDark(hex, amount = 0.45) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const mix = (ch) => Math.round(ch + (255 - ch) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// ── Speed cycle helper ─────────────────────────────────────────────────────────
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ── Category strip (auto-scrolls active pill into view) ───────────────────────
function CatStrip({ contextCategories, category, onSelectCategory, onEditCategories, user, onGuestEdit }) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // Fires when playback crosses into a new category. Strip-local for the same reason as the
  // other two strips — scrollIntoView would also scroll whatever is behind the player.
  useEffect(() => {
    centrePill(stripRef.current, activeRef.current);
  }, [category]);

  // Drawn exactly as Swipe's strip: flat text pills, only the active one carrying a fill,
  // its colour the category's own tinted for a dark ground. It used to be a row of bordered,
  // blurred chips — its own dialect on the one screen that should look most like the others.
  return (
    <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center' }}>
      <style>{`.fp-cat-strip::-webkit-scrollbar { display: none; }`}</style>

      {/* Same control, same place as Swipe and Scroll — outside the scroller so it holds
          still while the pills move past it. */}
      {onEditCategories && (
        <button
          onClick={() => (user ? onEditCategories() : onGuestEdit?.())}
          aria-label="Choose your topics"
          title="Choose your topics"
          style={{ flexShrink: 0, width: 26, height: 26, marginLeft: 16, borderRadius: 8, border: 'none',
            background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SlidersHorizontal size={14} />
        </button>
      )}

      <div ref={stripRef} className="fp-cat-strip" style={{ flex: 1, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 8, padding: '8px 16px 9px', minWidth: 'max-content' }}>
          {contextCategories.map(cat => {
            const act = cat === category;
            const c = act ? tintForDark(CATEGORY_COLORS[cat]) : 'rgba(255,255,255,0.55)';
            return (
              <button
                key={cat}
                ref={act ? activeRef : null}
                onClick={() => { if (!act && onSelectCategory) onSelectCategory(cat); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, border: 'none',
                  background: act ? 'rgba(255,255,255,0.20)' : 'transparent',
                  color: c,
                  fontSize: '0.76rem', fontWeight: act ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0,
                  cursor: act ? 'default' : 'pointer' }}
              >
                <CategoryIcon category={cat} size={13} color={c} />
                {CATEGORY_SHORT[cat] || cat}
              </button>
            );
          })}
        </div>
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
  onEditCategories,
  onGuestEdit,
  user,
  isStoryRead = false,
  onOpenSummary,
  lens,
  onChangeLens,
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

  // The player wraps narrower than the feed tabs. Those are a column of text you read down;
  // this is one phone-shaped screen — a full-bleed photo, a headline and a transport — and
  // stretched to the feed's 600px the artwork went wide and letterboxed while the controls
  // drifted apart. 480 is the width the sheet already uses, so the page and the sheet are
  // now the same object at the same size rather than two sizes of the same design.
  const PAGE_MAX = 480;

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
        {/* ── Full-bleed photo + scrim, Swipe's treatment.
               The photo fills the whole surface behind everything and one layered scrim
               carries it down to near-black. It used to be a 58%-tall band with its own
               vignettes, which ended in a visible horizon halfway down. Same gradient stops
               as StoryReader, so all three screens sit at the same depth. ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {image
            ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${color} 0%, ${color}66 100%)` }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.28) 56%, rgba(10,10,20,0.88) 90%, rgba(10,10,20,0.98) 100%), rgba(0,0,0,0.5)' }} />
          {/* Chrome scrim: the controls sit over their own fade rather than on the photo. */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.8) 45%, rgba(10,10,20,0) 100%)' }} />
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
          {/* Absolutely centered breadcrumb — unaffected by button widths. Sheet only: on the
              page the header directly above already names the feed, the day and (via the
              active pill) the category, so this restated all three over the artwork. */}
          {!asPage && (
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{feedName || 'Playing Now'}</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
              {isRecap ? `${category} Recap` : storyCount === 0 ? category : `${category} · ${storyIndex + 1} of ${storyCount}`}
            </p>
          </div>
          )}
          {!asPage && (
          <button
            onClick={onMinimize}
            aria-label="Minimize player"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <ChevronDown size={20} />
          </button>
          )}
        </div>

        {/* ── Topics, then the story progress as the rule beneath them. Sheet only: the page
               carries both in its own header. Same order and same pairing either way — the
               dots used to sit *above* the pills here, so the sheet read bottom-up while the
               page read top-down. ── */}
        {!asPage && contextCategories.length > 0 && (
          <>
            <CatStrip
              contextCategories={contextCategories}
              category={category}
              onSelectCategory={onSelectCategory}
              onEditCategories={onEditCategories}
              user={user}
              onGuestEdit={onGuestEdit}
            />
            {dots.length > 0 && (
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '3px', padding: '0 16px' }}>
                {dots}
              </div>
            )}
          </>
        )}

        {/* ── Category recap, page only. It sits against the artwork, directly above the
               story it summarises, rather than up among the scope controls — it's content,
               not scope, and it was the one piece of *reading* stranded in the header. ── */}
        {!isRecap && storyCount > 0 && (onOpenRecap || (asPage && onChangeLens)) && (
          /* Recap left, lens right — one row over the artwork. The lens sorts the stories the
             transport pages through, so it belongs with them rather than up in the scope
             rows; Swipe puts it in the same relationship, low and close to the card. */
          <div style={{ position: 'relative', zIndex: 10, padding: '0.5rem 1.25rem 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            {onOpenRecap ? (
              <RecapBar category={category} theme="dark" compact
                onOpen={() => onOpenRecap(category)} onPlay={onPlayRecap} />
            ) : <div />}
            <div style={{ flex: 1 }} />
            {asPage && onChangeLens && <LensToggle value={lens} onChange={onChangeLens} theme="dark" />}
          </div>
        )}

        {/* ── Spacer — pushes headline down into the gradient zone ── */}
        <div style={{ flex: 1, position: 'relative', zIndex: 10 }} />

        {/* ── Headline + Excerpt (overlaid on image gradient) ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: '0 1.5rem 0.75rem' }}>
          {/* Read status, above the headline — the same three states and the same wording the
              Scroll and Swipe cards carry, so a story's status doesn't disappear the moment
              you switch to listening to it. An evening-incremental story reads NEW until
              it's opened, then Read like any other. */}
          {user && storyCount > 0 && !isRecap && (
            <p style={{ margin: '0 0 6px', fontSize: '0.66rem', fontWeight: 700, color: isStoryRead ? '#4ade80' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isStoryRead ? '✓ Read' : story?.status === 'New' ? 'New' : story?.status === 'Updated' ? 'Updated' : 'Unread'}
            </p>
          )}
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
        <div style={{ position: 'relative', zIndex: 10, padding: '0.6rem 1.5rem 0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Speed and repeat live on the progress line: both are about *playback*, which is
              what this line reports, and both are set-once settings. Bare text and a bare
              icon rather than a pill and a filled circle — the card's actions below are the
              buttons that should read as buttons, and four circles in two rows was too many
              for one screen. */}
          <button
            onClick={onSpeedCycle}
            aria-label={`Playback speed ${playbackSpeed}×`}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, color: playbackSpeed === 1 ? 'rgba(255,255,255,0.45)' : color }}>
            {playbackSpeed}×
          </button>
          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, borderRadius: '99px', transition: isNarrating && !isPaused ? 'width 0.1s linear' : 'width 0.25s ease' }} />
          </div>
          <button
            onClick={onRepeatToggle}
            aria-label={repeatMode ? 'Repeat on' : 'Repeat off'}
            aria-pressed={!!repeatMode}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', color: repeatMode ? color : 'rgba(255,255,255,0.45)' }}>
            <Repeat size={15} />
          </button>
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

          {/* Secondary: the story's own two actions, in the corners, matching the cards.
              Speed and repeat used to hold these corners — but they're playback settings you
              set once, not things you do to this story, and giving them the widest, most
              reachable slots put the furniture above the content. They move up beside the
              progress bar; see above. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {isRecap ? <div /> : (
              <InterestingButton theme="dark" active={!!isInteresting} onClick={onToggleInteresting} />
            )}
            {asPage && !isRecap ? (
              <CircleAction
                Icon={FileText}
                label="Summary"
                theme="dark"
                onClick={onOpenSummary}
                aria-label="Open summary"
              />
            ) : <div />}
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
          <div style={{ maxWidth: PAGE_MAX, margin: '0 auto' }}>
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
                onEditCategories={onEditCategories}
                user={user}
                onGuestEdit={onGuestEdit}
              />
            )}

            {/* The rule under the topics IS the story progress — one 3px line doing both
                jobs, instead of a hairline border and a separate strip of dots twenty
                pixels apart. Tapping a segment still jumps to that story. Falls back to a
                plain border when there's nothing to be partway through. */}
            {dots.length > 0 ? (
              <div style={{ display: 'flex', gap: '3px' }}>
                {dots}
              </div>
            ) : (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.10)' }} />
            )}
          </div>
        </div>

        {/* Wrapped to the sheet's width — see PAGE_MAX. Unconstrained, this stretched the
            image and the controls edge to edge on a desktop window while every other tab
            stayed in its column. Below this the layout is the sheet's, untouched. */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', maxWidth: PAGE_MAX, margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
