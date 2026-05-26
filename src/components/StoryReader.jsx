import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { colors, CATEGORY_COLORS } from '../theme';

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
  const [view, setView] = useState('takeaways'); // 'takeaways' | 'summary'
  const color = CATEGORY_COLORS[category] || colors.accent;

  if (!story) return null;

  const bullets  = story.allBullets || story.tightBullets || [];
  const hasPrev  = storyIndex > 0;
  const hasNext  = storyIndex < stories.length - 1;

  return (
    <div style={{ background: '#0d1117', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: #0d1117; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `#0d1117ee`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(`/category/${encodeURIComponent(category)}`)}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {category}
          </span>
          <span style={{ fontSize: '0.78rem', color: colors.textMuted, flexShrink: 0 }}>
            {storyIndex + 1} / {stories.length}
          </span>
        </div>
      </header>

      {/* ── Content ── */}
      <article style={{ flex: 1, maxWidth: '680px', margin: '0 auto', width: '100%', padding: '1.75rem 1.25rem', paddingBottom: miniPlayerVisible ? '6rem' : '3rem' }}>

        {/* Category badge */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ padding: '0.2rem 0.65rem', background: `${color}22`, border: `1px solid ${color}44`, borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {category}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.55rem', fontWeight: '900', color: colors.text, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
          {story.headline}
        </h1>

        {/* Play this story */}
        <button onClick={() => onPlayFrom(storyIndex)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '999px', background: color, border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', marginBottom: '1.75rem', boxShadow: `0 4px 16px ${color}44` }}>
          <Play size={14} fill="white" style={{ marginLeft: '1px' }} />
          {isNarrating ? 'Playing…' : 'Play Story'}
        </button>

        {/* Toggle: Key Takeaways / Summary */}
        <div style={{ display: 'flex', background: colors.bgCard, borderRadius: '999px', padding: '3px', gap: '2px', marginBottom: '1.5rem', width: 'fit-content', border: `1px solid ${colors.border}` }}>
          {[['takeaways', 'Key Takeaways'], ['summary', 'Summary']].map(([val, label]) => (
            <button key={val} onClick={() => setView(val)}
              style={{ padding: '0.4rem 1rem', borderRadius: '999px', border: 'none', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: view === val ? color : 'transparent', color: view === val ? 'white' : colors.textMuted }}>
              {label}
            </button>
          ))}
        </div>

        {/* Key Takeaways view */}
        {view === 'takeaways' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {bullets.map((bullet, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color: color }}>{i + 1}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: colors.text, lineHeight: 1.6 }}>{bullet}</p>
              </div>
            ))}
            {story.perspectives && (
              <div style={{ marginTop: '0.5rem', padding: '0.9rem 1rem', background: colors.bgCard, borderRadius: '12px', borderLeft: `3px solid ${color}` }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perspectives</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: colors.textSub, lineHeight: 1.6 }}>{story.perspectives}</p>
              </div>
            )}
            {story.why && (
              <div style={{ padding: '0.9rem 1rem', background: colors.bgCard, borderRadius: '12px', borderLeft: `3px solid rgba(255,255,255,0.2)` }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why This Matters</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: colors.textSub, lineHeight: 1.6 }}>{story.why}</p>
              </div>
            )}
          </div>
        )}

        {/* Summary view */}
        {view === 'summary' && (
          <div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: colors.textSub, lineHeight: 1.75 }}>
              {[...bullets, story.perspectives, story.why].filter(Boolean).join(' ')}
            </p>
          </div>
        )}
      </article>

      {/* ── Story navigation ── */}
      <div style={{ position: 'sticky', bottom: miniPlayerVisible ? '5rem' : '0', background: `#0d1117`, borderTop: `1px solid ${colors.border}`, padding: '0.75rem 1.25rem', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 0.75rem)', maxWidth: '680px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <button
          onClick={() => hasPrev && navigate(`/category/${encodeURIComponent(category)}/story/${storyIndex - 1}`)}
          disabled={!hasPrev}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', borderRadius: '999px', background: hasPrev ? colors.bgCard : 'transparent', border: `1px solid ${hasPrev ? colors.border : 'transparent'}`, color: hasPrev ? colors.textSub : colors.textMuted, cursor: hasPrev ? 'pointer' : 'default', fontSize: '0.82rem', fontWeight: '600' }}>
          <ChevronLeft size={16} /> Prev
        </button>

        <span style={{ fontSize: '0.78rem', color: colors.textMuted, fontWeight: '500' }}>
          {storyIndex + 1} / {stories.length}
        </span>

        <button
          onClick={() => hasNext && navigate(`/category/${encodeURIComponent(category)}/story/${storyIndex + 1}`)}
          disabled={!hasNext}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', borderRadius: '999px', background: hasNext ? colors.bgCard : 'transparent', border: `1px solid ${hasNext ? colors.border : 'transparent'}`, color: hasNext ? colors.textSub : colors.textMuted, cursor: hasNext ? 'pointer' : 'default', fontSize: '0.82rem', fontWeight: '600' }}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
