import './HomeTypography.css';
import { HOME_TYPE } from './homeTypography';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X, Repeat, Repeat1, Play, Pause, Rewind, FastForward, Loader, SlidersHorizontal, Sparkles } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT, UI_TRIAL,
         TYPE, WEIGHT, RADIUS, SPACE, ICON, SEMANTIC } from '../theme';
import CategoryIcon from './CategoryIcon';
import InterestingButton from './InterestingButton';
import AppHeader, { formatHeaderDate as fmtDay } from './AppHeader';
import { StoryTopRow, SourcesRow, StarButton, NextLink } from './StoryBits';
import { storyParagraph } from '../lib/stories';
import NewsLoader from './NewsLoader';
import { cleanForTTS } from '../audio/narrationText';
import AudioSeekBar from './AudioSeekBar';
import RadioTranscript from './RadioTranscript';
import RecapSourcesSheet from './RecapSourcesSheet';
import AnimatedRecap from './AnimatedRecap';
import { topicVars } from '../design';
import { centrePill } from '../utils';

// Lift a category colour toward white so it stays legible over the dark photo — the same
// helper Swipe mode uses for its pills, copied so the two strips tint identically.
function tintForDark(hex, amount = 0.45) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const mix = (ch) => Math.round(ch + (255 - ch) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// ── Scope + topics, as one row ────────────────────────────────────────────────
//
// Option B, without the mode. There is no Me/All: you see every topic until you edit them,
// and after that you see yours. So the pinned slot holds the one control that changes what
// the strip contains — the editor — rather than a switch between two lists. Getting back to
// the full set is "Restore default" in Settings, which is a deliberate act rather than a
// tap you can make by accident while reaching for a topic.
//
// "Me" read as nothing anyone has seen in an app, and "My" begs "my what"; only "All" worked,
// because it stands alone. Rather than hunt for a partner word that also stands alone, the
// mode goes.
//
// The pills are text, not chips. Weight and colour carry the state, and the active one is
// marked by a heavy underline that overlaps the closing hairline: one line saying both
// "you are here" and "the header ends here", where the old header spent three unrelated
// marks — a filled rectangle, a rule above it and a rule below it.
function CatStrip({ contextCategories, category, onSelectCategory, onEditCategories, user, onGuestEdit, showAllPill = false, allScope = false, onSelectAll, gutter = 16 }) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // Fires when playback crosses into a new category. Strip-local for the same reason as the
  // other two strips — scrollIntoView would also scroll whatever is behind the player.
  //
  // Also on the list itself: with the scope pinned beside them the topics get ~211px rather
  // than the full width, so the active one is off-screen often enough that only re-centring
  // when `category` changes leaves it stranded whenever the list arrives or changes shape.
  useEffect(() => {
    centrePill(stripRef.current, activeRef.current);
  }, [category, contextCategories, allScope]);

  const tab = (label, act, onClick, ref, key) => (
    <button
      key={key}
      ref={ref}
      onClick={onClick}
      aria-current={act ? 'page' : undefined}
      style={{ background: 'none', border: 'none', cursor: act ? 'default' : 'pointer',
        padding: `0 0 ${SPACE.md}px`, whiteSpace: 'nowrap', flexShrink: 0,
        fontSize: TYPE.ui, fontWeight: act ? WEIGHT.strong : WEIGHT.ui,
        color: act ? tintForDark(CATEGORY_COLORS[category]) : 'rgba(255,255,255,0.5)',
        // Sits on the row's own border rather than above it, so the mark and the divider
        // read as one line thickened where you are.
        boxShadow: act ? `inset 0 -2px 0 0 ${tintForDark(CATEGORY_COLORS[category])}` : 'none' }}>
      {label}
    </button>
  );

  // Trying it with no rule under the topics: the active tab's underline is left as the only
  // mark, and the SPACE.lg below the row does the closing. Revert that commit to put the
  // hairline back — it is the borderBottom on the row below.
  return (
    <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'stretch',
      paddingTop: SPACE.sm }}>
      <style>{`.fp-cat-strip::-webkit-scrollbar { display: none; }`}</style>

      {/* Pinned: the editor holds still while the topics move past it. Bottom-padded so its
          box centres on the tab labels rather than on the row.
          Not on Popular and Interesting. Those are rankings across every category — the strip
          there is a jump list over a list you did not choose, so an editor for "your topics"
          acts on something this screen isn't showing. Same reason the category recap is
          hidden there. */}
      {!showAllPill && (
        <span style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: gutter, paddingBottom: 11, flexShrink: 0 }}>
          <button
            onClick={() => (user ? onEditCategories?.() : onGuestEdit?.())}
            aria-label="Choose your topics"
            title="Choose your topics"
            style={{ width: 26, height: 26, border: 'none', padding: 0, borderRadius: RADIUS.sm,
              background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={ICON.sm} />
          </button>
        </span>
      )}
      {/* Spans the track exactly, top and bottom. Floating between the two heights it read
          as a stray tick rather than the boundary between scope and topic.
          It divides the editor from the topics, so it goes when the editor does. */}
      {contextCategories.length > 0 && !showAllPill && (
        <span aria-hidden style={{ width: 1, margin: `0 ${SPACE.sm}px ${SPACE.sm + 1}px`, background: 'rgba(255,255,255,0.16)', flexShrink: 0 }} />
      )}

      {/* `position: relative` is load-bearing: centrePill measures the active tab with
          offsetLeft, which is relative to the nearest *positioned* ancestor. Without it that
          is the outer row, so the pinned scope's 164px got added to every target and the
          strip scrolled clean past the tab it was trying to centre. */}
      <div ref={stripRef} className="fp-cat-strip" style={{ position: 'relative', flex: 1, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, paddingRight: gutter,
          /* The pinned editor supplied the left gutter; without it "Top" would start hard
             against the screen edge. */
          paddingLeft: showAllPill ? gutter : 0, minWidth: 'max-content' }}>
          {/* "All" — the ranking itself, across every category, on the tabs that show one. */}
          {showAllPill && (
            <>
              {tab('Top', allScope, () => { if (!allScope) onSelectAll?.(); }, null, '__all')}
              {/* Divides Top from the topics, so it needs topics to divide it from. On a day
                  with nothing popular yet the strip is Top alone and this dangled after it. */}
              {contextCategories.length > 0 && (
                <span aria-hidden style={{ width: 1, alignSelf: 'stretch', margin: '2px 0 13px', background: 'rgba(255,255,255,0.16)', flexShrink: 0 }} />
              )}
            </>
          )}
          {contextCategories.map(cat => {
            const act = !allScope && cat === category;
            return tab(CATEGORY_SHORT[cat] || cat, act,
              () => { if (!act && onSelectCategory) onSelectCategory(cat); },
              act ? activeRef : null, cat);
          })}
        </div>
      </div>
    </div>
  );
}

