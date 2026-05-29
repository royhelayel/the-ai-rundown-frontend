import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, PlusCircle, GripVertical, Lock } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

const ALL_TABS = [
  { path: '/',         label: 'All Feed',     Icon: BookOpen,   matchFn: p => p === '/' || p.startsWith('/category/'), authRequired: false },
  { path: '/popular',  label: 'Popular',      Icon: TrendingUp, matchFn: p => p === '/popular',                        authRequired: false },
  { path: '/customize',label: 'Customize Your Feed', Icon: PlusCircle, matchFn: p => p === '/customize',                      authRequired: true  },
];

export default function SideNav({ userFeeds = [], onReorderFeeds, categories = [], briefingData = {}, onSelectCategory, user = null, onShowAuth, activeFeedId = null }) {
  const navigate   = useNavigate();
  const { pathname } = useLocation();
  const dragId     = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, id) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    setDragOver(id);
  };
  const handleDrop = (e, id) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragId.current || dragId.current === id) return;
    const from = userFeeds.findIndex(f => f.id === dragId.current);
    const to   = userFeeds.findIndex(f => f.id === id);
    if (from === -1 || to === -1) return;
    const next = [...userFeeds];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorderFeeds?.(next);
    dragId.current = null;
  };
  const handleDragEnd = () => { dragId.current = null; setDragOver(null); };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '300px',
      background: light.bg, borderRight: `1px solid ${light.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 45,
      padding: '0.75rem 0.75rem',
      overflowY: 'auto',
    }}>
      {/* ── Custom named feeds ── */}
      {userFeeds.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ margin: '0 0 0.35rem 0.5rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            My Feeds
          </p>
          {userFeeds.map(feed => {
            const active  = activeFeedId ? activeFeedId === feed.id : pathname === `/feed/${feed.id}`;
            const isOver  = dragOver === feed.id;
            return (
              <div
                key={feed.id}
                draggable
                onDragStart={e => handleDragStart(e, feed.id)}
                onDragOver={e => handleDragOver(e, feed.id)}
                onDrop={e => handleDrop(e, feed.id)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  borderRadius: '10px', marginBottom: '1px',
                  background: active ? light.bgSub : isOver ? 'rgba(124,58,237,0.06)' : 'transparent',
                  border: isOver ? `1px dashed rgba(124,58,237,0.4)` : '1px solid transparent',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = light.bgSub; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = isOver ? 'rgba(124,58,237,0.06)' : 'transparent'; }}
              >
                {/* Drag handle */}
                <div style={{ padding: '0.6rem 0.2rem 0.6rem 0.5rem', color: light.textMuted, cursor: 'grab', flexShrink: 0, opacity: 0.4 }}
                  title="Drag to reorder">
                  <GripVertical size={12} />
                </div>
                {/* Feed dot + label */}
                <button
                  onClick={() => navigate(`/feed/${feed.id}`)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 0.5rem 0.6rem 0', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: FEED_COLOR, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {feed.name}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Divider */}
      {userFeeds.length > 0 && <div style={{ height: '1px', background: light.border, margin: '0.5rem 0.5rem 0.75rem' }} />}

      {/* ── Fixed tabs ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {ALL_TABS.map(({ path, label, Icon, matchFn, authRequired }) => {
          const locked = authRequired && !user;
          // If the user is on a category/story page that came from a custom feed,
          // don't highlight the All Feed tab — the custom feed item handles it.
          const active = !locked && matchFn(pathname) && !activeFeedId;
          return (
            <button key={path}
              onClick={() => locked ? navigate('/settings') : navigate(path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.75rem', borderRadius: '10px', border: 'none',
                background: active ? light.bgSub : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s', width: '100%',
                opacity: locked ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = light.bgSub; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} color={active ? light.text : light.textMuted} />
              <span style={{ fontSize: '0.9rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted, flex: 1 }}>
                {label}
              </span>
              {locked && <Lock size={11} color={light.textMuted} strokeWidth={2} style={{ flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <>
          <div style={{ height: '1px', background: light.border, margin: '0 0.5rem 0.65rem' }} />
          <p style={{ margin: '0 0 0.35rem 0.75rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Categories
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {categories.map(cat => {
              const color  = CATEGORY_COLORS[cat] || '#6366f1';
              const count  = briefingData[cat]?.storyCount || 0;
              const active = pathname === `/category/${encodeURIComponent(cat)}`;
              return (
                <button key={cat}
                  onClick={() => { onSelectCategory?.(cat); navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: pathname } }); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem', borderRadius: '10px', border: 'none',
                    background: active ? light.bgSub : 'transparent',
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s',
                    overflow: 'visible',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = light.bgSub; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: color + '22',
                    flexShrink: 0, fontSize: '0.62rem', fontWeight: '800', color, lineHeight: 1,
                  }}>
                    {(cat || '').slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat}
                  </span>
                  {count > 0 && (
                    <span style={{ fontSize: '0.65rem', color: light.textMuted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}
