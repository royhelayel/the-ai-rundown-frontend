import React from 'react';
import { Play } from 'lucide-react';

/**
 * PeriodRecapChips — the week's and the month's recaps, sitting beside the category's.
 *
 * One row that answers "catch me up" at three scopes, widest last: this category today,
 * then the week, then the month.
 *
 * Deliberately not tinted with a category colour. These span every category, so borrowing
 * one would misdescribe them — the violet says "different kind of thing" while keeping the
 * row visually of a piece with the chip beside it.
 *
 * Each chip renders only when its recap exists, so the row is a category recap alone for
 * most of the week and grows on the days the others land.
 */
export default function PeriodRecapChips({ recaps, minutesOf, onOpen, onPlay, theme = 'dark' }) {
  const dark = theme === 'dark';
  const accent = dark ? '#c4b5fd' : '#7c3aed';

  const chip = (period, label) => {
    const r = recaps?.[period];
    if (!r?.text) return null;
    return (
      <div
        key={period}
        onClick={() => onOpen?.(period)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(period); } }}
        title={`Read the ${label.toLowerCase()} recap`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
          padding: '4px 4px 4px 11px', borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${dark ? 'rgba(167,139,250,0.42)' : 'rgba(124,58,237,0.32)'}`,
          background: dark ? 'rgba(124,58,237,0.20)' : 'rgba(124,58,237,0.07)',
        }}
      >
        <span style={{ fontSize: '0.73rem', fontWeight: 700, whiteSpace: 'nowrap', color: dark ? 'rgba(255,255,255,0.88)' : '#0a0a0f' }}>
          {label}{' '}
          <span style={{ fontWeight: 600, color: dark ? 'rgba(255,255,255,0.45)' : '#6b7280' }}>· {minutesOf(r.text)} min</span>
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onPlay?.(period); }}
          aria-label={`Listen to the ${label.toLowerCase()} recap`}
          style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: accent,
          }}
        >
          <Play size={10} fill={dark ? '#241a3d' : '#fff'} color={dark ? '#241a3d' : '#fff'} style={{ marginLeft: 1 }} />
        </button>
      </div>
    );
  };

  const chips = [chip('Weekly', 'Weekly'), chip('Monthly', 'Monthly')].filter(Boolean);
  if (!chips.length) return null;
  return <>{chips}</>;
}
