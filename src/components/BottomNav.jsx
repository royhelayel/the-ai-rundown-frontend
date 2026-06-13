import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const light = {
  bg:        '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

// SVG icon components — no emojis, consistent stroke style
function IconMyFeed({ active }) {
  const s = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconAllNews({ active }) {
  const s = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconPopular({ active }) {
  const s = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}

function IconImportant({ active }) {
  const s = active ? 2.2 : 1.6;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" fill={active ? 'currentColor' : 'none'}/>
      <path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
    </svg>
  );
}

const TABS = [
  {
    path:    '/my-feed',
    label:   'My Feed',
    matchFn: p => p === '/my-feed',
    Icon:    IconMyFeed,
  },
  {
    path:    '/',
    label:   'All News',
    matchFn: p => p === '/' || (p.startsWith('/category/') && !p.includes('/story/')),
    Icon:    IconAllNews,
  },
  {
    path:    '/popular',
    label:   'Popular',
    matchFn: p => p === '/popular',
    Icon:    IconPopular,
  },
  {
    path:    '/important',
    label:   'Interesting',
    matchFn: p => p === '/important',
    Icon:    IconImportant,
  },
];

export default function BottomNav() {
  const navigate  = useNavigate();
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
      {TABS.map(({ path, label, matchFn, Icon }) => {
        const active = matchFn(pathname);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, padding: '0.55rem 0.25rem 0.6rem',
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              color: active ? light.text : light.textMuted,
            }}
          >
            <Icon active={active} />
            <span style={{ fontSize: '0.65rem', fontWeight: active ? '800' : '500' }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
