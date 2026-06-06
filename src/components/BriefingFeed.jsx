import React from 'react';
import StoryList from './StoryList';
import ProgressPill from './ProgressPill';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';

export default function BriefingFeed({
  briefingData, briefingLoading,
  selectedDay, availableDays, onSelectDay,
  defaultCategories, customCategories,
  onSelectCategory, onPlayStory,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible, challengeStats, gamifiedStats,
  selectedTime, availableTimes, onSelectTime,
  onPlayBriefing, onPlayCategory, onMarkRead,
  isPaused, newsLanguage, todayProgress, onShowSettings,
}) {
  useScrollRestore('/');
  const allCats = [...(defaultCategories || []), ...(customCategories || [])];

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      <FeedHeader
        user={user}
        onShowAuth={onShowAuth}
        selectedDay={selectedDay}
        availableDays={availableDays}
        onSelectDay={onSelectDay}
      />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: '4px' }}>
        <ProgressPill challengeStats={challengeStats} />
      </div>

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <StoryList
          availableDays={availableDays}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          briefingData={briefingData}
          categories={allCats}
          onReadStory={onSelectCategory}
          onPlayStory={onPlayStory}
          onPlayCategory={onPlayCategory}
          gamifiedStats={gamifiedStats}
          isNarrating={isNarrating}
          activeCategory={selectedCategory}
          currentStoryIndex={currentStoryIndex}
          playerVisible={playerVisible}
          challengeStats={challengeStats}
          loading={briefingLoading}
          fromPath="/"
          showCategoryImages
          sectionTitle="All News"
          onPlayFeed={onPlayBriefing}
        />
      </div>
    </div>
  );
}
