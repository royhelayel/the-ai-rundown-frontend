import React from 'react';

// Same helper as RecapBar's: the tint arrives as #rrggbb on light and rgb(r, g, b) on dark.
function hexA(c, a) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || '');
  if (m) return `rgba(${parseInt(m[1],16)}, ${parseInt(m[2],16)}, ${parseInt(m[3],16)}, ${a})`;
  const r = /rgba?\(([^)]+)\)/.exec(c || '');
  if (r) return `rgba(${r[1].split(',').slice(0,3).map(v=>v.trim()).join(', ')}, ${a})`;
  return `rgba(99, 102, 241, ${a})`;
}

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
export default function PeriodRecapChips({ recaps, minutesOf, onOpen, onPlay, accent: accentProp, theme = 'dark' }) {
  const dark = theme === 'dark';
  // The category's tint, passed down from the row that already computed it for the topic tab.
  // These used to be violet on purpose, to say "different kind of thing" — but they summarise
  // the same topic over a longer span, so wearing its colour is the truer statement, and it is
  // what makes the whole row read as one group.
  const accent = accentProp || (dark ? '#c4b5fd' : '#7c3aed');

  const chip = (period, label) => {
    const r = recaps?.[period];
    if (!r?.text) return null;
    return (
      <button
        key={period}
        onClick={() => onOpen?.(period)}
        title={`Read the ${label.toLowerCase()} recap`}
        style={{ border: 'none', cursor: 'pointer', flexShrink: 0,
          padding: '6px 13px', borderRadius: 999,
          fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
          background: hexA(accent, dark ? 0.20 : 0.13),
          color: accent }}
      >
        {label}
      </button>
    );
  };

  const chips = [chip('Weekly', 'Last week'), chip('Monthly', 'Last month')].filter(Boolean);
  if (!chips.length) return null;
  return <>{chips}</>;
}
