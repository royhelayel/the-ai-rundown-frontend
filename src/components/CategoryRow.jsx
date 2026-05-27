import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronRight } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import { readTime } from '../utils';

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

export default function CategoryRow({ cat, catData, onOpen, onPlay, fromPath }) {
  const navigate = useNavigate();
  const color = CATEGORY_COLORS[cat] || light.accent;
  const info = catData || null;

  const handleOpen = () => {
    onOpen(cat);
    navigate(`/category/${encodeURIComponent(cat)}`);
  };

  return (
    <div style={{ marginBottom: '1rem', marginLeft: '1.25rem', marginRight: '1.25rem', borderLeft: `3px solid ${color}`, background: light.bgSub, borderRadius: '12px', overflow: 'hidden' }}>

      {/* ── Category header ── */}
      <div
        onClick={handleOpen}
        style={{ padding: '0.7rem 1rem 0.65rem 0.9rem', cursor: 'pointer', userSelect: 'none', background: `${color}12` }}
        onMouseEnter={e => e.currentTarget.style.background = `${color}1e`}
        onMouseLeave={e => e.currentTarget.style.background = `${color}12`}
      >
        {/* Row 1: pill + Play + See all */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: `${color}20`, border: `1px solid ${color}40`, borderRadius: '999px', flexShrink: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{cat}</span>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={e => { e.stopPropagation(); onPlay(cat); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.65rem', borderRadius: '999px', border: `1px solid ${color}40`, background: `${color}18`, color: color, cursor: 'pointer', fontSize: '0.7rem', fontWeight: '700' }}>
            <Play size={10} fill={color} color={color} style={{ marginLeft: '1px' }} />
            Play
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: '700', color: color }}>
            See all <ChevronRight size={13} />
          </span>
        </div>

        {/* Row 2: story count + time */}
        {info && (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.71rem', color: `${color}aa`, fontWeight: '500' }}>
            {info.storyCount} {info.storyCount === 1 ? 'story' : 'stories'} · ~{info.estimatedMin} min
          </p>
        )}
      </div>

      {/* ── Story list ── */}
      {info && info.previewStories?.length > 0 ? (
        <div>
          {info.previewStories.map((story, i) => {
            const sources = story.storySources?.filter(s => s.outlet) || [];
            const topSources = sources.slice(0, 2);
            const excerpt = (story.tightBullets?.[0] || story.allBullets?.[0] || '').slice(0, 120);
            return (
              <div key={i}
                onClick={() => { onOpen(cat); navigate(`/category/${encodeURIComponent(cat)}/story/${i}`, { state: { from: fromPath || 'home' } }); }}
                style={{ display: 'flex', alignItems: 'flex-start', padding: '0.8rem 1.25rem 0.8rem 0.9rem', borderTop: `1px solid ${light.border}`, cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 0.3rem', fontSize: '0.92rem', fontWeight: '700', color: light.text, lineHeight: 1.35 }}>
                    {story.headline}
                  </p>
                  {excerpt && (
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: light.textMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {excerpt}{excerpt.length === 120 ? '…' : ''}
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
