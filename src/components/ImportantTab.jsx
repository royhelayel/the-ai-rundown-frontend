import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Users, UserCircle } from 'lucide-react';
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

// Small avatar stack for showing who saved a story
function AvatarStack({ savers = [], size = 22 }) {
  const shown = savers.slice(0, 3);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((s, i) => (
        <div
          key={s.id}
          title={s.display_name || s.username}
          style={{
            width: size, height: size, borderRadius: '50%',
            background: s.avatar_color || '#6366f1',
            border: '2px solid #f5f5f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: '800', color: '#fff',
            marginLeft: i === 0 ? 0 : -size * 0.35,
            zIndex: shown.length - i,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {(s.display_name || s.username || '?')[0].toUpperCase()}
        </div>
      ))}
      {savers.length > 3 && (
        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: light.textMuted, marginLeft: 4 }}>
          +{savers.length - 3}
        </span>
      )}
    </div>
  );
}

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
  circleSaves = [],
  following = [],
}) {
  const navigate = useNavigate();
  useScrollRestore('/important');
  const [selectedCat, setSelectedCat] = useState(null);
  const [scope, setScope] = useState('mine'); // 'mine' | 'circle' | 'person'
  const [selectedPerson, setSelectedPerson] = useState(null); // { id, username, display_name, avatar_color }

  // === My Saves ===
  const enriched = savedStories.map(item => {
    const full = briefingData[item.category]?.allStories?.[item.storyIndex];
    return full ? { ...full, category: item.category, storyIndex: item.storyIndex } : item;
  });

  // === Circle Saves ===
  // circleSaves = [{ category, story_index, headline, preview, story_key, savers: [...], latest_at }]
  const circleEnriched = circleSaves.map(item => {
    const full = briefingData[item.category]?.allStories?.[item.story_index];
    const base = full
      ? { ...full, category: item.category, storyIndex: item.story_index }
      : { headline: item.headline, allBullets: [item.preview], category: item.category, storyIndex: item.story_index, storySources: [] };
    return { ...base, savers: item.savers || [] };
  });

  // === Per Person ===
  // Group circle saves by saver, then filter if a person is selected
  const peopleInCircle = following; // [{ id, username, display_name, avatar_color }]
  const perPersonStories = selectedPerson
    ? circleEnriched.filter(s => s.savers.some(sv => sv.id === selectedPerson.id))
    : circleEnriched;

  // Determine active list for category filter
  const activeList = scope === 'mine' ? enriched : scope === 'circle' ? circleEnriched : perPersonStories;
  const cats = [...new Set(activeList.map(s => s.category))];
  const filtered = selectedCat ? activeList.filter(s => s.category === selectedCat) : activeList;

  const hasCircleData = following.length > 0;
  const firstStory = filtered[0] || activeList[0];

  // Build playlist for reader: use the filtered list so nav matches what's visible
  const buildPlaylist = (list) => list.map(s => ({ category: s.category, storyIndex: s.storyIndex }));
  const openStory = (item, list = filtered) => {
    onSelectCategory?.(item.category);
    navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, {
      state: { from: '/important', playlist: buildPlaylist(list) },
    });
  };

  const tabs = [
    { id: 'mine',   label: 'My Saves',   icon: <Bookmark size={12} /> },
    { id: 'circle', label: 'Circle',     icon: <Users size={12} /> },
    { id: 'person', label: 'Per Person', icon: <UserCircle size={12} /> },
  ];

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

      {/* Title row */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: '1.55rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Interesting
        </h2>
        {firstStory && (
          <>
            <div className="ai-btn-wrap-read" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner-white"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => openStory(firstStory, activeList)}
              >
                Read
              </button>
            </div>
            <div className="ai-btn-wrap-play" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => onPlayStory?.(firstStory.category, firstStory.storyIndex)}
              >
                <Play size={11} fill="white" color="white" />
                Play
              </button>
            </div>
          </>
        )}
      </div>

      {/* My Saves | Circle | Per Person — only shown for signed-in users following someone */}
      {user && hasCircleData && (
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 16px 12px' }}>
          <div style={{ display: 'inline-flex', background: light.bgSub, borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setScope(tab.id); setSelectedCat(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 11px', borderRadius: '8px', border: 'none',
                  background: scope === tab.id ? '#fff' : 'transparent',
                  color: scope === tab.id ? light.text : light.textMuted,
                  fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                  boxShadow: scope === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Per Person: people picker row */}
      {scope === 'person' && (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px', minWidth: 'max-content' }}>
            <button
              onClick={() => setSelectedPerson(null)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: selectedPerson === null ? light.text : light.bgSub, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${selectedPerson === null ? light.text : light.border}` }}>
                <Users size={18} color={selectedPerson === null ? '#fff' : light.textMuted} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: selectedPerson === null ? light.text : light.textMuted }}>All</span>
            </button>
            {peopleInCircle.map(person => {
              const isActive = selectedPerson?.id === person.id;
              const initials = (person.display_name || person.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(isActive ? null : person)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: person.avatar_color || '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: '800', color: '#fff',
                    border: `2px solid ${isActive ? (person.avatar_color || '#6366f1') : 'transparent'}`,
                    opacity: isActive ? 1 : 0.7,
                    transition: 'all 0.15s',
                  }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: isActive ? light.text : light.textMuted, maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.display_name || person.username}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

        {/* My Saves empty state */}
        {scope === 'mine' && savedStories.length === 0 && (
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
        )}

        {/* Circle / Per Person empty state */}
        {(scope === 'circle' || scope === 'person') && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '1rem', textAlign: 'center' }}>
            <Users size={36} color={light.textMuted} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: light.textMuted, lineHeight: 1.55 }}>
              {scope === 'person' && selectedPerson
                ? `${selectedPerson.display_name || selectedPerson.username} hasn't saved anything yet.`
                : 'No one in your circle has saved anything yet.'}
            </p>
          </div>
        )}

        {/* Story cards */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 16px' }}>
            {filtered.map((item) => {
              const isRead = !!(gamifiedStats.todayProgress?.[item.category]?.listenedIndices?.has(item.storyIndex));
              return (
                <div key={`${item.category}|${item.storyIndex}`}>
                  {/* Avatar stack for circle/per-person views */}
                  {(scope === 'circle' || scope === 'person') && item.savers?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px 6px' }}>
                      <AvatarStack savers={item.savers} />
                      <span style={{ fontSize: '0.72rem', color: light.textMuted, fontWeight: '600' }}>
                        {item.savers.length === 1
                          ? `${item.savers[0].display_name || item.savers[0].username} saved this`
                          : `${item.savers.slice(0, 2).map(s => s.display_name || s.username).join(' & ')}${item.savers.length > 2 ? ` +${item.savers.length - 2}` : ''} saved this`}
                      </span>
                    </div>
                  )}
                  <StoryCard
                    story={item}
                    category={item.category}
                    isRead={user ? isRead : undefined}
                    savedCount={savedCounts[headlineKey(item.headline || '')] || 0}
                    onRead={() => openStory(item)}
                    onPlay={() => onPlayStory?.(item.category, item.storyIndex)}
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
