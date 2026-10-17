import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import TabRecap from './TabRecap';
import useScrollRestore from '../hooks/useScrollRestore';
import { CATEGORY_SHORT } from '../theme';
import { headlineKey } from './PopularTab';

const light = {
  bg:        'var(--paper)',
  bgSub:     '#ececef',
  border:    'rgba(0,0,0,0.08)',
  text:      'var(--ink)',
  textMuted: 'var(--sub)',
};

// Interesting — the stories marked as interesting (saved) by all users, ranked by
// interest count. The category strip lists just the categories present (+ All) and
// filters the list.
export default function ImportantTab({
  briefingData = {},
  onSelectCategory,
  onPlayStory,
  onMarkRead,
  user,
  onShowAuth,
  playerVisible,
  challengeStats,
  gamifiedStats = {},
  selectedDay, availableDays = [], onSelectDay,
  onEnterStories, onEnterSummaries, onEnterAudio,
  savedStories = [], onToggleSaved,
  // The recap tab (see TabRecap). recapData is the day's live news, which holds the recaps.
  recapData = {}, recapView = false, onChangeRecapView, recapPeriod = 'Daily', onChangeRecapPeriod,
  periodRecaps, onActiveCategoryChange, onOpenRecapStory,
}) {
  const navigate = useNavigate();
  useScrollRestore('/important');
  const [selectedCat, setSelectedCat] = useState(null);

  // Flatten all categories' stories, tagging each with its per-category index
  // (so the reader/player resolve the right snapshot story) and interest count.
  const allStories = [];
  Object.keys(briefingData).forEach(cat => {
    const list = briefingData[cat]?.allStories || [];
    list.forEach((story, idx) => {
      allStories.push({ ...story, category: cat, storyIndex: idx, interestCount: story._interestCount || 0 });
    });
  });

  const cats = [...new Set(allStories.map(s => s.category))];

  // The recap tab's topic: the chosen chip, or on "Top" the first topic in the list — or, while
  // the list is still empty, the first topic with news that day.
  const recapCat = selectedCat || cats[0] || Object.keys(recapData).find(c => recapData[c]?.storyCount > 0) || null;
  // Weekly and monthly recaps are fetched for one topic at a time — say which.
  useEffect(() => { if (recapView && recapCat) onActiveCategoryChange?.(recapCat); }, [recapView, recapCat]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = [...allStories].sort((a, b) => b.interestCount - a.interestCount);
  const activeList = selectedCat ? ranked.filter(s => s.category === selectedCat) : ranked;

  const openStory = (item, list = activeList) => {
    onSelectCategory?.(item.category);
    const playlist = list.map(s => ({ category: s.category, storyIndex: s.storyIndex }));
    navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, {
      state: { from: '/important', playlist },
    });
  };

  const subtitle = selectedCat
    ? `${CATEGORY_SHORT[selectedCat] || selectedCat} · ${activeList.length} stories`
    : (activeList.length > 0 ? `${activeList.length} stories` : undefined);

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        .imp-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>

      <FeedHeader feedName="Interesting" user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay} challengeStats={challengeStats} viewMode="feed" onChangeViewMode={(m) => { if (m === 'stories') onEnterStories?.(); else if (m === 'summaries') onEnterSummaries?.(); }} onEnterStories={onEnterStories} onEnterSummaries={onEnterSummaries} onEnterAudio={onEnterAudio}
        categories={cats} activeCategory={recapView ? recapCat : selectedCat}
        onSelectCategory={(cat) => {
          // In the recap, a chip picks whose recap; "Top" (null) goes back to the list.
          if (recapView) { if (cat) setSelectedCat(cat); else { setSelectedCat(null); onChangeRecapView?.(false); } return; }
          setSelectedCat(cat === selectedCat ? null : cat);
        }} showAllPill subtitle={subtitle}
        storyCount={activeList.length} recapCategory={recapCat}
        recapView={recapView} onChangeRecapView={onChangeRecapView} recapPeriod={recapPeriod} onChangeRecapPeriod={onChangeRecapPeriod}
        periodReady={{ Daily: !!(recapData[recapCat]?.briefing || '').trim(), Weekly: !!periodRecaps?.Weekly?.text, Monthly: !!periodRecaps?.Monthly?.text }}
        showLens lens="interesting"
        onChangeLens={(l) => { if (l === 'latest') navigate('/'); else if (l === 'popular') navigate('/popular'); }}
        corpus="all"
        onChangeCorpus={(c) => navigate(c === 'mine' ? '/my-feed' : '/')} />

      {recapView && recapCat ? (
        <TabRecap category={recapCat} briefingData={recapData} period={recapPeriod} periodRecaps={periodRecaps}
          selectedDay={selectedDay} onOpenStory={onOpenRecapStory} />
      ) : <>


      {/* What you personally flagged lives under My Profile now — see Settings. This tab is
          the shared view: what readers collectively found interesting. Carrying a personal
          shortcut at the top of it put two different scopes on one screen, and the entry
          point was easy to mistake for a filter on the list below it. */}

      {/* List */}
      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: playerVisible ? '8rem' : '5rem' }}>
        {activeList.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3.5rem 2rem', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bookmark size={24} color={light.textMuted} />
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: light.textMuted, lineHeight: 1.55, maxWidth: 280 }}>
              No interesting stories yet for this day. Stories appear here once readers start marking them as interesting.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 16px' }}>
            {activeList.map((item) => {
              const isRead = !!(gamifiedStats.todayProgress?.[item.category]?.listenedIndices?.has(item.storyIndex));
              return (
                <StoryCard
                  key={`${item.category}|${item.storyIndex}`}
                  story={item}
                  category={item.category}
                  isRead={user ? isRead : undefined}
                  savedCount={item.interestCount}
                  isSaved={savedStories.some(s => headlineKey(s.headline || '') === headlineKey(item.headline || ''))}
                  onToggleSaved={() => onToggleSaved?.(item, item.category, item.storyIndex)}
                  onRead={() => openStory(item)}
                  onSeen={() => onMarkRead?.(item, item.category, item.storyIndex)}
                  onPlay={() => onPlayStory?.(item.category, item.storyIndex)}
                />
              );
            })}
          </div>
        )}
      </div>
      </>}
    </div>
  );
}
