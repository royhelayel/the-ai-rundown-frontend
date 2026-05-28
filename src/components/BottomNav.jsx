import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, PlusCircle, LayoutGrid, X } from 'lucide-react';

const light = {
  bg:        '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

const FIXED_TABS = [
  { path: '/',         label: 'All Feed',    Icon: BookOpen,    matchFn: p => p === '/' || p.startsWith('/category/') },
  { path: '/popular',  label: 'Popular',     Icon: TrendingUp,  matchFn: p => p === '/popular' },
  { path: '/customize',label: 'Create Feed', Icon: PlusCircle,  matchFn: p => p === '/customize' },
];

export default function BottomNav({ userFeeds = [] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showFeeds, setShowFeeds] = useState(false);

  const hasFeedActive = userFeeds.some(f => pathname === `/feed/${f.id}`);

  return (
    <>
      {/* Feed sheet (slides up when userFeeds exist and user taps Feeds tab) */}
      {showFeeds && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }}
            onClick={() => setShowFeeds(false)} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: '56px', zIndex: 201,
            background: light.bg, borderTop: `1px solid ${light.border}`,
            borderRadius: '16px 16px 0 0', padding: '1rem 1.25rem 0.75rem',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: FEED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>My Feeds</span>
              <button onClick={() => setShowFeeds(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: light.textMuted, padding: '2px' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {userFeeds.map(feed => {
                const active = pathname === `/feed/${feed.id}`;
                return (
                  <button key={feed.id}
                    onClick={() => { navigate(`/feed/${feed.id}`); setShowFeeds(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                      padding: '0.7rem 0.85rem', borderRadius: '10px', border: 'none', textAlign: 'left',
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
        {/* My Feeds tab (shows if user has feeds) */}
        {userFeeds.length > 0 && (
          <button
            onClick={() => setShowFeeds(v => !v)}
            style={{
              flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
            }}>
            <LayoutGrid size={21} strokeWidth={hasFeedActive || showFeeds ? 2.5 : 1.7}
              color={hasFeedActive || showFeeds ? light.text : light.textMuted} />
            <span style={{
              fontSize: '0.65rem', fontWeight: hasFeedActive || showFeeds ? '800' : '500',
              color: hasFeedActive || showFeeds ? light.text : light.textMuted,
            }}>
              My Feeds
            </span>
          </button>
        )}

        {/* Fixed tabs */}
        {FIXED_TABS.map(({ path, label, Icon, matchFn }) => {
          const active = matchFn(pathname);
          return (
            <button key={path} onClick={() => navigate(path)}
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
