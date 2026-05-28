import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, PlusCircle, LayoutGrid, X } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  bgSub:     '#f5f5f7',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

const FIXED_TABS = [
  { path: '/',        label: 'All Feed', Icon: BookOpen,   matchFn: p => p === '/' || p.startsWith('/category/') },
  { path: '/popular', label: 'Popular',  Icon: TrendingUp, matchFn: p => p === '/popular' },
];

export default function BottomNav({ userFeeds = [], categories = [], briefingData = {}, onSelectCategory }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showSheet, setShowSheet] = useState(false);

  const hasFeedActive = userFeeds.some(f => pathname === `/feed/${f.id}`);
  const hasCats       = categories.length > 0;
  const showGridTab   = true; // always show — sheet contains feeds, categories, and Create Feed

  return (
    <>
      {/* Bottom sheet — My Feeds + Categories */}
      {showSheet && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }}
            onClick={() => setShowSheet(false)}
          />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: '56px', zIndex: 201,
            background: light.bg, borderTop: `1px solid ${light.border}`,
            borderRadius: '16px 16px 0 0', padding: '1rem 1.25rem 0.75rem',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            maxHeight: '65vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: FEED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Browse</span>
              <button onClick={() => setShowSheet(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: light.textMuted, padding: '2px' }}>
                <X size={16} />
              </button>
            </div>

            {/* My Feeds section */}
            {userFeeds.length > 0 && (
              <>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>My Feeds</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '1rem' }}>
                  {userFeeds.map(feed => {
                    const active = pathname === `/feed/${feed.id}`;
                    return (
                      <button key={feed.id}
                        onClick={() => { navigate(`/feed/${feed.id}`); setShowSheet(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.65rem 0.85rem', borderRadius: '10px', border: 'none', textAlign: 'left',
                          background: active ? `${FEED_COLOR}10` : 'transparent', cursor: 'pointer',
                        }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: FEED_COLOR, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
                        <span style={{ fontSize: '0.92rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted }}>
                          {feed.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Create Feed */}
            <button
              onClick={() => { navigate('/customize'); setShowSheet(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.65rem 0.85rem', borderRadius: '10px', border: 'none', textAlign: 'left',
                background: pathname === '/customize' ? `rgba(99,102,241,0.08)` : 'transparent',
                cursor: 'pointer', width: '100%', marginBottom: '0.75rem',
              }}>
              <PlusCircle size={15} color="#6366f1" strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.92rem', fontWeight: pathname === '/customize' ? '700' : '500', color: pathname === '/customize' ? '#6366f1' : light.textMuted }}>
                Create Feed
              </span>
            </button>

            {/* Categories section */}
            {hasCats && (
              <>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Categories</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {categories.map(cat => {
                    const color  = CATEGORY_COLORS[cat] || '#6366f1';
                    const count  = briefingData[cat]?.storyCount || 0;
                    const active = pathname === `/category/${encodeURIComponent(cat)}`;
                    return (
                      <button key={cat}
                        onClick={() => { onSelectCategory?.(cat); navigate(`/category/${encodeURIComponent(cat)}`); setShowSheet(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.65rem 0.85rem', borderRadius: '10px', border: 'none', textAlign: 'left',
                          background: active ? light.bgSub : 'transparent', cursor: 'pointer',
                        }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                        <span style={{ flex: 1, fontSize: '0.92rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted }}>
                          {cat}
                        </span>
                        {count > 0 && (
                          <span style={{ fontSize: '0.72rem', color: light.textMuted }}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
        background: `${light.bg}f2`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${light.border}`,
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.05)',
      }}>
        {/* Browse tab (feeds + categories) */}
        {showGridTab && (
          <button
            onClick={() => setShowSheet(v => !v)}
            style={{
              flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            }}>
            <LayoutGrid size={21} strokeWidth={hasFeedActive || showSheet ? 2.5 : 1.7}
              color={hasFeedActive || showSheet ? light.text : light.textMuted} />
            <span style={{
              fontSize: '0.65rem', fontWeight: hasFeedActive || showSheet ? '800' : '500',
              color: hasFeedActive || showSheet ? light.text : light.textMuted,
            }}>
              Browse
            </span>
          </button>
        )}

        {/* Fixed tabs */}
        {FIXED_TABS.map(({ path, label, Icon, matchFn }) => {
          const active = matchFn(pathname);
          return (
            <button key={path} onClick={() => { setShowSheet(false); navigate(path); }}
              style={{
                flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              }}>
              <Icon size={21} strokeWidth={active ? 2.5 : 1.7} color={active ? light.text : light.textMuted} />
              <span style={{ fontSize: '0.65rem', fontWeight: active ? '800' : '500', color: active ? light.text : light.textMuted }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
