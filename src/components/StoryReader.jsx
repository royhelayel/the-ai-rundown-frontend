import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, Bookmark, BookmarkCheck, ChevronDown } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import { readTime } from '../utils';
import CategoryIcon from './CategoryIcon';

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
  isAlreadyRead = false,
  playlist = null, // [{ category, storyIndex }] — cross-category ordered list from Popular/Interesting
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState('takeaways'); // 'takeaways' | 'summary'
  const [isRead, setIsRead] = useState(isAlreadyRead);
  const color = CATEGORY_COLORS[category] || '#6366f1';

  // Sync isRead when navigating to a different story (isAlreadyRead comes from App)
  useEffect(() => {
    setIsRead(isAlreadyRead);
  }, [isAlreadyRead, storyIndex]);

  // Always-fresh ref so the cleanup below reads the LATEST story/category/index,
  // not a stale closure. Updated on every render (no deps = runs every render).
  const markReadRef = useRef({ story, category, storyIndex, onMarkRead });
  useEffect(() => {
    markReadRef.current = { story, category, storyIndex, onMarkRead };
  });

  // Mark story as read when the user LEAVES it (navigate away or close).
  // Depends on BOTH storyIndex and category so it fires when either changes
  // (e.g. tapping a category pill while staying at story 0).
  useEffect(() => {
    return () => {
      // Runs before re-render with new storyIndex/category, and on unmount.
      // At this point markReadRef.current still holds the OLD (just-left) values.
      const { story: s, category: c, storyIndex: i, onMarkRead: fn } = markReadRef.current;
      if (s && fn) fn(s, c, i);
    };
  }, [storyIndex, category]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Auto-scroll active category pill into view (must be before early return)
  const catStripRef = useRef(null);
  const activeCatRef = useRef(null);
  useEffect(() => {
    if (activeCatRef.current && catStripRef.current) {
      activeCatRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [category]);

  // Dock toggle+play into header when scrolled past (must be before early return)
  const scrollContainerRef = useRef(null);
  const toggleRowRef = useRef(null);
  const [toggleDocked, setToggleDocked] = useState(false);
  useEffect(() => { setToggleDocked(false); }, [storyIndex]);
  useEffect(() => {
    const el = toggleRowRef.current;
    const root = scrollContainerRef.current;
    if (!el || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setToggleDocked(!entry.isIntersecting),
      { root, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [storyIndex]);

  if (!story) return null;

  const takeawayBullets = story.tightBullets?.length ? story.tightBullets : (story.allBullets || []).slice(0, 3);
  const summaryBullets  = story.allBullets?.length ? story.allBullets : (story.tightBullets || []);

  // ── Playlist mode (launched from Popular or Interesting) ──────────────────
  const playlistPos = playlist
    ? playlist.findIndex(p => p.category === category && p.storyIndex === storyIndex)
    : -1;
  const inPlaylist  = !!playlist && playlistPos !== -1;

  // Story count / position — playlist overrides single-category
  const totalCount = inPlaylist ? playlist.length : stories.length;
  const currentPos = inPlaylist ? playlistPos    : storyIndex;

  const hasPrev = inPlaylist ? playlistPos > 0 : storyIndex > 0;
  const hasNext = inPlaylist ? playlistPos < playlist.length - 1 : storyIndex < stories.length - 1;

  // Navigate to a specific URL carrying the current state (keeps playlist in location)
  const navTo = (cat, idx) =>
    navigate(`/category/${encodeURIComponent(cat)}/story/${idx}`, { state: location.state, replace: true });

  // Go to a category — in playlist mode, jump to that category's first playlist entry
  const goToCat = (cat) => {
    if (inPlaylist) {
      const entry = playlist.find(p => p.category === cat);
      if (entry) { navTo(entry.category, entry.storyIndex); return; }
    }
    navTo(cat, 0);
  };

  // Story nav handlers
  const goPrevStory = () => {
    if (!hasPrev) return;
    if (inPlaylist) {
      const p = playlist[playlistPos - 1];
      navTo(p.category, p.storyIndex);
    } else {
      navTo(category, storyIndex - 1);
    }
  };
  const goNextStory = () => {
    if (!hasNext) return;
    if (inPlaylist) {
      const p = playlist[playlistPos + 1];
      navTo(p.category, p.storyIndex);
    } else {
      navTo(category, storyIndex + 1);
    }
  };

  // Category skip (<</>>) — jump to prev/next category within playlist or contextCategories
  const catIdx  = contextCategories.indexOf(category);
  const prevCat = inPlaylist
    ? (() => { const cats = playlist.slice(0, playlistPos).reverse(); return (cats.find(p => p.category !== category) || {}).category || null; })()
    : (catIdx > 0 ? contextCategories[catIdx - 1] : null);
  const nextCat = inPlaylist
    ? (() => { const cats = playlist.slice(playlistPos + 1); return (cats.find(p => p.category !== category) || {}).category || null; })()
    : (catIdx < contextCategories.length - 1 ? contextCategories[catIdx + 1] : null);

  const goBackCat  = () => { if (prevCat) goToCat(prevCat); };
  const goNextCat  = () => { if (nextCat) goToCat(nextCat); };

  // Bookmark state
  const isSaved = savedStories.some(s => s.category === category && s.storyIndex === storyIndex);

  // Shared toggle+play JSX (used in both header docked and article positions)
  const TogglePills = ({ compact = false }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...(compact ? { padding: '6px 16px 8px' } : { marginBottom: '1.75rem' }) }}>
      <div style={{ display: 'flex', background: light.bgSub, borderRadius: '999px', padding: '3px', gap: '2px', border: `1px solid ${light.border}` }}>
        {[['takeaways', 'Key Takeaways'], ['summary', 'Summary']].map(([val, label]) => (
          <button key={val} onClick={() => setView(val)}
            style={{ padding: '0.3rem 0.8rem', borderRadius: '999px', border: 'none', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: view === val ? color : 'transparent', color: view === val ? 'white' : light.textMuted, whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div className="ai-btn-wrap-play" style={{ flexShrink: 0, borderRadius: '11px' }}>
        <button className="ai-btn-inner" style={{ padding: '0.28rem 0.9rem', fontSize: '0.72rem', borderRadius: '8px' }} onClick={() => onPlayFrom(storyIndex)}>
          <Play size={10} fill="white" color="white" />
          {isNarrating ? 'Playing…' : 'Play'}
        </button>
      </div>
    </div>
  );

  return (
    <div ref={scrollContainerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: light.bg }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        .rdr-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header + category strip (one sticky unit) ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: `${light.bg}f0`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        flexShrink: 0,
      }}>
        {/* Top row: minimize + bookmark */}
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem' }}>
          <button
            onClick={onClose || goBack}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronDown size={18} />
          </button>
          <div style={{ flex: 1 }} />
          {user && (
            <button
              onClick={() => onToggleSaved?.(story, category, storyIndex)}
              title={isSaved ? 'Remove from Interesting' : 'Save to Interesting'}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSaved ? 'rgba(124,58,237,0.1)' : light.bgSub, border: `1px solid ${isSaved ? 'rgba(124,58,237,0.3)' : light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isSaved ? '#7c3aed' : light.textMuted, flexShrink: 0 }}>
              {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
          )}
        </div>

        {/* Story progress dots — single-category mode only (too many for playlists) */}
        {!inPlaylist && stories.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', padding: '0 1.25rem 0.5rem' }}>
            {stories.map((_, i) => (
              <button
                key={i}
                onClick={() => navTo(category, i)}
                style={{
                  flex: 1, height: '3px', border: 'none', borderRadius: '99px',
                  cursor: 'pointer', padding: 0,
                  background: i === storyIndex ? color : i < storyIndex ? `${color}66` : 'rgba(0,0,0,0.12)',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        )}
        {/* Playlist progress bar — compact single bar showing fraction */}
        {inPlaylist && (
          <div style={{ padding: '0 1.25rem 0.5rem' }}>
            <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: color, width: `${((playlistPos + 1) / playlist.length) * 100}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Category pills row */}
        {contextCategories.length > 0 && (
          <div ref={catStripRef} className="rdr-cat-strip" style={{
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            <div style={{ display: 'flex', gap: '5px', padding: '8px 16px', minWidth: 'max-content' }}>
              {contextCategories.map(cat => {
                const c   = CATEGORY_COLORS[cat] || '#6366f1';
                const act = cat === category;
                return (
                  <button
                    key={cat}
                    ref={act ? activeCatRef : null}
                    onClick={() => !act && goToCat(cat)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '5px 13px', borderRadius: '8px',
                      border: `1px solid ${act ? c : 'rgba(0,0,0,0.1)'}`,
                      background: act ? c : 'transparent',
                      cursor: act ? 'default' : 'pointer',
                      whiteSpace: 'nowrap', flexShrink: 0,
                      fontSize: '0.82rem', fontWeight: act ? '800' : '600',
                      color: act ? 'white' : '#6b7280',
                    }}
                  >
                    <CategoryIcon category={cat} size={15} color={act ? 'white' : '#6b7280'} />
                    {CATEGORY_SHORT[cat] || cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Docked toggle+play — only when scrolled past original position */}
        {toggleDocked && <TogglePills compact />}
      </header>

      {/* ── Content ── */}
      <article style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '1.75rem 1.25rem', paddingBottom: '6rem' }}>

        {/* Category badge (left) + read status (right) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ padding: '0.2rem 0.65rem', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '999px', fontSize: '0.7rem', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {category}
          </span>
          {user && (
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: isRead ? '#22c55e' : '#9ca3af' }}>
              {isRead ? '✓ Read' : 'Unread'}
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.55rem', fontWeight: '800', color: light.text, lineHeight: 1.22, letterSpacing: '-0.025em' }}>
          {story.headline}
        </h1>

        {/* Sources — horizontal scroll, all outlets shown */}
        {story.storySources?.filter(s => s.outlet).length > 0 && (
          <div style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '1.25rem' }}>
            <style>{`.rdr-sources::-webkit-scrollbar { display: none; }`}</style>
            <div className="rdr-sources" style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 'max-content' }}>
              {story.storySources.filter(s => s.outlet).map((s, i) => (
                s.url ? (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap', textDecoration: 'none' }}
                  >
                    {s.outlet}
                  </a>
                ) : (
                  <span
                    key={i}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap' }}
                  >
                    {s.outlet}
                  </span>
                )
              ))}
            </div>
          </div>
        )}

        {/* Toggle + Play — original position, becomes docked on scroll */}
        <div ref={toggleRowRef}>
          <TogglePills />
        </div>

        {/* Key Takeaways — crisp bullets */}
        {view === 'takeaways' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {takeawayBullets.map((bullet, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', color }}>{i + 1}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.65 }}>{bullet}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary — elaborate full read */}
        {view === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Narrative paragraph for newly generated stories */}
            {story.summary && (
              <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.8 }}>{story.summary}</p>
            )}

            {/* All bullets — the elaborate detailed breakdown (always shown) */}
            {!story.summary && summaryBullets.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {summaryBullets.map((bullet, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.58rem' }} />
                    <p style={{ margin: 0, fontSize: '0.95rem', color: light.textSub, lineHeight: 1.7 }}>{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Perspectives */}
            {story.perspectives && (
              <div style={{ padding: '0.9rem 1rem', background: `${color}08`, borderRadius: '12px', borderLeft: `3px solid ${color}` }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.68rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perspectives</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: light.textSub, lineHeight: 1.65 }}>{story.perspectives}</p>
              </div>
            )}

            {/* Why This Matters */}
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
        position: 'sticky', bottom: 0,
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
              {inPlaylist
                ? (location.state?.from === '/popular' ? 'Popular' : location.state?.from === '/important' ? 'Interesting' : category)
                : category}
            </div>
            <div style={{ fontSize: '0.7rem', color: light.textMuted, fontWeight: '500' }}>
              {currentPos + 1} / {totalCount}
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
