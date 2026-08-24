import React from 'react';
import { FileText, Play } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';

/**
 * RecapBar — the category's one-minute summary, as an item rather than a button.
 *
 * It kept getting lost as a chip in the header because it was the only piece of *content*
 * being rendered as chrome. Given the same shape as a story card — icon, title, meta, a play
 * affordance — it reads as something to consume, which is what it is.
 *
 * Tapping the body opens the recap; tapping play narrates it.
 */
export default function RecapBar({ category, storyCount = 0, theme = 'light', compact = false, onOpen, onPlay }) {
  const dark = theme === 'dark';
  const accent = dark ? '#a5b4fc' : (CATEGORY_COLORS[category] || '#6366f1');
  const name = CATEGORY_SHORT[category] || category;

  const readBtn = {
    padding: compact ? '4px 10px' : '5px 12px', borderRadius: 8,
    fontSize: compact ? '0.7rem' : '0.72rem', fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, background: 'transparent', color: accent,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.3)' : `${accent}66`}`,
  };
  const listenBtn = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: compact ? '4px 10px' : '5px 12px', borderRadius: 8,
    fontSize: compact ? '0.7rem' : '0.72rem', fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, border: 'none',
    background: dark ? 'rgba(255,255,255,0.92)' : accent,
    color: dark ? '#0a0a14' : '#fff',
  };
  const actions = (
    <>
      <button onClick={(e) => { e.stopPropagation(); onOpen?.(); }} style={readBtn}>Read</button>
      {onPlay && (
        <button onClick={(e) => { e.stopPropagation(); onPlay(); }} aria-label={`Listen to the ${name} recap`} style={listenBtn}>
          <Play size={10} fill={dark ? '#0a0a14' : '#fff'} color={dark ? '#0a0a14' : '#fff'} style={{ marginLeft: 1 }} />
          Listen
        </button>
      )}
    </>
  );

  // One line rather than two stacked. Full width across the screen with the lens on its own
  // row beneath — the arrangement that read best — but the recap itself is half the height
  // it was, and that difference goes to the story card.
  //
  // The title truncates and the actions never shrink: if a category name runs long, it's the
  // name that gives, not the two things you can do here.
  if (compact) {
    return (
      <div onClick={onOpen}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 5px 5px 11px',
          borderRadius: 11, cursor: 'pointer',
          background: dark ? 'rgba(165,180,252,0.14)' : `${accent}17` }}>
        <FileText size={15} color={accent} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: '0.74rem', fontWeight: 700,
          color: dark ? 'rgba(255,255,255,0.92)' : '#0a0a0f',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name} Category recap <span style={{ fontWeight: 600, color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>· 1 min</span>
        </span>
        {/* Same shape as the story card's own Summary/Listen pair below — rounded-rect,
            not a pill — so the two look like the same family of button rather than two
            different button languages on the same screen. */}
        <button onClick={(e) => { e.stopPropagation(); onOpen?.(); }} aria-label={`Read the ${name} recap`}
          style={{ flexShrink: 0, padding: '3px 11px', borderRadius: 8, background: 'transparent',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.3)' : `${accent}66`}`,
            color: accent, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
          Read
        </button>
        {onPlay && (
          <button onClick={(e) => { e.stopPropagation(); onPlay(); }} aria-label={`Listen to the ${name} recap`}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px',
              borderRadius: 8, border: 'none', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
              background: dark ? 'rgba(255,255,255,0.92)' : accent, color: dark ? '#0a0a14' : '#fff' }}>
            <Play size={9} fill={dark ? '#0a0a14' : '#fff'} color={dark ? '#0a0a14' : '#fff'} />
            Listen
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
        background: dark ? 'rgba(165,180,252,0.14)' : `${accent}17`,
      }}
    >
      <FileText size={16} color={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: dark ? '#fff' : '#0a0a0f' }}>
          {name} recap
        </p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: dark ? 'rgba(255,255,255,0.55)' : '#6b7280' }}>
          {storyCount} {storyCount === 1 ? 'story' : 'stories'} · 1 min
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{actions}</div>
    </div>
  );
}
