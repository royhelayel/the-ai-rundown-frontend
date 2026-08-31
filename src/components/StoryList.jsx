import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import { SkeletonCategoryRows } from './SkeletonScreens';
import { centrePill } from '../utils';
import StoryCard from './StoryCard';
import CategoryIcon from './CategoryIcon';
import RecapBar from './RecapBar';
import { headlineKey } from './PopularTab';

// ── Category header — the recap chip, and nothing else ───────────────────────
//
// This was a photo banner with the category's name over it, and the recap chip beneath. The
// photo was doing no work the pills and the chip weren't already doing: it named a category
// you had just tapped to reach, and cost 168px of the screen before the first story. Neither
// Swipe nor Listen shows one, and the point of the chip was that the recap looks the same in
// all three modes — which it can't while one of them wraps it in a card the others don't have.
function CategoryImageHeader({ cat, onPlay, onBriefing, hasBriefing }) {
  return (
    <RecapBar
      category={cat}
      onOpen={() => (hasBriefing && onBriefing) ? onBriefing(cat) : onPlay?.(cat)}
      compact
    />
  );
}

// How many cards a category shows before "View more". One constant: the list, the rail's
// count and the collapse scroll target all have to agree on it.
const COLLAPSED_CAP = 6;

// Breathing room above the first category card, matching the gaps between the header rows.
//
// This used to be padded out to 49px so Scroll opened at exactly the same height as Swipe.
// That number was calibrated to the old chrome and is not worth chasing: Swipe centres its
// story card in whatever band is left, so its top moves with the length of the story. Any
// fixed value here is only ever right for one story. A normal gap beats a void.
const FIRST_CARD_TOP = 20;

// The sticky header's measured height, published by FeedHeader as --header-h. Read rather
// than assumed: every offset that has to clear the header used to carry its own copy of
// that number, and they went stale the moment the header changed height.
const headerH = () => {
  const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10);
  return Number.isFinite(v) ? v : 135;
};

