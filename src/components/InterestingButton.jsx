/**
 * InterestingButton — the "mark as Interesting" control, shared by the Scroll-mode card
 * (StoryCard) and the Swipe-mode card (StoryReader), so the two look and behave the same.
 *
 * A labelled icon rather than a pill: it has to share the bottom-left corner of the card
 * with the audience-count text (Scroll) or sit clear of the docked Summary/Listen buttons
 * (Swipe), and a full "Interesting" pill was too wide for either. The caption underneath
 * keeps it self-explanatory without the width.
 */
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function InterestingButton({ active, onClick, theme = 'light' }) {
  const dark = theme === 'dark';
  const activeColor = dark ? '#c4b5fd' : '#7c3aed';
  const idleColor    = dark ? 'rgba(255,255,255,0.6)' : '#6b7280';
  const idleCaption  = dark ? 'rgba(255,255,255,0.45)' : '#9ca3af';
  const idleBorder   = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.14)';

  return (
    <button
      onClick={onClick}
      aria-label={active ? 'Remove from Interesting' : 'Mark as Interesting'}
      title={active ? 'Remove from Interesting' : 'Mark as Interesting'}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${active ? activeColor : idleBorder}`,
        background: active ? (dark ? 'rgba(167,139,250,0.18)' : 'rgba(124,58,237,0.10)') : 'transparent',
        color: active ? activeColor : idleColor,
      }}>
        <Sparkles size={13} fill={active ? 'currentColor' : 'none'} />
      </span>
      <span style={{ fontSize: '0.52rem', fontWeight: 700, color: active ? activeColor : idleCaption }}>
        Interesting
      </span>
    </button>
  );
}
