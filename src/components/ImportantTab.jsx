import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, User, Play, BookmarkCheck } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_SHORT } from '../theme';
import ProgressPill from './ProgressPill';

function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 16px' }}>
            {savedStories.map((item, idx) => {
              const color   = CATEGORY_COLORS[item.category] || '#6366f1';
              const icon    = CATEGORY_ICONS[item.category] || '';
              const short   = CATEGORY_SHORT[item.category] || item.category;
              const sources = (item.storySources || []).filter(s => s.outlet);
              const topSrcs = sources.slice(0, 2);
              const more    = sources.length - topSrcs.length;
              const goRead  = () => { onSelectCategory?.(item.category); navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, { state: { from: '/important' } }); };
              return (
                <div
                  key={`${item.category}|${item.storyIndex}`}
                  onClick={goRead}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.07)', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Category + remove */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {icon ? `${icon} ` : ''}{short}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); onRemoveSaved?.(item.category, item.storyIndex); }}
                        title="Remove"
                        style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7c3aed', flexShrink: 0 }}>
                        <BookmarkCheck size={12} />
                      </button>
                    </div>

                    {/* Headline */}
                    <p style={{ margin: '0 0 5px', fontSize: '0.88rem', fontWeight: '700', color: '#0a0a0f', lineHeight: 1.32 }}>
                      {item.headline}
                    </p>

                    {/* Preview */}
                    {item.preview && (
                      <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.48, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.preview}
                      </p>
                    )}

                    {/* Sources + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: '4px' }}>
                        {topSrcs.map((s, i) => {
                          const fav = faviconUrl(s.url);
                          return (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.6rem', fontWeight: '600', color: '#6b7280' }}>
                              {fav && <img src={fav} alt="" width={10} height={10} style={{ borderRadius: '2px', opacity: 0.7 }} />}
                              {s.outlet}
                            </span>
                          );
                        })}
                        {more > 0 && <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9ca3af' }}>+{more}</span>}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); goRead(); }}
                        style={{ padding: '4px 10px', borderRadius: '7px', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', border: 'none', flexShrink: 0 }}
                      >
                        Read
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onPlayStory?.(item.category, item.storyIndex); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${color}40`, background: `${color}15`, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <Play size={10} fill={color} color={color} style={{ marginLeft: '1px' }} />
                      </button>
                    </div>
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
