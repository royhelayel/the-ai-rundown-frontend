import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import StoryList from './StoryList';
import ProgressPill from './ProgressPill';
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
  const navigate = useNavigate();
  useScrollRestore('/');
  const allCats = [...(defaultCategories || []), ...(customCategories || [])];

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #f5f5f7; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 20px 10px' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>All News</span>
          <button onClick={user ? () => navigate('/settings') : onShowAuth} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>
            <User size={16} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
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
          gamifiedStats={gamifiedStats}
          isNarrating={isNarrating}
          activeCategory={selectedCategory}
          currentStoryIndex={currentStoryIndex}
          playerVisible={playerVisible}
          challengeStats={challengeStats}
          loading={briefingLoading}
          fromPath="/"
        />
      </div>
    </div>
  );
}
