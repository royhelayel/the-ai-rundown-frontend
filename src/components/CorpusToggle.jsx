import React from 'react';

/**
 * CorpusToggle — My news / All news, the outermost scope.
 *
 * It was a pair of bottom tabs. It moved up here because the header carries the rest of the
 * narrowing chain — corpus, day, category, lens — and splitting the first link of that chain
 * off to the opposite end of the screen made the hierarchy unreadable.
 */
export default function CorpusToggle({ value = 'all', onChange, theme = 'light' }) {
  // Reads as a switch, not as two more chips.
  //
  // The category pills directly beneath draw their selected state almost identically to how
  // this used to draw its own — same subtle fill, same weight, same radius to within a pixel
  // — so stacked, the two rows read as one wrapped list of chips rather than "mode, then
  // topic". The fix is form, not spacing: a rounded track with a solid raised thumb is a
  // physical object, and the pills stay flat text. Nothing else on the screen looks like it.
  const dark = theme === 'dark';
  const track  = dark ? 'rgba(255,255,255,0.07)' : '#e6e6ec';
  const onBg   = dark ? 'rgba(255,255,255,0.95)' : '#ffffff';
  const onFg   = dark ? '#0a0a14' : '#0a0a0f';
  const offFg  = dark ? 'rgba(255,255,255,0.5)' : '#6b7280';

  const item = (key, label) => {
    const active = value === key;
    return (
      <button
        key={key}
        onClick={() => !active && onChange?.(key)}
        aria-pressed={active}
        style={{
          padding: '5px 13px', borderRadius: 999, border: 'none',
          background: active ? onBg : 'transparent',
          color: active ? onFg : offFg,
          // The thumb sits on the track rather than being cut into it — a small drop is what
          // sells it as a moving part instead of a highlighted cell.
          boxShadow: active ? '0 1px 3px rgba(0,0,0,0.35)' : 'none',
          fontSize: '0.82rem', fontWeight: active ? 800 : 600,
          whiteSpace: 'nowrap', cursor: active ? 'default' : 'pointer',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: 'inline-flex', background: track, borderRadius: 999, padding: 3, gap: 2, flexShrink: 0 }}>
      {item('mine', 'My news')}
      {item('all', 'All news')}
    </div>
  );
}
