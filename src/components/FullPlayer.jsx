import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Repeat, Play, Pause, Rewind, FastForward, Loader, Calendar, SlidersHorizontal, FileText } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT, UI_TRIAL } from '../theme';
import CategoryIcon from './CategoryIcon';
import CorpusToggle from './CorpusToggle';
import RecapBar from './RecapBar';
import InterestingButton from './InterestingButton';
import CircleAction from './CircleAction';
import LensToggle from './LensToggle';
import PeriodRecapChips from './PeriodRecapChips';
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
function CatStrip({ contextCategories, category, onSelectCategory, onEditCategories, user, onGuestEdit, showAllPill = false, allScope = false, onSelectAll }) {
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
          {/* "All" — the ranking itself, in rank order across every category. Popular and
              Interesting are cross-category lists, so the whole list is a scope in its own
              right and not just the union of the pills beside it. Same control, same rule as
              Swipe: the divider marks it as a different kind of choice, and in All scope no
              category pill is selected, because the one you happen to be on is incidental. */}
          {showAllPill && (
            <>
              <button
                onClick={() => { if (!allScope) onSelectAll?.(); }}
                style={{ display: 'flex', alignItems: 'center', padding: '8px 13px', borderRadius: 9, border: 'none',
                  background: allScope ? 'rgba(255,255,255,0.20)' : 'transparent',
                  color: allScope ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: '0.84rem', fontWeight: allScope ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0,
                  cursor: allScope ? 'default' : 'pointer' }}>
                All
              </button>
              <span aria-hidden style={{ width: 1, alignSelf: 'stretch', margin: '3px 3px', background: 'rgba(255,255,255,0.20)', flexShrink: 0 }} />
            </>
          )}
          {contextCategories.map(cat => {
            const act = !allScope && cat === category;
            const c = act ? tintForDark(CATEGORY_COLORS[cat]) : 'rgba(255,255,255,0.55)';
            return (
              <button
                key={cat}
                ref={act ? activeRef : null}
                onClick={() => { if (!act && onSelectCategory) onSelectCategory(cat); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 9, border: 'none',
                  background: act ? 'rgba(255,255,255,0.20)' : 'transparent',
                  color: c,
                  fontSize: '0.84rem', fontWeight: act ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0,
                  cursor: act ? 'default' : 'pointer' }}
              >
                <CategoryIcon category={cat} size={14} color={c} />
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
  showAllPill = false,
  allScope = false,
  onSelectAll,
  periodRecaps,
  periodMinutes = () => 1,
  onOpenPeriodRecap,
  onPlayPeriodRecap,
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
  const outlets  = (story?.storySources || []).filter(so => so.outlet);

  // bg color as rgb for gradient stop
  const bgColor = colors.bg || '#0a0a14';

  // The player wraps narrower than the feed tabs. Those are a column of text you read down;
  // this is one phone-shaped screen — a full-bleed photo, a headline and a transport — and
  // stretched to the feed's 600px the artwork went wide and letterboxed while the controls
  // drifted apart. 480 is the width the sheet already uses, so the page and the sheet are
  // now the same object at the same size rather than two sizes of the same design.
  const PAGE_MAX = 480;

  // Swipe left / right to move through stories — on a screen whose whole job is one story at
  // a time, reaching for a button to advance is the odd part. The buttons stay: this is an
  // addition, not a replacement. Left goes forward, the direction the next card would come
  // from; right goes back.
  //
  // Deliberately dumb compared to StoryReader's: no drag-follow, no rubber-banding, just a
  // committed flick. There is nothing to drag here — the card doesn't travel with the finger
  // — so tracking one would promise a transition the player doesn't perform.
  const touchRef = useRef(null);
  const SWIPE_MIN = 55;      // px of travel before a flick counts
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    // A horizontal drag that starts inside something that scrolls sideways belongs to that
    // thing, not to us.
    const inScroller = !!e.target?.closest?.('.fp-cat-strip, [data-hscroll]');
    touchRef.current = t && !inScroller ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || storyCount === 0) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Ignore anything that reads as vertical, or as a tap that wandered a little.
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) onNext?.(); else onPrev?.();
  };

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
        {/* ── Full-bleed photo + scrim, Swipe's treatment. Sheet only on the page: there the
               shell paints it behind the header too, so the body would double it up.
               The photo fills the whole surface behind everything and one layered scrim
               carries it down to near-black. It used to be a 58%-tall band with its own
               vignettes, which ended in a visible horizon halfway down. Same gradient stops
               as StoryReader, so all three screens sit at the same depth. ── */}
        {!asPage && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {UI_TRIAL.photoBackdrop ? (
            <>
              {image
                ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${color} 0%, ${color}66 100%)` }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.28) 56%, rgba(10,10,20,0.88) 90%, rgba(10,10,20,0.98) 100%), rgba(0,0,0,0.5)' }} />
              {/* Chrome scrim: the controls sit over their own fade, not on the photo. */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.8) 45%, rgba(10,10,20,0) 100%)' }} />
            </>
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${color}1f 0%, transparent 62%), ${bgColor}` }} />
          )}
        </div>
        )}

        {/* ── Top bar (floats over image). Sheet only: everything in it — close, the
               breadcrumb, minimize — is sheet-only, so on the page it rendered as an empty
               52px box that pushed the recap 76px below the header where Swipe puts it at
               24, and squeezed the spacer above the story card to nothing. ── */}
        {!asPage && (
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
        )}

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
              showAllPill={showAllPill}
              allScope={allScope}
              onSelectAll={onSelectAll}
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
        {/* ── Category recap, then the lens: two rows above the story, at Swipe's spacing.
               They were one row with the recap left and the lens right, which is neither
               screen's arrangement and left the lens sharing a line with content. ── */}
        {!isRecap && storyCount > 0 && onOpenRecap && (
          /* Scrolls sideways: the category's recap always fits, and the week and month join
             it on the days they exist rather than being budgeted for year-round. */
          <div className="fp-recap-row" style={{ position: 'relative', zIndex: 10, flexShrink: 0, padding: '24px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            <style>{`.fp-recap-row::-webkit-scrollbar { display: none; }`}</style>
            <RecapBar category={category} storyCount={storyCount} theme="dark" compact
              onOpen={() => onOpenRecap(category)} onPlay={onPlayRecap} />
            <PeriodRecapChips recaps={periodRecaps} minutesOf={periodMinutes} theme="dark"
              onOpen={onOpenPeriodRecap} onPlay={onPlayPeriodRecap} />
          </div>
        )}

        {/* zIndex above the story card's 10, not level with it. The card is later in the DOM,
            so at equal z-index it won every tie — which is why the open menu was drawn
            underneath it. It also outlives the stories: switch to a feed that happens to be
            empty and, gated on storyCount, the one control that could get you back out would
            disappear with them. */}
        {asPage && !isRecap && onChangeLens && (
          <div style={{ position: 'relative', zIndex: 20, padding: '32px 16px 0' }}>
            <LensToggle value={lens} onChange={onChangeLens} theme="dark" />
          </div>
        )}

        {/* ── Above the card: a fixed gap on the page, so the story stays anchored near the
               controls that scope it. It used to be the flexible one, which parked the card
               in the middle of an empty band once the flat ground removed the photo that had
               been filling that space. Slack now pools *below* the card instead. ── */}
        <div style={{ flex: asPage ? '0 0 auto' : 1, height: asPage ? 24 : undefined, position: 'relative', zIndex: 10 }} />

        {/* ── The story, as a card.
               On the page this is Swipe's card, part for part: category and read status on
               one row, headline, sources, then Interesting and Go deeper docked at the
               bottom — all on the same dark panel. The pieces were previously scattered
               (status floating over the photo, actions stranded in the screen's bottom
               corners) which read as chrome around a picture rather than as a story you
               could act on. The depth toggle and the transport stay below it.
               The sheet keeps the looser overlay: it's a panel over a card you came from. ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: asPage ? '0 1rem 0.5rem' : '0 1.5rem 0.75rem' }}>
        <div style={asPage && storyCount > 0
          ? { padding: '13px 15px 11px', borderRadius: 16, background: 'rgba(8,8,16,0.78)', border: '1px solid rgba(255,255,255,0.08)',
              // Lifted off the ground: a single object that ends, rather than one that
              // continues past the fold the way a swipeable stack does.
              boxShadow: '0 12px 34px rgba(0,0,0,0.5)' }
          : undefined}>
          {/* Category left, read status right — the corners Swipe and Scroll both use. */}
          {asPage && storyCount > 0 && !isRecap && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', minHeight: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: tintForDark(CATEGORY_COLORS[category]), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <CategoryIcon category={category} size={11} color={tintForDark(CATEGORY_COLORS[category])} />
                {CATEGORY_SHORT[category] || category}
              </span>
              <span style={{ flex: 1 }} />
              {user && (
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: isStoryRead ? '#4ade80' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isStoryRead ? '✓ Read' : story?.status === 'New' ? 'New' : story?.status === 'Updated' ? 'Updated' : 'Unread'}
                </span>
              )}
            </div>
          )}
          {/* Read status, above the headline — the same three states and the same wording the
              Scroll and Swipe cards carry, so a story's status doesn't disappear the moment
              you switch to listening to it. An evening-incremental story reads NEW until
              it's opened, then Read like any other. */}
          {!asPage && user && storyCount > 0 && !isRecap && (
            <p style={{ margin: '0 0 6px', fontSize: '0.66rem', fontWeight: 700, color: isStoryRead ? '#4ade80' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isStoryRead ? '✓ Read' : story?.status === 'New' ? 'New' : story?.status === 'Updated' ? 'Updated' : 'Unread'}
            </p>
          )}
          {/* Headline. With nothing to play — a day that was never generated, reached from the
              date picker — the card would otherwise be blank under a "1 of 0" breadcrumb,
              which reads as a failed load rather than an empty day. Says what the other tabs
              say in the same situation. */}
          <h2 style={{ margin: '0 0 0.55rem', fontSize: storyCount === 0 ? '1rem' : '1.35rem', fontWeight: storyCount === 0 ? '700' : '900', color: storyCount === 0 ? 'rgba(255,255,255,0.6)' : '#ffffff', lineHeight: 1.22, letterSpacing: '-0.025em' }}>
            {storyCount === 0
              ? (lens === 'popular' ? 'Nothing popular yet today.'
                : lens === 'interesting' ? 'Nothing marked interesting yet today.'
                : 'No stories available for this day.')
              : headline}
          </h2>
          {/* Excerpt */}
          {excerpt && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {excerpt}
            </p>
          )}

          {/* Sources — one muted line, capped at two outlets plus a count, exactly as the
              Swipe card renders them. The full list lives in Go deeper. */}
          {asPage && storyCount > 0 && !isRecap && outlets.length > 0 && (() => {
            const shown = outlets.slice(0, 2);
            const rest = outlets.length - shown.length;
            const src = { fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', whiteSpace: 'nowrap' };
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '9px 0 0', overflow: 'hidden' }}>
                {shown.map((so, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ ...src, opacity: 0.5 }}>·</span>}
                    {so.url
                      ? <a href={so.url} target="_blank" rel="noopener noreferrer" title={so.title || so.outlet} onClick={e => e.stopPropagation()} style={{ ...src, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis' }}>{so.outlet}</a>
                      : <span style={src}>{so.outlet}</span>}
                  </React.Fragment>
                ))}
                {rest > 0 && <span style={{ ...src, opacity: 0.75, flexShrink: 0 }}>· +{rest}</span>}
              </div>
            );
          })()}

          {/* Interesting and Go deeper, docked at the bottom of the card — the same corners
              the Swipe card gives them. */}
          {asPage && storyCount > 0 && !isRecap && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
              <InterestingButton theme="dark" active={!!isInteresting} onClick={onToggleInteresting} />
              <CircleAction
                Icon={FileText}
                label="Go deeper"
                theme="dark"
                onClick={onOpenSummary}
                aria-label="Go deeper"
              />
            </div>
          )}
        </div>

        </div>

        {/* Slack lives here now: between the story and the transport, where growing it just
            opens up the screen rather than stranding the card. */}
        {asPage && <div style={{ flex: 1, minHeight: 12, position: 'relative', zIndex: 10 }} />}

        {/* ── How much gets read aloud.
               It was a filled pill floating dead-centre in the gap between the story and the
               transport, belonging to neither — and its second option was labelled "Go
               deeper", the same words as the button forty pixels above it in the card, which
               opens the summary sheet. Two different behaviours, one name.
               So: "Full", and it sits with the playback controls, because that is what it
               governs — the length of the narration, alongside its speed and repeat. Quiet
               track rather than a filled pill; the play button is the only filled thing down
               here. ── */}
        {!isRecap && storyCount > 0 && (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 1.5rem 14px' }}>
          <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: 2 }}>
            {[['takeaways', 'Takeaways'], ['deep', 'Full']].map(([level, label]) => {
              const on = depthLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => onSetDepth(level)}
                  aria-pressed={on}
                  style={{ padding: '3px 11px', borderRadius: 999, border: 'none', cursor: on ? 'default' : 'pointer',
                    fontSize: '0.7rem', fontWeight: on ? 800 : 600, transition: 'all 0.15s',
                    // The category's colour, not white — white made this the brightest thing
                    // in the transport block, competing with the play button beside it.
                    background: on ? color : 'transparent',
                    color: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        )}

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
          {/* Grouped, not spread edge to edge: skip belongs to play, and pinned to the
              margins the three read as three unrelated controls with a gap in the middle. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginBottom: '1.25rem' }}>
            {/* Skip loses its disc: three filled circles in a row meant the one that matters
                stopped looking like the one that matters. Same tap target, no chrome. */}
            <button
              onClick={onPrev}
              aria-label="Previous story"
              style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
              <Rewind size={24} />
            </button>

            <button
              onClick={isLoading ? undefined : (isPaused ? onResume : (isNarrating ? onPause : onPlay))}
              style={{ width: '62px', height: '62px', borderRadius: '50%', background: color, border: 'none', color: 'white', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: UI_TRIAL.photoBackdrop ? `0 8px 28px ${color}60` : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
              {isLoading
                ? <Loader size={26} style={{ animation: 'spin 0.8s linear infinite' }} />
                : (isNarrating && !isPaused
                  ? <Pause size={23} fill="white" />
                  : <Play size={23} fill="white" style={{ marginLeft: '3px' }} />
                )
              }
            </button>

            <button
              onClick={onNext}
              aria-label="Next story"
              style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
              <FastForward size={24} />
            </button>
          </div>

          {/* Secondary: the story's own two actions, in the corners, matching the cards.
              Speed and repeat used to hold these corners — but they're playback settings you
              set once, not things you do to this story, and giving them the widest, most
              reachable slots put the furniture above the content. They move up beside the
              progress bar; see above. */}
          {/* Sheet only: on the page these live in the story card above, where the two cards
              already put them. */}
          {!asPage && !isRecap && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <InterestingButton theme="dark" active={!!isInteresting} onClick={onToggleInteresting} />
              <div />
            </div>
          )}
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
        {/* The photo runs behind the header, not below it — Swipe's arrangement. On its own
            flat black strip the header read as a separate black bar bolted above the
            artwork; over the photo with Swipe's own top scrim it belongs to the same screen,
            and the scrim still guarantees the toggle and the date have something to sit on
            whatever image loads. Full width, while the content column above stays at
            PAGE_MAX, so the artwork fills the window the way it does in Swipe. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {UI_TRIAL.photoBackdrop ? (
            <>
              {image
                ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${color} 0%, ${color}66 100%)` }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.28) 56%, rgba(10,10,20,0.88) 90%, rgba(10,10,20,0.98) 100%), rgba(0,0,0,0.5)' }} />
              {/* Chrome scrims, same as Swipe's: the header fades out of the photo at the top
                  and the transport fades in at the bottom. */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.75) 55%, rgba(10,10,20,0) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.8) 45%, rgba(10,10,20,0) 100%)' }} />
            </>
          ) : (
            /* Flat ground. The photo was the loudest thing on a screen whose subject is a
               headline and a play button, and every scrim on top of it existed to hold it
               down. One faint wash of the category's colour keeps the screen from reading as
               a black rectangle and still says which section you're in. */
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${color}1f 0%, transparent 62%), ${bgColor}` }} />
          )}
        </div>
        {/* ── Page header: wordmark, then scope — the same statement the other two tabs open
               with, so Listen isn't a dead end you must leave to change day or feed.

               It sits *above* the body rather than inside it. Inside, it was painted over the
               top of the full-bleed image: the toggle's translucent track and the muted date
               had no contrast against whatever photo happened to load, and it displaced the
               player's own spacing so the page and the sheet no longer matched. On its own
               opaque strip it always reads, and everything below is the sheet untouched. ── */}
        <div style={{ position: 'relative', zIndex: 20, flexShrink: 0 }}>
          <div style={{ maxWidth: PAGE_MAX, margin: '0 auto' }}>
            <div style={{ padding: '9px 16px 0', textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                <span style={{ color: 'rgba(255,255,255,0.58)' }}>Radio</span>
                <span style={{ color: 'rgba(255,255,255,0.32)' }}>News</span>
              </span>
            </div>
            {/* 6px below, matching Swipe and Scroll. At 10 the player's topic row sat four
                pixels lower than the other two modes' — enough to see when switching. */}
            <div style={{ position: 'relative', zIndex: 12, display: 'flex', alignItems: 'center', padding: '11px 16px 6px', gap: 10 }}>
              <CorpusToggle value={corpus} onChange={onChangeCorpus} theme="dark" />
              <div style={{ flex: 1 }} />
              <div style={{ position: 'relative' }} ref={dayPickerRef}>
                <button onClick={() => availableDays.length > 0 && setDayPickerOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 0, background: 'transparent', border: 'none', cursor: availableDays.length ? 'pointer' : 'default' }}>
                  <Calendar size={12} color="rgba(255,255,255,0.6)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{formatHeaderDate(selectedDay)}</span>
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
                showAllPill={showAllPill}
                allScope={allScope}
                onSelectAll={onSelectAll}
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
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', maxWidth: PAGE_MAX, margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
