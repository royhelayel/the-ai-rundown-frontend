import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, User, Play, BookmarkCheck } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import ProgressPill from './ProgressPill';

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

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,245,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 20px 10px' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>Important</span>
          <button onClick={() => navigate('/settings')} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>
            <User size={16} />
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <ProgressPill challengeStats={challengeStats} />
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {savedStories.map((item, idx) => {
              const color = CATEGORY_COLORS[item.category] || '#6366f1';
              return (
                <div key={`${item.category}|${item.storyIndex}`} style={{
                  padding: '1rem 1.25rem',
                  borderBottom: `1px solid ${light.border}`,
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                }}>
                  {/* Category + remove button row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.18rem 0.55rem', background: `${color}12`, border: `1px solid ${color}28`, borderRadius: '999px', fontSize: '0.65rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.category}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => onRemoveSaved?.(item.category, item.storyIndex)}
                      title="Remove from Important"
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c3aed', flexShrink: 0 }}>
                      <BookmarkCheck size={13} />
                    </button>
                  </div>

                  {/* Headline */}
                  <h3
                    onClick={() => { onSelectCategory?.(item.category); navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, { state: { from: '/important' } }); }}
                    style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: light.text, lineHeight: 1.35, cursor: 'pointer' }}>
                    {item.headline}
                  </h3>

                  {/* Preview */}
                  {item.preview && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: light.textMuted, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.preview}
                    </p>
                  )}

                  {/* Actions row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => { onSelectCategory?.(item.category); navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, { state: { from: '/important' } }); }}
                      style={{ padding: '0.38rem 0.9rem', background: `${color}12`, border: `1px solid ${color}28`, borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', color: color, cursor: 'pointer' }}>
                      Read
                    </button>
                    <button
                      onClick={() => onPlayStory?.(item.category, item.storyIndex)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.38rem 0.9rem', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700', color: light.textMuted, cursor: 'pointer' }}>
                      <Play size={11} fill="currentColor" style={{ marginLeft: '1px' }} />
                      Play
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
