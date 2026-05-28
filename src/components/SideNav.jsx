import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, TrendingUp, PlusCircle } from 'lucide-react';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
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
    label: 'Briefing',
    Icon: BookOpen,
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
    label: 'Create Feed',
    Icon: PlusCircle,
    matchFn: p => p === '/customize',
  },
];

export default function SideNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: '220px',
      background: light.bg,
      borderRight: `1px solid ${light.border}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 45,
      padding: '1.5rem 0.75rem',
    }}>
      {/* Brand */}
      <div style={{ padding: '0 0.5rem 2rem' }}>
        <span style={{
          fontSize: '1.1rem', fontWeight: '900', color: light.text,
          letterSpacing: '-0.02em',
        }}>
          The Rundown
        </span>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {TABS.map(({ path, label, Icon, matchFn }) => {
          const active = matchFn(pathname);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: active ? light.bgSub : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = light.bgSub; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 1.8}
                color={active ? light.text : light.textMuted}
              />
              <span style={{
                fontSize: '0.9rem',
                fontWeight: active ? '700' : '500',
                color: active ? light.text : light.textMuted,
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
