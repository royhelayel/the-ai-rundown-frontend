import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Play, User } from 'lucide-react';
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
  user,
  onShowAuth,
  categoryProgress = {},
}) {

  const navigate = useNavigate();
  const location = useLocation();
  const color  = CATEGORY_COLORS[category] || '#6366f1';

  const goBack = () => {
    const from = location.state?.from;
    if (!from || from === '/' || from === 'home') navigate('/');
    else if (from === '/my-feed') navigate('/my-feed');
    else if (typeof from === 'string' && from.startsWith('/feed/')) navigate(from);
    else navigate('/');
  };
  const image  = CATEGORY_IMAGES[category] || null;
  const totalMin = Math.round(stories.length * 2.5);

  return (
    <div style={{ background: light.bgSub, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{WAVE_STYLE}</style>

      {/* ── Sticky header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.75rem 1.25rem' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button onClick={goBack}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={15} />
          </button>
          <span className="header-brand" style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={user ? () => navigate('/settings') : onShowAuth}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: light.textMuted, flexShrink: 0 }}>
            <User size={16} />
          </button>
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
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{category}</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', letterSpacing: '-0.025em', lineHeight: 1.2 }}>{category}</div>
                {stories.length > 0 && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: '3px' }}>{stories.length} {stories.length === 1 ? 'story' : 'stories'} · ~{totalMin} min</div>}
              </div>
              {stories.length > 0 && (
                <div className="ai-btn-wrap" style={{ flexShrink: 0 }}>
                  <button className="ai-btn-inner" onClick={() => onPlayFrom(0)}>
                    <Play size={13} fill="white" style={{ marginLeft: '1px', flexShrink: 0 }} />
                    {isNarrating ? 'Playing…' : 'Play All'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Today's progress for this category ── */}
          {!isLoading && stories.length > 0 && !user && (
            <div style={{ padding: '0.75rem 0.9rem 0.25rem', background: light.bg }}>
              <button onClick={onShowAuth}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '99px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = light.border}
              >
                <span style={{ fontSize: '0.75rem' }}>🔒</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: light.textMuted }}>Sign in to track your reading progress</span>
              </button>
            </div>
          )}
          {!isLoading && stories.length > 0 && user && (() => {
            const listened = categoryProgress?.listened || 0;
            const total    = categoryProgress?.total    || 0;
            const done     = categoryProgress?.done     || false;
            const pct      = categoryProgress?.pct      || 0;
            if (total === 0) return null;
            const msg = done
              ? { icon: '✅', text: `${listened} out of ${total} stories read. You are fully caught up!`, color: '#15803d', bg: 'rgba(22,163,74,0.07)', border: 'rgba(22,163,74,0.2)' }
              : { icon: listened > 0 ? '🔥' : '👇', text: `${listened} out of ${total} stories read. ${listened > 0 ? 'You are almost there, continue reading!' : 'Continue reading to be fully caught up!'}`, color: listened > 0 ? '#92400e' : light.textMuted, bg: listened > 0 ? 'rgba(251,146,60,0.07)' : 'transparent', border: listened > 0 ? 'rgba(251,146,60,0.2)' : 'transparent' };
            return (
              <div style={{ padding: '0.75rem 0.9rem 0.25rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: light.bg }}>
                {/* Progress pill */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '99px', padding: '5px 10px 5px 8px', flexShrink: 0 }}>
                  <div style={{ height: '4px', width: '48px', borderRadius: '99px', background: `${color}22`, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: done ? '#16a34a' : color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: done ? '#15803d' : light.text, flexShrink: 0 }}>{listened}/{total}</span>
                  {done && <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>✅</span>}
                </div>
                {/* Message */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: msg.bg, border: `1px solid ${msg.border}`, borderRadius: '99px', padding: '5px 12px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.78rem', lineHeight: 1 }}>{msg.icon}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: msg.color }}>{msg.text}</span>
                </div>
              </div>
            );
          })()}

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
                  onClick={() => { onMarkRead?.(story, category, i); navigate(`/category/${encodeURIComponent(category)}/story/${i}`, { state: { from: 'category', feedFrom: location.state?.from } }); }}
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
