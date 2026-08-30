import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Sparkles, ChevronDown, ChevronUp, FileText, Newspaper, X, Calendar, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT, CATEGORY_IMAGES } from '../theme';
import CategoryIcon from './CategoryIcon';
import InterestingButton from './InterestingButton';
import CircleAction from './CircleAction';
import { headlineKey } from './PopularTab';
import BottomNav from './BottomNav';
import StorySummarySheet from './StorySummarySheet';
import ProgressRail from './ProgressRail';
import LensToggle from './LensToggle';
import CorpusToggle from './CorpusToggle';
import RecapBar from './RecapBar';
import { centrePill } from '../utils';

function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date  = new Date(y, m - 1, d);
    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

// Lift a category colour toward white so it stays legible on the dark photo behind the
// Swipe-mode pills, without losing which category it is.
function tintForDark(hex, amount = 0.45) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const mix = (ch) => Math.round(ch + (255 - ch) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

// Reader = Reels-style Headlines + a Summary bottom sheet.
//   Headlines: one full-screen headline per screen (category photo + scrim),
//   vertical swipe/scroll to move between stories, progress bar on top.
//   Summary: a bottom sheet with the full details (takeaways, perspectives, why).
export default function StoryReader({
  category,
  story,
  storyIndex,
  stories,
  onPlayFrom,
  isNarrating,
  isPaused,
  miniPlayerVisible,
  contextCategories = [],
  user,
  onShowAuth,
  onMarkRead,
  savedStories = [],
  onToggleSaved,
  inSheet = false,
  onClose,
  isAlreadyRead = false,
  playlist = null,
  feedName,
  categoryBriefing = null,
  onPlayRecap,
  asPage = false,
  challengeStats,
  selectedDay,
  availableDays = [],
  onSelectDay,
  activeTabPath = '/',
  onSwitchStoriesTab,
  onOpenFeedSummary,
  onEnterSummaries,
  onEnterAudio,
  onOpenCategoryRecap,
  storiesForCategory,
  isStoryRead,
  onFocusStory,
  lens = 'latest',
  onChangeLens,
  onEditCategories,
}) {
  const navigate = useNavigate();
  const modeLinkStyle = { padding: '2px 8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' };
  const location = useLocation();
  // Arriving from "Go deeper" in Scroll mode opens the summary straight away.
  const [summaryOpen, setSummaryOpen] = useState(!!location.state?.openSummary);

  // ...and then the instruction is spent. It lives in history state, which the browser
  // restores on reload and when a tab is reopened — so without this, every later load of
  // that entry re-opened the sheet, and the app looked like it booted into Summary. Replace
  // the entry without the flag; the sheet stays open now because state already says so.
  useEffect(() => {
    if (!location.state?.openSummary) return;
    const { openSummary, ...rest } = location.state;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: rest });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [recapOpen, setRecapOpen] = useState(false);
  // Read status is derived, never stored. It used to be state synced from the prop in an
  // effect — which runs after paint, so every swipe painted one frame carrying the previous
  // story's status. isStoryRead already subsumes isAlreadyRead (same listenedIndices, plus
  // the session-seen set), so one function answers for the live story and its neighbours
  // alike and the two can't disagree at the handover.
  const readOf = (cat, idx) => !!isStoryRead?.(cat, idx);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const dayPickerRef = useRef(null);
  const effectiveDay = selectedDay || new Date().toISOString().split('T')[0];
  const canPickDay = availableDays.length > 0;

  useEffect(() => {
    if (!dayPickerOpen) return;
    const handler = (e) => {
      if (dayPickerRef.current && !dayPickerRef.current.contains(e.target)) setDayPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [dayPickerOpen]);
  const color = CATEGORY_COLORS[category] || '#6366f1';
  const image = CATEGORY_IMAGES[category];

  // Tell the app where we are, so Scroll mode can continue from the same story.
  useEffect(() => { if (asPage) onFocusStory?.(category, storyIndex); }, [asPage, category, storyIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  // Close the summary sheet when the story actually changes. Keyed on the story rather
  // than "is this the first run" so StrictMode's double-invoke can't undo an
  // "openSummary" arrival from Scroll mode's Go deeper.
  // Layout, not effect: the live body is one persistent DOM node reused by every story, so
  // it carries the previous story's scrollTop into the new one. Resetting after paint left
  // one frame showing the incoming story mid-scroll — the flicker at the moment a swipe
  // settled, and why it only appeared after a story long enough to scroll.
  const shownStoryRef = useRef(`${category}|${storyIndex}`);
  useLayoutEffect(() => {
    const key = `${category}|${storyIndex}`;
    if (shownStoryRef.current === key) return;
    shownStoryRef.current = key;
    setSummaryOpen(false);
    setRecapOpen(false);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [storyIndex, category]);

  // Counted when the story arrives, not when you leave it.
  //
  // This used to fire from the effect's cleanup — i.e. on the way out — so the count always
  // trailed by one: the story on screen was never counted, and the last story of a session
  // only landed if you happened to swipe off it. That's why the counter looked like it
  // incremented at random.
  //
  // Still deferred past the swipe animation: it writes reading history and re-renders the
  // app, which inline would land in the same frame as the handover. The timer is
  // deliberately not cancelled on unmount — a story you opened counts even if you swipe
  // straight on, and App dedupes by (day, category, index).
  useEffect(() => {
    if (!story || !onMarkRead) return;
    const s = story, c = category, i = storyIndex, fn = onMarkRead;
    setTimeout(() => fn(s, c, i), 350);
  }, [storyIndex, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => {
    const from = location.state?.from;
    if (!from || from === 'home' || from === '/') navigate('/');
    else if (from === '/my-feed') navigate('/my-feed');
    else if (from === 'popular') navigate('/popular');
    else if (from === '/important') navigate('/important');
    else if (from === 'category') navigate(`/category/${encodeURIComponent(category)}`, { state: { from: location.state?.feedFrom || '/' } });
    else if (typeof from === 'string' && from.startsWith('/feed/')) navigate(from);
    else navigate('/');
  };

  // Auto-scroll active category pill into view
  const catStripRef = useRef(null);
  const activeCatRef = useRef(null);
  useEffect(() => {
    centrePill(catStripRef.current, activeCatRef.current);
  }, [category]);

  // ── Navigation (single-category or cross-category playlist) ──────────────────
  const playlistPos = playlist
    ? playlist.findIndex(p => p.category === category && p.storyIndex === storyIndex)
    : -1;
  const inPlaylist  = !!playlist && playlistPos !== -1;

  const totalCount = inPlaylist ? playlist.length : stories.length;
  const currentPos = inPlaylist ? playlistPos    : storyIndex;

  // Swipe mode reveals the category in batches: you get SWIPE_BATCH stories, then a button
  // offering the rest. Stops an endless strip and gives a natural stopping point.
  const SWIPE_BATCH = 8;
  const [revealed, setRevealed] = useState(SWIPE_BATCH);
  // Which way to animate once a reveal/collapse has re-rendered. It can't be done inline:
  // changing `revealed` re-renders, and the layout effect re-zeroes the strip on every
  // render — so a transition set before that lands is wiped before it can play.
  const pendingSwipeRef = useRef(null); // 'next' | 'prev' | null
  useEffect(() => { setRevealed(Math.max(SWIPE_BATCH, storyIndex + 1)); }, [category]); // eslint-disable-line react-hooks/exhaustive-deps
  const swipeLimit  = asPage ? Math.min(revealed, stories.length) : stories.length;
  const remaining   = Math.max(0, stories.length - swipeLimit);

  // ── Category traversal: swiping past the last story moves to the next category, and
  // swiping back from the first returns to the previous category at whatever story was
  // last shown there. Remembered per category for the session.
  // Popular and Interesting are ranked cross-category lists — same as Scroll mode, they
  // get an "All" entry. The per-category feeds don't.
  const fromPath = location.state?.from;
  const showAllPill = !!playlist?.length && (fromPath === '/popular' || fromPath === '/important');

  // Popular and Interesting are ranked lists that happen to span categories, so they have
  // two reading orders: the ranking itself ("All"), or one category at a time. Which one
  // you're in is a mode, not a by-product of where you happen to be — it decides what a
  // swipe past the last story does, so it's explicit, and it survives leaving the page so a
  // revisit resumes the way you left it.
  const scopeKey = showAllPill ? `rundown_swipe_scope_${fromPath}` : null;
  const [scope, setScope] = useState(() => {
    if (!showAllPill) return 'category';
    try { return sessionStorage.getItem(`rundown_swipe_scope_${fromPath}`) || 'all'; } catch { return 'all'; }
  });
  useEffect(() => {
    if (scopeKey) { try { sessionStorage.setItem(scopeKey, scope); } catch {} }
  }, [scope, scopeKey]);
  const allScope = showAllPill && scope === 'all';

  // The batch gate belongs to a category's own list. In All scope you're reading a ranking,
  // not a category, so there is nothing to reveal the rest of.
  const gateOn      = asPage && !allScope;
  const atBatchEnd  = gateOn && remaining > 0 && storyIndex >= swipeLimit - 1;
  // Once expanded, the same slot offers the way back — shown from the old gate position on.
  const isExpanded  = gateOn && stories.length > SWIPE_BATCH && revealed > SWIPE_BATCH;
  const showCollapse = isExpanded && storyIndex >= SWIPE_BATCH - 1;

  const cats = contextCategories.length ? contextCategories : [category];
  const catIdx = cats.indexOf(category);
  const lastSeenByCat = useRef({});
  useEffect(() => { lastSeenByCat.current[category] = storyIndex; }, [category, storyIndex]);
  const lenOf = (c) => (c === category ? stories.length : (storiesForCategory?.(c) || []).length);

  const nextCat = catIdx >= 0 && catIdx < cats.length - 1 ? cats[catIdx + 1] : null;
  const prevCat = catIdx > 0 ? cats[catIdx - 1] : null;
  const prevCatEntry = () => {
    if (!prevCat) return null;
    const remembered = lastSeenByCat.current[prevCat];
    const n = lenOf(prevCat);
    // Trust the remembered index — the count from storiesForCategory can lag the list
    // actually being shown, and clamping to it would land a story short.
    if (Number.isInteger(remembered)) return { category: prevCat, index: remembered };
    return n > 0 ? { category: prevCat, index: n - 1 } : null;
  };

  // In All scope the ranking is the whole list and it ends where it ends — running on into
  // a category would silently change what you're reading without you asking for it.
  const hasPrev = allScope
    ? playlistPos > 0
    : (storyIndex > 0 || (asPage && catIdx > 0));

  // At the gate you can still swipe on — it carries you to the next category, skipping
  // the stories you chose not to reveal. The button is an option, not a roadblock.
  const hasNext = allScope
    ? (playlistPos >= 0 && playlistPos < playlist.length - 1)
    : atBatchEnd
      ? !!(nextCat && lenOf(nextCat) > 0)
      : asPage
        ? (storyIndex < stories.length - 1 || (!!nextCat && lenOf(nextCat) > 0))
        : inPlaylist ? playlistPos < playlist.length - 1 : storyIndex < stories.length - 1;

  const navTo = (cat, idx) =>
    navigate(`/category/${encodeURIComponent(cat)}/story/${idx}`, { state: location.state, replace: true });

  const navDirRef = useRef('next'); // direction of last nav → picks the slide animation
  const contentRef = useRef(null);  // scrollable headline region
  const hintRef = useRef(null);     // "swipe up for next" — grows as you scroll toward the edge
  const stageRef = useRef(null);    // the reel "card" (image + headline) that pans with the drag

  const rootRef = useRef(null);     // the swipe viewport — one story tall

  // ── Reels-style drag ────────────────────────────────────────────────────────
  //
  // The drag offset is NOT React state, and that is the whole point of this rewrite.
  //
  // It used to be: every touchmove called setDragY, so following your finger meant a full
  // React render of all three stories — headline, takeaways, sources, buttons — sixty times
  // a second. React would keep up most of the time and miss occasionally, and a missed
  // frame during a 260ms animation is exactly the flicker: the strip jumps rather than
  // slides. No amount of memoising the contents fixes that, because the render itself is
  // the work, and it was on the critical path of every frame.
  //
  // Now the finger writes transforms straight to the DOM. React renders once per story —
  // when the route actually changes — and never during the gesture. There is no per-frame
  // React work left to drop.
  const dragRef = useRef(0);
  const draggingRef = useRef(false);
  const committingRef = useRef(false); // mid-flight between applyOffset(animate) and the route swap

  // One "slot" of the strip = the height of the swipe viewport.
  //
  // Kept in a ref, and measured with a ResizeObserver on the element itself, because there
  // used to be two different answers to "how tall is a slot". commitTo measured the live
  // clientHeight to decide how far to slide, while applyOffset positioned the slots from a
  // `stripH` state that only refreshed on a window `resize` event. Any time this element's
  // own height changed *without* a window resize — mobile Safari showing/hiding its URL bar
  // is the constant one, but so is anything above the strip changing height — the two
  // disagreed. The incoming story then animated to (stale − live)px instead of 0, and the
  // layout effect below snapped it the remaining distance right after the route swapped:
  // the twitch as a story lands, on every single swipe. One number, observed on the element
  // that actually defines it, so the animation and the positioning cannot drift apart.
  const stripHRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 800);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight || window.innerHeight;
      if (h === stripHRef.current) return;
      stripHRef.current = h;
      // A resize while sitting still must re-seat the neighbours at the new slot height —
      // otherwise they stay parked at the old one and the next swipe starts out misaligned.
      if (!draggingRef.current && !committingRef.current) applyOffset(0, false);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const viewH = () => stripHRef.current;

  // Neighbouring stories, so the incoming one is already on screen while the finger drags.
  // Must mirror goNextStory / goPrevStory exactly, including the category hops — the
  // strip shows these, so any divergence means you land on a different story than the
  // one that slid in.
  const entryFor = (cat, idx) => {
    const list = cat === category ? stories : (storiesForCategory?.(cat) || []);
    const st = list[idx];
    return st ? { category: cat, story: st, index: idx } : null;
  };
  const neighbourAt = (delta) => {
    if (allScope) {
      const p = playlist[playlistPos + delta];
      return p ? entryFor(p.category, p.storyIndex) : null;
    }
    if (asPage) {
      if (delta > 0) {
        if (atBatchEnd) return nextCat ? entryFor(nextCat, 0) : null;
        if (storyIndex < stories.length - 1) return entryFor(category, storyIndex + 1);
        return nextCat ? entryFor(nextCat, 0) : null;
      }
      if (storyIndex > 0) return entryFor(category, storyIndex - 1);
      const p = prevCatEntry();
      return p ? entryFor(p.category, p.index) : null;
    }
    if (inPlaylist) {
      const p = playlist[playlistPos + delta];
      return p ? entryFor(p.category, p.storyIndex) : null;
    }
    return entryFor(category, storyIndex + delta);
  };
  const prevEntry = hasPrev ? neighbourAt(-1) : null;
  const nextEntry = hasNext ? neighbourAt(1) : null;

  // Every element that rides the strip registers itself here with the slot it occupies
  // (-1 above, 0 live, +1 below). Photos and text register separately but move as one.
  const layersRef = useRef(new Map());
  const registerLayer = (key, slot) => (el) => {
    if (el) layersRef.current.set(key, { el, slot });
    else layersRef.current.delete(key);
  };
  const SLIDE = 'transform 0.26s cubic-bezier(0.22,0.61,0.36,1)';

  // The one place the strip's position is written. Straight to style — no React involved.
  //
  // Skips a layer already at its target transform/transition. This effect's own
  // useLayoutEffect (below) has no dependency array on purpose, so it re-runs on every
  // render this component gets for any reason — several async pieces of app state can each
  // land within the same second right after this page mounts, and every one of those
  // re-renders used to unconditionally rewrite inline styles on every layer even though
  // nothing had actually moved. That turned into hundreds of redundant DOM writes on the
  // photo layers in under a second, visible as flicker. A newly mounted neighbour layer
  // (swiping to a new story) has no matching style yet, so it's untouched by this — only
  // layers that are already exactly where they should be get skipped.
  const applyOffset = (dy, animate) => {
    dragRef.current = dy;
    const transition = animate ? SLIDE : 'none';
    layersRef.current.forEach(({ el, slot }) => {
      const transform = `translate3d(0, ${dy + slot * stripHRef.current}px, 0)`;
      if (el.style.transform === transform && el.style.transition === transition) return;
      el.style.transition = transition;
      el.style.transform = transform;
    });
  };

  // Position the strip before every paint. On a normal render this re-zeroes it, which is
  // what lands the swap after a commit; during a drag nothing re-renders, so it never runs.
  //
  // Also skipped while a commit's slide is still in flight (committingRef). Renders can land
  // for reasons that have nothing to do with the swipe — onMarkRead's delayed history write
  // is the recurring one, it lands ~350ms after a story opens and re-renders this component
  // with new props. If that happens to fall inside a commit's 260ms window, this effect used
  // to snap the strip back to 0 mid-slide: the transition was still playing, so the jump was
  // visible as a flicker. The route swap in commitTo clears the flag itself, right before
  // navigating, so the render that actually lands the new story still re-zeroes normally.
  useLayoutEffect(() => {
    if (!draggingRef.current && !committingRef.current) applyOffset(0, false);
  });

  // Finish the swipe: glide a full screen, then swap the route. The re-zero happens in the
  // layout effect above, before the browser paints the new story, so there is no frame in
  // between showing the new story at the old offset.
  //
  // Guarded against re-entry: nothing stopped a second commit from landing while the first
  // was still sliding — a quick second swipe, the wheel handler's own lock racing a touch
  // commit, or the batch-gate's reveal-then-commit sequence firing twice. That second call
  // reset the transform to a fresh -h/+h mid-flight and rescheduled its own 260ms timeout,
  // which is a visible jump partway through the first slide, not a smooth continuation of
  // it — indistinguishable from the mid-animation snap this file already fixed once via
  // committingRef, but from a second, overlapping commit rather than an unrelated re-render.
  const commitTo = (dir, after) => {
    if (committingRef.current) return;
    const h = viewH();
    committingRef.current = true;
    applyOffset(dir === 'next' ? -h : h, true);
    setTimeout(() => {
      committingRef.current = false;
      if (dir === 'next') goNextStory(); else goPrevStory();
      after?.();
    }, 260);
  };

  // Runs after the reveal re-render, when atBatchEnd is false and the next neighbour is the
  // newly revealed story — so the animation and the destination finally agree.
  useEffect(() => {
    const dir = pendingSwipeRef.current;
    if (!dir) return;
    pendingSwipeRef.current = null;
    requestAnimationFrame(() => commitTo(dir));
  }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPrevStory = () => {
    if (!hasPrev) return;
    navDirRef.current = 'prev';
    if (allScope) { const p = playlist[playlistPos - 1]; if (p) navTo(p.category, p.storyIndex); return; }
    if (storyIndex > 0) { navTo(category, storyIndex - 1); return; }
    const p = prevCatEntry();
    if (p) navTo(p.category, p.index);
  };
  const goNextStory = () => {
    if (!hasNext) return;
    navDirRef.current = 'next';
    if (allScope) { const p = playlist[playlistPos + 1]; if (p) navTo(p.category, p.storyIndex); return; }
    if (atBatchEnd) { if (nextCat) navTo(nextCat, 0); return; }
    if (storyIndex < stories.length - 1) { navTo(category, storyIndex + 1); return; }
    if (nextCat) navTo(nextCat, 0);
  };

  // ── Vertical swipe / wheel — content scrolls first, then the card pans at the edge ──
  const touchY = useRef(null);
  const touchEdge = useRef({ top: true, bottom: true });
  const wheelLock = useRef(false);
  const wheelQuietTimer = useRef(null);
  const WHEEL_QUIET_MS = 180; // see onWheel below
  useEffect(() => () => { if (wheelQuietTimer.current) clearTimeout(wheelQuietTimer.current); }, []);
  const atTop = () => { const el = contentRef.current; return !el || el.scrollTop <= 1; };
  const atBottom = () => { const el = contentRef.current; return !el || (el.scrollHeight - el.scrollTop - el.clientHeight) <= 1; };
  const navBlocked = () => summaryOpen || recapOpen;

  // "Scroll to see the full story, then a harder swipe turns the page" is only discoverable
  // if you already know it — the touch code that makes it work only ever sees one instant of
  // a gesture, so it has no way to hint what's coming. A separate scroll listener does: it
  // watches proximity to the bottom independent of the gesture, and grows the existing
  // "swipe up for next" affordance as you approach — like the card gently stretching toward
  // the edge. Direct style writes, not state: this fires on every scroll frame, and a
  // re-render per frame is exactly the flicker this file spent several rounds removing.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !hasNext) return;
    const ZONE = 90; // px of scroll remaining where the hint starts growing
    let raf = null;
    const apply = () => {
      raf = null;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const t = Math.max(0, Math.min(1, 1 - remaining / ZONE));
      const hint = hintRef.current;
      if (hint) {
        hint.style.transform = `scale(${(1 + t * 0.4).toFixed(3)})`;
        hint.style.opacity = (0.45 + t * 0.55).toFixed(3);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    el.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [hasNext, category, storyIndex]);

  // Every handler below is gated on committingRef, and touchstart also clears any dragging
  // state a missed end/cancel could have left behind. Two real gaps, found by walking the
  // touch lifecycle rather than re-testing the render-timing fix already in place:
  //
  // 1. Nothing stopped a new touch from taking over mid-commit. applyOffset() is an
  //    unconditional imperative write — it doesn't know or care whether a commit's 260ms
  //    CSS transition is currently playing. A fast, continuous swipe often lands the next
  //    touchstart before that transition finishes; without this guard, the very next
  //    touchmove called applyOffset(dy, false), which overwrites the in-flight transform
  //    *and* clears its transition, snapping the still-sliding card to wherever the finger
  //    is — a visible flicker, not a smooth continuation of the slide. If the finger then
  //    lifts past the threshold, that gesture goes on to call commitTo again once
  //    committingRef clears: a second, independent commit stacked right behind the first,
  //    which is the "swipes twice" from what felt like one continuous gesture.
  // 2. Nothing handled touchcancel. iOS in particular can cancel an in-progress touch when
  //    the DOM under the finger is being transformed heavily (exactly what a swipe does) —
  //    the finger never lifts, but the browser ends the touch anyway. Without a cancel
  //    handler, draggingRef stayed stuck true: the layout effect's re-zero guard
  //    (`!draggingRef.current`) would then skip every future render's reset, however
  //    unrelated to swiping, until some other interaction happened to clear it — a stale
  //    offset surfacing as a flicker on whatever render finally exposed it.
  const onTouchStart = (e) => {
    if (navBlocked()) return;
    if (committingRef.current) { touchY.current = null; return; } // let the commit finish undisturbed
    if (draggingRef.current) { draggingRef.current = false; applyOffset(0, false); } // stuck from a missed end/cancel
    touchY.current = e.touches[0].clientY;
    touchEdge.current = { top: atTop(), bottom: atBottom() };
  };
  const onTouchMove = (e) => {
    if (navBlocked() || touchY.current == null || committingRef.current) return;
    const dy = e.touches[0].clientY - touchY.current;
    const draggingUp = dy < 0 && touchEdge.current.bottom && hasNext;
    const draggingDown = dy > 0 && touchEdge.current.top && hasPrev;
    if (draggingUp || draggingDown) {
      if (e.cancelable) e.preventDefault();
      draggingRef.current = true;
      applyOffset(dy, false);
    } else if (draggingRef.current) {
      draggingRef.current = false;
      applyOffset(0, false);
    }
  };
  const onTouchEnd = (e) => {
    if (navBlocked() || touchY.current == null || committingRef.current) return;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchY.current = null;
    draggingRef.current = false;
    const threshold = 70;
    if (dy < -threshold && touchEdge.current.bottom && hasNext) commitTo('next');
    else if (dy > threshold && touchEdge.current.top && hasPrev) commitTo('prev');
    else applyOffset(0, true); // snap back under the same animation as a commit
  };
  const onTouchCancel = () => {
    touchY.current = null;
    if (draggingRef.current) {
      draggingRef.current = false;
      applyOffset(0, true);
    }
  };
  const onWheel = (e) => {
    if (navBlocked() || Math.abs(e.deltaY) < 14) return;

    // A single physical trackpad fling doesn't fire one wheel event — it fires dozens,
    // decaying over 600-900ms of inertial momentum. wheelLock used to release on a fixed
    // 260ms timer (the slide animation's own duration), unrelated to whether that momentum
    // was still flowing. The next still-large tick after 260ms then read as a brand new
    // gesture and fired its own commit — one continuous swipe cascading through several
    // stories, sometimes into the next category, before it finally "settled". Every
    // qualifying tick now pushes this deadline forward, locked or not, so the lock only
    // clears once the wheel has actually gone quiet — swallowing the whole momentum tail
    // into the single commit the gesture started, rather than releasing mid-flow.
    if (wheelQuietTimer.current) clearTimeout(wheelQuietTimer.current);
    wheelQuietTimer.current = setTimeout(() => { wheelLock.current = false; }, WHEEL_QUIET_MS);

    if (wheelLock.current) return;
    if (e.deltaY > 0 && !atBottom()) return; // let the content scroll down first
    if (e.deltaY < 0 && !atTop()) return;    // let the content scroll up first
    if (e.deltaY > 0 && !hasNext) return;
    if (e.deltaY < 0 && !hasPrev) return;
    wheelLock.current = true;
    commitTo(e.deltaY > 0 ? 'next' : 'prev');
  };

  // Bookmark identity
  const savedKey = headlineKey(story?.headline || '');
  const isSaved = (savedKey && savedStories.some(s => headlineKey(s.headline || '') === savedKey))
    || savedStories.some(s => s.category === category && s.storyIndex === storyIndex);

  if (!story) return null;

  // Takeaway bullets for the story body come from storyBody(), which derives them per entry.
  const summaryBullets  = story.allBullets?.length ? story.allBullets : (story.tightBullets || []);
  // For the Go deeper sheet: only worth repeating the takeaways when they're distinct from
  // the full picture below — i.e. punchy bullets exist, or the full picture is prose.
  const sheetTakeaways = story.tightBullets?.length
    ? story.tightBullets
    : (story.summary ? (story.allBullets || []).slice(0, 3) : []);
  const outlets = (story.storySources || []).filter(s => s.outlet);

  const iconBtn = { width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' };

  // ── One renderer for the story body, used by both the live story and its two neighbours.
  // They MUST produce identical boxes: any difference in layout, fill or overflow shows up
  // as a pop at the instant the swipe hands over. Keeping a single source prevents drift.
  const bodyContainer = {
    position: 'absolute', inset: 0,
    overflowY: 'auto', overscrollBehavior: 'contain',
    display: 'flex', flexDirection: 'column',
  };

  const savedFor = (st) => {
    const k = headlineKey(st?.headline || '');
    return !!(k && savedStories.some(x => headlineKey(x.headline || '') === k));
  };

  const storyBody = (entry, read, below = null) => {
    const col = CATEGORY_COLORS[entry.category] || '#6366f1';
    const entrySaved = savedFor(entry.story);
    const bullets = entry.story.tightBullets?.length ? entry.story.tightBullets : (entry.story.allBullets || []).slice(0, 3);
    const outs = (entry.story.storySources || []).filter(s => s.outlet);
    return (
      <>
        {/* Uneven spacers: the card sat dead-centre in the band, which left more air above
            it than below once the actions moved inside. Weighting the lower spacer lifts it
            without top-pinning, so short stories still sit comfortably rather than clinging
            to the pills. */}
        <div style={{ flex: 2, minHeight: '0.5rem' }} />
        <div style={{ position: 'relative', zIndex: 3, padding: '0 1rem', flexShrink: 0 }}>
          {/* One panel behind the whole block — read status, headline, takeaways and
              sources — so the text sits on a single surface rather than the headline
              floating on the photo above a separate card.
              Solid, not backdrop-blurred: live blur layers over a moving photo are what
              made the settle frame stutter. */}
          <div style={{ padding: '13px 15px 11px', borderRadius: 16, background: 'rgba(8,8,16,0.78)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Category top-left, read status top-right — the same corners the Scroll-mode
              card uses, so the two line up. Interesting moves to the bottom-left corner,
              next to Summary/Listen; see below. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', minHeight: 20 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', fontWeight: 800, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <CategoryIcon category={entry.category} size={11} color={col} />
              {CATEGORY_SHORT[entry.category] || entry.category}
            </span>
            <span style={{ flex: 1 }} />
            {/* Same three states as the story card in Scroll mode: an evening-incremental
                story reads NEW until it's opened, then Read like any other. Swipe mode only
                had Read/Unread, so a story added in the evening was indistinguishable from
                one you'd simply not got to yet. */}
            {user && (
              <p style={{ margin: 0, fontSize: '0.66rem', fontWeight: 700, color: read ? '#4ade80' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {read ? '✓ Read' : entry.story.status === 'New' ? 'New' : entry.story.status === 'Updated' ? 'Updated' : 'Unread'}
              </p>
            )}
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.18rem', fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.55)' }}>{entry.story.headline}</h1>
          {bullets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '2px 0 10px' }}>
              {bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 7, boxShadow: `0 0 6px ${col}` }} />
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.80)', lineHeight: 1.5, fontWeight: 500 }}>{b}</span>
                </div>
              ))}
            </div>
          )}
          {/* One muted line instead of a row of filled chips — the full list is in the
              Go deeper sheet under "Sources", so nothing is lost here. */}
          {outs.length > 0 && (() => {
            const shown = outs.slice(0, 2);
            const rest = outs.length - shown.length;
            const src = { fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', whiteSpace: 'nowrap' };
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, overflow: 'hidden' }}>
                {shown.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ ...src, opacity: 0.5 }}>·</span>}
                    {s.url
                      ? <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title || s.outlet} onClick={e => e.stopPropagation()} style={{ ...src, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.outlet}</a>
                      : <span style={src}>{s.outlet}</span>}
                  </React.Fragment>
                ))}
                {rest > 0 && <span style={{ ...src, opacity: 0.75, flexShrink: 0 }}>· +{rest}</span>}
              </div>
            );
          })()}

          {/* Docked to the bottom of the SAME panel, not a separate chip floating below it —
              same background, no gap, so the card reads as one piece whether the actions are
              sitting at their natural position (short story) or stuck to the screen's bottom
              edge (long story, scrolled). `position: sticky` is what does the docking: it
              clamps here once the panel's own flow would otherwise carry it off-screen.
              Solid background, not backdrop-filter: a blurred layer sitting over a scrolling
              photo repaints every frame, the stutter this codebase already removed once from
              the sticky header and the summary sheet. */}
          <div style={{ position: 'sticky', bottom: 0, zIndex: 5, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: 8, marginTop: 12, padding: '9px 0 0' }}>
            {/* No background of its own. It's the last child of the SAME panel, and the
                panel's own background already spans this row's natural position whether or
                not the row is currently stuck — a second translucent layer painted on top of
                that produced a visibly harder, more opaque rectangle exactly where the two
                overlapped, which is the box that showed up behind "Summary / Listen". One
                layer, not two. */}
            {/* Interesting anchors the bottom-left corner — the same slot the Scroll-mode
                card gives it, next to the audience-count text there. */}
            <InterestingButton
              theme="dark"
              active={entrySaved}
              onClick={(e) => { e.stopPropagation(); onToggleSaved?.(entry.story, entry.category, entry.index); }}
            />
            {/* Same circle-and-caption shape as Interesting opposite, pinned right — matches
                the Scroll card exactly, so the two modes present one set of actions. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CircleAction
                Icon={FileText}
                label="Go deeper"
                theme="dark"
                onClick={(e) => { e.stopPropagation(); setRecapOpen(false); setSummaryOpen(true); }}
                aria-label="Go deeper"
              />
              <CircleAction
                Icon={Play}
                label="Listen"
                variant="filled"
                theme="dark"
                iconProps={{ fill: '#0a0a14', color: '#0a0a14', style: { marginLeft: 1 } }}
                onClick={(e) => { e.stopPropagation(); onPlayFrom(entry.index); }}
                aria-label={isNarrating ? 'Playing' : 'Listen to story'}
              />
            </div>
          </div>

          </div>
          {/* Sits directly under the card, inside the same block, so it travels with the
              story instead of anchoring to the bottom of the band.

              The slot is always rendered, at a constant height, and whatever goes in it is
              absolutely positioned so its own height never feeds back into the layout. Only
              the live layer gets content here — neighbours pass null — so when this was a
              plain {below} the incoming card was laid out ~38px shorter than the same card
              one frame later, once it became live and the hint appeared. The card block sits
              between flex:2 and flex:3 spacers, so that extra height pushed it up by two
              fifths of it the instant a swipe landed: the twitch. Reserving the space in
              every layer means the geometry is identical before and after the handover.
              This also stops the card jumping when the hint swaps for the batch gate, or
              hides itself while the summary sheet is open. */}
          <div style={{ height: 52, position: 'relative', flexShrink: 0 }}>
            {below && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                {below}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 3, minHeight: '0.5rem' }} />
      </>
    );
  };

  const renderNeighbourText = (entry, slot) => {
    if (!entry) return null;
    return (
      <div aria-hidden ref={registerLayer(`text${slot}`, slot)}
        style={{ ...bodyContainer, pointerEvents: 'none', willChange: 'transform', backfaceVisibility: 'hidden' }}>
        {storyBody(entry, readOf(entry.category, entry.index))}
      </div>
    );
  };

  // The gate / hint, rendered under the card rather than under the band.
  //
  // It used to sit in a fixed 52px slot below the story band. That kept the band from
  // resizing — which was the flicker fix — but it also parked the button at the bottom of
  // the screen, a long way from the card it acts on. Inside the card's own column it stays
  // next to the story, and the band still can't resize because the layer it lives in is
  // absolutely positioned and scrolls internally.
  const gateOrHint = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, paddingTop: 12 }}>
    {(atBatchEnd || showCollapse) && !summaryOpen ? (
      <>
        {/* Quieter than before: no border, no fill, smaller text. It was styled like a
            primary action — heavier than the Summary/Listen buttons that actually matter
            more on this screen. */}
        <button
          onClick={() => {
            if (atBatchEnd) {
              // Reveal the rest, then swipe into the first of them so the new stories
              // arrive the same way every other story does. Flagged rather than done
              // inline: the neighbour still points at the next *category* until the
              // reveal re-renders, so animating now would slide in the wrong story.
              setRevealed(stories.length);
              pendingSwipeRef.current = 'next';
            } else {
              // Collapse back to the batch, stepping off any story that's about to be
              // hidden so we're never stranded past the end of the rail.
              //
              // One step back is a real swipe down, so animate it — the card below is
              // already rendered and it's the one you land on. From deeper in the list
              // it's a jump, not a swipe: animating would slide the wrong card in for
              // 260ms before cutting to a different one, so that case stays instant.
              setRevealed(SWIPE_BATCH);
              if (storyIndex === SWIPE_BATCH) pendingSwipeRef.current = 'prev';
              else if (storyIndex > SWIPE_BATCH) requestAnimationFrame(() => navTo(category, SWIPE_BATCH - 1));
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 4px', borderRadius: 999, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.58rem', fontWeight: 600, cursor: 'pointer' }}>
          {/* Down reveals more (there's further to go); up collapses back (folding up what
              was revealed) — these were swapped, pointing the opposite way from what each
              button actually does. */}
          {atBatchEnd ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
          {atBatchEnd
            ? `View ${remaining} more ${remaining === 1 ? 'story' : 'stories'}`
            : 'View less stories'}
        </button>
        {/* Swiping still works here — say where it goes, or it looks like a dead end. */}
        {atBatchEnd && nextCat && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.45)', fontSize: '0.56rem', fontWeight: 600 }}>
            <ChevronUp size={9} /> swipe up for {CATEGORY_SHORT[nextCat] || nextCat}
          </span>
        )}
      </>
    ) : hasNext && !summaryOpen ? (
      // The hint names a gesture, so it should also *be* one: tapping runs the same
      // commit the swipe does, animation included. It read as a caption before, which
      // left the only way forward as a gesture you had to already know.
      <button
        ref={hintRef}
        onClick={() => commitTo('next')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '6px 12px', borderRadius: 999,
          border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '0.58rem', cursor: 'pointer',
          transformOrigin: 'center', transition: 'transform 0.08s ease-out' }}>
        <ChevronUp size={10} /> swipe up for next
      </button>
    ) : null}
    </div>
  );

  return (
    <div
      ref={rootRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onWheel={onWheel}
      style={{ position: 'relative', flex: 1, minHeight: 0, background: '#0a0a14', overflow: 'hidden', display: 'flex', flexDirection: 'column', overscrollBehavior: 'none', touchAction: 'pan-y' }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        .rdr-cat-strip::-webkit-scrollbar { display: none; }
        .rdr-sources::-webkit-scrollbar { display: none; }
        /* Swipe mode owns the vertical gesture — stop the page itself rubber-banding under it. */
        html, body { overscroll-behavior: none; overflow: hidden; }
      `}</style>

      {/* ── Full-bleed photo + scrim, three deep: prev sits a screen above, next a screen below,
             so the incoming story is already rendered and slides in under the finger. ── */}
      <div ref={stageRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {[[-1, prevEntry], [0, { category, story }], [1, nextEntry]].map(([slot, entry]) => {
          if (!entry) return null;
          const img = CATEGORY_IMAGES[entry.category];
          const col = CATEGORY_COLORS[entry.category] || '#6366f1';
          return (
            <div key={slot} ref={registerLayer(`photo${slot}`, slot)}
              style={{ position: 'absolute', inset: 0, willChange: 'transform', backfaceVisibility: 'hidden' }}>
              {img
                ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${col} 0%, ${col}66 100%)` }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.28) 56%, rgba(10,10,20,0.88) 90%, rgba(10,10,20,0.98) 100%), rgba(0,0,0,0.5)' }} />
            </div>
          );
        })}
      </div>

      {/* ── Chrome scrims: sit above the moving strip but below the controls, so a story
             sliding past fades out behind the header and the buttons instead of colliding. ── */}
      {asPage && (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200, zIndex: 5, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.75) 55%, rgba(10,10,20,0) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, zIndex: 5, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.8) 45%, rgba(10,10,20,0) 100%)' }} />
        </>
      )}

      {/* ── Top: identity row (asPage), or close/breadcrumb/Interesting (sheet) ── */}
      {asPage ? (
        <>
          {/* Same wordmark as Scroll mode's header — see FeedHeader. */}
          <div style={{ position: 'relative', zIndex: 6, padding: '9px 16px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              <span style={{ color: 'rgba(255,255,255,0.58)' }}>Radio</span>
              <span style={{ color: 'rgba(255,255,255,0.32)' }}>News</span>
            </span>
          </div>

          {/* Scope row: corpus left, day right — the same statement as Scroll mode's.
              Tight to the topics below it: with the rule moved under the pills, these two
              rows are the same header block, so the air between them is grouping, not
              separation. It used to be padded away from a rule that sat directly beneath it.
              zIndex 8, above every other zIndex-6 row here: the day picker is an absolutely
              positioned child of this row, so its z-index only wins within this row's own
              stacking context — against the category strip and recap/lens rows below it,
              which tie on 6 and win on DOM order, it painted underneath and got clipped. */}
          <div style={{ position: 'relative', zIndex: 8, display: 'flex', alignItems: 'center', padding: '11px 16px 6px', gap: 10 }}>
            <CorpusToggle
              value={activeTabPath === '/my-feed' ? 'mine' : 'all'}
              onChange={(c) => onSwitchStoriesTab?.(c === 'mine' ? '/my-feed' : '/')}
              theme="dark"
            />
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative' }} ref={dayPickerRef}>
              <button onClick={() => canPickDay && setDayPickerOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 0, background: 'transparent', border: 'none', cursor: canPickDay ? 'pointer' : 'default' }}>
                <Calendar size={12} color="rgba(255,255,255,0.6)" />
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{formatHeaderDate(effectiveDay)}</span>
                {canPickDay && <ChevronDown size={12} color="rgba(255,255,255,0.6)" />}
              </button>
              {dayPickerOpen && canPickDay && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20, width: 160, background: '#fff', borderRadius: 14, boxShadow: '0 12px 36px rgba(0,0,0,0.35)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {availableDays.map(day => {
                    const isActive = day.fullDate === selectedDay;
                    return (
                      <button
                        key={day.fullDate}
                        onClick={() => { onSelectDay?.(day.fullDate); setDayPickerOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '7px 10px', borderRadius: 9, border: 'none',
                          background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                          color: isActive ? '#7c3aed' : '#374151',
                          fontSize: '0.78rem', fontWeight: isActive ? 800 : 500,
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                        }}
                      >
                        {formatHeaderDate(day.fullDate)}
                        {isActive && <span style={{ fontSize: '0.6rem', color: '#7c3aed' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ position: 'relative', zIndex: 6, display: 'flex', alignItems: 'center', padding: '0.7rem 1rem 0.4rem', gap: 8 }}>
          <button onClick={onClose || goBack} style={iconBtn} aria-label="Close"><ChevronDown size={20} /></button>
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{feedName || 'Reading'}</p>
            <p style={{ margin: '1px 0 0', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{CATEGORY_SHORT[category] || category} · {storyIndex + 1} of {stories.length}</p>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => onToggleSaved?.(story, category, storyIndex)}
            style={{ ...iconBtn, background: isSaved ? `${color}` : 'rgba(0,0,0,0.35)' }}
            aria-label={isSaved ? 'Remove from Interesting' : 'Mark as Interesting'}
          >
            <Sparkles size={17} fill={isSaved ? '#fff' : 'none'} color="#fff" />
          </button>
        </div>
      )}

      {/* ── Category pills — quick jump across topics ── */}
      {contextCategories.length > 1 && (
        /* Rule sits under the pills rather than over them, so the wordmark, the scope row
           and the topics read as one header block and the rule separates that block from
           the story below it — rather than splitting the header's own two halves. */
        <div style={{ position: 'relative', zIndex: 6, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        {/* Same control, same place as Scroll mode's — outside the scroller, so it holds
            still while the pills move past it. */}
        {onEditCategories && (
          <button
            // Same as Scroll: guests meet the My News page, which makes the case before
            // asking for an account.
            onClick={() => (user ? onEditCategories() : navigate('/my-feed'))}
            aria-label="Choose your topics"
            title="Choose your topics"
            style={{ flexShrink: 0, width: 26, height: 26, marginLeft: 16, borderRadius: 8, border: 'none',
              // The pill strip's padding is 8px top / 9px bottom — near enough symmetric that
              // its pills sit on the row's true centre, so the icon centres with them and
              // needs no nudge. (It carried a 3px offset while that padding was 15/9.)
              background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={14} />
          </button>
        )}
        <div ref={catStripRef} className="rdr-cat-strip" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, padding: '8px 16px 9px', minWidth: 'max-content' }}>
            {/* "All" — the ranking itself, in rank order across every category. */}
            {showAllPill && (
              <>
                <button onClick={() => { setScope('all'); const p = playlist?.[0]; if (p) navTo(p.category, p.storyIndex); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, border: 'none',
                    background: allScope ? 'rgba(255,255,255,0.20)' : 'transparent',
                    color: allScope ? '#fff' : 'rgba(255,255,255,0.55)',
                    fontSize: '0.76rem', fontWeight: allScope ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0,
                    cursor: allScope ? 'default' : 'pointer' }}>
                  All
                </button>
                {/* All isn't a peer of the categories — it's the whole ranking rather than a
                    slice of it, and picking it changes what a swipe past the last story
                    does. The rule reads as a divider between two kinds of choice. */}
                <span aria-hidden style={{ width: 1, alignSelf: 'stretch', margin: '3px 3px', background: 'rgba(255,255,255,0.20)', flexShrink: 0 }} />
              </>
            )}
            {contextCategories.map(cat => {
              // In All scope no category is selected — you're reading the ranking, and the
              // category you happen to be on is incidental to it.
              const act = !allScope && cat === category;
              // Same rule as Scroll mode: the selected pill takes the category's colour.
              // Over a photo the raw hue can sit too dark, so it's mixed toward white —
              // the hue still reads as the category's, at a weight that survives the scrim.
              const c = act ? tintForDark(CATEGORY_COLORS[cat]) : 'rgba(255,255,255,0.55)';
              return (
                // Only the active chip keeps a fill — the rest recede to plain text so the
                // strip stops reading as twelve competing buttons over the photo.
                <button key={cat} ref={act ? activeCatRef : null}
                  onClick={() => { if (act) return; setScope('category'); navTo(cat, 0); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, border: 'none',
                    background: act ? 'rgba(255,255,255,0.20)' : 'transparent',
                    color: c,
                    fontSize: '0.76rem', fontWeight: act ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: act ? 'default' : 'pointer' }}>
                  <CategoryIcon category={cat} size={13} color={c} />
                  {CATEGORY_SHORT[cat] || cat}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* Full-width recap, lens on its own line beneath — the arrangement that read best.
          The saving comes from the recap itself: one line instead of two stacked, which is
          ~24px handed back to the story card without moving anything else.
          Not in Popular/Interesting — those are cross-category rankings shown with the "All"
          pill and the category strip instead, and a one-category recap doesn't fit reading
          a ranked list that spans every category. The strip above already covers "jump to a
          category"; the recap here would just be a second, narrower way to do the same thing
          for whichever one category you happened to land on. */}
      {asPage && onOpenCategoryRecap && !showAllPill && (
        /* Sits clear of the rule above it: the recap belongs to the story area, not to the
           header block the rule closes, so it needs visible air rather than hugging it. */
        <div style={{ position: 'relative', zIndex: 6, padding: '24px 16px 0' }}>
          <RecapBar
            category={category}
            storyCount={stories.length}
            theme="dark"
            compact
            onOpen={() => onOpenCategoryRecap(category)}
            onPlay={onPlayRecap}
          />
        </div>
      )}

      {/* Sits low and tight to the card: it sorts the stories, so proximity should say which
          thing it belongs to. Parked midway it read as more header chrome. Pushed down with
          its own top padding rather than by moving the card — the card's vertical position
          is set by the spacers inside it and stays put regardless of lens. */}
      {asPage && (
        <div style={{ position: 'relative', zIndex: 6, padding: '32px 16px 0' }}>
          <LensToggle value={lens} onChange={onChangeLens} theme="dark" />
        </div>
      )}

      {/* ── Summarize category — sheet mode only; page mode has its own Digest toggle ── */}
      {!asPage && categoryBriefing && categoryBriefing.trim() && (
        <div style={{ position: 'relative', zIndex: 6, padding: '4px 1rem 0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => { setSummaryOpen(false); setRecapOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 4px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>
            <Newspaper size={12} /> Summarize category
          </button>
        </div>
      )}

      {/* ── Middle band: the current story scrolls internally; its two neighbours ride the same
             strip a screen above and below, so text and photo arrive together. ── */}
      <div style={{ position: 'relative', zIndex: 3, flex: 1, minHeight: 0 }}>
      {renderNeighbourText(prevEntry, -1)}
      {renderNeighbourText(nextEntry, 1)}
      <div
        ref={(el) => { contentRef.current = el; registerLayer('text0', 0)(el); }}
        style={{ ...bodyContainer, willChange: 'transform', backfaceVisibility: 'hidden' }}
      >
        {storyBody({ category, story, index: storyIndex }, readOf(category, storyIndex), gateOrHint)}
      </div>
      </div>

      {/* ── Dark bottom nav — Instagram-Reels-style, stays put in Stories mode ── */}
      {asPage && (
        <BottomNav theme="dark" fixed={false} mode="swipe"
          onChangeMode={(m) => {
            if (m === 'scroll') (onClose ? onClose() : goBack());
            // Listen is a tab now, not a sheet over this one: hand off to the Listen page,
            // which picks up the same story from the shared cursor. Falls back to the old
            // play-in-place behaviour if the page isn't wired up.
            else if (m === 'audio') (onEnterAudio ? onEnterAudio() : onPlayFrom(storyIndex));
          }}
          challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
      )}

      {/* ── Progress — vertical rail on the right edge, so position maps to the swipe ── */}
      {/* The rail measures whatever list you're actually in — the ranking in All scope,
          the category's own stories otherwise. */}
      <ProgressRail
        filled={allScope ? playlistPos + 1 : storyIndex + 1}
        total={allScope ? playlist.length : swipeLimit}
        theme="dark"
        position="absolute"
        onSelect={(i) => {
          if (!allScope) { navTo(category, i); return; }
          const p = playlist[i];
          if (p) navTo(p.category, p.storyIndex);
        }}
      />

      {/* ── Summary bottom sheet — shared with Scroll mode (see StorySummarySheet) ── */}
      <StorySummarySheet
        open={summaryOpen}
        story={story}
        category={category}
        onClose={() => setSummaryOpen(false)}
        onPlay={() => onPlayFrom(storyIndex)}
        isInteresting={isSaved}
        onToggleInteresting={() => onToggleSaved?.(story, category, storyIndex)}
      />

      {/* ── Category recap bottom sheet ── */}
      <div onClick={() => setRecapOpen(false)}
        style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(0,0,0,0.5)', opacity: recapOpen ? 1 : 0, pointerEvents: recapOpen ? 'auto' : 'none', transition: 'opacity 0.3s' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 9, height: '92%', background: light.bg, borderRadius: '20px 20px 0 0', transform: recapOpen ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${light.border}`, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: `${color}14`, color, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <Newspaper size={12} /> Category recap
            </span>
            <button onClick={() => setRecapOpen(false)} style={{ width: 30, height: 30, borderRadius: '50%', background: light.bgSub, border: 'none', color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-label="Close recap"><X size={16} /></button>
          </div>
          <h2 style={{ margin: '10px 0 0', fontSize: '1.35rem', fontWeight: 900, color: light.text, letterSpacing: '-0.025em' }}>{CATEGORY_SHORT[category] || category}</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.1rem 1.25rem 6rem' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.72rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>A 60-second recap of the top stories</p>
          {(categoryBriefing || '').split(/\n\s*\n|\n/).map(s => s.trim()).filter(Boolean).map((para, i) => (
            <p key={i} style={{ margin: '0 0 1rem', fontSize: '0.95rem', lineHeight: 1.8, color: '#3a3a4a' }}>{para}</p>
          ))}
        </div>
        {onPlayRecap && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0.75rem 1.25rem', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 0.9rem)', background: light.bg, borderTop: `1px solid ${light.border}` }}>
            <button onClick={() => { setRecapOpen(false); onPlayRecap(); }}
              style={{ width: '100%', height: 46, borderRadius: 999, border: 'none', background: 'linear-gradient(135deg,#6366f1,#ec4899)', color: '#fff', fontSize: '0.92rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Play size={16} fill="#fff" color="#fff" /> Listen to the recap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
