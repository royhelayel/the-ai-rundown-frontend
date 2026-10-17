import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Star, ChevronDown, Newspaper, X } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT, CATEGORY_IMAGES, UI_TRIAL } from '../theme';
import { headlineKey } from './PopularTab';
import BottomNav from './BottomNav';
import StorySummarySheet from './StorySummarySheet';
import ProgressRail from './ProgressRail';
import AppHeader, { formatHeaderDate } from './AppHeader';
import { StoryTopRow, SourcesRow, StarButton, NextLink } from './StoryBits';
import { TopicRecapPanel } from './TopicRecap';
import { storyParagraph } from '../lib/stories';
import NewsLoader from './NewsLoader';
import { topicVars } from '../design';
import { centrePill } from '../utils';

// Lift a category colour toward white so it stays legible on the dark photo behind the
// Swipe-mode pills, without losing which category it is.
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
//   Summary: a bottom sheet with the full details (takeaways and sources).
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
  periodRecaps,
  periodMinutes = () => 1,
  onOpenPeriodRecap,
  onPlayPeriodRecap,
  // The tabs
  recapView = false,
  onChangeRecapView,
  recapPeriod = 'Daily',
  onChangeRecapPeriod,
  periodReady,
  recapText,
  recapSources,
  // (category) → { text, sources } for a neighbouring topic's recap, or undefined when it
  // isn't loaded here, so the recap pages can carry a swipe on into the next topic.
  recapFor,
  loading = false,   // the day's news is on its way: the loader takes the card's place
  isTodaySelected = true,
  onOpenRecapStory,
}) {
  const navigate = useNavigate();
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
  const color = CATEGORY_COLORS[category] || '#6366f1';

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

  // Each topic's recap is one panel, and the swipe runs on into the neighbouring topics'
  // recaps as stories do. Coming back into a topic from the one after lands at its end.
  const [recapLandLast, setRecapLandLast] = useState(null);
  const recapTopic = (c) => {
    if (!c || lenOf(c) === 0) return null;
    const r = recapFor?.(c);
    return { category: c, text: r ? (r.text || null) : undefined, sourcesMap: r?.sources };
  };
  const leaveRecap = (dir) => {
    if (dir === 'next' && nextCat) { setRecapLandLast(null); navTo(nextCat, 0); }
    if (dir === 'prev' && prevCat) { setRecapLandLast(prevCat); navTo(prevCat, prevCatEntry()?.index ?? 0); }
  };
  // The topics a recap swipe passes through: one pill each on the rail.
  const recapTopics = cats.filter(c => lenOf(c) > 0);

  const navDirRef = useRef('next'); // direction of last nav → picks the slide animation
  const contentRef = useRef(null);  // scrollable headline region
  const hintRef = useRef(null);     // "swipe up for next" — strengthens as you scroll toward the edge
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
  const dragBase = useRef(null);   // y at which the card began following the finger
  const wheelLock = useRef(false);
  const wheelQuietTimer = useRef(null);
  const WHEEL_QUIET_MS = 180; // see onWheel below
  useEffect(() => () => { if (wheelQuietTimer.current) clearTimeout(wheelQuietTimer.current); }, []);
  // 4px, not 1. scrollHeight/scrollTop/clientHeight are fractional on a device with a
  // non-integer pixel ratio, and a long card could settle a pixel and a half short of its
  // own bottom — leaving atBottom() permanently false and the story impossible to swipe
  // past however many times you tried. Short cards were never affected: they don't scroll,
  // so the sum is zero and the edge is trivially true. That is why this only ever showed up
  // on big stories.
  const EDGE_SLOP = 4;
  const atTop = () => { const el = contentRef.current; return !el || el.scrollTop <= EDGE_SLOP; };
  const atBottom = () => { const el = contentRef.current; return !el || (el.scrollHeight - el.scrollTop - el.clientHeight) <= EDGE_SLOP; };
  const navBlocked = () => summaryOpen || recapOpen;

  // "Scroll to see the full story, then a harder swipe turns the page" is only discoverable
  // if you already know it — the touch code that makes it work only ever sees one instant of
  // a gesture, so it has no way to hint what's coming. A separate scroll listener does: it
  // watches proximity to the bottom independent of the gesture, and brings the existing
  // "swipe up for next" line from faint to full as you approach. Direct style writes, not
  // state: this fires on every scroll frame, and a re-render per frame is exactly the flicker
  // this file spent several rounds removing.
  //
  // It used to grow to 1.4× as well. A story short enough not to scroll counts as already at
  // the bottom, so on most stories the line sat permanently 1.4× the size of every other
  // "next" link (Roy, 2026-10-17). It fades now; it never changes size.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !hasNext) return;
    const ZONE = 90; // px of scroll remaining where the hint starts to strengthen
    let raf = null;
    const apply = () => {
      raf = null;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const t = Math.max(0, Math.min(1, 1 - remaining / ZONE));
      const hint = hintRef.current;
      if (hint) {
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
    dragBase.current = null;
  };
  // The edges are read live, every move — not once at touchstart.
  //
  // Captured at touchstart only, a card taller than the screen took two separate gestures:
  // one to scroll to the bottom, then finger off, then another to swipe. Within a single
  // motion the edge flags were still whatever they had been at the top of the story, so
  // continuing to pull did nothing and the card felt stuck. Now reaching the bottom mid-pull
  // hands the same motion over to the drag.
  //
  // dragBase is where that handover happened, and the offset is measured from there rather
  // than from the start of the gesture — otherwise the card would jump by however far you
  // had already scrolled, and the 70px commit threshold would already be spent.
  const onTouchMove = (e) => {
    if (navBlocked() || touchY.current == null || committingRef.current) return;
    const y = e.touches[0].clientY;
    const travel = y - touchY.current;
    const draggingUp = travel < 0 && atBottom() && hasNext;
    const draggingDown = travel > 0 && atTop() && hasPrev;
    if (draggingUp || draggingDown) {
      if (dragBase.current == null) dragBase.current = y;
      if (e.cancelable) e.preventDefault();
      draggingRef.current = true;
      applyOffset(y - dragBase.current, false);
    } else if (draggingRef.current) {
      draggingRef.current = false;
      dragBase.current = null;
      applyOffset(0, false);
    }
  };
  const onTouchEnd = (e) => {
    if (navBlocked() || touchY.current == null || committingRef.current) return;
    const y = e.changedTouches[0].clientY;
    // Measured from the handover point when there was one, so the threshold means "pulled
    // 70px past the end of the story", not "moved 70px in total including the scrolling".
    const dy = y - (dragBase.current ?? touchY.current);
    touchY.current = null;
    dragBase.current = null;
    draggingRef.current = false;
    const threshold = 70;
    if (dy < -threshold && atBottom() && hasNext) commitTo('next');
    else if (dy > threshold && atTop() && hasPrev) commitTo('prev');
    else applyOffset(0, true); // snap back under the same animation as a commit
  };
  const onTouchCancel = () => {
    touchY.current = null;
    dragBase.current = null;
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

  const swipeBar = asPage ? (
    <BottomNav theme="dark" fixed={false} mode="swipe"
      onChangeMode={(m) => {
        if (m === 'scroll') (onClose ? onClose() : goBack());
        // Listen is a tab now, not a sheet over this one: hand off to the Listen page,
        // which picks up the same story from the shared cursor. Falls back to the old
        // play-in-place behaviour if the page isn't wired up.
        else if (m === 'audio') (onEnterAudio ? onEnterAudio() : onPlayFrom(storyIndex));
      }}
      challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
  ) : null;

  // A day with no news, or one still loading into an empty list. This used to render nothing
  // at all — header included — so on a date without news there was no way to pick another.
  if (!story) {
    if (!asPage) return null;
    return (
      <div ref={rootRef} style={{ position: 'relative', flex: 1, minHeight: 0, background: 'var(--paper)', color: 'var(--ink)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', zIndex: 8, flexShrink: 0 }}>
          <AppHeader selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay}
            categories={[]} showTabs={false} onEditCategories={onEditCategories} user={user} />
        </div>
        {loading ? <NewsLoader day={selectedDay} /> : (
          <div role="status" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 36px', textAlign: 'center', color: 'var(--sub)', fontSize: 15, lineHeight: 1.5 }}>
            {formatHeaderDate(selectedDay) === 'Today' ? 'No stories yet today.' : `No stories for ${formatHeaderDate(selectedDay)}.`} Pick another date above.
          </div>
        )}
        {swipeBar}
      </div>
    );
  }


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

  // The story as a tinted card that fills the band — Swipe is the reading mode, so the card
  // stays tall (Codex, 2026-10-15). Topic and status, headline, the takeaways, then every
  // source and the Interesting star on one row. No Go deeper and no Listen: the bottom bar is
  // how you choose to listen.
  const twoLineFoot = atBatchEnd && !!nextCat && !summaryOpen;
  const storyBody = (entry, read) => {
    const entrySaved = savedFor(entry.story);
    const paragraph = storyParagraph(entry.story);
    const outs = (entry.story.storySources || []).filter(s => s.outlet);
    return (
      <>
        <div style={{ height: 4, flexShrink: 0 }} />
        <div style={{ position: 'relative', zIndex: 3, padding: '0 20px', flex: '1 0 auto', display: 'flex' }}>
          <article className="rn-tp" style={{ ...topicVars(entry.category), flex: 1, minWidth: 0, background: 'var(--tp-card)', color: 'var(--card-ink)',
            borderRadius: 19, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StoryTopRow category={entry.category} onCard read={user ? read : undefined} isNew={entry.story.status === 'New'} />
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.045em', fontWeight: 700 }}>{entry.story.headline}</h1>
            {paragraph && (
              <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.55, color: 'var(--card-body)' }}>{paragraph}</p>
            )}
            <div style={{ marginTop: 'auto' }}>
              <SourcesRow sources={outs} onCard bleed={20} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <StarButton onCard active={entrySaved} onClick={() => onToggleSaved?.(entry.story, entry.category, entry.index)} />
              </div>
            </div>
          </article>
        </div>
        {/* Room under the card for the links below it, so they never sit on the star's label:
            one line normally, two at the end of a batch ("View 4 more…" over "Swipe up for…"). */}
        <div style={{ height: twoLineFoot ? 66 : 46, flexShrink: 0 }} />
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

  // The gate / hint, pinned to the bottom edge of the band (see the row after it).
  //
  // Third position for this thing, and the history is worth keeping because each move was
  // a fix that created the next problem. It began in a fixed 52px slot *below* the band:
  // that stopped the band resizing — the flicker fix — but parked it at the bottom of the
  // screen, far from the card it acts on. It then moved into the card's own scrolling
  // column, which put it next to the story but made it the last child of a column that
  // routinely overflows, so it was always the first thing below the fold. Pinned to the
  // band's bottom edge it is both: at the foot of the story area, where it reads as
  // belonging to the card, and outside the scroll, so nothing can push it off.
  //
  // The band still can't resize — this row is zero-height and the hint inside it is
  // absolutely positioned, so it contributes no layout at all, to the band or to the three
  // story layers.
  //
  // The scroll listener that grows it as you near the bottom (see ZONE above) keeps
  // working, and reads better here: on a story too short to scroll it settles at full size
  // immediately, and on a long one it swells as the end comes up.
  const gateOrHint = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 6 }}>
    {(atBatchEnd || showCollapse) && !summaryOpen ? (
      <>
        {/* Quieter than before: no border, no fill, smaller text. It was styled like a
            primary action — heavier than the Summary/Listen buttons that actually matter
            more on this screen. */}
        {/* Keyed apart from the hint below: unkeyed, React reuses the hint's button for this
            one and it keeps the hint's scroll-driven opacity, drawing this line faded. */}
        <NextLink key="gate" dir={atBatchEnd ? 'down' : 'up'} style={{ minHeight: atBatchEnd && nextCat ? 30 : 34 }}
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
          }}>
          {/* Down reveals more (there's further to go); up collapses back (folding up what
              was revealed). Named, not generic. In Swipe the gate sits at the end of one category's run
              with the next category's name directly under it ("swipe up for Sports"), so
              "View 8 more stories" was the one line on screen that didn't say which pile it
              meant. */}
          {atBatchEnd
            ? `View ${remaining} more ${CATEGORY_SHORT[category] || category} ${remaining === 1 ? 'story' : 'stories'}`
            : `View less ${CATEGORY_SHORT[category] || category} stories`}
        </NextLink>
        {/* Swiping still works here — say where it goes, or it looks like a dead end. */}
        {atBatchEnd && nextCat && (
          <NextLink key="next-topic" as="span" dir="up" style={{ minHeight: 24 }}>Swipe up for {CATEGORY_SHORT[nextCat] || nextCat}</NextLink>
        )}
      </>
    ) : hasNext && !summaryOpen ? (
      // The hint names a gesture, so it should also *be* one: tapping runs the same
      // commit the swipe does, animation included. It read as a caption before, which
      // left the only way forward as a gesture you had to already know.
      <NextLink key="hint" ref={hintRef} dir="up" onClick={() => commitTo('next')}
        style={{ transition: 'opacity 0.08s ease-out' }}>
        Swipe up for next story
      </NextLink>
    ) : null}
    </div>
  );

  return (
    <div
      ref={rootRef}
      onTouchStart={recapView ? undefined : onTouchStart}
      onTouchMove={recapView ? undefined : onTouchMove}
      onTouchEnd={recapView ? undefined : onTouchEnd}
      onTouchCancel={recapView ? undefined : onTouchCancel}
      onWheel={recapView ? undefined : onWheel}
      style={{ position: 'relative', flex: 1, minHeight: 0, background: 'var(--paper)', color: 'var(--ink)', overflow: 'hidden', display: 'flex', flexDirection: 'column', overscrollBehavior: 'none', touchAction: 'pan-y' }}
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
              {UI_TRIAL.photoBackdrop ? (
                <>
                  {img
                    ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${col} 0%, ${col}66 100%)` }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.28) 56%, rgba(10,10,20,0.88) 90%, rgba(10,10,20,0.98) 100%), rgba(0,0,0,0.5)' }} />
                </>
              ) : (
                /* Flat ground, with one faint wash of the category's colour so the screen
                   still says which section you're in. Each layer keeps its own, so the wash
                   still travels with the story as you swipe. */
                <div style={{ position: 'absolute', inset: 0, background: 'var(--paper)' }} />
              )}
            </div>
          );
        })}
      </div>


      {/* ── Top: identity row (asPage), or close/breadcrumb/Interesting (sheet) ── */}
      {asPage ? (
        <div style={{ position: 'relative', zIndex: 8, flexShrink: 0 }}>
          <AppHeader
            selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay}
            categories={contextCategories} activeCategory={allScope && !recapView ? null : category}
            onSelectCategory={(cat) => { if (!allScope && cat === category) return; setScope('category'); navTo(cat, 0); }}
            showAllPill={showAllPill} allActive={allScope && !recapView}
            onSelectAll={() => { if (allScope) return; setScope('all'); const p = playlist?.[0]; if (p) navTo(p.category, p.storyIndex); }}
            onEditCategories={onEditCategories} user={user}
            storyCount={allScope ? (playlist?.length || 0) : stories.length}
            recapView={recapView} onChangeRecapView={onChangeRecapView} canRecap={!!onChangeRecapView} recapCategory={category}
            lens={lens} onChangeLens={onChangeLens}
            period={recapPeriod} onChangePeriod={onChangeRecapPeriod} periodReady={periodReady}
          />
        </div>
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
            <Star size={17} fill={isSaved ? '#fff' : 'none'} color="#fff" />
          </button>
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
      {loading && asPage ? (
        <div style={{ position: 'relative', zIndex: 3, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <NewsLoader day={selectedDay} />
        </div>
      ) : recapView && asPage ? (
        <div style={{ position: 'relative', zIndex: 3, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
          <TopicRecapPanel key={`${category}|${recapPeriod}`} category={category} period={recapPeriod} text={recapText} sourcesMap={recapSources}
            nextTopic={recapTopic(nextCat)} prevTopic={recapTopic(prevCat)} onLeave={leaveRecap} startAtEnd={recapLandLast === category}
            storyCount={stories.length} isToday={isTodaySelected} dateLabel={selectedDay ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} onOpenStory={(idx) => onOpenRecapStory?.(category, idx)} />
        </div>
      ) : (<>
      <div style={{ position: 'relative', zIndex: 3, flex: 1, minHeight: 0 }}>
      {renderNeighbourText(prevEntry, -1)}
      {renderNeighbourText(nextEntry, 1)}
      <div
        ref={(el) => { contentRef.current = el; registerLayer('text0', 0)(el); }}
        style={{ ...bodyContainer, willChange: 'transform', backfaceVisibility: 'hidden' }}
      >
        {storyBody({ category, story, index: storyIndex }, readOf(category, storyIndex))}
      </div>
      </div>

      {/* ── The hint, pinned to the band's bottom edge rather than trailing the story.
             A zero-height flex row: it contributes nothing to the column, so the band keeps
             every pixel, and its absolutely-positioned child hangs upward from the band's
             bottom edge — where the hint already sat visually on a story short enough to
             fit. Now it sits there on every story.
             Outside the band on purpose. The band carries zIndex 3 and is therefore its own
             stacking context, so a child of it can't be lifted over the bottom scrim at
             zIndex 5 however high its own z-index goes — pinned in there, the hint would
             have been read through 0.9 of dark. Out here at zIndex 6 it sits on the scrim,
             which is also what gives it something to sit on when a long story scrolls
             underneath. ── */}
      {/* Both modes. In the Summary sheet the band runs to the bottom of the container, so
          this lands at the sheet's own foot — where the hint used to scroll away too. */}
      <div style={{ position: 'relative', zIndex: 6, height: 0, flexShrink: 0 }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex',
          justifyContent: 'center', paddingTop: 6, pointerEvents: 'none',
          /* Short and gentle. Page mode already has the 130px scrim under this and needs
             nothing more — over the ~0.9 that scrim reaches by here, this is invisible.
             Sheet mode has no scrim, so without it the pill would sit on bare story text. */
          background: 'linear-gradient(to top, var(--paper) 0%, var(--paper) 70%, transparent 100%)' }}>
          <div style={{ pointerEvents: 'auto' }}>{gateOrHint}</div>
        </div>
      </div>
      </>)}

      {/* ── Dark bottom nav — Instagram-Reels-style, stays put in Stories mode ── */}
      {swipeBar}

      {/* ── Progress — vertical rail on the right edge, so position maps to the swipe ── */}
      {/* The rail measures whatever list you're actually in — the ranking in All scope,
          the category's own stories otherwise. */}
      {/* In a recap, one pill per topic — the recap you're on among the ones a swipe moves
          through — so it shows on every recap, however short (Roy, 2026-10-17). */}
      {recapView && asPage && !loading && recapTopics.includes(category) && <ProgressRail
        filled={recapTopics.indexOf(category) + 1}
        total={recapTopics.length}
        theme="dark"
        position="absolute"
        onSelect={(i) => { const c = recapTopics[i]; if (c && c !== category) { setRecapLandLast(null); navTo(c, 0); } }}
        labelFor={(i) => `${CATEGORY_SHORT[recapTopics[i]] || recapTopics[i]} recap, ${i + 1} of ${recapTopics.length}`}
      />}
      {!recapView && !loading && <ProgressRail
        filled={allScope ? playlistPos + 1 : storyIndex + 1}
        total={allScope ? playlist.length : swipeLimit}
        theme="dark"
        position="absolute"
        onSelect={(i) => {
          if (!allScope) { navTo(category, i); return; }
          const p = playlist[i];
          if (p) navTo(p.category, p.storyIndex);
        }}
      />}

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
