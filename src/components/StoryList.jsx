import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_SHORT } from '../theme';
import { SkeletonCategoryRows } from './SkeletonScreens';

// ── Single story row ──────────────────────────────────────────────────────────
function StoryItem({ story, index, category, isRead, isPlaying, onRead, onPlay }) {
  const color   = CATEGORY_COLORS[category] || '#6366f1';
  const outlets = (story.storySources || []).filter(s => s.outlet).slice(0, 3);
  const moreCount = (story.storySources?.filter(s => s.outlet).length || 0) - outlets.length;

  const preview = story.allBullets?.[0]
    || story.tightBullets?.[0]
    || (story.summary ? story.summary.slice(0, 140) + (story.summary.length > 140 ? '…' : '') : '');

  return (
    <div style={{
      display: 'flex', gap: '10px', padding: '10px 20px 12px', alignItems: 'flex-start',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      background: isPlaying ? `${color}06` : 'transparent',
    }}>
      {/* Number */}
      <span style={{ fontSize: '0.68rem', fontWeight: '800', width: '18px', flexShrink: 0, paddingTop: '3px', color: 'rgba(0,0,0,0.22)' }}>
        {index + 1}
      </span>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Headline + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '5px' }}>
          <span onClick={onRead} style={{ fontSize: '0.86rem', fontWeight: '700', lineHeight: 1.32, flex: 1, color: '#0a0a0f', cursor: 'pointer' }}>
            {story.headline}
          </span>
          {isRead ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, marginTop: '2px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
              ✓ Read
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, marginTop: '2px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.22)' }}>
              ● New
            </span>
          )}
        </div>

        {/* Preview */}
        {preview && (
          <p style={{ margin: '0 0 8px', fontSize: '0.72rem', lineHeight: 1.48, color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {preview}
          </p>
        )}

        {/* Actions: outlets + buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
            {outlets.map((s, i) => (
              <span key={i} style={{ fontSize: '0.56rem', fontWeight: '700', padding: '2px 6px', borderRadius: '5px', marginRight: '3px', background: 'rgba(0,0,0,0.06)', color: '#6b7280' }}>
                {s.outlet}
              </span>
            ))}
            {moreCount > 0 && (
              <span style={{ fontSize: '0.56rem', fontWeight: '700', padding: '2px 6px', borderRadius: '5px', background: 'rgba(0,0,0,0.06)', color: '#6b7280' }}>
                +{moreCount}
              </span>
            )}
          </div>
          <button onClick={onRead} style={{ padding: '4px 10px', borderRadius: '7px', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', border: 'none' }}>
            Read
          </button>
          <button onClick={onPlay} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 10px', borderRadius: '7px', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', background: 'transparent', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>
            <Play size={9} fill="currentColor" style={{ marginLeft: '1px' }} />
            Play
          </button>
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
            whiteSpace: 'nowrap', cursor: 'pointer', border: 'none',
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
          const label  = CATEGORY_SHORT[cat] || cat;
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
              {icon && `${icon} `}{label}
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
      <div style={{ paddingBottom: playerVisible ? '9rem' : '5rem', display: loading ? 'none' : undefined }}>
        {visibleCats.length === 0 && (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#8a8a9a', fontSize: '0.88rem' }}>
            No stories available for this day.
          </div>
        )}
        {visibleCats.map(cat => {
          const catData  = briefingData[cat];
          const stories  = catData?.allStories || [];
          const color    = CATEGORY_COLORS[cat] || '#6366f1';
          const listenedSet = gamifiedStats?.todayProgress?.[cat]?.listenedIndices || new Set();
          if (stories.length === 0) return null;

          return (
            <div key={cat}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>
                    {CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ` : ''}{cat}
                  </span>
                </div>
                <span style={{ fontSize: '0.58rem', fontWeight: '700', color: '#c4c4d0' }}>
                  {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                </span>
              </div>

              {/* Stories */}
              {stories.map((story, idx) => (
                <StoryItem
                  key={idx}
                  story={story}
                  index={idx}
                  category={cat}
                  isRead={listenedSet.has(idx)}
                  isPlaying={isNarrating && activeCategory === cat && currentStoryIndex === idx}
                  onRead={() => handleRead(cat, idx)}
                  onPlay={() => onPlayStory?.(cat, idx)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
