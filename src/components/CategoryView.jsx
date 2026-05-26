import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, Loader } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES } from '../theme';

export default function CategoryView({
  category,
  stories,
  isLoading,
  isNarrating,
  isPaused,
  currentStoryIndex,
  onPlayFrom,
  miniPlayerVisible,
}) {
  const navigate   = useNavigate();
  const color      = CATEGORY_COLORS[category] || colors.accent;
  const image      = CATEGORY_IMAGES[category];

  return (
    <div style={{ background: colors.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${colors.bg}; margin: 0; } ::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${colors.bg}ee`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '1rem', fontWeight: '800', color: colors.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{category}</span>
          </div>
          {stories.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: '500', flexShrink: 0 }}>
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </span>
          )}
        </div>
      </header>

      {/* ── Hero image ── */}
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden', flexShrink: 0 }}>
        {image && <img src={image} alt={category} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.5)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent, ${colors.bg})` }} />
        <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem', right: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={() => onPlayFrom(0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '999px', background: color, border: 'none', color: 'white', fontSize: '0.88rem', fontWeight: '800', cursor: 'pointer', boxShadow: `0 4px 20px ${color}55` }}>
            <Play size={15} fill="white" style={{ marginLeft: '1px' }} />
            Play All
          </button>
        </div>
      </div>

      {/* ── Story list ── */}
      <div style={{ flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: miniPlayerVisible ? '6rem' : '2rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: colors.textMuted }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.88rem' }}>Loading stories…</span>
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: colors.textMuted }}>
            <p style={{ fontSize: '0.88rem' }}>No stories available for this selection.</p>
          </div>
        ) : (
          stories.map((story, i) => {
            const isActive = isNarrating && currentStoryIndex === i;
            return (
              <button key={i}
                onClick={() => navigate(`/category/${encodeURIComponent(category)}/story/${i}`)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', width: '100%', padding: '1rem 1.25rem', background: isActive ? `${color}12` : 'transparent', border: 'none', borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}>

                {/* Index / playing indicator */}
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isActive ? color : colors.bgCard, border: `1px solid ${isActive ? color : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                  {isActive
                    ? <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
                        {[0.6, 1, 0.8].map((h, j) => (
                          <span key={j} style={{ width: '3px', background: 'white', borderRadius: '1px', height: `${h * 14}px`, animation: `wave 0.8s ease-in-out ${j * 0.15}s infinite alternate` }} />
                        ))}
                      </span>
                    : <span style={{ fontSize: '0.75rem', fontWeight: '700', color: colors.textMuted }}>{i + 1}</span>
                  }
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 0.3rem', fontSize: '0.93rem', fontWeight: '700', color: colors.text, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {story.headline}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: colors.textMuted, fontWeight: '500' }}>2 min read</p>
                </div>

                {/* Play button */}
                <button onClick={e => { e.stopPropagation(); onPlayFrom(i); }}
                  style={{ width: '34px', height: '34px', borderRadius: '50%', background: isActive ? color : 'rgba(255,255,255,0.07)', border: 'none', color: isActive ? 'white' : colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Play size={14} fill="currentColor" style={{ marginLeft: '1px' }} />
                </button>

              </button>
            );
          })
        )}
      </div>
      <style>{`@keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}
