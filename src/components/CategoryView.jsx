import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Loader } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

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
  const navigate = useNavigate();
  const color    = CATEGORY_COLORS[category] || '#6366f1';

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}` }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate('/')}
            style={{ width: '34px', height: '34px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={17} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Colored pill badge in header */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.18rem 0.6rem', background: `${color}15`, border: `1px solid ${color}35`, borderRadius: '999px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{category}</span>
            </div>
          </div>
          {stories.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: light.textMuted, fontWeight: '500', flexShrink: 0 }}>
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </span>
          )}
        </div>
      </header>

      {/* ── Category banner ── */}
      <div style={{ borderLeft: `3px solid ${color}`, marginLeft: '1.25rem', padding: '1rem 1.25rem 0.85rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '600px', margin: '0 auto', width: '100%', marginTop: '0.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.2rem', fontSize: '1.4rem', fontWeight: '900', color: light.text, letterSpacing: '-0.025em' }}>{category}</h1>
          {stories.length > 0 && (
            <p style={{ margin: 0, fontSize: '0.78rem', color: light.textMuted }}>{stories.length} stories · ~{Math.round(stories.length * 2.5)} min</p>
          )}
        </div>
        {stories.length > 0 && (
          <button onClick={() => onPlayFrom(0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: '999px', background: color, border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', boxShadow: `0 3px 12px ${color}40`, flexShrink: 0 }}>
            <Play size={13} fill="white" style={{ marginLeft: '1px' }} />
            Play All
          </button>
        )}
      </div>

      {/* ── Story list ── */}
      <div style={{ flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%', paddingBottom: miniPlayerVisible ? '6rem' : '2rem', borderLeft: `3px solid ${color}`, marginLeft: '1.25rem', marginTop: '0.25rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: light.textMuted }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.88rem' }}>Loading stories…</span>
          </div>
        ) : stories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: light.textMuted }}>
            <p style={{ fontSize: '0.88rem' }}>No stories available.</p>
          </div>
        ) : (
          stories.map((story, i) => {
            const isActive  = isNarrating && currentStoryIndex === i;
            const sources   = story.storySources?.filter(s => s.outlet) || [];
            const topSources = sources.slice(0, 2);
            const excerpt   = (story.tightBullets?.[0] || story.allBullets?.[0] || '').slice(0, 120);

            return (
              <div key={i}
                onClick={() => navigate(`/category/${encodeURIComponent(category)}/story/${i}`, { state: { from: 'category' } })}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1.25rem 0.85rem 0.9rem', background: isActive ? `${color}08` : 'transparent', borderTop: `1px solid ${light.border}`, cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = isActive ? `${color}10` : light.bgSub}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? `${color}08` : 'transparent'}
              >
                {/* Playing indicator */}
                {isActive && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.15rem' }}>
                    <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
                      {[0.6, 1, 0.8].map((h, j) => (
                        <span key={j} style={{ width: '2.5px', background: 'white', borderRadius: '1px', height: `${h * 12}px`, animation: `wave 0.8s ease-in-out ${j * 0.15}s infinite alternate` }} />
                      ))}
                    </span>
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 0.3rem', fontSize: '0.92rem', fontWeight: '700', color: light.text, lineHeight: 1.35 }}>
                    {story.headline}
                  </p>
                  {excerpt && (
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: light.textMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {excerpt}{excerpt.length === 120 ? '…' : ''}
                    </p>
                  )}
                  {/* Sources + read time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {topSources.map((s, j) => {
                      const icon = faviconUrl(s.url);
                      return (
                        <React.Fragment key={j}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.1rem 0.45rem', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '999px', textDecoration: 'none', transition: 'border-color 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = `${color}55`}
                            onMouseLeave={e => e.currentTarget.style.borderColor = light.border}
                          >
                            {icon && <img src={icon} alt="" width={11} height={11} style={{ borderRadius: '2px', opacity: 0.7 }} />}
                            <span style={{ fontSize: '0.7rem', color: light.textMuted, fontWeight: '500' }}>{s.outlet}</span>
                          </a>
                          {j < topSources.length - 1 && <span style={{ fontSize: '0.7rem', color: light.textMuted, opacity: 0.4 }}>·</span>}
                        </React.Fragment>
                      );
                    })}
                    {topSources.length > 0 && <span style={{ fontSize: '0.7rem', color: light.textMuted, opacity: 0.4 }}>·</span>}
                    <span style={{ fontSize: '0.72rem', color: light.textMuted }}>2 min read</span>
                  </div>
                </div>

                {/* Play button */}
                <button
                  onClick={e => { e.stopPropagation(); onPlayFrom(i); }}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: isActive ? color : light.bgSub, border: `1px solid ${isActive ? color : light.border}`, color: isActive ? 'white' : light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                  <Play size={13} fill="currentColor" style={{ marginLeft: '1px' }} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
