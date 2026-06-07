import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play } from 'lucide-react';
import ProgressPill from './ProgressPill';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import CategoryIcon from './CategoryIcon';
import useScrollRestore from '../hooks/useScrollRestore';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import { headlineKey } from './PopularTab';

const light = {
  bg:        '#f5f5f7',
  bgCard:    '#ffffff',
  bgSub:     '#ececef',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

export default function ImportantTab({
  savedStories = [],
  savedCounts = {},
  briefingData = {},
  onRemoveSaved,
  onSelectCategory,
  onPlayStory,
  user,
  onShowAuth,
  playerVisible,
  challengeStats,
  gamifiedStats = {},
}) {
  const navigate = useNavigate();
  useScrollRestore('/important');
  const [selectedCat, setSelectedCat] = useState(null);

  // Enrich saved story stubs with full story data from briefingData
  const enriched = savedStories.map(item => {
    const full = briefingData[item.category]?.allStories?.[item.storyIndex];
    return full ? { ...full, category: item.category, storyIndex: item.storyIndex } : item;
  });

  // Unique categories present in saved stories
  const cats = [...new Set(enriched.map(s => s.category))];
  const filtered = selectedCat ? enriched.filter(s => s.category === selectedCat) : enriched;

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        .imp-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>

      <FeedHeader user={user} onShowAuth={onShowAuth} />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: '4px' }}>
        <ProgressPill challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
      </div>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: '1.55rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Interesting
        </h2>
        {enriched.length > 0 && (
          <>
            <div className="ai-btn-wrap-read" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner-white"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => { onSelectCategory?.(enriched[0].category); navigate(`/category/${encodeURIComponent(enriched[0].category)}/story/${enriched[0].storyIndex}`, { state: { from: '/important' } }); }}
              >
                Read
              </button>
            </div>
            <div className="ai-btn-wrap-play" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => onPlayStory?.(enriched[0].category, enriched[0].storyIndex)}
              >
                <Play size={11} fill="white" color="white" />
                Play
              </button>
            </div>
          </>
        )}
      </div>

      {/* Category filter pills */}
      {cats.length > 1 && (
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
        {savedStories.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bookmark size={22} color={light.textMuted} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: '800', color: light.text }}>Nothing saved yet</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: light.textMuted, lineHeight: 1.55 }}>
                While reading a story, tap the bookmark icon to save it here.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              style={{ padding: '0.65rem 1.6rem', background: light.text, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}>
              Browse Stories
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 16px' }}>
            {filtered.map((item) => {
              const isRead = !!(gamifiedStats.todayProgress?.[item.category]?.listenedIndices?.has(item.storyIndex));
              return (
                <StoryCard
                  key={`${item.category}|${item.storyIndex}`}
                  story={item}
                  category={item.category}
                  isRead={user ? isRead : undefined}
                  savedCount={savedCounts[headlineKey(item.headline || '')] || 0}
                  onRead={() => { onSelectCategory?.(item.category); navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, { state: { from: '/important' } }); }}
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
