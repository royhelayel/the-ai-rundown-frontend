import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToTop from './BackToTop';
import PeriodRecapChips from './PeriodRecapChips';
import LensToggle from './LensToggle';
import StoryList from './StoryList';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';
import { getRememberedCategory, rememberCategory } from '../hooks/useCategoryMemory';
import { computeGamifiedStats } from '../hooks/useListenHistory';
import { Sparkles } from 'lucide-react';
import RecapBar from './RecapBar';
import { CATEGORY_SHORT, CATEGORY_COLORS, RADIUS, SPACE, TYPE, WEIGHT } from '../theme';

export default function BriefingFeed({
  briefingData, briefingLoading,
  selectedDay, availableDays, onSelectDay,
  defaultCategories, customCategories,
  onSelectCategory, onPlayStory,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible, challengeStats, gamifiedStats,
  listenHistory = [], perfectDays = [],
  selectedTime, availableTimes, onSelectTime,
  onPlayBriefing, onPlayCategory, onMarkRead, focusStory, onFocusStory, onFocusRestored,
  isPaused, newsLanguage, todayProgress, onShowSettings,
  onEnterStories, onEnterSummaries, onEnterAudio,
  savedStories, onToggleSaved,
  periodRecaps, periodMinutes = () => 1, onOpenPeriodRecap, onPlayPeriodRecap,
  onActiveCategoryChange,
}) {
  const navigate = useNavigate();
  useScrollRestore('/');
  // Placeholder until the lens re-sorts in place: Popular and Interesting open the existing
  // ranked feeds, so nothing becomes unreachable when they leave the bottom bar.
  const [lens, setLens] = useState('latest');
  const allCats = [...(defaultCategories || []), ...(customCategories || [])];
  const visibleCats = allCats.filter(c => briefingData[c]?.storyCount > 0);
  // Remembers the last category selected on THIS tab, across revisits within the
  // session — defaults to the first category the first time you ever land here.
  const [activeCat, setActiveCatRaw] = useState(() => getRememberedCategory('/'));
  const setActiveCat = (cat) => { setActiveCatRaw(cat); rememberCategory('/', cat); };
  // Stories scrolled past this session, per category — drives the progress rail so it
  // fills for guests too (read history is only recorded for signed-in users).
  // Which story sits under the header right now. The rail marks where you *are* in the
  // list, so it has to move both ways; it used to be fed a cumulative "stories ever seen"
  // count, which by definition only ever grew, leaving it pinned at the furthest point
  // reached when you scrolled back up.
  const [railPos, setRailPos] = useState({ cat: null, idx: -1 });
  const [shownCounts, setShownCounts] = useState({}); // cards rendered per category — the rail matches the list
  const effectiveCat = activeCat || visibleCats[0] || null;
  const subtitle = effectiveCat ? `${CATEGORY_SHORT[effectiveCat] || effectiveCat} · ${briefingData[effectiveCat]?.storyCount || 0} stories` : undefined;
  // The list owns the jump: it sets the category and mutes its own scroll-spy for the
  // duration, so the two can't fight over which category is active mid-scroll.
  const listRef = useRef(null);
  // A tap outranks the restore. The restore below waits for the section elements to exist
  // and only then schedules its jump — which on a slow load can be seconds after the reader
  // has started tapping, so their choice would be set and then overwritten by wherever they
  // were last time. Choosing a category ends the restore for this mount, and cancels it if
  // it is already in flight.
  const restoreTimerRef = useRef(null);
  const userPickedRef = useRef(false);
  const jumpTo = (cat) => listRef.current?.jumpToCategory(cat);
  const scrollToCat = (cat) => {
    userPickedRef.current = true;
    if (restoreTimerRef.current) { clearTimeout(restoreTimerRef.current); restoreTimerRef.current = null; }
    jumpTo(cat);
  };
  useEffect(() => () => { if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current); }, []);

  // The docked recap's week and month are fetched app-side, keyed on whichever topic is on
  // screen. Cleared on unmount: leaving the feed hands that key back to selectedCategory,
  // which is what Listen and Swipe show.
  useEffect(() => {
    if (effectiveCat) onActiveCategoryChange?.(effectiveCat);
  }, [effectiveCat, onActiveCategoryChange]);
  useEffect(() => () => onActiveCategoryChange?.(null), [onActiveCategoryChange]);

  // The remembered category only wins the *first* render — StoryList's own scroll-spy runs
  // its initial check before this component's effects settle (child effects fire before
  // parent effects), so it reports "top of page" and immediately overwrites the remembered
  // value with the first category, before the state above ever gets a chance to stick.
  // jumpToCategory is the fix: the same call a pill click already uses. It sets the pill
  // once, mutes the spy for a real scroll, and lands on the section — so the remembered
  // category wins instead of losing the race, and the strip auto-scrolls to it for free.
  const restoredCatRef = useRef(false);
  useEffect(() => {
    if (restoredCatRef.current || userPickedRef.current) return;
    const remembered = getRememberedCategory('/');
    if (focusStory?.category) return; // focusStory is more specific
    if (!remembered || remembered === visibleCats[0] || !visibleCats.includes(remembered)) return;
    if (!document.getElementById(`sl-topic-${remembered}`)) return; // data not rendered yet — retry
    restoredCatRef.current = true;
    // useScrollRestore (above) also moves the page on this same mount — an instant scroll,
    // which resolves and fires its own 'scrollend' in the same tick. jumpToCategory attaches
    // its *own* 'scrollend' listener to know when its smooth scroll has settled; if that
    // listener is already attached when the instant scroll's 'scrollend' arrives, it reads
    // as "my scroll is done" after a few pixels of an animation that's really still mid-flight,
    // unmutes the spy early, and the spy latches onto whatever's onscreen at that instant —
    // which is why the page visibly landed on Business while the pill stayed on World. A
    // short delay lets the instant scroll's own 'scrollend' fire and clear out first, so by
    // the time jumpToCategory attaches its listener, the only 'scrollend' left to catch is
    // its own.
    restoreTimerRef.current = setTimeout(() => {
      restoreTimerRef.current = null;
      if (userPickedRef.current) return;   // they chose during the delay — leave it alone
      jumpTo(remembered);
    }, 60);
  }); // deliberately no deps — cheap no-op once restoredCatRef is set, keeps retrying until the DOM exists

  // gamifiedStats (app-wide) is scoped to the user's My Feed categories, not the full
  // All News list — recompute the same pure function scoped to allCats so read badges
  // and the header progress bar are accurate here too.
  const allNewsStats = useMemo(
    () => computeGamifiedStats(listenHistory, perfectDays, briefingData, allCats, selectedTime || null, selectedDay || null),
    [listenHistory, perfectDays, briefingData, allCats.join(','), selectedTime, selectedDay] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      <FeedHeader
        feedName="All News"
        user={user}
        onShowAuth={onShowAuth}
        selectedDay={selectedDay}
        availableDays={availableDays}
        onSelectDay={onSelectDay}
        challengeStats={challengeStats}
        viewMode="feed"
        onChangeViewMode={(m) => { if (m === 'stories') onEnterStories?.(); else if (m === 'summaries') onEnterSummaries?.(); }}
        onEnterStories={onEnterStories} onEnterSummaries={onEnterSummaries} onEnterAudio={onEnterAudio}
        categories={visibleCats}
        activeCategory={effectiveCat}
        onSelectCategory={scrollToCat}
        subtitle={subtitle}
        onEditCategories={() => navigate('/settings', { state: { scrollTo: 'myfeed', from: window.location.pathname } })}
        corpus="all"
        onChangeCorpus={(c) => { if (c === 'mine') navigate('/my-feed'); }}
        lens={lens}
        onChangeLens={(l) => { if (l === 'popular') navigate('/popular'); else if (l === 'interesting') navigate('/important'); else setLens('latest'); }}
        progressListened={railPos.cat === effectiveCat ? railPos.idx + 1 : 0}
        progressTotal={shownCounts[effectiveCat] ?? (allNewsStats.todayProgress?.[effectiveCat]?.total || 0)}
      />

      {/* ── One recap row, docked under the header — Listen and Swipe's row, part for part.
             It used to be split in two and in the wrong places: the week and month floated
             up here with no box while every one of the twelve sections carried its own
             "{Topic} recap" card, so the same control appeared thirteen times in three
             different shapes, and only the pair up top was ever visible once you started
             scrolling.
             Docked, it is one row that follows you: the scroll-spy already knows which
             section is under the header (it drives the topic tabs), so the name, the tint and
             the topic whose week and month are fetched all move with it. `--header-h` is
             measured by FeedHeader's ResizeObserver, so this sits exactly under the header at
             whatever height it happens to be.
             The lens sits below and does *not* dock — it sorts the list you are looking at,
             and the recap is the thing worth keeping in reach. ── */}
      <div style={{ position: 'sticky', top: 'var(--header-h, 0px)', zIndex: 40, background: '#f5f5f7' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          {effectiveCat && (() => {
            // The category's own colour, undimmed: Scroll's ground is near-white, which is
            // what CATEGORY_COLORS were picked against. Listen and Swipe lift theirs because
            // their ground is near-black.
            const tint = CATEGORY_COLORS[effectiveCat] || '#6366f1';
            return (
              <div style={{ margin: `${SPACE.md}px ${SPACE.md}px 0`, padding: '10px 12px 11px',
                borderRadius: RADIUS.md, background: 'rgba(10,10,20,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden style={{ display: 'flex', flexShrink: 0, color: tint }}>
                    <Sparkles size={13} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontSize: TYPE.meta, fontWeight: WEIGHT.ui, color: '#8b8b98' }}>
                    {CATEGORY_SHORT[effectiveCat] || effectiveCat} recap
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <RecapBar category={effectiveCat} theme="light" compact accent={tint}
                      storyCount={briefingData[effectiveCat]?.storyCount || 0}
                      onOpen={() => navigate(`/category/${encodeURIComponent(effectiveCat)}/briefing`, { state: { from: '/' } })} />
                    <PeriodRecapChips recaps={periodRecaps} minutesOf={periodMinutes} theme="light" accent={tint}
                      onOpen={onOpenPeriodRecap} onPlay={onPlayPeriodRecap} />
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <div style={{ padding: `${SPACE.md}px ${SPACE.md}px 12px` }}>
          <LensToggle
            value={lens}
            onChange={(l) => { if (l === 'popular') navigate('/popular'); else if (l === 'interesting') navigate('/important'); else setLens('latest'); }}
            theme="light"
          />
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <StoryList
          ref={listRef}
          availableDays={availableDays}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          briefingData={briefingData}
          categories={allCats}
          onReadStory={onSelectCategory}
          onPlayStory={onPlayStory}
          onPlayCategory={onPlayCategory}
          gamifiedStats={allNewsStats}
          user={user}
          isNarrating={isNarrating}
          currentStoryIndex={currentStoryIndex}
          playerVisible={playerVisible}
          challengeStats={challengeStats}
          loading={briefingLoading}
          fromPath="/"
          showCategoryImages
          sectionRecap={false}
          sectionTitle="All News"
          onPlayFeed={onPlayBriefing}
          markNew
          activeCategory={effectiveCat}
          onCategoryChange={setActiveCat}
          hidePills
          onMarkRead={onMarkRead}
          focusStory={focusStory}
          onFocusRestored={onFocusRestored}
          onFocusStory={(cat, idx) => { setRailPos({ cat, idx }); onFocusStory?.(cat, idx); }}
          onShownCounts={setShownCounts}
          savedStories={savedStories}
          onToggleSaved={onToggleSaved}
        />
      </div>

      <BackToTop />
    </div>
  );
}
