import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Bookmark } from 'lucide-react';
import ProgressPill from './ProgressPill';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import CategoryIcon from './CategoryIcon';
import useScrollRestore from '../hooks/useScrollRestore';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';

const light = {
  bg:        '#f5f5f7',
  bgSub:     '#ececef',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

// Interesting — the stories marked as interesting (saved) by all users,
// ranked by interest count. Same feed chrome as other tabs: category pills + "All".
export default function ImportantTab({
  briefingData = {},
  onSelectCategory,
  onPlayStory,
  onOpenSaves,
  user,
  onShowAuth,
  playerVisible,
  challengeStats,
  gamifiedStats = {},
  selectedDay, availableDays = [], onSelectDay,
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

  // All view → ranked across categories by interest count.
  // Category view → that category's stories (already ranked).
  const ranked = [...allStories].sort((a, b) => b.interestCount - a.interestCount);
  const activeList = selectedCat ? ranked.filter(s => s.category === selectedCat) : ranked;

  const openStory = (item, list = activeList) => {
    onSelectCategory?.(item.category);
    const playlist = list.map(s => ({ category: s.category, storyIndex: s.storyIndex }));
    navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, {
      state: { from: '/important', playlist },
    });
  };

  const firstStory = activeList[0];

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        .imp-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>

      <FeedHeader user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay} />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: '4px' }}>
        <ProgressPill challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
      </div>

      {/* Title row + Read/Play */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: '1.55rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Interesting
        </h2>
        {firstStory && (
          <>
            <div className="ai-btn-wrap-read" style={{ flexShrink: 0 }}>
              <button className="ai-btn-inner-white" style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }} onClick={() => openStory(firstStory)}>
                Read
              </button>
            </div>
            <div className="ai-btn-wrap-play" style={{ flexShrink: 0 }}>
              <button className="ai-btn-inner" style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }} onClick={() => onPlayStory?.(firstStory.category, firstStory.storyIndex)}>
                <Play size={11} fill="white" color="white" />
                Play
              </button>
            </div>
          </>
        )}
      </div>

      {/* My Saves entry */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 16px 10px' }}>
        <button
          onClick={() => (user ? onOpenSaves?.() : onShowAuth?.())}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '12px 14px', borderRadius: '14px',
            background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: '10px', background: light.bgSub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bookmark size={17} color="#6366f1" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0a0a0f' }}>My Saves</div>
            <div style={{ fontSize: '0.74rem', color: light.textMuted, fontWeight: '500' }}>Stories you marked as interesting</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={light.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Category pills */}
      {cats.length > 0 && (
        <div className="imp-cat-strip" style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
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
                  onRead={() => openStory(item)}
                  onPlay={() => onPlayStory?.(item.category, item.storyIndex)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
