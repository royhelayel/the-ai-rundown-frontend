import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, PlusCircle, GripVertical } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

const BOTTOM_TABS = [
  { path: '/',         label: 'All Feed',     Icon: BookOpen,   matchFn: p => p === '/' || p.startsWith('/category/') },
  { path: '/popular',  label: 'Popular',      Icon: TrendingUp, matchFn: p => p === '/popular' },
  { path: '/customize',label: 'Create Feed',  Icon: PlusCircle, matchFn: p => p === '/customize' },
];

export default function SideNav({ userFeeds = [], onReorderFeeds, categories = [], briefingData = {}, onSelectCategory }) {
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
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '260px',
      background: light.bg, borderRight: `1px solid ${light.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 45,
      padding: '1.5rem 0.75rem',
      overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '0 0.5rem 1.5rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>
          The Rundown
        </span>
      </div>

      {/* ── Custom named feeds ── */}
      {userFeeds.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ margin: '0 0 0.35rem 0.5rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            My Feeds
          </p>
          {userFeeds.map(feed => {
            const active  = pathname === `/feed/${feed.id}`;
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
        {BOTTOM_TABS.map(({ path, label, Icon, matchFn }) => {
          const active = matchFn(pathname);
          return (
            <button key={path} onClick={() => navigate(path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.75rem', borderRadius: '10px', border: 'none',
                background: active ? light.bgSub : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s', width: '100%',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = light.bgSub; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} color={active ? light.text : light.textMuted} />
              <span style={{ fontSize: '0.9rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted }}>
                {label}
              </span>
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
                  onClick={() => { onSelectCategory?.(cat); navigate(`/category/${encodeURIComponent(cat)}`); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem', borderRadius: '10px', border: 'none',
                    background: active ? light.bgSub : 'transparent',
                    cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = light.bgSub; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
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
