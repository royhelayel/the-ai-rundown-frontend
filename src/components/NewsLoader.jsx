/**
 * NewsLoader — what every mode shows while a day's news is on its way.
 *
 * Changing the date used to leave the previous day's stories on screen under the new date
 * until the fetch landed, with nothing to say it was working (Roy, 2026-10-17). Scroll, Swipe
 * and Listen all show this one instead.
 */
import React from 'react';
import { formatHeaderDate } from './AppHeader';

const label = (day) => {
  const d = day ? formatHeaderDate(day) : '';
  return !d ? 'Loading the news' : d === 'Today' ? "Loading today's news" : `Loading the news for ${d}`;
};

export default function NewsLoader({ day }) {
  return (
    <div role="status" aria-live="polite"
      style={{ flex: 1, minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, color: 'var(--sub)', fontSize: 14, fontWeight: 600 }}>
      <span aria-hidden style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--line)', borderTopColor: 'var(--accent)',
        animation: 'rn-spin 0.8s linear infinite' }} />
      {label(day)}
    </div>
  );
}
