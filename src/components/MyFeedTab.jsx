import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import StoryList from './StoryList';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';
import { getRememberedCategory, rememberCategory } from '../hooks/useCategoryMemory';
import { CATEGORY_SHORT } from '../theme';

export default function MyFeedTab({
  briefingData, briefingLoading,
  feedCategories,
  selectedDay, availableDays, onSelectDay,
  onSelectCategory, onPlayStory, onMarkRead, focusStory, onFocusStory, onFocusRestored,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible, challengeStats, gamifiedStats,
  selectedTime, availableTimes, onSelectTime,
  onPlayFeed, onPlayMyFeed, onPlayCategory, onEnterStories, onEnterSummaries, onEnterAudio,
  savedStories, onToggleSaved,
}) {
  const navigate = useNavigate();
  useScrollRestore('/my-feed');
  const [lens, setLens] = useState('latest');
  const allFeedCats = feedCategories || [];
  const visibleFeedCats = allFeedCats.filter(c => briefingData[c]?.storyCount > 0);
  // Remembers the last category selected on THIS tab, across revisits within the
  // session — defaults to the first category the first time you ever land here.
  const [activeCat, setActiveCatRaw] = useState(() => getRememberedCategory('/my-feed'));
  const setActiveCat = (cat) => { setActiveCatRaw(cat); rememberCategory('/my-feed', cat); };
  // Which story sits under the header right now — drives the rail, so it tracks scrolling
  // in both directions rather than a high-water mark.
  const [railPos, setRailPos] = useState({ cat: null, idx: -1 });
  const [shownCounts, setShownCounts] = useState({}); // cards rendered per category — the rail matches the list
  const effectiveCat = activeCat || visibleFeedCats[0] || null;
  const subtitle = effectiveCat ? `${CATEGORY_SHORT[effectiveCat] || effectiveCat} · ${briefingData[effectiveCat]?.storyCount || 0} stories` : undefined;
  // The list owns the jump: it sets the category and mutes its own scroll-spy for the
  // duration, so the two can't fight over which category is active mid-scroll.
  const listRef = useRef(null);
  const scrollToCat = (cat) => listRef.current?.jumpToCategory(cat);

  // See BriefingFeed's identical block for why this is needed: StoryList's own scroll-spy
  // runs its first check before this component's effects settle and overwrites the
  // remembered category with the first one before it ever sticks. jumpToCategory — the same
  // call a pill click uses — wins that race and auto-scrolls the strip as a side effect.
  const restoredCatRef = useRef(false);
  useEffect(() => {
    if (restoredCatRef.current || focusStory?.category) return;
    const remembered = getRememberedCategory('/my-feed');
    if (!remembered || remembered === visibleFeedCats[0] || !visibleFeedCats.includes(remembered)) return;
    if (!document.getElementById(`sl-topic-${remembered}`)) return;
    restoredCatRef.current = true;
    // See BriefingFeed's identical delay: useScrollRestore's instant scroll fires its own
    // 'scrollend' in the same tick, which — if jumpToCategory's listener is already attached
    // — reads as "my scroll is done" while the real smooth-scroll is still mid-flight, and
    // the spy latches onto whatever's onscreen at that instant. Letting the instant scroll's
    // own 'scrollend' clear out first avoids the false read.
    setTimeout(() => scrollToCat(remembered), 60);
  });

  if (!user) {
    return (
      <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <FeedHeader
          feedName="My News"
          user={user}
          onShowAuth={onShowAuth}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={onSelectDay}
          corpus="mine"
          onChangeCorpus={(c) => { if (c === 'all') navigate('/'); }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color="#8a8a9a" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.02em' }}>Your Personalised Feed</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#8a8a9a', lineHeight: 1.55 }}>Sign in to create your own feed with only the categories you care about.</p>
          </div>
          {/* Sign in opens the dialog, not the settings page — see GuestPromo. */}
          <button onClick={() => onShowAuth?.()} style={{ padding: '0.7rem 1.8rem', background: '#0a0a0f', color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (allFeedCats.length === 0) {
    return (
      <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <FeedHeader
          feedName="My News"
          user={user}
          onShowAuth={onShowAuth}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={onSelectDay}
          corpus="mine"
          onChangeCorpus={(c) => { if (c === 'all') navigate('/'); }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>⭐</div>
          <div>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: '#0a0a0f' }}>Set Up My News</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#8a8a9a', lineHeight: 1.55 }}>Choose the categories you want and we'll keep your feed personalised.</p>
          </div>
          <button onClick={() => navigate('/settings', { state: { scrollTo: 'myfeed' } })} style={{ padding: '0.7rem 1.8rem', background: '#0a0a0f', color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
            Set Up My News
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      <FeedHeader
        feedName="My News"
        user={user}
        onShowAuth={onShowAuth}
        selectedDay={selectedDay}
        availableDays={availableDays}
        onSelectDay={onSelectDay}
        challengeStats={challengeStats}
        viewMode="feed"
        onChangeViewMode={(m) => { if (m === 'stories') onEnterStories?.(); else if (m === 'summaries') onEnterSummaries?.(); }}
        onEnterStories={onEnterStories} onEnterSummaries={onEnterSummaries} onEnterAudio={onEnterAudio}
        categories={visibleFeedCats}
        activeCategory={effectiveCat}
        onSelectCategory={scrollToCat}
        subtitle={subtitle}
        showLens
        onEditCategories={() => navigate('/settings', { state: { scrollTo: 'myfeed' } })}
        corpus="mine"
        onChangeCorpus={(c) => { if (c === 'all') navigate('/'); }}
        lens={lens}
        onChangeLens={(l) => { if (l === 'popular') navigate('/popular'); else if (l === 'interesting') navigate('/important'); else setLens('latest'); }}
        progressListened={railPos.cat === effectiveCat ? railPos.idx + 1 : 0}
        progressTotal={shownCounts[effectiveCat] ?? (gamifiedStats?.todayProgress?.[effectiveCat]?.total || 0)}
      />

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <StoryList
          ref={listRef}
          availableDays={availableDays}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          briefingData={briefingData}
          categories={allFeedCats}
          onReadStory={onSelectCategory}
          onPlayStory={onPlayStory}
          onPlayCategory={onPlayCategory}
          gamifiedStats={gamifiedStats}
          user={user}
          isNarrating={isNarrating}
          currentStoryIndex={currentStoryIndex}
          playerVisible={playerVisible}
          challengeStats={challengeStats}
          loading={briefingLoading}
          fromPath="/my-feed"
          showCategoryImages
          sectionTitle="My News"
          onPlayFeed={onPlayMyFeed}
          onEditFeed={() => navigate('/settings', { state: { scrollTo: 'myfeed' } })}
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
    </div>
  );
}
