import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, User, Bookmark, BookmarkCheck, ChevronDown } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import { readTime } from '../utils';

function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

// ── Nav button (<<, <, >, >>) ─────────────────────────────────────────────────
function NavBtn({ onClick, disabled, title, children, wide = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: wide ? 40 : 32, height: 32,
        borderRadius: '8px',
        border: `1px solid ${disabled ? 'transparent' : light.border}`,
        background: disabled ? 'transparent' : light.bgSub,
        color: disabled ? 'rgba(0,0,0,0.2)' : light.textMuted,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// Chevron SVGs
const ChevL  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ChevR  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const ChevLL = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>;
const ChevRR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>;

export default function StoryReader({
  category,
  story,
  storyIndex,
  stories,
  onPlayFrom,
  isNarrating,
  isPaused,
  miniPlayerVisible,
  contextCategories = [],
  user,
  onShowAuth,
  onMarkRead,
  savedStories = [],
  onToggleSaved,
  inSheet = false,
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('takeaways'); // 'takeaways' | 'summary'
  const [isRead, setIsRead] = useState(false);
  const color = CATEGORY_COLORS[category] || '#6366f1';

  // Mark the story as read whenever the displayed story changes
  useEffect(() => {
    setIsRead(false); // reset on story change, then mark read
    if (story && onMarkRead) { onMarkRead(story, category, storyIndex); setIsRead(true); }
  }, [storyIndex, story]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = () => {
    const from = location.state?.from;
    if (!from || from === 'home' || from === '/') navigate('/');
    else if (from === '/my-feed') navigate('/my-feed');
    else if (from === 'popular') navigate('/popular');
    else if (from === '/important') navigate('/important');
    else if (from === 'category') navigate(`/category/${encodeURIComponent(category)}`, { state: { from: location.state?.feedFrom || '/' } });
    else if (typeof from === 'string' && from.startsWith('/feed/')) navigate(from);
    else navigate('/');
  };

  if (!story) return null;

  const bullets  = story.allBullets || story.tightBullets || [];
  const hasPrev  = storyIndex > 0;
  const hasNext  = storyIndex < stories.length - 1;

  // Category navigation
  const catIdx  = contextCategories.indexOf(category);
  const prevCat = catIdx > 0 ? contextCategories[catIdx - 1] : null;
  const nextCat = catIdx < contextCategories.length - 1 ? contextCategories[catIdx + 1] : null;

  const goToCat = (cat, idx = 0) => navigate(
    `/category/${encodeURIComponent(cat)}/story/${idx}`,
    { state: location.state, replace: true }
  );

  // Story nav handlers
  const goPrevStory = () => {
    if (hasPrev) navigate(`/category/${encodeURIComponent(category)}/story/${storyIndex - 1}`, { state: location.state, replace: true });
  };
  const goNextStory = () => {
    if (hasNext) navigate(`/category/${encodeURIComponent(category)}/story/${storyIndex + 1}`, { state: location.state, replace: true });
  };
  const goBackCat  = () => { if (prevCat) goToCat(prevCat); };
  const goNextCat  = () => { if (nextCat) goToCat(nextCat); };

  // Bookmark state
  const isSaved = savedStories.some(s => s.category === category && s.storyIndex === storyIndex);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: light.bg }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        .rdr-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: `${light.bg}f0`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${light.border}`,
        padding: '0.6rem 1.25rem',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Minimize button — mirrors the player's dismiss affordance */}
          <button
            onClick={onClose || goBack}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronDown size={18} />
          </button>
          <div style={{ flex: 1 }} />
          {/* Bookmark */}
          <button
            onClick={() => onToggleSaved?.(story, category, storyIndex)}
            title={isSaved ? 'Remove from Important' : 'Save to Important'}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSaved ? 'rgba(124,58,237,0.1)' : light.bgSub, border: `1px solid ${isSaved ? 'rgba(124,58,237,0.3)' : light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#7c3aed' : light.textMuted, flexShrink: 0 }}>
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
          <button
            onClick={() => navigate('/settings')}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: light.textMuted, flexShrink: 0 }}>
            <User size={16} />
          </button>
        </div>
      </header>

      {/* ── Category strip ── */}
      {contextCategories.length > 1 && (
        <div className="rdr-cat-strip" style={{ overflowX: 'auto', scrollbarWidth: 'none', borderBottom: `1px solid ${light.border}` }}>
          <div style={{ display: 'flex', gap: '5px', padding: '8px 16px', minWidth: 'max-content' }}>
            {contextCategories.map(cat => {
              const c   = CATEGORY_COLORS[cat] || '#6366f1';
              const act = cat === category;
              return (
                <button
                  key={cat}
                  onClick={() => !act && goToCat(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px', borderRadius: '8px',
                    border: act ? `1px solid ${c}55` : `1px solid ${light.border}`,
                    background: act ? `${c}12` : 'transparent',
                    cursor: act ? 'default' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: act ? '800' : '600', color: act ? c : light.textMuted }}>
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <article style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '1.75rem 1.25rem', paddingBottom: miniPlayerVisible ? '10rem' : '6rem' }}>

        {/* Category badge (left) + read status (right) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ padding: '0.2rem 0.65rem', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {category}
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: '700', color: isRead ? '#22c55e' : '#9ca3af' }}>
            {isRead ? '✓ Read' : 'Unread'}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.55rem', fontWeight: '800', color: light.text, lineHeight: 1.22, letterSpacing: '-0.025em' }}>
          {story.headline}
        </h1>

        {/* Sources — same pill style as StoryCard, no favicons */}
        {story.storySources?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {story.storySources.filter(s => s.outlet).slice(0, 2).map((s, i) => (
              <span
                key={i}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280' }}
              >
                {s.outlet}
              </span>
            ))}
            {story.storySources.filter(s => s.outlet).length > 2 && (
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af' }}>
                +{story.storySources.filter(s => s.outlet).length - 2}
              </span>
            )}
          </div>
        )}

        {/* Play button + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
          <div className="ai-btn-wrap">
            <button className="ai-btn-inner" onClick={() => onPlayFrom(storyIndex)}>
              <Play size={14} fill="white" style={{ marginLeft: '1px', flexShrink: 0 }} />
              {isNarrating ? 'Playing…' : 'Play Story'}
            </button>
          </div>
          <div style={{ flex: 1 }} />
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
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color }}>{i + 1}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.65 }}>{bullet}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {view === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {story.summary ? (
              <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.8 }}>{story.summary}</p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.88rem', color: light.textMuted, lineHeight: 1.7, fontStyle: 'italic' }}>
                Full summary available for newly generated stories.
              </p>
            )}
            {story.perspectives && (
              <div style={{ padding: '0.9rem 1rem', background: `${color}08`, borderRadius: '12px', borderLeft: `3px solid ${color}` }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perspectives</p>
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
      </article>

      {/* ── Navigation footer: << < [Cat · X/N] > >> ── */}
      <div style={{
        position: 'sticky', bottom: miniPlayerVisible ? '5rem' : '0',
        background: light.bg, borderTop: `1px solid ${light.border}`,
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 0.5rem)',
        width: '100%', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem 0.25rem' }}>
          {/* << back category */}
          <NavBtn onClick={goBackCat} disabled={!prevCat} title={prevCat ? `Back to ${prevCat}` : 'First category'} wide>
            <ChevLL />
          </NavBtn>

          {/* < prev story */}
          <NavBtn onClick={goPrevStory} disabled={!hasPrev} title="Previous story">
            <ChevL />
          </NavBtn>

          {/* Centre label */}
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {category}
            </div>
            <div style={{ fontSize: '0.7rem', color: light.textMuted, fontWeight: '500' }}>
              {storyIndex + 1} / {stories.length}
            </div>
          </div>

          {/* > next story */}
          <NavBtn onClick={goNextStory} disabled={!hasNext} title="Next story">
            <ChevR />
          </NavBtn>

          {/* >> next category */}
          <NavBtn onClick={goNextCat} disabled={!nextCat} title={nextCat ? `Skip to ${nextCat}` : 'Last category'} wide>
            <ChevRR />
          </NavBtn>
        </div>
      </div>
    </div>
  );
}
