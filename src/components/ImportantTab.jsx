import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Users, Search, X, UserPlus, Check } from 'lucide-react';
import ProgressPill from './ProgressPill';
import StoryCard from './StoryCard';
import FeedHeader from './FeedHeader';
import CategoryIcon from './CategoryIcon';
import useScrollRestore from '../hooks/useScrollRestore';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import { headlineKey } from './PopularTab';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const light = {
  bg:        '#f5f5f7',
  bgCard:    '#ffffff',
  bgSub:     '#ececef',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

// Small avatar stack for showing who saved a story
function AvatarStack({ savers = [], size = 22 }) {
  const shown = savers.slice(0, 3);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((s, i) => (
        <div
          key={s.id}
          title={s.display_name || s.username}
          style={{
            width: size, height: size, borderRadius: '50%',
            background: s.avatar_color || '#6366f1',
            border: '2px solid #f5f5f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: '800', color: '#fff',
            marginLeft: i === 0 ? 0 : -size * 0.35,
            zIndex: shown.length - i,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {(s.display_name || s.username || '?')[0].toUpperCase()}
        </div>
      ))}
      {savers.length > 3 && (
        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: light.textMuted, marginLeft: 4 }}>
          +{savers.length - 3}
        </span>
      )}
    </div>
  );
}

// ── UserSearchSheet ───────────────────────────────────────────────────────────

function UserAvatar({ person, size = 40 }) {
  const initials = (person.display_name || person.username || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: person.avatar_color || '#6366f1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '800', color: '#fff',
    }}>
      {initials}
    </div>
  );
}

