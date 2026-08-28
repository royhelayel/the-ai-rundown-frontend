import React from 'react';

/**
 * CorpusToggle — My news / All news, the outermost scope.
 *
 * It was a pair of bottom tabs. It moved up here because the header carries the rest of the
 * narrowing chain — corpus, day, category, lens — and splitting the first link of that chain
 * off to the opposite end of the screen made the hierarchy unreadable.
 */
export default function CorpusToggle({ value = 'all', onChange, theme = 'light' }) {
  const dark = theme === 'dark';
  const track  = dark ? 'rgba(255,255,255,0.12)' : '#e6e6ec';
  const onBg   = dark ? 'rgba(255,255,255,0.22)' : '#ffffff';
  const onFg   = dark ? '#ffffff' : '#0a0a0f';
  const offFg  = dark ? 'rgba(255,255,255,0.55)' : '#6b7280';

  const item = (key, label) => {
    const active = value === key;
    return (
      <button
        key={key}
        onClick={() => !active && onChange?.(key)}
        aria-pressed={active}
        style={{
          padding: '4px 11px', borderRadius: 7, border: 'none',
          background: active ? onBg : 'transparent',
          color: active ? onFg : offFg,
          fontSize: '0.76rem', fontWeight: active ? 800 : 600,
          whiteSpace: 'nowrap', cursor: active ? 'default' : 'pointer',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: 'inline-flex', background: track, borderRadius: 9, padding: 3, gap: 2, flexShrink: 0 }}>
      {item('mine', 'My news')}
      {item('all', 'All news')}
    </div>
  );
}