// ── Main component ────────────────────────────────────────────────────────────
function StoryListInner({
  availableDays = [],
  selectedDay,
  onSelectDay,
  briefingData = {},
  categories = [],
  onReadStory,
  onPlayStory,
  gamifiedStats = {},
  user,
  isNarrating = false,
  currentStoryIndex = 0,
  playerVisible = false,
  challengeStats,
  loading = false,
  fromPath = '/',
  showCategoryImages = false,
  sectionTitle = '',
  onEditFeed,
  markNew = false, // show "New"/"Updated" badges on evening-incremental stories (live feeds only)
  activeCategory = null,
  onCategoryChange,
  hidePills = false, // caller (FeedHeader) already renders the pills strip
  onMarkRead, // called when the reader opens a story's takeaways or summary
  onPlayRecap, // narrate a category's recap
  savedStories, // current user's Interesting list — [{ category, storyIndex, headline, ... }]
  onToggleSaved, // (story, category, storyIndex) => void
  onShownCounts,  // reports { category: cardsCurrentlyRendered } so the rail matches the list
  focusStory,     // { category, index } — where Swipe mode left off; scroll there on arrival
  onFocusStory,   // reports the story currently under the header, for mode continuity
  onFocusRestored, // called once the handoff from Swipe mode has been consumed
}, ref) {
  const [localCatFilter, setLocalCatFilter] = useState(null);
  const catFilter = onCategoryChange ? activeCategory : localCatFilter;
  const setCatFilter = onCategoryChange || setLocalCatFilter;
  const [expandedCats, setExpandedCats] = useState(() => new Set());
  const navigate = useNavigate();

  // Read is now an act, not an observation: it's recorded when you open a story's
  // Takeaways or Summary, not when the card drifts past the middle of the screen.
  //
  // That removes a whole machine from the scroll path. Marking on sight meant a history
  // write and two network requests per card, fired from an observer that ran while the list
  // was moving — so it had to be batched, deferred behind a scroll-idle check, and kept off
  // the critical path with a scroll listener that existed for no other reason. All of that
  // is gone, along with its failure mode. Reads are now single, user-initiated, and rare.
  const markedRef = useRef(new Set()); // dedupe: opening the same story twice is one read
  // Stable identity, reading the latest prop through cbs — the card list is memoised, so a
  // handler that changed each render would be captured stale inside it.
  const markRead = React.useCallback((cat, idx, story) => {
    const key = `${cat}|${idx}`;
    if (markedRef.current.has(key)) return;
    markedRef.current.add(key);
    cbs.current.onMarkRead?.(story, cat, idx);
  }, []);
  // Tracks which story is *currently* under the header — position, not readership. It
  // drives the progress rail and keeps Swipe mode in sync, and never unobserves.
  const focusObsRef = useRef(null);
  const getFocusObserver = () => {
    if (focusObsRef.current) return focusObsRef.current;
    focusObsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const m = entry.target.__storyKey && metaRef.current.get(entry.target.__storyKey);
        if (m) onFocusStory?.(m.cat, m.idx);
      });
    }, { rootMargin: '-150px 0px -65% 0px', threshold: 0 });
    return focusObsRef.current;
  };
  useEffect(() => () => focusObsRef.current?.disconnect(), []);

  // Card metadata lives in a map keyed by card, not in a closure baked into the ref
  // callback. A fresh ref callback on every render makes React detach and re-attach every
  // card — ~60 observer unobserve/observe pairs per render — and the scroll-spy re-renders
  // this list each time you cross a category boundary. Stable identity means the cards are
  // attached once and simply stay attached, while the meta stays current.
  const metaRef  = useRef(new Map());
  const refCbRef = useRef(new Map());
  const observeCard = (cat, idx, story) => {
    const key = `${cat}|${idx}`;
    metaRef.current.set(key, { cat, idx, story });
    let cb = refCbRef.current.get(key);
    if (!cb) {
      cb = (el) => {
        if (!el) return;
        el.__storyKey = key;
        getFocusObserver().observe(el);
      };
      refCbRef.current.set(key, cb);
    }
    return cb;
  };

  // Arriving from Swipe mode: reveal and scroll to the story that was on screen there,
  // so the two modes continue from the same place. Runs once per arrival.
  const restoredRef = useRef(null);
  useEffect(() => {
    if (!focusStory?.category) return;
    const key = `${focusStory.category}|${focusStory.index}`;
    if (restoredRef.current === key) return;
    const el = document.getElementById(`sl-story-${focusStory.category}-${focusStory.index}`);
    if (!el) {
      // Card not rendered yet — expand the category and try again on the next pass.
      if (focusStory.index >= 6) setExpandedCats(prev => new Set(prev).add(focusStory.category));
      return;
    }
    restoredRef.current = key;
    // useScrollRestore re-applies the saved scroll position for this tab right after mount,
    // so run on the next frame to land last.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`sl-story-${focusStory.category}-${focusStory.index}`)?.scrollIntoView({ block: 'center' });
      // Consumed. The focus is a one-shot handoff from Swipe mode, not a standing position
      // — left set, the next tab you open would jump to a story belonging to the feed you
      // were reading before it.
      onFocusRestored?.();
    }));
  }, [focusStory, expandedCats]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror of expandedCats, so the handler can tell which way it's about to toggle without
  // doing it inside the state updater (which StrictMode double-invokes).
  const expandedRef = useRef(expandedCats);
  expandedRef.current = expandedCats;

  const toggleExpanded = React.useCallback((cat) => {
    const collapsing = expandedRef.current.has(cat);
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    if (!collapsing) return;
    // Collapsing removes everything you scrolled through, so the browser's kept scroll
    // position lands you somewhere further down the page with no memory of where you were.
    // Come back to the last card of the batch — the story the button follows.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (let i = COLLAPSED_CAP - 1; i >= 0; i--) {
        const el = document.getElementById(`sl-story-${cat}-${i}`);
        if (el) { el.scrollIntoView({ block: 'center' }); return; }
      }
    }));
  }, []);

  // Every topic with stories is always shown — the pills/Browse just jump to one.
  const visibleCats = categories.filter(c => briefingData[c]?.storyCount > 0);

  // The rail should have one pill per card actually on screen, so it grows with
  // "View all" and shrinks with "Show less".
  const shownCounts = React.useMemo(() => {
    const out = {};
    visibleCats.forEach(c => {
      const n = (briefingData[c]?.allStories || []).length;
      out[c] = expandedCats.has(c) ? n : Math.min(n, COLLAPSED_CAP);
    });
    return out;
  }, [visibleCats.join(','), expandedCats, briefingData]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onShownCounts?.(shownCounts); }, [shownCounts]); // eslint-disable-line react-hooks/exhaustive-deps


  // Latest props, read through the stable handlers below. The card list is memoised so the
  // scroll-spy can repaint the pills without reconciling 60 cards; that only works if the
  // handlers passed into those cards keep their identity across renders.
  const cbs = useRef({});
  cbs.current = { onReadStory, onPlayStory, onCategoryChange, setLocalCatFilter, fromPath, onMarkRead, onPlayRecap, onToggleSaved };

  // "Go deeper" — open the story's summary straight away, not the swipe reader.
  const handleRead = React.useCallback((cat, idx) => {
    cbs.current.onReadStory?.(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/${idx}`, { state: { from: cbs.current.fromPath, openSummary: true } });
  }, [navigate]);

  // Smooth-scroll a topic's section into view (used by the pills and Browse).
  const scrollToTopic = (cat) => {
    const el = document.getElementById(`sl-topic-${cat}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Browse a topic = jump to its section (and reveal all of its stories).
  const handleBrowse = React.useCallback((cat) => {
    const { onReadStory: read, onCategoryChange: change, setLocalCatFilter: setLocal } = cbs.current;
    read?.(cat);
    (change || setLocal)(cat);
    setExpandedCats(prev => new Set(prev).add(cat));
    setTimeout(() => scrollToTopic(cat), 30);
  }, []);

  const handleOpenBriefing = React.useCallback((cat) => {
    navigate(`/category/${encodeURIComponent(cat)}/briefing`, { state: { from: cbs.current.fromPath } });
  }, [navigate]);

  const handlePlayCat = React.useCallback((cat, idx) => cbs.current.onPlayStory?.(cat, idx), []);
  const handlePlayRecap = React.useCallback((cat) => cbs.current.onPlayRecap?.(cat), []);
  const handleToggleSaved = React.useCallback((story, cat, idx) => cbs.current.onToggleSaved?.(story, cat, idx), []);

  // Headline keys only — a Set lookup per card, not an array scan, and it keeps the card
  // list's memo deps to a primitive instead of the whole savedStories array reference.
  const savedKeySet = React.useMemo(
    () => new Set((savedStories || []).map(s => headlineKey(s.headline || ''))),
    [savedStories],
  );

  // Scroll-spy: highlight the topic whose section is currently under the sticky pills.
  // Reads the latest catFilter via a ref (not a dependency) so a pill click doesn't
  // re-subscribe this effect and race the smooth-scroll animation it just started.
  const catFilterRef = useRef(catFilter);
  useEffect(() => { catFilterRef.current = catFilter; }, [catFilter]);

  // ── Category jumps ────────────────────────────────────────────────────────────
  // The pill click and the scroll-spy both want to own "which category is active".
  // During a programmatic scroll they fight: the spy rewrites the category for every
  // section the page flies past, and each write re-renders mid-animation, which both
  // flickers the pills and stalls the scroll before it arrives.
  //
  // So a jump is an explicit mode: the spy is muted for its duration, the category is
  // set once by the click, and the spy resumes only after the scroll has settled.
  const jumpingRef = useRef(null);
  const jumpTimerRef = useRef(null);
  const endJump = () => {
    jumpingRef.current = null;
    if (jumpTimerRef.current) { clearTimeout(jumpTimerRef.current); jumpTimerRef.current = null; }
    window.removeEventListener('scrollend', endJump);
  };
  const jumpToCategory = (cat) => {
    if (!cat) return;
    jumpingRef.current = cat;
    setCatFilter(cat);                       // set once, authoritatively
    // Scroll after the commit, so we measure the layout the click just produced
    // rather than the one it replaced.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`sl-topic-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.addEventListener('scrollend', endJump);
      // scrollend isn't universal (Safari) — release on a timer as well.
      jumpTimerRef.current = setTimeout(endJump, 1200);
    }));
  };
  useImperativeHandle(ref, () => ({ jumpToCategory }));
  useEffect(() => () => endJump(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      if (jumpingRef.current) return;        // muted: a jump owns the category right now
      raf = requestAnimationFrame(() => {
        raf = null;
        const sections = Array.from(document.querySelectorAll('[id^="sl-topic-"]'));
        if (!sections.length) return;
        const threshold = headerH() + 8; // just below the sticky header + pills
        let active = null;
        for (const el of sections) {
          if (el.getBoundingClientRect().top <= threshold) active = el.id.replace('sl-topic-', '');
          else break; // sections are in document order — stop at the first one still below the line
        }
        if (!active) active = sections[0].id.replace('sl-topic-', '');
        if (active !== catFilterRef.current) setCatFilter(active);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [visibleCats.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the active pill in view within its own strip. This fires from the scroll-spy, so
  // it must not touch the document scroller — scrollIntoView would, and a programmatic
  // smooth scroll there kills the momentum scroll that triggered this in the first place.
  const pillStripRef = useRef(null);
  useEffect(() => {
    if (!catFilter) return;
    try {
      const sel = (window.CSS && CSS.escape) ? CSS.escape(catFilter) : catFilter.replace(/"/g, '\\"');
      centrePill(pillStripRef.current, pillStripRef.current?.querySelector(`[data-pill="${sel}"]`));
    } catch {}
  }, [catFilter]);

  // The card list, memoised on the things that actually change what a card looks like.
  // Crossing a category boundary while scrolling only moves the pill highlight — but with
  // the list built inline, that repaint reconciled every card on screen, which is the
  // stutter at each boundary. catFilter is deliberately absent from the dependencies: no
  // card reads it, so the pills can repaint on their own.
  const sections = React.useMemo(
    () => buildSections({
      visibleCats, briefingData, gamifiedStats, expandedCats, user, markNew, showCategoryImages,
      handleBrowse, handleOpenBriefing, handlePlayCat, handlePlayRecap, handleRead, toggleExpanded, observeCard, markRead,
      savedKeySet, handleToggleSaved,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCats.join(','), briefingData, gamifiedStats, expandedCats, user, markNew, showCategoryImages, savedKeySet],
  );

  return (
    <div>
      <style>{`.sl-cat-pills::-webkit-scrollbar { display: none; }`}</style>

      {!hidePills && (
        <>
          {/* Topics section label */}
          {sectionTitle && (
            <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '0.72rem', fontWeight: '800', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                News categories
              </h2>
              {onEditFeed && (
                <button onClick={onEditFeed}
                  style={{ display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '6px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', flexShrink: 0 }}>
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}

          {/* Category pills — sticky below header */}
          <div ref={pillStripRef} className="sl-cat-pills" style={{
            position: 'sticky', top: 54, zIndex: 40,
            display: 'flex', gap: '5px',
            padding: '8px 16px 10px', overflowX: 'auto', scrollbarWidth: 'none',
            background: '#f5f5f7',   // opaque; see FeedHeader — blur on sticky costs a repaint per frame
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}>
            {categories.filter(c => briefingData[c]?.storyCount > 0).map(cat => {
              const active = catFilter === cat;
              const color  = CATEGORY_COLORS[cat] || '#6366f1';
              return (
                <button
                  key={cat}
                  data-pill={cat}
                  onClick={() => { setCatFilter(cat); scrollToTopic(cat); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 13px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: active ? '800' : '600',
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    background: active ? `${color}12` : 'transparent',
                    border: `1px solid ${active ? `${color}55` : 'rgba(0,0,0,0.1)'}`,
                    color: active ? color : '#6b7280',
                  }}
                >
                  <CategoryIcon category={cat} size={15} color={active ? color : '#6b7280'} />
                  {CATEGORY_SHORT[cat] || cat}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Story list */}
      {loading && (
        <div style={{ padding: '0.5rem 0' }}>
          <SkeletonCategoryRows count={4} />
        </div>
      )}

      <div style={{
        display: loading ? 'none' : 'flex',
        flexDirection: 'column',
        gap: showCategoryImages ? '24px' : '8px',
        // Opens at the same height as Swipe mode. Swipe carries a Category Recap row that
        // Scroll doesn't — Scroll keeps its recap inside the category card — so without this
        // the two modes started their content ~41px apart, and switching between them jumped.
        // Matched to the measured offset rather than eyeballed; see FIRST_CARD_TOP.
        padding: showCategoryImages ? `${FIRST_CARD_TOP}px 16px 0` : '0 16px',
        paddingBottom: playerVisible ? '9rem' : '5rem',
      }}>
        {visibleCats.length === 0 && (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#8a8a9a', fontSize: '0.88rem' }}>
            No stories available for this day.
          </div>
        )}

        {sections}
      </div>
    </div>
  );
}

const StoryList = forwardRef(StoryListInner);
export default StoryList;

function buildSections({
  visibleCats, briefingData, gamifiedStats, expandedCats, user, markNew, showCategoryImages,
  handleBrowse, handleOpenBriefing, handlePlayCat, handlePlayRecap, handleRead, toggleExpanded, observeCard, markRead,
  savedKeySet, handleToggleSaved,
}) {
  return visibleCats.map(cat => {
          const catData     = briefingData[cat];
          const stories     = catData?.allStories || [];
          const color       = CATEGORY_COLORS[cat] || '#6366f1';
          const listenedSet = gamifiedStats?.todayProgress?.[cat]?.listenedIndices || new Set();
          if (stories.length === 0) return null;

          const isExpanded  = expandedCats.has(cat);
          // Cap at 6 unless this topic is expanded (via Browse or "View all").
          const shownStories = isExpanded ? stories : stories.slice(0, COLLAPSED_CAP);

          return (
            <div key={cat} id={`sl-topic-${cat}`} style={{ scrollMarginTop: 'calc(var(--header-h, 135px) + 10px)' }}>
              {showCategoryImages ? (
                /* ── Topic card ── */
                /* The recap now sits once, under the header, as it does in Swipe and Listen
                   — so a copy at the top of every section would be the same control twice on
                   one screen for whichever category you happen to be looking at. */
                null
              ) : (
                /* ── Simple text category header ── */
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 2px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color }}>
                    <CategoryIcon category={cat} size={16} color={color} />
                    <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.01em' }}>
                      {cat}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#9ca3af' }}>
                    {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>
              )}

              {/* Story cards — always shown under each topic (capped at 6, expandable) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shownStories.map((story, idx) => (
                  <div key={idx} id={`sl-story-${cat}-${idx}`} ref={observeCard(cat, idx, story)} style={{ scrollMarginTop: 'calc(var(--header-h, 135px) + 56px)' }}>
                    <StoryCard
                      story={story}
                      category={cat}
                      isRead={user ? listenedSet.has(idx) : undefined}
                      isNew={markNew && story.status === 'New'}
                      isUpdated={markNew && story.status === 'Updated'}
                      isSaved={savedKeySet.has(headlineKey(story.headline || ''))}
                      onToggleSaved={() => handleToggleSaved(story, cat, idx)}
                      onRead={() => handleRead(cat, idx)}
                      onSeen={() => markRead(cat, idx, story)}
                      onPlay={() => handlePlayCat(cat, idx)}
                    />
                  </div>
                ))}
              </div>

              {/* View all / Show less — expands inline */}
              {stories.length > COLLAPSED_CAP && (
                <button
                  onClick={() => toggleExpanded(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    width: '100%', marginTop: '6px', marginBottom: '6px',
                    padding: '10px', border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '12px', background: 'rgba(0,0,0,0.02)',
                    cursor: 'pointer', color: '#6b7280', fontSize: '0.78rem', fontWeight: '700',
                  }}
                >
                  {/* Same wording as Swipe mode's gate, so the two modes read alike */}
                  {isExpanded
                    ? 'View less stories'
                    : `View ${stories.length - shownStories.length} more ${stories.length - shownStories.length === 1 ? 'story' : 'stories'}`}
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              )}
            </div>
          );
  });
}
