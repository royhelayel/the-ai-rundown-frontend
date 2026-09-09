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
    const ready = !!r?.text;
    return (
      <button
        key={period}
        disabled={!ready}
        onClick={ready ? () => onOpen?.(period) : undefined}
        title={ready ? `Read the ${label.toLowerCase()} recap` : `${label} recap — not generated yet`}
        style={{ border: 'none', flexShrink: 0,
          padding: '6px 11px', borderRadius: 999,
          fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap',
          cursor: ready ? 'pointer' : 'default',
          background: ready
            ? hexA(accent, dark ? 0.20 : 0.13)
            : (dark ? 'rgba(255,255,255,0.045)' : 'rgba(10,10,20,0.04)'),
          color: ready
            ? accent
            : (dark ? 'rgba(255,255,255,0.28)' : '#a8a8b3') }}
      >
        {label}
      </button>
    );
  };

  // Both always render. They used to disappear until their recap existed, which meant the
  // row silently changed shape on the days one landed — and nobody could learn the feature was
  // coming, because it only appeared once it had already arrived. Disabled says "this exists,
  // not yet"; absent says nothing at all.
  // "Week" and "Month", not "Last week" and "Last month". On one line beside the topic's name
  // the long pair measured 260px of a 319px box, leaving 40 for a phrase that needs 90 — so
  // the row could not be one line while they kept those labels. At 189px it can.
  return <>{[chip('Weekly', 'Week'), chip('Monthly', 'Month')]}</>;
}