function UserSearchSheet({ open, onClose, user, following, onFollowChange }) {
  const [mounted, setMounted]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [followingIds, setFollowingIds] = useState(() => new Set((following || []).map(f => f.id)));
  const [inFlight, setInFlight] = useState(new Set()); // ids currently being toggled
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Sync followingIds when parent following changes
  useEffect(() => {
    setFollowingIds(new Set((following || []).map(f => f.id)));
  }, [following]);

  // Animate open/close
  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => { setVisible(true); inputRef.current?.focus(); }, 16);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      const t = setTimeout(() => { setMounted(false); setQuery(''); setResults([]); }, 380);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`${BACKEND_URL}/api/social/search?q=${encodeURIComponent(query.trim())}&userId=${user?.id || ''}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { setResults(data || []); setLoading(false); })
        .catch(() => setLoading(false));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, user?.id]);

  const toggleFollow = async (person) => {
    if (inFlight.has(person.id)) return;
    setInFlight(prev => new Set([...prev, person.id]));
    const isFollowing = followingIds.has(person.id);
    try {
      if (isFollowing) {
        await fetch(`${BACKEND_URL}/api/social/follow/${person.id}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: user.id }),
        });
        setFollowingIds(prev => { const n = new Set(prev); n.delete(person.id); return n; });
      } else {
        await fetch(`${BACKEND_URL}/api/social/follow`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: user.id, followingId: person.id }),
        });
        setFollowingIds(prev => new Set([...prev, person.id]));
      }
      onFollowChange?.(); // ask App.js to reload social data
    } catch {}
    setInFlight(prev => { const n = new Set(prev); n.delete(person.id); return n; });
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 400,
        opacity: visible ? 1 : 0, transition: 'opacity 0.32s ease',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 401,
        background: '#fff', borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 1rem)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Handle + header */}
        <div style={{ padding: '0.65rem 1.1rem 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.1)', margin: '0 auto 0.85rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.02em' }}>
              Find People
            </span>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} color="#6b7280" />
            </button>
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or @username…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px 10px 34px',
                borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.1)',
                background: '#f5f5f7', fontSize: '0.88rem', fontWeight: '500',
                color: '#0a0a0f', outline: 'none',
                WebkitAppearance: 'none',
              }}
            />
            {query.length > 0 && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <X size={14} color="#9ca3af" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 1.1rem' }}>
          {loading && (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
              Searching…
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
              No users found for "{query}"
            </div>
          )}

          {!loading && !query.trim() && (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
              Type a name or username to search
            </div>
          )}

          {results.map(person => {
            const isFollowing = followingIds.has(person.id);
            const busy = inFlight.has(person.id);
            return (
              <div key={person.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}>
                <UserAvatar person={person} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0a0a0f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {person.display_name || person.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8a8a9a', fontWeight: '500' }}>
                    @{person.username}
                  </div>
                </div>
                <button
                  onClick={() => toggleFollow(person)}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '7px 14px', borderRadius: 999, border: 'none',
                    background: isFollowing ? 'rgba(0,0,0,0.06)' : 'linear-gradient(135deg,#6366f1,#ec4899)',
                    color: isFollowing ? '#374151' : '#fff',
                    fontSize: '0.78rem', fontWeight: '800', cursor: busy ? 'default' : 'pointer',
                    opacity: busy ? 0.6 : 1, transition: 'all 0.15s', flexShrink: 0,
                  }}
                >
                  {isFollowing ? <><Check size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
                </button>
              </div>
            );
          })}
          <div style={{ height: '0.5rem' }} />
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportantTab({
  savedStories = [],
  savedCounts = {},
  briefingData = {},
  onRemoveSaved,
  onSelectCategory,
  onPlayStory,
  user,
  onShowAuth,
  playerVisible,
  challengeStats,
  gamifiedStats = {},
  circleSaves = [],
  following = [],
  selectedDay, availableDays = [], onSelectDay,
  onRefreshSocial,
}) {
  const navigate = useNavigate();
  useScrollRestore('/important');
  const [selectedCat, setSelectedCat] = useState(null);
  const [scope, setScope] = useState('mine'); // 'mine' | 'circle' | 'person'
  const [selectedPerson, setSelectedPerson] = useState(null); // { id, username, display_name, avatar_color }
  const [showSearch, setShowSearch] = useState(false);

  // === My Saves ===
  // Preserve _savedHeadline (the headline at save time) so the savedCounts key lookup
  // always matches — briefingData enrichment can replace headline with today's version.
  const enriched = savedStories.map(item => {
    const full = briefingData[item.category]?.allStories?.[item.storyIndex];
    return full
      ? { ...full, category: item.category, storyIndex: item.storyIndex, _savedHeadline: item.headline }
      : { ...item, _savedHeadline: item.headline };
  });

  // === Circle Saves ===
  // circleSaves = [{ category, story_index, headline, preview, story_key, savers: [...], latest_at }]
  const circleEnriched = circleSaves.map(item => {
    const full = briefingData[item.category]?.allStories?.[item.story_index];
    const base = full
      ? { ...full, category: item.category, storyIndex: item.story_index }
      : { headline: item.headline, allBullets: [item.preview], category: item.category, storyIndex: item.story_index, storySources: [] };
    return { ...base, savers: item.savers || [] };
  });

  // === Following view ===
  // When a person is selected, filter circle saves to that person's saves only
  const peopleInCircle = following; // [{ id, username, display_name, avatar_color }]
  const followingList = selectedPerson
    ? circleEnriched.filter(s => s.savers.some(sv => sv.id === selectedPerson.id))
    : circleEnriched;

  // Determine active list for category filter
  const activeList = scope === 'mine' ? enriched : followingList;
  const cats = [...new Set(activeList.map(s => s.category))];
  const filtered = selectedCat ? activeList.filter(s => s.category === selectedCat) : activeList;

  const hasCircleData = following.length > 0;
  const firstStory = filtered[0] || activeList[0];

  // Build playlist for reader: use the filtered list so nav matches what's visible
  const buildPlaylist = (list) => list.map(s => ({ category: s.category, storyIndex: s.storyIndex }));
  const openStory = (item, list = filtered) => {
    onSelectCategory?.(item.category);
    navigate(`/category/${encodeURIComponent(item.category)}/story/${item.storyIndex}`, {
      state: { from: '/important', playlist: buildPlaylist(list) },
    });
  };

  // Two main tabs — Following first, My Interest second
  const tabs = [
    { id: 'circle', label: 'Following',   icon: <Users size={12} /> },
    { id: 'mine',   label: 'My Interest', icon: <Bookmark size={12} /> },
  ];

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        .imp-cat-strip::-webkit-scrollbar { display: none; }
      `}</style>

      <FeedHeader user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} availableDays={availableDays} onSelectDay={onSelectDay} />

      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: '4px' }}>
        <ProgressPill challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
      </div>

      {/* Title row */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: '1.55rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
          Interesting
        </h2>
        {firstStory && (
          <>
            <div className="ai-btn-wrap-read" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner-white"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => openStory(firstStory, activeList)}
              >
                Read
              </button>
            </div>
            <div className="ai-btn-wrap-play" style={{ flexShrink: 0 }}>
              <button
                className="ai-btn-inner"
                style={{ padding: '0.38rem 1rem', fontSize: '0.78rem' }}
                onClick={() => onPlayStory?.(firstStory.category, firstStory.storyIndex)}
              >
                <Play size={11} fill="white" color="white" />
                Play
              </button>
            </div>
          </>
        )}
      </div>

      {/* Following | My Interest tabs + detached Follow button */}
      {user && (
        <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Main tab pill */}
          <div style={{ display: 'inline-flex', background: light.bgSub, borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setScope(tab.id); setSelectedCat(null); setSelectedPerson(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 13px', borderRadius: '8px', border: 'none',
                  background: scope === tab.id ? '#fff' : 'transparent',
                  color: scope === tab.id ? light.text : light.textMuted,
                  fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                  boxShadow: scope === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Detached Follow button */}
          <button
            onClick={() => setShowSearch(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 13px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#ec4899)',
              color: '#fff', fontSize: '0.75rem', fontWeight: '800',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <UserPlus size={12} /> Follow
          </button>
        </div>
      )}

      {/* Following: per-person avatar filter row */}
      {scope === 'circle' && peopleInCircle.length > 0 && (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            {/* All */}
            <button
              onClick={() => setSelectedPerson(null)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: selectedPerson === null ? light.text : light.bgSub, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${selectedPerson === null ? light.text : light.border}` }}>
                <Users size={16} color={selectedPerson === null ? '#fff' : light.textMuted} />
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: '700', color: selectedPerson === null ? light.text : light.textMuted }}>All</span>
            </button>
            {/* Each person */}
            {peopleInCircle.map(person => {
              const isActive = selectedPerson?.id === person.id;
              const initials = (person.display_name || person.username || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <button
                  key={person.id}
                  onClick={() => setSelectedPerson(isActive ? null : person)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: person.avatar_color || '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: '800', color: '#fff',
                    border: `2.5px solid ${isActive ? (person.avatar_color || '#6366f1') : 'transparent'}`,
                    boxShadow: isActive ? `0 0 0 2px ${light.bg}, 0 0 0 4px ${person.avatar_color || '#6366f1'}` : 'none',
                    opacity: isActive ? 1 : 0.65, transition: 'all 0.15s',
                  }}>
                    {initials}
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: '700', color: isActive ? light.text : light.textMuted, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.display_name || person.username}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category filter pills */}
      {cats.length > 1 && (
        <div className="imp-cat-strip" style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px', minWidth: 'max-content' }}>
            <button
              onClick={() => setSelectedCat(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 13px', borderRadius: '8px', border: 'none',
                background: selectedCat === null ? light.text : light.bgSub,
                color: selectedCat === null ? '#fff' : light.textMuted,
                fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              All
            </button>
            {cats.map(cat => {
              const c = CATEGORY_COLORS[cat] || '#6366f1';
              const act = selectedCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(act ? null : cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 13px', borderRadius: '8px',
                    border: `1px solid ${act ? c : light.border}`,
                    background: act ? c : light.bgSub,
                    color: act ? '#fff' : light.textMuted,
                    fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  <CategoryIcon category={cat} size={13} color={act ? '#fff' : light.textMuted} />
                  {CATEGORY_SHORT[cat] || cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', paddingBottom: playerVisible ? '8rem' : '5rem' }}>

        {/* My Interest empty state */}
        {scope === 'mine' && savedStories.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bookmark size={22} color={light.textMuted} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: '800', color: light.text }}>Nothing saved yet</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: light.textMuted, lineHeight: 1.55 }}>
                While reading a story, tap the bookmark icon to save it here.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              style={{ padding: '0.65rem 1.6rem', background: light.text, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}>
              Browse Stories
            </button>
          </div>
        )}

        {/* Following empty state */}
        {scope === 'circle' && filtered.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3.5rem 2rem', gap: '1rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color={light.textMuted} />
            </div>
            <div>
              {!hasCircleData ? (
                <>
                  <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: '800', color: light.text }}>
                    Start following readers
                  </h3>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: light.textMuted, lineHeight: 1.55, maxWidth: 260 }}>
                    See the stories people you follow are saving — tap Follow above to find them.
                  </p>
                </>
              ) : selectedPerson ? (
                <p style={{ margin: 0, fontSize: '0.9rem', color: light.textMuted, lineHeight: 1.55 }}>
                  {selectedPerson.display_name || selectedPerson.username} hasn't saved anything yet.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9rem', color: light.textMuted, lineHeight: 1.55 }}>
                  No one you follow has saved anything yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Story cards */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 16px' }}>
            {filtered.map((item) => {
              const isRead = !!(gamifiedStats.todayProgress?.[item.category]?.listenedIndices?.has(item.storyIndex));
              return (
                <div key={`${item.category}|${item.storyIndex}`}>
                  {/* Avatar stack for Following view */}
                  {scope === 'circle' && item.savers?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px 6px' }}>
                      <AvatarStack savers={item.savers} />
                      <span style={{ fontSize: '0.72rem', color: light.textMuted, fontWeight: '600' }}>
                        {item.savers.length === 1
                          ? `${item.savers[0].display_name || item.savers[0].username} saved this`
                          : `${item.savers.slice(0, 2).map(s => s.display_name || s.username).join(' & ')}${item.savers.length > 2 ? ` +${item.savers.length - 2}` : ''} saved this`}
                      </span>
                    </div>
                  )}
                  <StoryCard
                    story={item}
                    category={item.category}
                    isRead={user ? isRead : undefined}
                    savedCount={
                      scope === 'mine'
                        ? (savedCounts[headlineKey(item._savedHeadline || item.headline || '')] || 0)
                        : (item.savers?.length || 0)
                    }
                    onRead={() => openStory(item)}
                    onPlay={() => onPlayStory?.(item.category, item.storyIndex)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User search sheet */}
      <UserSearchSheet
        open={showSearch}
        onClose={() => setShowSearch(false)}
        user={user}
        following={following}
        onFollowChange={onRefreshSocial}
      />
    </div>
  );
}
