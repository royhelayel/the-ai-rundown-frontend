import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play } from 'lucide-react';
import { SkeletonCategoryView } from './SkeletonScreens';
import { CATEGORY_COLORS, CATEGORY_IMAGES } from '../theme';
import { readTime } from '../utils';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const WAVE_STYLE = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes wave  { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
  @keyframes cr-wave { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
  .cv-img-bg { transform-origin: center; transition: transform 0.4s ease; }
  .cv-img-wrap:hover .cv-img-bg { transform: scale(1.04); }
  ::-webkit-scrollbar { display: none; }
`;

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
  onMarkRead,
}) {
  const navigate = useNavigate();
  const color  = CATEGORY_COLORS[category] || '#6366f1';
  const image  = CATEGORY_IMAGES[category] || null;
  const totalMin = Math.round(stories.length * 2.5);

  return (
    <div style={{ background: light.bgSub, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{WAVE_STYLE}</style>

      {/* ── Sticky header — back + category pill ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}` }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(-1)}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: `${color}15`, border: `1px solid ${color}35`, borderRadius: '999px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{category}</span>
          </div>
          <div style={{ flex: 1 }} />
          {stories.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: light.textMuted, fontWeight: '500' }}>
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </span>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '1rem 1.25rem', paddingBottom: miniPlayerVisible ? '8rem' : '3.5rem' }}>

        {/* ── Skeleton while loading ── */}
        {isLoading ? (
          <SkeletonCategoryView />
        ) : (

        /* ── Immersive image header — same as CategoryRow Option B ── */
        <div className="cv-img-wrap" style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <div style={{ height: '240px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
            <div className="cv-img-bg" style={{
              position: 'absolute', inset: 0,
              backgroundImage: image ? `url(${image})` : 'none',
              backgroundColor: image ? 'transparent' : color,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, transparent 25%, rgba(0,0,0,0.88) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.18 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', letterSpacing: '-0.025em', lineHeight: 1.2 }}>{category}</div>
                {stories.length > 0 && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: '3px' }}>{stories.length} {stories.length === 1 ? 'story' : 'stories'} · ~{totalMin} min</div>}
              </div>
              {stories.length > 0 && (
                <button onClick={() => onPlayFrom(0)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'white', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                  <Play size={9} fill="white" color="white" style={{ marginLeft: '1px' }} />
                  Play All
                </button>
              )}
            </div>
          </div>

          {/* ── Story list — card-wrapped, white rows ── */}
          {stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: light.textMuted, background: light.bg }}>
              <p style={{ fontSize: '0.88rem' }}>No stories available.</p>
            </div>
          ) : (
            stories.map((story, i) => {
              const isActive   = isNarrating && currentStoryIndex === i;
              const sources    = story.storySources?.filter(s => s.outlet) || [];
              const topSources = sources.slice(0, 2);
              const excerpt    = (story.tightBullets?.[0] || story.allBullets?.[0] || '').slice(0, 200);
              return (
                <div key={i}
                  onClick={() => { onMarkRead?.(story, category, i); navigate(`/category/${encodeURIComponent(category)}/story/${i}`, { state: { from: 'category' } }); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1.35rem 0.9rem', borderTop: `1px solid ${light.border}`, cursor: 'pointer', transition: 'background 0.12s', background: isActive ? `${color}08` : light.bg }}
                  onMouseEnter={e => e.currentTarget.style.background = isActive ? `${color}10` : light.bgSub}
                  onMouseLeave={e => e.currentTarget.style.background = isActive ? `${color}08` : light.bg}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.92rem', fontWeight: '700', color: light.text, lineHeight: 1.35 }}>
                      {story.headline}
                    </p>
                    {excerpt && (
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: light.textMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {excerpt}{excerpt.length === 200 ? '…' : ''}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {topSources.map((s, j) => {
                        const icon = faviconUrl(s.url);
                        return (
                          <React.Fragment key={j}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer"
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
                      <span style={{ fontSize: '0.72rem', color: light.textMuted }}>{readTime(story)}</span>
                    </div>
                  </div>

                  {/* Per-story play button */}
                  <button
                    onClick={e => { e.stopPropagation(); onPlayFrom(i); }}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', border: `1px solid ${isActive ? color : light.border}`, background: isActive ? color : light.bg, color: isActive ? 'white' : light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem', transition: 'all 0.15s' }}
                  >
                    {isActive ? (
                      <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '11px' }}>
                        {[0.6, 1, 0.8].map((h, j) => (
                          <span key={j} style={{ width: '2.5px', background: 'white', borderRadius: '1px', height: `${h * 11}px`, animation: `wave 0.8s ease-in-out ${j * 0.15}s infinite alternate` }} />
                        ))}
                      </span>
                    ) : (
                      <Play size={11} fill="currentColor" style={{ marginLeft: '1px' }} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
        )}
      </div>
    </div>
  );
}
