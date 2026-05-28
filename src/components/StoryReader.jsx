import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import { readTime } from '../utils';

function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

// Light-mode tokens used only in read view
const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

export default function StoryReader({
  category,
  story,
  storyIndex,
  stories,
  onPlayFrom,
  isNarrating,
  isPaused,
  miniPlayerVisible,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('takeaways'); // 'takeaways' | 'summary'
  const color = CATEGORY_COLORS[category] || '#6366f1';

  const goBack = () => {
    const from = location.state?.from;
    if (from === 'home' || from === '/') navigate('/');
    else if (from === '/my-feed') navigate('/my-feed');
    else if (from === 'popular') navigate('/popular');
    else if (from === 'category') navigate(`/category/${encodeURIComponent(category)}`);
    else navigate(-1); // fallback: browser history back
  };

  if (!story) return null;

  const bullets  = story.allBullets || story.tightBullets || [];
  const hasPrev  = storyIndex > 0;
  const hasNext  = storyIndex < stories.length - 1;

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: `${light.bg}f0`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${light.border}`,
      }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={goBack}
            style={{ width: '34px', height: '34px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={17} />
          </button>
          <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: '700', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {category}
          </span>
          <span style={{ fontSize: '0.78rem', color: light.textMuted, flexShrink: 0 }}>
            {storyIndex + 1} / {stories.length}
          </span>
        </div>
      </header>

      {/* ── Content ── */}
      <article style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '1.75rem 1.25rem', paddingBottom: miniPlayerVisible ? '6rem' : '3rem' }}>

        {/* Category badge */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ padding: '0.2rem 0.65rem', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {category}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.55rem', fontWeight: '800', color: light.text, lineHeight: 1.22, letterSpacing: '-0.025em' }}>
          {story.headline}
        </h1>

        {/* Sources */}
        {story.storySources?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {story.storySources.slice(0, 3).filter(s => s.outlet).map((s, i, arr) => {
              const icon = faviconUrl(s.url);
              return (
                <React.Fragment key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.55rem', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '999px', textDecoration: 'none', transition: 'border-color 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = `${color}55`}
                    onMouseLeave={e => e.currentTarget.style.borderColor = light.border}
                  >
                    {icon && <img src={icon} alt="" width={13} height={13} style={{ borderRadius: '2px', opacity: 0.75 }} />}
                    <span style={{ fontSize: '0.78rem', fontWeight: '500', color: light.textMuted }}>{s.outlet}</span>
                  </a>
                  {i < arr.length - 1 && <span style={{ fontSize: '0.78rem', color: light.textMuted, opacity: 0.4 }}>·</span>}
                </React.Fragment>
              );
            })}
            <span style={{ fontSize: '0.78rem', color: light.textMuted, opacity: 0.4 }}>·</span>
            <span style={{ fontSize: '0.78rem', color: light.textMuted }}>{readTime(story)}</span>
          </div>
        )}

        {/* Play button + view toggle on the same row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <div className="ai-btn-wrap">
            <button className="ai-btn-inner" onClick={() => onPlayFrom(storyIndex)}>
              <Play size={14} fill="white" style={{ marginLeft: '1px', flexShrink: 0 }} />
              {isNarrating ? 'Playing…' : 'Play Story'}
            </button>
          </div>
          <div style={{ flex: 1 }} />
          {/* Toggle: Key Takeaways / Summary */}
          <div style={{ display: 'flex', background: light.bgSub, borderRadius: '999px', padding: '3px', gap: '2px', border: `1px solid ${light.border}`, flexShrink: 0 }}>
            {[['takeaways', 'Key Takeaways'], ['summary', 'Summary']].map(([val, label]) => (
              <button key={val} onClick={() => setView(val)}
                style={{ padding: '0.38rem 1rem', borderRadius: '999px', border: 'none', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: view === val ? color : 'transparent', color: view === val ? 'white' : light.textMuted }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Takeaways */}
        {view === 'takeaways' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {bullets.map((bullet, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: color }}>{i + 1}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.65 }}>{bullet}</p>
              </div>
            ))}

            {story.perspectives && (
              <div style={{ marginTop: '0.5rem', padding: '0.9rem 1rem', background: `${color}08`, borderRadius: '12px', borderLeft: `3px solid ${color}` }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perspectives</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: light.textSub, lineHeight: 1.65 }}>{story.perspectives}</p>
              </div>
            )}

            {story.why && (
              <div style={{ padding: '0.9rem 1rem', background: light.bgSub, borderRadius: '12px', borderLeft: `3px solid ${light.border}` }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why This Matters</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: light.textSub, lineHeight: 1.65 }}>{story.why}</p>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {view === 'summary' && (
          <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.8 }}>
            {[...bullets, story.perspectives, story.why].filter(Boolean).join(' ')}
          </p>
        )}
      </article>

      {/* ── Story navigation ── */}
      <div style={{
        position: 'sticky', bottom: miniPlayerVisible ? '5rem' : '0',
        background: light.bg,
        borderTop: `1px solid ${light.border}`,
        padding: '0.75rem 1.25rem',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 0.75rem)',
        maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <button
          onClick={() => hasPrev && navigate(`/category/${encodeURIComponent(category)}/story/${storyIndex - 1}`)}
          disabled={!hasPrev}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', borderRadius: '999px', background: hasPrev ? light.bgSub : 'transparent', border: `1px solid ${hasPrev ? light.border : 'transparent'}`, color: hasPrev ? light.textSub : light.textMuted, cursor: hasPrev ? 'pointer' : 'default', fontSize: '0.82rem', fontWeight: '600' }}>
          <ChevronLeft size={15} /> Prev
        </button>

        <span style={{ fontSize: '0.78rem', color: light.textMuted, fontWeight: '500' }}>
          {storyIndex + 1} / {stories.length}
        </span>

        <button
          onClick={() => hasNext && navigate(`/category/${encodeURIComponent(category)}/story/${storyIndex + 1}`)}
          disabled={!hasNext}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', borderRadius: '999px', background: hasNext ? light.bgSub : 'transparent', border: `1px solid ${hasNext ? light.border : 'transparent'}`, color: hasNext ? light.textSub : light.textMuted, cursor: hasNext ? 'pointer' : 'default', fontSize: '0.82rem', fontWeight: '600' }}>
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
