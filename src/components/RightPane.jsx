import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

export default function RightPane({ categories = [], briefingData = {}, onSelectCategory }) {
  const navigate   = useNavigate();
  const { pathname } = useLocation();

  const activecat = pathname.startsWith('/category/')
    ? decodeURIComponent(pathname.split('/category/')[1]?.split('/')[0] || '')
    : null;

  const handleClick = (cat) => {
    onSelectCategory?.(cat);
    navigate(`/category/${encodeURIComponent(cat)}`);
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '200px',
      background: light.bg, borderLeft: `1px solid ${light.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 45,
      padding: '1.5rem 0.75rem',
      overflowY: 'auto',
    }}>
      <p style={{ margin: '0 0 0.5rem 0.5rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Categories
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {categories.map(cat => {
          const color  = CATEGORY_COLORS[cat] || '#6366f1';
          const data   = briefingData[cat];
          const count  = data?.storyCount || 0;
          const active = activecat === cat;
          return (
            <button
              key={cat}
              onClick={() => handleClick(cat)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.55rem 0.75rem', borderRadius: '10px', border: 'none',
                background: active ? light.bgSub : 'transparent',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'background 0.1s',
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
    </nav>
  );
}
