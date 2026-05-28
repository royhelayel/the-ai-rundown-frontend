import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import CategoryRow from './CategoryRow';
import DateTimePill from './DateTimePill';
import { SkeletonCategoryRows } from './SkeletonScreens';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

export default function FeedPage({
  feed,
  briefingData, briefingLoading,
  selectedDay, selectedTime,
  availableDays, availableTimes,
  onSelectDay, onSelectTime,
  onPlayFeed, onPlayCategory, onSelectCategory, onPlayStory,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible,
}) {
  const navigate = useNavigate();

  if (!feed) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: light.textMuted, fontSize: '0.9rem' }}>Feed not found.</p>
      </div>
    );
  }

  const totalStories = feed.categories.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
  const totalMin     = feed.categories.reduce((s, c) => s + (briefingData[c]?.estimatedMin || 0), 0);
  const isLoading    = briefingLoading;

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.75rem 1.25rem' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <span className="header-brand" style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={user ? () => navigate('/settings') : onShowAuth}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: light.textMuted, flexShrink: 0 }}>
            <User size={16} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <div className="hero-row">
          <div className="hero-title-row">
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15, flexShrink: 0 }}>
              {feed.name}
            </h1>
            <DateTimePill
              selectedDay={selectedDay} selectedTime={selectedTime}
              availableDays={availableDays} availableTimes={availableTimes}
              onSelectDay={onSelectDay} onSelectTime={onSelectTime}
            />
          </div>
          <div className="hero-play-row">
            <div className="ai-btn-wrap">
              <button className="ai-btn-inner" onClick={() => onPlayFeed(feed.categories)}>
                <Play size={14} fill="white" style={{ marginLeft: '1px', flexShrink: 0 }} />
                {isNarrating ? 'Now Playing…' : `Play ${feed.name}`}
              </button>
            </div>
          </div>
        </div>
        {totalStories > 0 && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: light.textMuted }}>
            {totalStories} {totalStories === 1 ? 'story' : 'stories'} · ~{totalMin} min
          </p>
        )}
      </div>

      {/* Category rows */}
      <div style={{ flex: 1, paddingTop: '0.25rem', paddingBottom: playerVisible ? '8rem' : '3.5rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        {isLoading ? (
          <SkeletonCategoryRows count={3} />
        ) : (
          feed.categories.map(cat => (
            <CategoryRow
              key={cat}
              cat={cat}
              catData={briefingData[cat]}
              onOpen={c => onSelectCategory(c)}
              onPlay={c => { onSelectCategory(c); onPlayCategory(c); }}
              onPlayStory={onPlayStory}
              isNarrating={isNarrating}
              activeCategory={selectedCategory}
              activeStoryIndex={currentStoryIndex}
              fromPath={`/feed/${feed.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
