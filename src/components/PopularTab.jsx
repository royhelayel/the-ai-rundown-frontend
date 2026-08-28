import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Globe } from 'lucide-react';
import { SkeletonPopularList } from './SkeletonScreens';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';
import { rankStories } from '../utils';
import { CATEGORY_SHORT } from '../theme';

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

// Popular — only the stories that have been read, ranked by most read. The category
// strip lists just the categories that have read stories (+ All) and filters the list.
export default function PopularTab({
  briefingData, briefingLoading, listenCounts, savedCounts = {},
  defaultCategories,
  onSelectCategory, onPlayCategory, onMarkRead,
  isNarrating, playerVisible,
  user, onShowAuth,
  challengeStats, gamifiedStats = {},
  circlePopular = [],
  selectedDay, availableDays = [], onSelectDay,
  onEnterStories, onEnterSummaries, onEnterAudio,
  savedStories = [], onToggleSaved,
}) {
  const navigate = useNavigate();
  useScrollRestore('/popular');
  const [selectedCat, setSelectedCat] = useState(null);
  const [scope, setScope] = useState('everyone'); // 'everyone' | 'circle'

  // Flatten all stories across all categories.
  // listenCount = stored count OR 1 if the current user has read the story today.
  const allStories = [];
  defaultCategories.forEach(cat => {
    const d = briefingData[cat];
    if (!d?.allStories?.length) return;
    const readToday = gamifiedStats?.todayProgress?.[cat]?.listenedIndices;
    d.allStories.forEach((story, idx) => {
      const key = headlineKey(story.headline);
      const stored = listenCounts[key] || 0;
      const userRead = readToday?.has(idx) ? 1 : 0;
      const listenCount = Math.max(stored, userRead);
      // interestCount is the second sort key; rankKey is the last. Both are content-based,
      // so they mean the same thing here as in the playlist App builds for Swipe mode.
      allStories.push({
        ...story, category: cat, storyIndex: idx, listenCount,
        interestCount: savedCounts[key] || 0, rankKey: key,
      });
    });
  });

  const hasAnyData    = allStories.length > 0;
  const hasAnyListens = allStories.some(s => s.listenCount > 0);

  // === Everyone view === only read stories: most-read, then most-saved, then stable order.
  const sorted = rankStories(allStories.filter(s => s.listenCount > 0), 'reads');

  // === Circle view ===
  const circleStories = circlePopular.map(cp => {
    const story = briefingData[cp.category]?.allStories?.[cp.story_index];
    if (!story) return null;
    return { ...story, category: cp.category, storyIndex: cp.story_index, listenCount: cp.circleCount };
  }).filter(Boolean);

  const activeList = scope === 'circle' ? circleStories : sorted;
  const cats = [...new Set(activeList.map(s => s.category))];
  const filtered = selectedCat ? activeList.filter(s => s.category === selectedCat) : activeList;

  // The same progress rail as the other scroll screens, on the same rule: it marks the
  // story currently under the header, so it moves both ways as you scroll. Popular renders
  // a flat ranked list rather than StoryList, so it tracks its own position — but with the
  // identical observer geometry, or the rail would mean something different here.
  const [railIdx, setRailIdx] = useState(-1);
  useEffect(() => { setRailIdx(-1); }, [selectedCat, scope]);
  const focusObsRef = useRef(null);
  const cardCbRef = useRef(new Map());
  const getFocusObserver = () => {
    if (focusObsRef.current) return focusObsRef.current;
    focusObsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting && e.target.__idx != null) setRailIdx(e.target.__idx); });
    }, { rootMargin: '-150px 0px -65% 0px', threshold: 0 });
    return focusObsRef.current;
  };
  useEffect(() => () => focusObsRef.current?.disconnect(), []);
  // Cached per index so the ref identity is stable — a fresh callback each render would
  // detach and re-attach every card on every render.
  const observeCard = (i) => {
    let cb = cardCbRef.current.get(i);
    if (!cb) {
      cb = (el) => { if (!el) return; el.__idx = i; getFocusObserver().observe(el); };
      cardCbRef.current.set(i, cb);
    }
    return cb;
  };

  const handleStoryClick = (cat, storyIndex, list = activeList) => {
    onSelectCategory(cat);
    const playlist = list.map(s => ({ category: s.category, storyIndex: s.storyIndex }));
    navigate(`/category/${encodeURIComponent(cat)}/story/${storyIndex}`, { state: { from: '/popular', playlist } });
  };

  const hasCircle = circlePopular.length > 0;
  const subtitle = selectedCat
    ? `${CATEGORY_SHORT[selectedCat] || selectedCat} · ${filtered.length} stories`
    : (filtered.length > 0 ? `${filtered.length} stories` : undefined);

  return (
    <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${bg}; margin: 0; } ::-webkit-scrollbar { display: none; } .pop-cat-strip::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <FeedHeader feedName="Popular" user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay} challengeStats={challengeStats} viewMode="feed" onChangeViewMode={(m) => { if (m === 'stories') onEnterStories?.(); else if (m === 'summaries') onEnterSummaries?.(); }} onEnterStories={onEnterStories} onEnterSummaries={onEnterSummaries} onEnterAudio={onEnterAudio}
        categories={!briefingLoading && cats.length > 1 ? cats : []} activeCategory={selectedCat} onSelectCategory={(cat) => setSelectedCat(cat === selectedCat ? null : cat)} showAllPill subtitle={subtitle}
        // The lens row was missing here entirely, so arriving at Popular had no way back to
        // Latest or across to Interesting except the browser's own back button — it read as
        // the Popular option vanishing rather than as "you're already on it".
        showLens lens="popular"
        onChangeLens={(l) => { if (l === 'latest') navigate('/'); else if (l === 'interesting') navigate('/important'); }}
        corpus="all"
        onChangeCorpus={(c) => navigate(c === 'mine' ? '/my-feed' : '/')}
        progressListened={railIdx + 1} progressTotal={filtered.length} />


      {/* Everyone | Circle toggle — only shown when the user follows someone */}
      {user && hasCircle && (
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 16px 12px' }}>
          <div style={{ display: 'inline-flex', background: light.bgSub, borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {[
              { id: 'everyone', label: 'Everyone', icon: <Globe size={13} /> },
              { id: 'circle',   label: 'Circle',   icon: <Users size={13} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setScope(tab.id); setSelectedCat(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 14px', borderRadius: '8px', border: 'none',
                  background: scope === tab.id ? '#fff' : 'transparent',
                  color: scope === tab.id ? light.text : light.textMuted,
                  fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
                  boxShadow: scope === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 1rem', paddingBottom: playerVisible ? '8rem' : '3.5rem' }}>

        {/* Circle empty state */}
        {scope === 'circle' && circleStories.length === 0 && (
          <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(99,102,241,0.06)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={18} color="#6366f1" />
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', lineHeight: 1.45 }}>
              No one in your circle has read anything yet. Check back later!
            </p>
          </div>
        )}

        {/* Empty-state banner: no listens yet (everyone view) */}
        {scope === 'everyone' && hasAnyData && !hasAnyListens && (
          <div style={{ padding: '0.9rem 1.1rem', background: `rgba(99,102,241,0.06)`, borderRadius: '12px', border: `1px solid rgba(99,102,241,0.15)`, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>⏳</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', lineHeight: 1.45 }}>
              We're compiling the list, check back soon.
            </p>
          </div>
        )}

        {briefingLoading && scope === 'everyone' ? (
          <SkeletonPopularList count={7} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((story, i) => {
              const isRead = !!(gamifiedStats.todayProgress?.[story.category]?.listenedIndices?.has(story.storyIndex));
              return (
                <div key={`${story.category}-${story.storyIndex}`} ref={observeCard(i)}>
                  <StoryCard
                    story={story}
                    category={story.category}
                    listenCount={story.listenCount}
                    isRead={user ? isRead : undefined}
                    isSaved={savedStories.some(s => headlineKey(s.headline || '') === headlineKey(story.headline || ''))}
                    onToggleSaved={() => onToggleSaved?.(story, story.category, story.storyIndex)}
                    onRead={() => handleStoryClick(story.category, story.storyIndex, filtered)}
                    onSeen={() => onMarkRead?.(story, story.category, story.storyIndex)}
                    onPlay={() => { onSelectCategory(story.category); onPlayCategory(story.category); }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
