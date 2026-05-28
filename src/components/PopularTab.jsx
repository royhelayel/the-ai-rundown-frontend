import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader, User } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

// Normalize a headline to a stable key for listen counting
export function headlineKey(headline) {
  return (headline || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().slice(0, 50);
}

export default function PopularTab({
  briefingData, briefingLoading, listenCounts,
  defaultCategories,
  onSelectCategory, onPlayCategory,
  isNarrating, playerVisible,
  user, onShowAuth,
}) {
  const navigate = useNavigate();

  // Flatten all stories across all categories
  const allStories = [];
  defaultCategories.forEach(cat => {
    const d = briefingData[cat];
    if (!d?.allStories?.length) return;
    d.allStories.forEach((story, idx) => {
      const key = headlineKey(story.headline);
      allStories.push({
        ...story,
        category: cat,
        storyIndex: idx,
        listenCount: listenCounts[key] || 0,
      });
    });
  });

  const hasAnyData    = allStories.length > 0;
  const hasAnyListens = allStories.some(s => s.listenCount > 0);

  // Sort by listenCount desc; ties keep original order (stable)
  const sorted = [...allStories].sort((a, b) => b.listenCount - a.listenCount);

  const handleStoryClick = (cat, storyIndex) => {
    onSelectCategory(cat);
    navigate(`/category/${encodeURIComponent(cat)}/story/${storyIndex}`, { state: { from: 'popular' } });
  };

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header — matches Briefing: brand left, user icon right */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.75rem 1.25rem' }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <span className="header-brand" style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={user ? () => navigate('/settings') : onShowAuth}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: light.textMuted, flexShrink: 0 }}>
            <User size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem', paddingBottom: playerVisible ? '8rem' : '3.5rem' }}>

        {/* Title row — matches Briefing hero */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15 }}>Popular</h1>
        </div>

        {/* Empty-state banner: no listens yet */}
        {hasAnyData && !hasAnyListens && (
          <div style={{ padding: '0.9rem 1.1rem', background: `rgba(99,102,241,0.06)`, borderRadius: '12px', border: `1px solid rgba(99,102,241,0.15)`, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>⏳</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6366f1', fontWeight: '600', lineHeight: 1.45 }}>
              We're compiling the list, check back soon.
            </p>
          </div>
        )}

        {/* Loading */}
        {briefingLoading && !hasAnyData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: light.textMuted }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.88rem' }}>Loading stories…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sorted.map((story, rank) => {
              const color = CATEGORY_COLORS[story.category] || '#6366f1';
              const excerpt = (story.tightBullets?.[0] || story.allBullets?.[0] || '').slice(0, 120);
              return (
                <div
                  key={`${story.category}-${story.storyIndex}`}
                  onClick={() => handleStoryClick(story.category, story.storyIndex)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.85rem 0.9rem',
                    background: light.bgSub,
                    borderRadius: '12px', cursor: 'pointer', transition: 'background 0.12s',
                    border: `1px solid ${light.border}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = light.bgSub}
                >
                  {/* Story info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'inline-block', fontSize: '0.6rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                      {story.category}
                    </span>
                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.9rem', fontWeight: '700', color: light.text, lineHeight: 1.35 }}>
                      {story.headline}
                    </p>
                    {excerpt && (
                      <p style={{ margin: '0 0 0.3rem', fontSize: '0.82rem', color: light.textMuted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {excerpt}{excerpt.length === 120 ? '…' : ''}
                      </p>
                    )}
                    {story.listenCount > 0 && (
                      <span style={{ fontSize: '0.72rem', color: light.textMuted }}>
                        {story.listenCount.toLocaleString()} {story.listenCount === 1 ? 'listen' : 'listens'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); onSelectCategory(story.category); onPlayCategory(story.category); }}
                    style={{ width: '30px', height: '30px', borderRadius: '50%', border: `1px solid ${color}40`, background: `${color}15`, color: color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                    <Play size={11} fill={color} color={color} style={{ marginLeft: '1px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
