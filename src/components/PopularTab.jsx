import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonPopularList } from './SkeletonScreens';
import ProgressPill from './ProgressPill';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';

const bg = '#f5f5f7';

// Normalize a headline to a stable key for listen counting
export function headlineKey(headline) {
  return (headline || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().slice(0, 50);
}

export default function PopularTab({
  briefingData, briefingLoading, listenCounts,
  defaultCategories,
  onSelectCategory, onPlayCategory,
  isNarrating, playerVisible,
  user, onShowAuth,
  challengeStats,
}) {
  const navigate = useNavigate(); // still needed for story navigation
  useScrollRestore('/popular');

  // Flatten all stories across all categories
  const allStories = [];
  defaultCategories.forEach(cat => {
    const d = briefingData[cat];
    if (!d?.allStories?.length) return;
    d.allStories.forEach((story, idx) => {
      const key = headlineKey(story.headline);
      allStories.push({
        ...story,
        category: cat,
        storyIndex: idx,
        listenCount: listenCounts[key] || 0,
      });
    });
  });

  const hasAnyData    = allStories.length > 0;
  const hasAnyListens = allStories.some(s => s.listenCount > 0);

  // Sort by listenCount desc; ties keep original order (stable)
  const sorted = [...allStories].sort((a, b) => b.listenCount - a.listenCount);

  const handleStoryClick = (cat, storyIndex) => {
    onSelectCategory(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/${storyIndex}`, { state: { from: 'popular' } });
  };

  return (
    <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${bg}; margin: 0; } ::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <FeedHeader user={user} onShowAuth={onShowAuth} />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <ProgressPill challengeStats={challengeStats} />
      </div>

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0.5rem 1.25rem 1.5rem', paddingBottom: playerVisible ? '8rem' : '3.5rem' }}>

        {/* Empty-state banner: no listens yet */}
        {hasAnyData && !hasAnyListens && (
          <div style={{ padding: '0.9rem 1.1rem', background: `rgba(99,102,241,0.06)`, borderRadius: '12px', border: `1px solid rgba(99,102,241,0.15)`, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>⏳</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', lineHeight: 1.45 }}>
              We're compiling the list, check back soon.
            </p>
          </div>
        )}

        {/* Loading */}
        {briefingLoading ? (
          <SkeletonPopularList count={7} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sorted.map((story, rank) => {
              return (
                <StoryCard
                  key={`${story.category}-${story.storyIndex}`}
                  story={story}
                  category={story.category}
                  listenCount={story.listenCount}
                  onRead={() => handleStoryClick(story.category, story.storyIndex)}
                  onPlay={() => { onSelectCategory(story.category); onPlayCategory(story.category); }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
