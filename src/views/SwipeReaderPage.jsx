import StoryReader from '../components/StoryReader';

export default function SwipeReaderPage({
  user, setShowAuth, setAuthMode, selectedDay, storyIndex, isNarrating, isPaused, feedCategories,
  sessionSeenRef, setFocus, miniPlayerDock, readerMounted, briefingData, gamifiedStats,
  readTodaySet, savedStories, handleToggleSaved, navigate, location, readerExiting, allCategories,
  availableDays, challengeStatsFull, selectDay, onPlayFrom, periodRecaps, periodMinutes,
  openPeriodRecap, playPeriodRecap, handleNarrateBriefing, handleMarkRead, catFromUrl,
  storyIdxFromUrl, isStoriesPage, feedNameForPath, miniPlayerVisible, enterAudioMode,
  enterStoriesForTab, openFeedSummary, enterSummariesMode, readerClose, snapshotBriefing,
  viewStories,
}) {
  const readerTranslateY = (readerMounted && !readerExiting) ? '0px' : '100%';
  const contextCats = (() => {
    const from     = location.state?.from;
    const playlist = location.state?.playlist;
    // Playlist mode (Popular / Interesting): pills show only categories in that list, in order
    let cats;
    if (playlist?.length) {
      const seen = new Set();
      cats = playlist.map(p => p.category).filter(c => !seen.has(c) && seen.add(c));
    } else if (from === '/my-feed') {
      cats = feedCategories;
    } else {
      cats = allCategories;
    }
    // location.state survives across every in-reader navigate() — each one does a
    // history replace that carries the same state forward unchanged (see navTo in
    // StoryReader). A playlist or feedCategories snapshot from wherever the reader was
    // FIRST opened can outlive its relevance: swipe far enough and catFromUrl drifts
    // outside that original list. When that happens the pill strip's own length>1 gate
    // flips between a real list and a stale one-or-zero-category list, which is the
    // strip appearing and disappearing. If the category actually being viewed isn't in
    // the resolved list, the list is stale — fall back to the full set instead of
    // trusting state that no longer describes what's on screen.
    return cats.includes(catFromUrl) ? cats : allCategories;
  })();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 160, pointerEvents: 'auto' }}>
      {/* Backdrop — dims behind sheet; fades out on exit. Not shown when opened as a full page. */}
      {!isStoriesPage && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', transition: 'opacity 0.38s', opacity: readerExiting ? 0 : 1 }}
          onClick={readerClose}
        />
      )}
      {/* Sheet (or full page, when opened via the Feed/Stories toggle) */}
      <div
        style={{
          position: 'absolute', left: '50%', bottom: 0,
          width: '100%', maxWidth: '560px', height: '100dvh',
          background: '#ffffff', borderRadius: isStoriesPage ? 0 : '20px 20px 0 0',
          transform: isStoriesPage ? 'translateX(-50%)' : `translateX(-50%) translateY(${readerTranslateY})`,
          transition: isStoriesPage ? 'none' : 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          willChange: 'transform',
        }}
      >
        {/* Reader content */}
        <StoryReader
          category={catFromUrl}
          story={viewStories[storyIdxFromUrl] || null}
          storyIndex={storyIdxFromUrl}
          isAlreadyRead={!!(gamifiedStats.todayProgress[catFromUrl]?.listenedIndices?.has(storyIdxFromUrl))}
          stories={viewStories}
          onPlayFrom={onPlayFrom}
          isNarrating={isNarrating && storyIndex === storyIdxFromUrl}
          isPaused={isPaused}
          miniPlayerVisible={miniPlayerVisible && miniPlayerDock === 'bottom'}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          onMarkRead={handleMarkRead}
          savedStories={savedStories}
          onToggleSaved={handleToggleSaved}
          contextCategories={contextCats}
          playlist={location.state?.playlist || null}
          feedName={feedNameForPath(location.state?.from)}
          categoryBriefing={briefingData[catFromUrl]?.briefing || null}
          onPlayRecap={() => handleNarrateBriefing(catFromUrl, contextCats.filter(c => briefingData[c]?.briefing && briefingData[c].briefing.trim()))}
          inSheet
          onClose={readerClose}
          asPage={isStoriesPage}
          challengeStats={challengeStatsFull}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
          activeTabPath={location.state?.from || '/'}
          onSwitchStoriesTab={enterStoriesForTab}
          onOpenFeedSummary={() => openFeedSummary(location.state?.from || '/', contextCats)}
          onEnterSummaries={() => enterSummariesMode(location.state?.from || '/', 'swipe')}
          onEnterAudio={() => enterAudioMode(location.state?.from || '/')}
          // Recap opens as a bottom sheet over Swipe mode — no asPage, so the
          // full-page Category Recap is no longer used.
          // Carry the exact route we're leaving, so closing the recap returns to this
          // story in Swipe mode. `from` alone is the tab path, which always resolved
          // to Scroll — so opening a recap from Swipe used to dump you into the feed.
          onOpenCategoryRecap={(cat) => navigate(`/category/${encodeURIComponent(cat)}/briefing`, {
            state: { from: location.state?.from || '/', returnTo: location.pathname, returnState: location.state },
          })}
          storiesForCategory={(cat) => (
            (snapshotBriefing && snapshotBriefing[cat]?.allStories?.length > 0)
              ? snapshotBriefing[cat].allStories
              : (briefingData[cat]?.allStories || [])
          )}
          isStoryRead={(cat, idx) => sessionSeenRef.current.has(`${cat}|${idx}`) || readTodaySet.has(`${cat}|${idx}`)}
          onFocusStory={setFocus}
          periodRecaps={periodRecaps}
          periodMinutes={periodMinutes}
          onOpenPeriodRecap={openPeriodRecap}
          onPlayPeriodRecap={playPeriodRecap}
          onEditCategories={() => navigate('/settings', { state: { scrollTo: 'myfeed', from: location.pathname } })}
          // The lens control rendered in Swipe mode but nothing was wired to it, so
          // tapping Popular or Interesting did nothing. Reuse enterStoriesForTab — the
          // same switch the mode toggle already uses to move between feeds within
          // Swipe — so Popular/Interesting behave exactly like the other tab switches,
          // including the empty-feed fallback to the plain tab.
          lens={
            location.state?.from === '/popular' ? 'popular'
            : location.state?.from === '/important' ? 'interesting'
            : 'latest'
          }
          onChangeLens={(l) => {
            const tabPath = l === 'popular' ? '/popular' : l === 'interesting' ? '/important' : '/';
            enterStoriesForTab(tabPath);
          }}
        />
      </div>
    </div>
  );
}
