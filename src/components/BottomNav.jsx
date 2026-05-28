import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutList, TrendingUp, SlidersHorizontal } from 'lucide-react';

const light = {
  bg:        '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const TABS = [
  {
    path: '/my-feed',
    label: 'My Feed',
    Icon: Home,
    matchFn: p => p === '/my-feed',
  },
  {
    path: '/',
    label: 'All Feed',
    Icon: LayoutList,
    matchFn: p => p === '/' || p.startsWith('/category/'),
  },
  {
    path: '/popular',
    label: 'Popular',
    Icon: TrendingUp,
    matchFn: p => p === '/popular',
  },
  {
    path: '/customize',
    label: 'Customize',
    Icon: SlidersHorizontal,
    matchFn: p => p === '/customize',
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
      background: `${light.bg}f2`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${light.border}`,
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -1px 12px rgba(0,0,0,0.05)',
    }}>
      {TABS.map(({ path, label, Icon, matchFn }) => {
        const active = matchFn(pathname);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              transition: 'opacity 0.1s',
            }}
          >
            <Icon
              size={21}
              strokeWidth={active ? 2.5 : 1.7}
              color={active ? light.text : light.textMuted}
            />
            <span style={{
              fontSize: '0.65rem',
              fontWeight: active ? '800' : '500',
              color: active ? light.text : light.textMuted,
              letterSpacing: active ? '-0.01em' : '0',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
