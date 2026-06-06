import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT } from '../theme';
import { formatDuration } from '../utils';
import { SkeletonCategoryRows } from './SkeletonScreens';
import StoryCard from './StoryCard';
import CategoryIcon from './CategoryIcon';

// ── Category image header (175 px tall, full-bleed photo) ────────────────────
function CategoryImageHeader({ cat, catData, color, image, onPlay, onNavigate }) {
  return (
    <div
      onClick={onNavigate}
      style={{
        height: '175px', position: 'relative', overflow: 'hidden',
        cursor: 'pointer', userSelect: 'none',
        borderRadius: '14px',
      }}
    >
      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: image ? `url(${image})` : 'none',
        backgroundColor: image ? 'transparent' : color,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />

      {/* Diagonal dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, transparent 25%, rgba(0,0,0,0.88) 100%)',
      }} />

      {/* Subtle category colour tint */}
      <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.18 }} />

      {/* Content pinned to bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            {cat}
          </div>
          {catData && (
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: '3px' }}>
              {catData.storyCount} {catData.storyCount === 1 ? 'story' : 'stories'}
              {catData.estimatedSec ? ` · ~${formatDuration(catData.estimatedSec)}` : ''}
            </div>
          )}
        </div>
        {onPlay && (
          <button
            onClick={e => { e.stopPropagation(); onPlay(cat); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.35rem 0.85rem', borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              color: 'white', fontSize: '0.72rem', fontWeight: '700',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Play size={9} fill="white" color="white" style={{ marginLeft: '1px' }} />
            Play
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StoryList({
  availableDays = [],
  selectedDay,
  onSelectDay,
  briefingData = {},
  categories = [],
  onReadStory,
  onPlayStory,
  onPlayCategory,
  gamifiedStats = {},
  isNarrating = false,
  activeCategory = '',
  currentStoryIndex = 0,
  playerVisible = false,
  challengeStats,
  loading = false,
  fromPath = '/',
  showCategoryImages = false,
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

  const handleCatNavigate = (cat) => {
    onReadStory?.(cat);
    navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: fromPath } });
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

      {/* Category pills — Reader style */}
      <div className="sl-cat-pills" style={{ display: 'flex', gap: '5px', padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setCatFilter(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 11px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: catFilter === null ? '800' : '600',
            whiteSpace: 'nowrap', cursor: 'pointer',
            background: catFilter === null ? 'rgba(124,58,237,0.1)' : 'transparent',
            border: `1px solid ${catFilter === null ? 'rgba(124,58,237,0.4)' : 'rgba(0,0,0,0.1)'}`,
            color: catFilter === null ? '#7c3aed' : '#6b7280',
          }}
        >
          All
        </button>
        {categories.filter(c => briefingData[c]?.storyCount > 0).map(cat => {
          const active = catFilter === cat;
          const color  = CATEGORY_COLORS[cat] || '#6366f1';
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(active ? null : cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 11px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: active ? '800' : '600',
                whiteSpace: 'nowrap', cursor: 'pointer',
                background: active ? `${color}12` : 'transparent',
                border: `1px solid ${active ? `${color}55` : 'rgba(0,0,0,0.1)'}`,
                color: active ? color : '#6b7280',
              }}
            >
              <CategoryIcon category={cat} size={13} color={active ? color : '#6b7280'} />
              {CATEGORY_SHORT[cat] || cat}
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

      <div style={{
        display: loading ? 'none' : 'flex',
        flexDirection: 'column',
        gap: showCategoryImages ? '20px' : '8px',
        padding: showCategoryImages ? '0 16px' : '0 16px',
        paddingBottom: playerVisible ? '9rem' : '5rem',
      }}>
        {visibleCats.length === 0 && (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#8a8a9a', fontSize: '0.88rem' }}>
            No stories available for this day.
          </div>
        )}

        {visibleCats.map(cat => {
          const catData     = briefingData[cat];
          const stories     = catData?.allStories || [];
          const color       = CATEGORY_COLORS[cat] || '#6366f1';
          const image       = CATEGORY_IMAGES[cat] || null;
          const listenedSet = gamifiedStats?.todayProgress?.[cat]?.listenedIndices || new Set();
          if (stories.length === 0) return null;

          return (
            <div key={cat}>
              {showCategoryImages ? (
                /* ── Image category header ── */
                <div style={{ marginBottom: '10px' }}>
                  <CategoryImageHeader
                    cat={cat}
                    catData={catData}
                    color={color}
                    image={image}
                    onPlay={onPlayCategory}
                    onNavigate={() => handleCatNavigate(cat)}
                  />
                </div>
              ) : (
                /* ── Simple text category header ── */
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 2px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color }}>
                    <CategoryIcon category={cat} size={16} color={color} />
                    <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.01em' }}>
                      {cat}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#9ca3af' }}>
                    {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>
              )}

              {/* Story cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stories.map((story, idx) => (
                  <StoryCard
                    key={idx}
                    story={story}
                    category={cat}
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
