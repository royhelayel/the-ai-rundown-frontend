import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_SHORT } from '../theme';
import { SkeletonCategoryRows } from './SkeletonScreens';
import StoryCard from './StoryCard';

// ── Main component ────────────────────────────────────────────────────────────
export default function StoryList({
  availableDays = [],
  selectedDay,
  onSelectDay,
  briefingData = {},
  categories = [],
  onReadStory,
  onPlayStory,
  gamifiedStats = {},
  isNarrating = false,
  activeCategory = '',
  currentStoryIndex = 0,
  playerVisible = false,
  challengeStats,
  loading = false,
  fromPath = '/',
}) {
  const [catFilter, setCatFilter] = useState(null);
  const navigate = useNavigate();

  const visibleCats = catFilter
    ? categories.filter(c => c === catFilter && briefingData[c]?.storyCount > 0)
    : categories.filter(c => briefingData[c]?.storyCount > 0);

  const handleRead = (cat, idx) => {
    onReadStory?.(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/${idx}`, { state: { from: fromPath } });
  };

  return (
    <div>
      <style>{`
        .sl-day-strip::-webkit-scrollbar { display: none; }
        .sl-cat-pills::-webkit-scrollbar  { display: none; }
      `}</style>

      {/* Day selector */}
      {availableDays.length > 0 && (
        <div className="sl-day-strip" style={{ display: 'flex', gap: '4px', padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {availableDays.map(day => {
            const active   = day.fullDate === selectedDay;
            const count    = challengeStats?.dailyCountMap?.[day.fullDate] || 0;
            const goal     = challengeStats?.dailyGoal || 10;
            const dotColor = count >= goal ? '#22c55e' : count > 0 ? '#f97316' : 'rgba(0,0,0,0.12)';
            return (
              <button
                key={day.fullDate}
                onClick={() => onSelectDay?.(day.fullDate)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  padding: '7px 10px', borderRadius: '12px', cursor: 'pointer', flexShrink: 0, minWidth: '42px',
                  background: active ? 'rgba(124,58,237,0.12)' : '#fff',
                  border: `1px solid ${active ? '#7c3aed' : 'rgba(0,0,0,0.07)'}`,
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: '0.52rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? '#7c3aed' : '#8a8a9a', lineHeight: 1 }}>
                  {day.label}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: active ? '#0a0a0f' : '#374151', lineHeight: 1 }}>
                  {day.date}
                </span>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: dotColor }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Category pills */}
      <div className="sl-cat-pills" style={{ display: 'flex', gap: '7px', padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setCatFilter(null)}
          style={{
            padding: '6px 13px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '700',
            whiteSpace: 'nowrap', cursor: 'pointer',
            background: catFilter === null ? 'rgba(124,58,237,0.1)' : '#fff',
            border: `1px solid ${catFilter === null ? 'rgba(124,58,237,0.4)' : 'rgba(0,0,0,0.1)'}`,
            color: catFilter === null ? '#7c3aed' : '#6b7280',
            boxShadow: catFilter !== null ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          All
        </button>
        {categories.filter(c => briefingData[c]?.storyCount > 0).map(cat => {
          const active = catFilter === cat;
          const color  = CATEGORY_COLORS[cat] || '#6366f1';
          const icon   = CATEGORY_ICONS[cat] || '';
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(active ? null : cat)}
              style={{
                padding: '6px 13px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '700',
                whiteSpace: 'nowrap', cursor: 'pointer',
                background: active ? `${color}18` : '#fff',
                border: `1px solid ${active ? `${color}60` : 'rgba(0,0,0,0.1)'}`,
                color: active ? color : '#6b7280',
                boxShadow: !active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {icon ? `${icon} ${CATEGORY_SHORT[cat] || cat}` : (CATEGORY_SHORT[cat] || cat)}
            </button>
          );
        })}
      </div>

      {/* Story list */}
      {loading && (
        <div style={{ padding: '0.5rem 0' }}>
          <SkeletonCategoryRows count={4} />
        </div>
      )}
      <div style={{ display: loading ? 'none' : 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px', paddingBottom: playerVisible ? '9rem' : '5rem' }}>
        {visibleCats.length === 0 && (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#8a8a9a', fontSize: '0.88rem' }}>
            No stories available for this day.
          </div>
        )}
        {visibleCats.map(cat => {
          const catData     = briefingData[cat];
          const stories     = catData?.allStories || [];
          const color       = CATEGORY_COLORS[cat] || '#6366f1';
          const listenedSet = gamifiedStats?.todayProgress?.[cat]?.listenedIndices || new Set();
          if (stories.length === 0) return null;

          return (
            <div key={cat}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.63rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>
                    {cat}
                  </span>
                </div>
                <span style={{ fontSize: '0.58rem', fontWeight: '700', color: '#c4c4d0' }}>
                  {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                </span>
              </div>

              {/* Story cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stories.map((story, idx) => (
                  <StoryCard
                    key={idx}
                    story={story}
                    category={cat}
                    index={idx}
                    isRead={listenedSet.has(idx)}
                    onRead={() => handleRead(cat, idx)}
                    onPlay={() => onPlayStory?.(cat, idx)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
