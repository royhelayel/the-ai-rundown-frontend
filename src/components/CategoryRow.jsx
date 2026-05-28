import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_IMAGES } from '../theme';
import { readTime } from '../utils';

const WAVE_STYLE = `
  @keyframes cr-wave {
    from { transform: scaleY(0.4); }
    to   { transform: scaleY(1); }
  }
  .cat-img-bg { transform-origin: center; }
  div:hover > .cat-img-bg { transform: scale(1.04); }
`;

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
  accent:    '#6366f1',
};

function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

export default function CategoryRow({ cat, catData, onOpen, onPlay, onPlayStory, onMarkRead, isNarrating, activeCategory, activeStoryIndex, fromPath }) {
  const navigate = useNavigate();
  const color = CATEGORY_COLORS[cat] || light.accent;
  const image = CATEGORY_IMAGES[cat] || null;
  const info = catData || null;

  const handleOpen = () => {
    onOpen(cat);
    navigate(`/category/${encodeURIComponent(cat)}`);
  };

  return (
    <div style={{ marginBottom: '1rem', marginLeft: '1.25rem', marginRight: '1.25rem', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
      <style>{WAVE_STYLE}</style>

      {/* ── Category header — Option B: tall image + diagonal overlay ── */}
      <div
        onClick={handleOpen}
        style={{ height: '175px', position: 'relative', overflow: 'hidden', cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Background image (or solid color fallback) */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: image ? `url(${image})` : 'none',
          backgroundColor: image ? 'transparent' : color,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transition: 'transform 0.4s ease',
        }} className="cat-img-bg" />

        {/* Diagonal dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, transparent 25%, rgba(0,0,0,0.88) 100%)' }} />

        {/* Subtle category colour tint */}
        <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.18 }} />

        {/* Content pinned to bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: 'white', letterSpacing: '-0.025em', lineHeight: 1.2 }}>{cat}</div>
            {info && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: '2px' }}>{info.storyCount} {info.storyCount === 1 ? 'story' : 'stories'} · ~{info.estimatedMin} min</div>}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onPlay(cat); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'white', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
            <Play size={9} fill="white" color="white" style={{ marginLeft: '1px' }} />
            Play
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.8)', flexShrink: 0 }}>
            See all <ChevronRight size={12} />
          </span>
        </div>
      </div>

      {/* ── Story list ── */}
      {info && info.previewStories?.length > 0 ? (
        <div>
          {info.previewStories.map((story, i) => {
            const sources = story.storySources?.filter(s => s.outlet) || [];
            const topSources = sources.slice(0, 2);
            const excerpt = (story.tightBullets?.[0] || story.allBullets?.[0] || '').slice(0, 200);
            const isActive = isNarrating && activeCategory === cat && activeStoryIndex === i;
            return (
              <div key={i}
                onClick={() => { onOpen(cat); onMarkRead?.(story, cat, i); navigate(`/category/${encodeURIComponent(cat)}/story/${i}`, { state: { from: fromPath || 'home' } }); }}
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
                    <span style={{ fontSize: '0.72rem', color: light.textMuted }}>{readTime(story)}</span>
                  </div>
                </div>

                {/* Per-story play button */}
                <button
                  onClick={e => { e.stopPropagation(); onPlayStory?.(cat, i); }}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', border: `1px solid ${isActive ? color : light.border}`, background: isActive ? color : light.bg, color: isActive ? 'white' : light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem', transition: 'all 0.15s' }}
                >
                  {isActive ? (
                    <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '11px' }}>
                      {[0.6, 1, 0.8].map((h, j) => (
                        <span key={j} style={{ width: '2px', background: 'white', borderRadius: '1px', height: `${h * 11}px`, animation: `cr-wave 0.8s ease-in-out ${j * 0.15}s infinite alternate` }} />
                      ))}
                    </span>
                  ) : (
                    <Play size={11} fill="currentColor" style={{ marginLeft: '1px' }} />
                  )}
                </button>
              </div>
            );
          })}

          {/* View all */}
          {info.storyCount > info.previewStories.length && (
            <div
              onClick={handleOpen}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.7rem', borderTop: `1px solid ${light.border}`, cursor: 'pointer', color: color, fontSize: '0.8rem', fontWeight: '600' }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}08`}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              View all {info.storyCount} stories <ChevronRight size={14} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '0.75rem 0.9rem', borderTop: `1px solid ${light.border}` }}>
          <span style={{ fontSize: '0.82rem', color: light.textMuted }}>
            {catData === undefined ? 'Loading…' : 'Not available'}
          </span>
        </div>
      )}
    </div>
  );
}