// ── FullPlayer ────────────────────────────────────────────────────────────────
const REPEAT_LABEL = { off: 'Repeat off', all: 'Repeating this topic', one: 'Repeating this story' };
const REPEAT_HINT = { off: 'Repeat off', all: 'Repeat this topic', one: 'Repeat this story' };
// Speed and repeat are about playback, so they appear once it starts and stay through a pause
// until it stops (Roy, 2026-10-18); before that they only crowded the line. Their room is kept,
// so the line does not move when they fade in.
const whilePlaying = (on) => ({
  props: { tabIndex: on ? 0 : -1, 'aria-hidden': on ? undefined : true },
  style: { opacity: on ? 1 : 0, pointerEvents: on ? 'auto' : 'none' },
});

export default function FullPlayer({
  visible,
  isExiting,
  asPage = false,
  programmeMeta, programmeNotice, resumeProgramme, onResumeProgramme,
  narrationLimitRef,   // how many of this topic's stories are shown; narration moves on after them
  loading = false,   // the day's news is on its way: the loader takes the card's place
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
  // Page-mode header: the day picker, so Listen isn't a dead end you have to leave to
  // change which day you are reading.
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
  // The tabs
  recapView = false,
  onChangeRecapView,
  recapPeriod = 'Daily',
  readOnly = false,
  unified = false, onChangeReading, onReadUpdate,
  onChangeRecapPeriod,
  periodReady,
  recapText,
  onPlayRecapPeriod,
  topicStoryCount,
  onSeek,
  narrationDuration = 0,
  isTodaySelected = true,
  phoneVoice = false,
  radioOnly = false, narrationCharOffset = -1, recapError = false, recapSources = [], radioQueueCategories = [], recapEnd,
  recapAttributions, getRecapStoryAction,
}) {
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const readerRef = useRef(null);
  const [readerNavigation, setReaderNavigation] = useState({ next: false, previous: false });
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
  const [sourcesSnapshot, setSourcesSnapshot] = useState(null);
  const closeSources = React.useCallback(() => setSourcesSnapshot(null), []);
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
  const excerpt  = storyParagraph(story);
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

  // What the Repeat button just switched to, shown for a moment above it.
  const [repeatHint, setRepeatHint] = useState(null);
  const repeatHintTimer = useRef(null);
  const nextRepeat = !repeatMode ? 'all' : repeatMode === 'all' ? 'one' : 'off';
  const flashRepeatHint = () => {
    clearTimeout(repeatHintTimer.current);
    setRepeatHint(REPEAT_HINT[nextRepeat]);
    repeatHintTimer.current = setTimeout(() => setRepeatHint(null), 1600);
  };
  useEffect(() => () => clearTimeout(repeatHintTimer.current), []);
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    // A horizontal drag that starts inside something that scrolls sideways belongs to that
    // thing, not to us — the outlets row above all, which used to drag the whole card with it
    // (Roy, 2026-10-18). The card is swiped from anywhere else on it.
    const inScroller = !!e.target?.closest?.('.fp-cat-strip, [data-hscroll], .rn-hscroll');
    touchRef.current = t && !inScroller ? { x: t.clientX, y: t.clientY } : null;
  };

  // ── Listen's card moves like a page being scrolled (Roy, 2026-10-17) ──
  // It follows a sideways drag, and next/back, by swipe, button or pill, slide it out one way
  // and the new story in from the other, instead of swapping the words in place. The drag is
  // written straight to the card's style, so following the finger costs no renders.
  const cardRef = useRef(null);
  const slideDirRef = useRef(null);   // set just before a move; read by the card that mounts
  const lastCardRef = useRef(null);
  const enterRef = useRef(null);
  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const SLIDE_OUT_MS = 170;

  // The progress pills live under the card, not on it, so they stay put while cards slide past —
  // they used to leave with the old card and reappear on the new one (Roy, 2026-10-18). While the
  // card is dragged they follow it: the current pill narrows as the one it is heading for widens,
  // then both settle where the story lands. Written to the DOM directly, like the drag itself.
  const dotRefs = useRef([]);
  const DOT_TRANSITION = 'width 0.24s ease, opacity 0.24s ease';
  const dotLook = (i, cur) => ({ width: i === cur ? 16 : 5, opacity: i === cur ? 1 : i < cur ? 0.45 : 0.2 });
  const setDot = (i, look, transition) => {
    const d = dotRefs.current[i];
    if (!d) return;
    d.style.transition = transition;
    d.style.width = `${look.width}px`;
    d.style.opacity = String(look.opacity);
  };
  const settleDots = (cur) => dotRefs.current.forEach((_, i) => setDot(i, dotLook(i, cur), DOT_TRANSITION));
  const followDots = (dx, blocked) => {
    const cur = storyIndex, to = dx < 0 ? cur + 1 : cur - 1, away = dx < 0 ? cur - 1 : cur + 1;
    const width = cardRef.current?.offsetWidth || 320;
    const f = blocked || !dotRefs.current[to] ? 0 : Math.min(1, Math.abs(dx) / (width * 0.6));
    const from = dotLook(cur, cur), past = dotLook(cur, to), was = dotLook(to, cur);
    setDot(cur, { width: from.width + (past.width - from.width) * f, opacity: from.opacity + (past.opacity - from.opacity) * f }, 'none');
    setDot(to, { width: was.width + (16 - was.width) * f, opacity: was.opacity + (1 - was.opacity) * f }, 'none');
    setDot(away, dotLook(away, cur), 'none');      // the drag may have changed direction
  };

  const slideTo = (dir, go) => {
    const el = cardRef.current;
    if (!el || reduceMotion) { go?.(); return; }
    el.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in, opacity ${SLIDE_OUT_MS}ms ease-in`;
    el.style.transform = `translateX(${dir === 'next' ? '-110%' : '110%'})`;
    el.style.opacity = '0';
    setTimeout(() => {
      slideDirRef.current = dir;
      go?.();
      // Nowhere to go (the first story, say): the same card is still here, so bring it back.
      setTimeout(() => {
        if (cardRef.current !== el) return;
        slideDirRef.current = null;
        settleDots(storyIndex);
        el.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        el.style.transform = 'none';
        el.style.opacity = '1';
      }, 250);
    }, SLIDE_OUT_MS);
  };
  // The recap moves along the topic row, as Swipe's recaps do.
  const topicRow = contextCategories || [];
  const topicAt = (d) => { const i = topicRow.indexOf(category); return i > -1 ? topicRow[i + d] || null : null; };
  const pageTouchMove = (e) => {
    const start = touchRef.current;
    const el = cardRef.current;
    const t = e.touches?.[0];
    if (!start || !el || !t || (!recapView && storyCount === 0)) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!start.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      start.dragging = true;
    }
    // Where there is nothing to pull in, the card resists: past the end of a batch, or past
    // the first or last topic in the recap.
    const blocked = recapView ? !topicAt(dx < 0 ? 1 : -1) : (dx < 0 && atBatchEnd && !topicAt(1));
    el.style.transition = 'none';
    el.style.transform = `translateX(${blocked ? dx * 0.25 : dx}px)`;
    if (!recapView) followDots(dx, blocked);
  };
  const pageTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    const el = cardRef.current;
    if (!start || !el) return;
    const t = e.changedTouches?.[0];
    const dx = t ? t.clientX - start.x : 0;
    const dy = t ? t.clientY - start.y : 0;
    const settle = () => { el.style.transition = 'transform 0.2s ease-out'; el.style.transform = 'none'; settleDots(storyIndex); };
    if (!start.dragging) return;
    if ((!recapView && storyCount === 0) || Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) { settle(); return; }
    if (recapView) {
      const to = topicAt(dx < 0 ? 1 : -1);
      if (to) slideTo(dx < 0 ? 'next' : 'prev', () => onSelectCategory?.(to)); else settle();
      return;
    }
    // Committed: the pills finish their move while the card slides out.
    // At the end of a batch, on to the next topic — the rest of this one is behind "View 4 more".
    if (dx < 0) {
      if (atBatchEnd) { const t = topicAt(1); if (t) slideTo('next', () => onSelectCategory?.(t)); else settle(); }
      else { settleDots(storyIndex + 1); slideTo('next', onNext); }
    }
    else { if (storyIndex > 0) settleDots(storyIndex - 1); slideTo('prev', onPrev); }
  };

  // The recap row's colour: the category's own tint, and the exact value the active topic tab
  // is drawn in. One source means the tab and the pills cannot drift apart — which is what
  // ties the recaps to the topic without naming it a second time.
  const recapTint = tintForDark(CATEGORY_COLORS[category]);
  // tintForDark returns 'rgb(r, g, b)'; the player needs it at an alpha, the way the recap
  // chips take theirs.
  const tintA = (a) => {
    const m = String(recapTint).match(/\d+/g);
    return m ? `rgba(${m[0]}, ${m[1]}, ${m[2]}, ${a})` : recapTint;
  };

  // The story progress dots, defined once because they render in two different places:
  // floating over the artwork in the sheet, and as the page header's dividing rule.
  // ── Story batching, the same shape Swipe uses (see StoryReader's SWIPE_BATCH).
  // A long category used to arrive as forty progress dots — a rail so finely divided it
  // stopped reading as progress at all — and a Next button with no visible end. Eight at a
  // time, then an explicit control to take the rest.
  // Browsing only: continuous narration runs on its own path (goNextCategoryNarration in
  // App.js) and is deliberately left alone, so pressing play still listens straight through.
  const LISTEN_BATCH = 8;
  const [revealed, setRevealed] = useState(LISTEN_BATCH);
  useEffect(() => { setRevealed(Math.max(LISTEN_BATCH, storyIndex + 1)); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps
  const total       = (stories || []).length;
  const listenLimit = asPage ? Math.min(revealed, total) : total;
  // The narration stops where the shown stories stop and moves to the next topic, rather than
  // reading on into stories the batch has not revealed (Roy, 2026-10-18).
  useEffect(() => {
    if (!narrationLimitRef) return undefined;
    narrationLimitRef.current = asPage && !radioOnly && !allScope && !recapView ? listenLimit : null;
    return () => { narrationLimitRef.current = null; };
  }, [narrationLimitRef, asPage, radioOnly, allScope, recapView, listenLimit]);
  const remaining   = Math.max(0, total - listenLimit);
  const atBatchEnd  = asPage && remaining > 0 && storyIndex >= listenLimit - 1;
  const isExpanded  = asPage && total > LISTEN_BATCH && revealed > LISTEN_BATCH;
  const showCollapse = isExpanded && storyIndex >= LISTEN_BATCH - 1;

  // Dots, not a segmented bar. The three states survive the change — the current story is an
  // elongated pill, stories behind you are dim, ahead of you dimmer — so the rail still says
  // how far through you are and not merely which one you are on.
  //
  // The visible dot is 5px but the button around it is not: transparent padding gives each a
  // ~15px tap target, since 5px is well under anything a thumb can hit. That padding is why
  // the row's bottom margin drops from 12 to 6 below — the buttons now carry their own.
  const dots = (stories || []).slice(0, radioOnly ? stories.length : listenLimit).map((_, i) => {
    const current = i === storyIndex;
    const read    = i < storyIndex;
    return (
      <button
        key={i}
        onClick={() => onGoToStory?.(i)}
        aria-label={`Story ${i + 1} of ${radioOnly ? stories.length : listenLimit}`}
        aria-current={current ? 'true' : undefined}
        style={{ border: 'none', background: 'transparent', padding: '5px 3px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <span style={{ display: 'block', height: 5, width: current ? 16 : 5, borderRadius: RADIUS.pill,
          background: current ? '#fff' : read ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          transition: 'width 0.2s ease, background 0.2s ease' }} />
      </button>
    );
  });

  // The playback controls — the progress line and the transport — as one block, because on
  // the page they live inside the story card and in the sheet they sit under it. One
  // definition, two placements; two copies would drift.
  const playback = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Speed and repeat live on the progress line: both are about *playback*, which is
            what this line reports, and both are set-once settings. Bare text and a bare icon
            rather than a pill and a filled circle — the play button should be the only filled
            thing here. */}
        <button
          onClick={onSpeedCycle}
          aria-label={`Playback speed ${playbackSpeed}×`} {...whilePlaying(isNarrating).props}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, fontSize: TYPE.meta, fontWeight: WEIGHT.ui, color: playbackSpeed === 1 ? 'rgba(255,255,255,0.45)' : color,
            ...whilePlaying(isNarrating).style, transition: 'opacity 0.25s ease' }}>
          {playbackSpeed}×
        </button>
        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.pill, overflow: 'hidden' }}>
          {/* Solid, not tinted: a 3px bar at 0.22 is invisible. The tint rather than the raw
              hex, so it is the same hue as everything else the topic colours. */}
          <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: recapTint, borderRadius: RADIUS.pill, transition: isNarrating && !isPaused ? 'width 0.1s linear' : 'width 0.25s ease' }} />
        </div>
        <button
          onClick={onRepeatToggle}
          aria-label={REPEAT_LABEL[repeatMode || 'off']}
          aria-pressed={!!repeatMode} {...whilePlaying(isNarrating).props}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', color: repeatMode ? color : 'rgba(255,255,255,0.45)',
            ...whilePlaying(isNarrating).style, transition: 'opacity 0.25s ease' }}>
          {repeatMode === 'one' ? <Repeat1 size={ICON.md} /> : <Repeat size={ICON.md} />}
        </button>
      </div>

      {/* Grouped, not spread edge to edge: skip belongs to play, and pinned to the margins
          the three read as three unrelated controls with a gap in the middle. Skip has no
          disc — three filled circles in a row meant the one that matters stopped looking
          like the one that matters. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
        <button
          onClick={onPrev}
          aria-label="Previous story"
          style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
          <Rewind size={ICON.lg} />
        </button>
        <button
          onClick={isLoading ? undefined : (isPaused ? onResume : (isNarrating ? onPause : onPlay))}
          style={{ width: '62px', height: '62px', borderRadius: '50%', background: tintA(0.22), border: 'none', color: recapTint, cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: UI_TRIAL.photoBackdrop ? `0 8px 28px ${color}60` : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          {isLoading
            ? <Loader size={26} style={{ animation: 'spin 0.8s linear infinite' }} />
            : (isNarrating && !isPaused
              /* currentColor, so the glyph takes the disc's tint. White on a 0.22 tint was
                 the only white mark left among controls that all carry the topic's colour. */
              ? <Pause size={23} fill="currentColor" />
              : <Play size={23} fill="currentColor" style={{ marginLeft: '3px' }} />
            )
          }
        </button>
        {/* Stops at the batch end — the rest of the category is behind the control in the
            card, so skipping can't quietly walk past the count the rail is showing. */}
        <button
          onClick={atBatchEnd ? undefined : onNext}
          disabled={atBatchEnd}
          aria-label={atBatchEnd ? 'End of this batch' : 'Next story'}
          style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'none', border: 'none', color: atBatchEnd ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)', cursor: atBatchEnd ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}>
          <FastForward size={ICON.lg} />
        </button>
      </div>
    </>
  );

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
            <X size={ICON.md} />
          </button>
          )}
          {/* Absolutely centered breadcrumb — unaffected by button widths. Sheet only: on the
              page the header directly above already names the feed, the day and (via the
              active pill) the category, so this restated all three over the artwork. */}
          {!asPage && (
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: TYPE.micro, fontWeight: WEIGHT.ui, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{feedName || 'Playing Now'}</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: TYPE.ui, fontWeight: WEIGHT.strong, color: 'rgba(255,255,255,0.9)' }}>
              {isRecap ? `${category} Recap` : storyCount === 0 ? category : `${category} · ${storyIndex + 1} of ${asPage ? listenLimit : storyCount}`}
            </p>
          </div>
          )}
          {!asPage && (
          <button
            onClick={onMinimize}
            aria-label="Minimize player"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <ChevronDown size={ICON.md} />
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


        {/* ── Above the card: a fixed gap on the page, so the story stays anchored near the
               controls that scope it. It used to be the flexible one, which parked the card
               in the middle of an empty band once the flat ground removed the photo that had
               been filling that space. Slack now pools *below* the card instead.
               SPACE.sm, the tightest step in a gap sequence that descends from the pills:
               24 to the recap, 16 to the lens, 8 to the card. Even gaps made three unrelated
               controls read as three equal peers; closing as you go down says the lens
               belongs to the card and the pills do not. ── */}
        {/* Fixed on the page, flexible in the sheet. Flexible here pinned the panel to the
            bottom and collected every spare pixel into one 90px void under the lens — with
            the story and the transport now enclosed in a single box, that gap read as the
            box having been pushed away from the controls above it. The panel sits up under
            the lens instead and the slack falls below it. */}
        <div style={{ flex: asPage ? '0 0 auto' : 1, height: asPage ? SPACE.sm : undefined, position: 'relative', zIndex: 10 }} />

        {/* ── The story, as a card.
               On the page this is Swipe's card, part for part: category and read status on
               one row, headline, sources, then Interesting and Go deeper docked at the
               bottom — all on the same dark panel. The pieces were previously scattered
               (status floating over the photo, actions stranded in the screen's bottom
               corners) which read as chrome around a picture rather than as a story you
               could act on. The depth toggle and the transport stay below it.
               The sheet keeps the looser overlay: it's a panel over a card you came from. ── */}
        <div style={{ position: 'relative', zIndex: 10, padding: asPage ? `0 1rem calc(env(safe-area-inset-bottom, 0px) + ${SPACE.lg}px)` : '0 1.5rem 0.75rem' }}>
        {/* One panel around the story and the player together — trying whether a single
            enclosure fixes the page reading as loose parts: headline here, actions there,
            transport somewhere below, with nothing saying they belong to each other. The
            wrapper is deliberately quiet: no hairline now, just the faintest lift off the
            ground. The border was the last hard edge on a screen whose other edges have all
            gone — the header's two rules, the divider under the topics — and one box left
            outlined read as the odd one out rather than as the frame it was meant to be. The
            lift alone still groups the story with its player. */}
        <div style={asPage && storyCount > 0
          ? { padding: '14px 15px 12px', borderRadius: RADIUS.md,
              background: 'rgba(255,255,255,0.03)' }
          : undefined}>
          {/* Story progress, the first thing inside the card — it counts stories, so it
              belongs to the thing showing one. Inside the padding rather than bled into the
              border: on the edge it read as a bar attached to the card, in here it reads as
              the card's own first line, on the same gutter as the headline under it. */}
          {asPage && storyCount > 0 && dots.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', margin: '0 0 6px' }}>
              {dots}
            </div>
          )}
          {/* Category left, read status right — the corners Swipe and Scroll both use. */}
          {asPage && storyCount > 0 && !isRecap && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', minHeight: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: TYPE.micro, fontWeight: WEIGHT.strong, color: tintForDark(CATEGORY_COLORS[category]), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <CategoryIcon category={category} size={ICON.sm} color={tintForDark(CATEGORY_COLORS[category])} />
                {CATEGORY_SHORT[category] || category}
              </span>
              <span style={{ flex: 1 }} />
              {user && (
                <span style={{ fontSize: TYPE.micro, fontWeight: WEIGHT.strong, flexShrink: 0, color: isStoryRead ? SEMANTIC.read : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {isStoryRead ? '✓ Read' : story?.status === 'New' ? 'New' : 'Unread'}
                </span>
              )}
            </div>
          )}
          {/* Read status, above the headline — the same three states and the same wording the
              Scroll and Swipe cards carry, so a story's status doesn't disappear the moment
              you switch to listening to it. An evening-incremental story reads NEW until
              it's opened, then Read like any other. */}
          {!asPage && user && storyCount > 0 && !isRecap && (
            <p style={{ margin: '0 0 6px', fontSize: TYPE.micro, fontWeight: WEIGHT.strong, color: isStoryRead ? SEMANTIC.read : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isStoryRead ? '✓ Read' : story?.status === 'New' ? 'New' : 'Unread'}
            </p>
          )}
          {/* Headline. With nothing to play — a day that was never generated, reached from the
              date picker — the card would otherwise be blank under a "1 of 0" breadcrumb,
              which reads as a failed load rather than an empty day. Says what the other tabs
              say in the same situation. */}
          <h2 style={{ margin: '0 0 0.55rem', fontSize: storyCount === 0 ? TYPE.body : TYPE.display, fontWeight: storyCount === 0 ? WEIGHT.ui : WEIGHT.strong, color: storyCount === 0 ? 'rgba(255,255,255,0.6)' : '#ffffff', lineHeight: 1.22, letterSpacing: '-0.025em' }}>
            {storyCount === 0
              ? (lens === 'popular' ? 'Nothing popular yet today.'
                : lens === 'interesting' ? 'Nothing marked interesting yet today.'
                : 'No stories available for this day.')
              : headline}
          </h2>
          {/* Excerpt */}
          {excerpt && (
            <p style={{ margin: 0, fontSize: TYPE.body, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {excerpt}
            </p>
          )}

        </div>

        </div>

        {/* Sheet only — the page carries these inside its panel.
               Same division as the page: the story's own action first, then everything that
               belongs to playback. Interesting used to sit *below* the transport, which put a
               control that acts on the story underneath the ones that act on the audio. ── */}
        {!asPage && storyCount > 0 && (
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1rem',
            padding: '0.6rem 1.5rem 0.25rem', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>

            {/* The story's own action. */}
            {!isRecap && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 14 }}>
                <InterestingButton theme="dark" active={!!isInteresting} onClick={onToggleInteresting} />
              </div>
            )}


            {playback}
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
    // ── Listen, as a page ────────────────────────────────────────────────────────────
    // The shared header, then the story as a tinted card of fixed height — fixed so the
    // player under it doesn't jump between stories with longer and shorter headlines — and
    // the player directly beneath it, with the slack left above the bottom bar rather than
    // inside the card (Codex, 2026-10-15). On "World recap" the card holds the recap and
    // Play plays it.
    const recapPlaying = isRecap;
    const recapCat = category;
    const topicName = CATEGORY_SHORT[recapCat] || recapCat;
    const recapDate = recapEnd ? new Date(`${recapEnd}T00:00:00Z`) : null;
    const monthLabel = recapDate ? recapDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Last month';
    const weekLabel = recapDate ? `Week ending ${recapDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}` : 'Last week';
    const words = (recapView
      ? (recapText || '')
      : storyParagraph(story || {})).split(/\s+/).filter(Boolean).length;
    const totalSec = narrationDuration > 0 && (recapView ? recapPlaying : !recapPlaying)
      ? narrationDuration
      : Math.round((words / 150) * 60 / (playbackSpeed || 1));
    const playingThis = recapView ? recapPlaying : !recapPlaying;
    const pct = playingThis ? (narrationProgress || 0) : 0;
    const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
    const isPlaying = playingThis && isNarrating && !isPaused;
    const onPlayButton = () => {
      if (isLoading && playingThis) { if (isPaused) onResume?.(); else if (isNarrating) onPause?.(); return; }
      if (recapView && !recapPlaying) { onPlayRecapPeriod?.(recapPeriod); return; }
      if (!recapView && recapPlaying) { onPlay?.(); return; }
      if (isPaused) onResume?.(); else if (isNarrating) onPause?.(); else onPlay?.();
    };

    // Which way the card now showing came in: the slide that asked for it; or, for a move made
    // some other way, the way it moved — along the topic for the next story starting, along the
    // topic row for a topic picked from it (Roy, 2026-10-17: topics slide too). Switching
    // between the stories and the recap, or the recap's period, doesn't slide.
    const cardKey = recapView ? `recap|${category}|${recapPeriod}` : `${category}|${storyIndex}`;
    if (lastCardRef.current?.key !== cardKey) {
      const before = lastCardRef.current;
      lastCardRef.current = { key: cardKey, recap: recapView, category, storyIndex };
      let dir = slideDirRef.current;
      if (!dir && before && before.recap === recapView) {
        if (before.category !== category) {
          const a = topicRow.indexOf(before.category), b = topicRow.indexOf(category);
          if (a > -1 && b > -1) dir = b > a ? 'next' : 'prev';
        } else if (!recapView && storyIndex !== before.storyIndex) {
          dir = storyIndex > before.storyIndex ? 'next' : 'prev';
        }
      }
      enterRef.current = reduceMotion || !before ? null : dir || null;
      slideDirRef.current = null;
    }

    const pageDots = (stories || []).slice(0, radioOnly ? stories.length : listenLimit).map((_, i) => {
      const current = i === storyIndex;
      return (
        <button key={i} className="rn-btn" onClick={() => { if (i !== storyIndex) slideTo(i > storyIndex ? 'next' : 'prev', () => onGoToStory?.(i)); }}
          aria-label={`Story ${i + 1} of ${radioOnly ? stories.length : listenLimit}`} aria-current={current ? 'true' : undefined}
          style={{ padding: '6px 2.5px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span ref={el => { dotRefs.current[i] = el; }}
            style={{ display: 'block', height: 5, width: current ? 16 : 5, borderRadius: 5, background: 'currentColor',
              opacity: current ? 1 : i < storyIndex ? 0.45 : 0.2, transition: DOT_TRANSITION }} />
        </button>
      );
    });

    const cardFrame = { ...topicVars(recapCat), flex: radioOnly ? '1 1 380px' : '0 1 380px', minHeight: radioOnly ? 130 : 250, background: 'var(--tp-card)', color: 'var(--card-ink)',
      borderRadius: 19, padding: '18px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' };
    const h1 = { margin: 0, fontSize: HOME_TYPE.title, lineHeight: 1.12, letterSpacing: '-0.045em', fontWeight: 700 };

    const storyCard = storyCount === 0 ? (
      <article className="rn-tp" style={{ ...cardFrame, justifyContent: 'center' }}>
        <p style={{ margin: 0, fontSize: HOME_TYPE.body, fontWeight: 600, textAlign: 'center' }}>
          {lens === 'popular' ? 'Nothing popular yet today.' : lens === 'interesting' ? 'Nothing marked interesting yet today.' : 'No stories available for this day.'}
        </p>
      </article>
    ) : (
      // The slide-in must let go once it ends. With fill "both" its last frame (transform:
      // none) stayed applied over the inline transform the drag writes, so only the first
      // card, which never slid in, followed the finger (Roy, 2026-10-17).
      <article key={cardKey} ref={cardRef} className="rn-tp" onTouchStart={onTouchStart} onTouchMove={pageTouchMove} onTouchEnd={pageTouchEnd}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.style.animation = 'none'; }}
        style={{ ...cardFrame, touchAction: 'pan-y', animation: enterRef.current ? `rn-enter-${enterRef.current} 0.24s ease-out backwards` : 'none' }}>
        <StoryTopRow category={category} onCard read={user ? isStoryRead : undefined} isNew={story?.status === 'New'} />
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, flex: 1 }}>
          <h1 style={h1}>{headline}</h1>
          {excerpt && (
            <p style={{ margin: 0, fontSize: HOME_TYPE.body, lineHeight: 1.55, color: 'var(--card-body)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {excerpt}
            </p>
          )}
          {/* The outlets and Interesting sit at the foot of the card, as in Swipe and Scroll
              (Roy, 2026-10-18); the card's fixed height leaves the room above them. */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SourcesRow sources={outlets} onCard bleed={20} />
          {/* "View 4 more stories" / "View less" shares Interesting's line at the end of a batch
              (Roy, 2026-10-18) — it used to sit under the play controls, apart from its story. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            {(atBatchEnd || showCollapse) && (
              <NextLink dir={atBatchEnd ? 'down' : 'up'} style={{ padding: 0, minHeight: 32, color: 'var(--card-sub)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (atBatchEnd) setRevealed(total);
                  else { setRevealed(LISTEN_BATCH); if (storyIndex > LISTEN_BATCH - 1) onGoToStory?.(LISTEN_BATCH - 1); }
                }}>
                {atBatchEnd ? `${remaining} more ${remaining === 1 ? 'story' : 'stories'}` : 'less'}
              </NextLink>
            )}
            <span style={{ marginLeft: 'auto' }}>
              <StarButton onCard active={!!isInteresting} onClick={onToggleInteresting} />
            </span>
          </div>
          </div>
        </div>
      </article>
    );

    const headlineCard = storyCount === 0 ? storyCard : (
      <article key={cardKey} ref={cardRef} className="rn-tp" style={{ ...cardFrame, touchAction: 'pan-y' }}>
        <RadioTranscript key={`${category}|${storyIndex}|${selectedDay}`} text={cleanForTTS(storyParagraph(story))} progress={pct} label="Headline summary" highlight={false} compact
          charOffset={narrationCharOffset} active={!readOnly && isNarrating && playingThis && !isLoading && narrationCharOffset !== -2}
          before={<header style={{ marginBottom: 12 }}>
            <StoryTopRow category={category} onCard read={user ? isStoryRead : undefined} isNew={story?.status === 'New'} />
            <h1 style={{ ...h1, marginTop: 10 }}>{headline}</h1>
          </header>}
          after={({ moreButton }) => <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SourcesRow sources={outlets} onCard />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{moreButton}<span style={{ marginLeft: 'auto' }}><StarButton onCard active={!!isInteresting} onClick={onToggleInteresting} /></span></div>
          </div>} />
      </article>
    );

    const recapHeading = <header style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 24, fontSize: HOME_TYPE.meta, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          <Sparkles size={14} strokeWidth={1.8} />{topicName} · {recapPeriod} recap
        </div>
          <h1 style={{ ...h1, marginTop: 10 }}>{recapPeriod === 'Daily' ? fmtDay(selectedDay) : recapPeriod === 'Weekly' ? weekLabel : monthLabel}</h1>
          {!readOnly && programmeMeta && <p style={{ margin: '8px 0 0', fontSize: HOME_TYPE.meta, color: 'var(--card-sub)' }}>{programmeMeta}</p>}
    </header>;

    const recapCard = (
      <article key={cardKey} ref={cardRef} className="rn-tp" onTouchStart={onTouchStart} onTouchMove={pageTouchMove} onTouchEnd={pageTouchEnd}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.style.animation = 'none'; }}
        style={{ ...cardFrame, ...(!readOnly && recapText ? { flex: '0 1 430px', minHeight: 180, padding: '12px 16px 8px', gap: 0 } : {}), touchAction: 'pan-y', animation: enterRef.current ? `rn-enter-${enterRef.current} 0.24s ease-out backwards` : 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          {recapText ? (
            !readOnly ? <AnimatedRecap key={`${category}|${recapPeriod}|${selectedDay}|${recapText}`} text={recapText} sourcesMap={recapAttributions} allSources={recapSources}
              category={category} progress={pct} charOffset={narrationCharOffset} duration={narrationDuration || totalSec} speed={playbackSpeed || 1}
              playing={isNarrating && playingThis && !isPaused && !isLoading && narrationCharOffset !== -2}
              getStoryAction={getRecapStoryAction}
              onOpenSources={snapshot => setSourcesSnapshot({ ...snapshot, label: `${topicName} · ${recapPeriod} recap · ${fmtDay(selectedDay)}` })} /> :
            <RadioTranscript key={`${category}|${recapPeriod}|${selectedDay}`} text={recapText} progress={readOnly ? 0 : pct} before={recapHeading} highlight={!readOnly} compact={!readOnly}
              charOffset={narrationCharOffset} active={!readOnly && isNarrating && playingThis && !isLoading && narrationCharOffset !== -2}
              after={recapSources.length > 0 && (
                // At the end of the text, not docked under it (Roy, 2026-10-18).
                <button className="rn-btn" aria-haspopup="dialog"
                  onClick={() => setSourcesSnapshot({ items: recapSources, label: `${topicName} · ${recapPeriod} recap · ${fmtDay(selectedDay)}` })}
                  style={{ marginTop: 10, minHeight: 44, color: 'var(--card-sub)', fontSize: HOME_TYPE.meta, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  Stories &amp; sources <ChevronDown size={15} style={{ transform: 'rotate(180deg)' }} />
                </button>
              )} />
          ) : (
            <div style={{ overflowY: 'auto' }}>{recapHeading}<p style={{ margin: 0, fontSize: HOME_TYPE.body, lineHeight: 1.5, color: 'var(--card-sub)' }}>
              {recapError ? 'Recaps couldn’t be loaded. Try another period or reload the page.' : recapPeriod === 'Daily' ? `No ${topicName} recap is available for this day. Try another topic or date.` : `The ${recapPeriod.toLowerCase()} ${topicName} recap isn't ready yet.`}
            </p></div>
          )}
        </div>
      </article>
    );

    const nextDisabled = !radioQueueCategories.length || (radioQueueCategories.indexOf(category) >= radioQueueCategories.length - 1 && (recapView || storyIndex >= storyCount - 1));
    const prevDisabled = radioQueueCategories.indexOf(category) <= 0 && (recapView || storyIndex <= 0);
    const unifiedText = recapView ? recapText : excerpt;
    const fullStoryMap = !recapView && unifiedText ? [{ text: unifiedText, stories: [{ headline, sources: outlets }] }] : null;
    const unifiedCard = <article className="rn-tp rn-unified-card" style={{ ...cardFrame, flex: '1 1 430px', minHeight: 170, maxHeight: readOnly ? undefined : 500, padding: '12px 16px 8px', gap: 0 }}>
      {unifiedText ? <AnimatedRecap ref={readerRef} key={`${category}|${recapPeriod}|${selectedDay}|${unifiedText}`}
        text={unifiedText} sourcesMap={recapView ? recapAttributions : fullStoryMap} allSources={recapView ? recapSources : fullStoryMap[0].stories}
        category={category} progress={pct} charOffset={narrationCharOffset} duration={narrationDuration || totalSec} speed={playbackSpeed || 1}
        playing={!readOnly && isNarrating && playingThis && !isPaused && !isLoading && narrationCharOffset !== -2}
        externalCount={recapView ? 0 : storyCount} externalIndex={storyIndex} onExternalSelect={onGoToStory}
        reading={readOnly} onChangeReading={onChangeReading} onNext={onNext} onPrev={onPrev}
        canNext={!nextDisabled} canPrev={!prevDisabled} onNavigationChange={setReaderNavigation} onReadUpdate={onReadUpdate}
        title={recapView ? `${recapPeriod === 'Daily' ? 'Today' : recapPeriod === 'Weekly' ? 'Last week' : 'Last month'} in ${topicName}` : headline}
        dateLabel={recapPeriod === 'Weekly' ? weekLabel : recapPeriod === 'Monthly' ? monthLabel : fmtDay(selectedDay)}
        getStoryAction={recapView ? getRecapStoryAction : () => ({ interesting: isInteresting, toggle: onToggleInteresting })}
        onOpenSources={snapshot => setSourcesSnapshot({ ...snapshot, label: `${topicName} · ${fmtDay(selectedDay)}` })} /> :
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 16 }}>
          <button className="rn-btn" onClick={() => onChangeReading?.(!readOnly)} style={{ alignSelf: 'flex-end', fontSize: HOME_TYPE.ui, minHeight: 44 }}>{readOnly ? 'Listen' : 'Read'}</button>
          <h1 style={h1}>{topicName}</h1>
          <p style={{ fontSize: HOME_TYPE.body, lineHeight: 1.5, color: 'var(--card-sub)' }}>
            {recapError ? 'This brief couldn’t be loaded. Try another topic or reload the page.' : recapView ? `No ${recapPeriod === 'Daily' ? 'quick' : recapPeriod === 'Weekly' ? 'weekly' : 'monthly'} brief is available for ${topicName} ${recapPeriod === 'Daily' ? 'on this date' : 'yet'}. Try another topic or period.` : 'No full brief is available for this topic and date. Try another topic or date.'}
          </p>
        </div>}
    </article>;

    const canPlay = recapView ? !!recapText : storyCount > 0;
    const navBtn = (onClick, label, Icon, disabled) => (
      <button className="rn-btn" onClick={disabled ? undefined : onClick} disabled={disabled} aria-label={label}
        style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1 }}>
        <Icon size={24} strokeWidth={1.9} />
      </button>
    );

    const transport = (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: unified ? 12 : 36, minHeight: 64 }}>
                {navBtn(() => slideTo('prev', onPrev), radioOnly && recapView ? 'Previous category recap' : 'Previous story', Rewind, radioOnly ? (radioQueueCategories.indexOf(category) <= 0 && (recapView || storyIndex <= 0)) : recapView)}
                <button className="rn-btn" onClick={onPlayButton} disabled={!canPlay} aria-label={isPlaying ? 'Pause' : 'Play'}
                  title={!canPlay ? 'Audio is available when this recap is ready' : undefined}
                  style={{ opacity: canPlay ? 1 : 0.35, cursor: canPlay ? 'pointer' : 'default', width: 56, height: 56, borderRadius: '50%', background: 'var(--play-bg)', color: 'var(--play-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isLoading && playingThis
                    ? <Loader size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
                    : isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />}
                </button>
                {radioOnly ? navBtn(() => slideTo('next', onNext), recapView ? 'Next category recap' : 'Next story', FastForward, !radioQueueCategories.length || (radioQueueCategories.indexOf(category) >= radioQueueCategories.length - 1 && (recapView || storyIndex >= storyCount - 1))) : navBtn(() => (atBatchEnd ? slideTo('next', () => onSelectCategory?.(topicAt(1))) : slideTo('next', onNext)),
                  atBatchEnd ? (topicAt(1) ? `Next topic: ${CATEGORY_SHORT[topicAt(1)] || topicAt(1)}` : 'Last topic') : 'Next story',
                  FastForward, recapView || (atBatchEnd && !topicAt(1)))}
              </div>);
    const footerCenter = readOnly ? <button className="rn-btn" aria-label="Next reading update" disabled={!unifiedText || !readerNavigation.next} onClick={() => readerRef.current?.next()} style={{ display: 'flex', gap: 5, alignItems: 'center', minHeight: 48, fontSize: HOME_TYPE.meta, color: 'var(--sub)', opacity: unifiedText && readerNavigation.next ? 1 : .5 }}><ChevronUp size={14} />{!unifiedText ? 'Choose another topic' : readerNavigation.next ? 'Swipe up to continue' : 'You’re all caught up'}</button> : loading ? null : transport;

    return (
      <div data-mode-surface={readOnly ? 'swipe' : 'audio'} style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--paper)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: PAGE_MAX, margin: '0 auto', flexShrink: 0, position: 'relative', zIndex: 20 }}>
          <AppHeader
            selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay}
            categories={contextCategories} activeCategory={allScope && !recapView ? null : category}
            onSelectCategory={onSelectCategory}
            showAllPill={radioOnly ? false : showAllPill} allActive={allScope && !recapView} onSelectAll={onSelectAll}
            onEditCategories={onEditCategories} user={user}
            storyCount={topicStoryCount ?? storyCount}
            radioOnly={radioOnly}
            recapView={recapView} onChangeRecapView={onChangeRecapView} canRecap={!!onChangeRecapView} recapCategory={category}
            lens={lens} onChangeLens={onChangeLens}
            period={recapPeriod} onChangePeriod={onChangeRecapPeriod} periodReady={periodReady}
          />
        </div>

        <div style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', maxWidth: PAGE_MAX, margin: '0 auto',
          display: 'flex', flexDirection: 'column', padding: '0 20px', overflowY: unified ? 'auto' : undefined, overscrollBehavior: 'contain' }}>
          {!readOnly && resumeProgramme && <button className="rn-btn" onClick={onResumeProgramme} style={{ textAlign: 'start', minHeight: 38, fontSize: HOME_TYPE.meta, fontWeight: 600, color: 'var(--sub)' }}>Continue listening · {CATEGORY_SHORT[resumeProgramme.category] || resumeProgramme.category} · {new Date(`${resumeProgramme.day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</button>}
          {programmeNotice?.message && <p role="status" style={{ margin: '2px 0 10px', fontSize: HOME_TYPE.ui, lineHeight: 1.4, color: 'var(--sub)' }}>{programmeNotice.complete ? '✓ ' : ''}{programmeNotice.message}</p>}
          {loading ? <NewsLoader day={selectedDay} /> : unified ? unifiedCard : recapView ? recapCard : radioOnly ? headlineCard : storyCard}
          {!unified && !loading && !recapView && pageDots.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 6, color: 'var(--ink)', flexShrink: 0 }}>{pageDots}</div>
          )}

          {/* The player: speed and repeat ride the progress line, the three buttons you press
              most sit under it, and Play is the one coloured thing on the screen. */}
          {!readOnly && !loading && (
            <section aria-label="Player" style={{ marginTop: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: HOME_TYPE.meta, color: 'var(--sub)', fontVariantNumeric: 'tabular-nums' }}>
                <button className="rn-btn" onClick={onSpeedCycle} aria-label={`Playback speed ${playbackSpeed}×`} {...whilePlaying(isNarrating).props}
                  style={{ width: 40, height: 40, fontSize: HOME_TYPE.ui, fontWeight: 650, color: playbackSpeed === 1 ? 'var(--ink)' : 'var(--accent)', flexShrink: 0,
                    ...whilePlaying(isNarrating).style, transition: 'opacity 0.25s ease' }}>
                  {playbackSpeed}×
                </button>
                <span>{fmt((totalSec * pct) / 100)}</span>
                <AudioSeekBar key={`${selectedDay}|${cardKey}`} progress={pct} duration={totalSec}
                  disabled={!onSeek || !isNarrating || !playingThis || isLoading || narrationCharOffset === -2} onSeek={onSeek} />
                <span>{fmt(totalSec)}</span>
                {/* Repeat: off, this topic, or this story. On, it sits in a filled circle with a dot
                    under it, and says which for a moment — a colour change alone was invisible. */}
                <button className="rn-btn" onClick={() => { onRepeatToggle?.(); flashRepeatHint(); }} aria-label={REPEAT_LABEL[repeatMode || 'off']} aria-pressed={!!repeatMode}
                  {...whilePlaying(isNarrating).props}
                  style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: repeatMode ? 'var(--panel)' : 'transparent', color: repeatMode ? 'var(--ink)' : 'var(--sub)',
                    ...whilePlaying(isNarrating).style, transition: 'background 0.2s ease, color 0.2s ease, opacity 0.25s ease' }}>
                  {repeatMode === 'one' ? <Repeat1 size={20} strokeWidth={2.1} /> : <Repeat size={20} strokeWidth={repeatMode ? 2.1 : 1.8} />}
                  {repeatMode && <span aria-hidden style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />}
                  {repeatHint && (
                    <span role="status" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, whiteSpace: 'nowrap', padding: '5px 10px', borderRadius: 999,
                      background: 'var(--ink)', color: 'var(--paper)', fontSize: HOME_TYPE.meta, fontWeight: 600, pointerEvents: 'none' }}>
                      {repeatHint}
                    </span>
                  )}
                </button>
              </div>
              {!unified && transport}
              {phoneVoice && (
                <p role="status" style={{ margin: '0 0 6px', padding: '9px 12px', borderRadius: 12, background: 'var(--panel)', color: 'var(--ink)', fontSize: HOME_TYPE.ui, lineHeight: 1.45 }}>
                  The narration voice isn't available right now, so your phone's own voice is reading. Turn off silent mode to hear it.
                </p>
              )}

            </section>
          )}
          <div style={{ flex: radioOnly ? '0 0 12px' : 1, minHeight: 12 }} />
        </div>
        {typeof footer === 'function' ? footer(footerCenter) : footer}
        {sourcesSnapshot && <RecapSourcesSheet snapshot={sourcesSnapshot} onClose={closeSources} />}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          borderRadius: `${RADIUS.md}px ${RADIUS.md}px 0 0`,
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
