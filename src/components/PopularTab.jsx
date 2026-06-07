import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { SkeletonPopularList } from './SkeletonScreens';
import ProgressPill from './ProgressPill';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import CategoryIcon from './CategoryIcon';
import useScrollRestore from '../hooks/useScrollRestore';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';

const bg = '#f5f5f7';
const light = {
  bgSub: '#ececef',
  border: 'rgba(0,0,0,0.08)',
  textMuted: '#8a8a9a',
  text: '#0a0a0f',
};

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
  challengeStats, gamifiedStats = {},
}) {
  const navigate = useNavigate();
  useScrollRestore('/popular');
  const [selectedCat, setSelectedCat] = useState(null);

  // Flatten all stories across all categories
  const allStories = [];
  defaultCategories.forEach(cat => {
    const d = briefingData[cat];
    if (!d?.allStories?.length) return;
    d.allStories.forEach((story, idx) => {
      const key = headlineKey(story.headline);
      allStories.push({ ...story, category: cat, storyIndex: idx, listenCount: listenCounts[key] || 0 });
    });
  });

  const hasAnyData    = allStories.length > 0;
  const hasAnyListens = allStories.some(s => s.listenCount > 0);

  // Sort by listenCount desc; show only stories with at least 1 listen
  const sorted = [...allStories]
    .filter(s => s.listenCount > 0)
    .sort((a, b) => b.listenCount - a.listenCount);

  // Unique categories in the popular list
  const cats = [...new Set(sorted.map(s => s.category))];
  const filtered = selectedCat ? sorted.filter(s => s.category === selectedCat) : sorted;

  const handleStoryClick = (cat, storyIndex) => {
    onSelectCategory(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/${storyIndex}`, { state: { from: 'popular' } });
  };

  return (
    <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${bg}; margin: 0; } ::-webkit-scrollbar { display: none; } .pop-cat-strip::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <FeedHeader user={user} onShowAuth={onShowAuth} />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: '4px' }}>
        <ProgressPill challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
      </div>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: '1.55rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Popular
        </h2>
        {sorted.length > 0 && (
          <>
            <div className="ai-btn-wrap-read" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner-white"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => handleStoryClick(sorted[0].category, sorted[0].storyIndex)}
              >
                Read
              </button>
            </div>
            <div className="ai-btn-wrap-play" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => { onSelectCategory(sorted[0].category); onPlayCategory(sorted[0].category); }}
              >
                <Play size={11} fill="white" color="white" />
                Play
              </button>
            </div>
          </>
        )}
      </div>

      {/* Category filter pills */}
      {cats.length > 1 && !briefingLoading && (
        <div className="pop-cat-strip" style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px', minWidth: 'max-content' }}>
            <button
              onClick={() => setSelectedCat(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 13px', borderRadius: '8px', border: 'none',
                background: selectedCat === null ? light.text : light.bgSub,
                color: selectedCat === null ? '#fff' : light.textMuted,
                fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              All
            </button>
            {cats.map(cat => {
              const c = CATEGORY_COLORS[cat] || '#6366f1';
              const act = selectedCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(act ? null : cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 13px', borderRadius: '8px',
                    border: `1px solid ${act ? c : light.border}`,
                    background: act ? c : light.bgSub,
                    color: act ? '#fff' : light.textMuted,
                    fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <CategoryIcon category={cat} size={13} color={act ? '#fff' : light.textMuted} />
                  {CATEGORY_SHORT[cat] || cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 1rem', paddingBottom: playerVisible ? '8rem' : '3.5rem' }}>

        {/* Empty-state banner: no listens yet */}
        {hasAnyData && !hasAnyListens && (
          <div style={{ padding: '0.9rem 1.1rem', background: `rgba(99,102,241,0.06)`, borderRadius: '12px', border: `1px solid rgba(99,102,241,0.15)`, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>⏳</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', lineHeight: 1.45 }}>
              We're compiling the list, check back soon.
            </p>
          </div>
        )}

        {briefingLoading ? (
          <SkeletonPopularList count={7} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((story) => {
              const isRead = !!(gamifiedStats.todayProgress?.[story.category]?.listenedIndices?.has(story.storyIndex));
              return (
                <StoryCard
                  key={`${story.category}-${story.storyIndex}`}
                  story={story}
                  category={story.category}
                  listenCount={story.listenCount}
                  isRead={user ? isRead : undefined}
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
