import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import ProgressPill from './ProgressPill';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import useScrollRestore from '../hooks/useScrollRestore';

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
  briefingData = {},
  onRemoveSaved,
  onSelectCategory,
  onPlayStory,
  user,
  onShowAuth,
  playerVisible,
  challengeStats,
}) {
  const navigate = useNavigate();
  useScrollRestore('/important');

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <FeedHeader user={user} onShowAuth={onShowAuth} />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: '4px' }}>
        <ProgressPill challengeStats={challengeStats} />
      </div>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '20px 20px 16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.55rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Important
        </h2>
      </div>

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
            {savedStories.map((item) => (
              <StoryCard
                key={`${item.category}|${item.storyIndex}`}
                story={item}
                category={item.category}
                onRead={() => { onSelectCategory?.(item.category); navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, { state: { from: '/important' } }); }}
                onPlay={() => onPlayStory?.(item.category, item.storyIndex)}
                removeButton={
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveSaved?.(item.category, item.storyIndex); }}
                    title="Remove"
                    style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c3aed', flexShrink: 0 }}
                  >
                    <BookmarkCheck size={12} />
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
