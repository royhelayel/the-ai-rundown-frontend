import CategoryBriefing from '../components/CategoryBriefing';

export default function CategoryBriefingView({
  user, setShowAuth, setAuthMode, selectedDay, briefingData, navigate, location, availableDays,
  challengeStatsFull, selectDay, handleNarrateBriefing, briefingCat, briefingNavCats,
  isSummariesPage, feedNameForPath, enterStoriesForTab, enterSummariesMode,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 165, pointerEvents: 'auto' }}>
      <style>{`@keyframes briefingIn { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }`}</style>
      {!isSummariesPage && (
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => navigate(location.state?.from || '/')}
        />
      )}
      <div style={{
        position: 'absolute', left: '50%', bottom: 0,
        width: '100%', maxWidth: '560px', height: '100dvh',
        background: '#fff', borderRadius: isSummariesPage ? 0 : '20px 20px 0 0',
        transform: 'translate(-50%, 0)',
        animation: isSummariesPage ? 'none' : 'briefingIn 0.38s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <CategoryBriefing
          category={briefingCat}
          briefing={briefingData[briefingCat]?.briefing || null}
          feedName={feedNameForPath(location.state?.from)}
          cats={briefingNavCats}
          onSelectCat={(c) => navigate(`/category/${encodeURIComponent(c)}/briefing`, { state: { from: location.state?.from || '/', asPage: isSummariesPage, fromMode: location.state?.fromMode || 'scroll', returnTo: location.state?.returnTo, returnState: location.state?.returnState } })}
          onListen={() => handleNarrateBriefing(briefingCat, briefingNavCats)}
          onReadStories={() => navigate(`/category/${encodeURIComponent(briefingCat)}/story/0`, { state: { from: location.state?.from || '/' } })}
          onClose={() => {
            const back = location.state?.returnTo;
            if (back) navigate(back, { state: location.state?.returnState });
            else navigate(location.state?.from || '/');
          }}
          asPage={isSummariesPage}
          onSwitchTab={(tabPath) => enterSummariesMode(tabPath)}
          activeTabPath={location.state?.from || '/'}
          onExitToFeed={() => navigate(location.state?.from || '/')}
          onExitToStories={() => enterStoriesForTab(location.state?.from || '/')}
          onBack={() => {
            const back = location.state?.from || '/';
            if (location.state?.fromMode === 'swipe') enterStoriesForTab(back);
            else navigate(back);
          }}
          challengeStats={challengeStatsFull}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
        />
      </div>
    </div>
  );
}
