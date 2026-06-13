import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pencil } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT } from '../theme';
import { formatDuration } from '../utils';
import { SkeletonCategoryRows } from './SkeletonScreens';
import StoryCard from './StoryCard';
import CategoryIcon from './CategoryIcon';

// ── Category image header (175 px tall, full-bleed photo) ────────────────────
function CategoryImageHeader({ cat, catData, color, image, onPlay, onNavigate }) {
  return (
    <div
      style={{
        height: '175px', position: 'relative', overflow: 'hidden',
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
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem',
      }}>
        {/* Category name + meta */}
        <div style={{ minWidth: 0 }}>
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

        {/* Read + Play buttons */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {/* Read — outlined white */}
          <button
            onClick={e => { e.stopPropagation(); onNavigate?.(); }}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
              background: 'transparent', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.7)',
            }}
          >
            Read
          </button>

          {/* Play — filled white */}
          {onPlay && (
            <button
              onClick={e => { e.stopPropagation(); onPlay(cat); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 14px', borderRadius: '8px',
                fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                background: 'white', color: color, border: 'none',
              }}
            >
              <Play size={9} fill={color} color={color} style={{ marginLeft: '1px' }} />
              Play
            </button>
          )}
        </div>
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
  user,
  isNarrating = false,
  activeCategory = '',
  currentStoryIndex = 0,
  playerVisible = false,
  challengeStats,
  loading = false,
  fromPath = '/',
  showCategoryImages = false,
  sectionTitle = '',
  onPlayFeed,
  onEditFeed,
  markNew = false, // show a "NEW" badge on evening-incremental stories (live feeds only)
}) {
  const [catFilter, setCatFilter] = useState(null);
  const [expandedCats, setExpandedCats] = useState(() => new Set());
  const navigate = useNavigate();

  const toggleExpanded = (cat) => setExpandedCats(prev => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });

  const visibleCats = catFilter
    ? categories.filter(c => c === catFilter && briefingData[c]?.storyCount > 0)
    : categories.filter(c => briefingData[c]?.storyCount > 0);

  const handleRead = (cat, idx) => {
    onReadStory?.(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/${idx}`, { state: { from: fromPath } });
  };

  const handleCatNavigate = (cat) => {
    onReadStory?.(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/0`, { state: { from: fromPath } });
  };

  return (
    <div>
      <style>{`.sl-cat-pills::-webkit-scrollbar { display: none; }`}</style>

      {/* Section title + feed-level actions */}
      {sectionTitle && (
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.55rem', fontWeight: '900',
              color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1,
            }}>
              {sectionTitle}
            </h2>
            {onEditFeed && (
              <button
                onClick={onEditFeed}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '4px', borderRadius: '6px',
                  background: 'none', border: 'none',
                  color: '#9ca3af', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Pencil size={14} />
              </button>
            )}
          </div>

          {/* Read — white inner */}
          <div className="ai-btn-wrap-read" style={{ flexShrink: 0 }}>
            <button
              className="ai-btn-inner-white"
              style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
              onClick={() => {
                const firstCat = visibleCats[0];
                if (firstCat) handleRead(firstCat, 0);
              }}
            >
              Read
            </button>
          </div>

          {/* Play — dark inner */}
          {onPlayFeed && (
            <div className="ai-btn-wrap-play" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={onPlayFeed}
              >
                <Play size={11} fill="white" color="white" />
                Play
              </button>
            </div>
          )}
        </div>
      )}

      {/* Category pills — sticky below header */}
      <div className="sl-cat-pills" style={{
        position: 'sticky', top: 54, zIndex: 40,
        display: 'flex', gap: '5px',
        padding: '8px 16px 10px', overflowX: 'auto', scrollbarWidth: 'none',
        background: 'rgba(245,245,247,0.96)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <button
          onClick={() => setCatFilter(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 13px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: catFilter === null ? '800' : '600',
            whiteSpace: 'nowrap', cursor: 'pointer',
            background: catFilter === null ? '#0a0a0f' : 'transparent',
            border: `1px solid ${catFilter === null ? '#0a0a0f' : 'rgba(0,0,0,0.1)'}`,
            color: catFilter === null ? '#ffffff' : '#6b7280',
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
                padding: '5px 13px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: active ? '800' : '600',
                whiteSpace: 'nowrap', cursor: 'pointer',
                background: active ? `${color}12` : 'transparent',
                border: `1px solid ${active ? `${color}55` : 'rgba(0,0,0,0.1)'}`,
                color: active ? color : '#6b7280',
              }}
            >
              <CategoryIcon category={cat} size={15} color={active ? color : '#6b7280'} />
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
        gap: showCategoryImages ? '24px' : '8px',
        padding: showCategoryImages ? '8px 16px 0' : '0 16px',
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

          const isExpanded  = expandedCats.has(cat);
          // In the All view, cap at 6 unless this category is expanded.
          const shownStories = catFilter || isExpanded ? stories : stories.slice(0, 6);

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

              {/* Story cards — capped at 6 in the all-categories view (expandable inline) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shownStories.map((story, idx) => (
                  <StoryCard
                    key={idx}
                    story={story}
                    category={cat}
                    isRead={user ? listenedSet.has(idx) : undefined}
                    isNew={markNew && story.generatedSlot === 'Evening'}
                    onRead={() => handleRead(cat, idx)}
                    onPlay={() => onPlayStory?.(cat, idx)}
                  />
                ))}
              </div>

              {/* View all / Show less — expands inline, no category-filter change */}
              {!catFilter && stories.length > 6 && (
                <button
                  onClick={() => toggleExpanded(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    width: '100%', marginTop: '6px', marginBottom: '6px',
                    padding: '10px', border: '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '12px', background: 'rgba(0,0,0,0.02)',
                    cursor: 'pointer', color: '#6b7280', fontSize: '0.78rem', fontWeight: '700',
                  }}
                >
                  {isExpanded ? 'Show less' : `View all ${stories.length} stories`}
                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)' }}
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
