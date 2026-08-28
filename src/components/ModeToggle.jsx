import React from 'react';
import { LayoutList, GalleryVerticalEnd, Headphones } from 'lucide-react';

/**
 * ModeToggle — Scroll ↔ Swipe, the two ways of reading the same stories.
 *
 * Three ways to take the same stories: read them as a list, swipe them one at a time, or
 * have them read to you. Audio isn't a persistent view — it opens the player on whatever
 * story you're currently on, so it continues from where you were rather than restarting.
 *
 * Category Recap deliberately isn't here: it's scoped to the selected category, not a way
 * of consuming stories, so it lives with the category instead.
 *
 * Sits in the same slot in every mode so it never has to be hunted for.
 */
export default function ModeToggle({ mode = 'scroll', onChange, theme = 'light' }) {
  const dark = theme === 'dark';
  const track    = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const activeBg = dark ? '#ffffff' : '#0a0a0f';
  const activeFg = dark ? '#0a0a14' : '#ffffff';
  const idleFg   = dark ? 'rgba(255,255,255,0.55)' : '#6b7280';

  // LayoutList = thumbnails with lines beside them, i.e. a feed of story cards.
  // GalleryVerticalEnd = a card stack with one large card in front, i.e. one story per screen.
  const item = (key, label, Icon) => {
    const on = mode === key;
    return (
      <button
        key={key}
        onClick={() => !on && onChange?.(key)}
        aria-label={label}
        aria-pressed={on}
        title={label}
        style={{
          border: 'none', cursor: on ? 'default' : 'pointer',
          height: 30, padding: '0 12px', borderRadius: 8,
          background: on ? activeBg : 'transparent',
          color: on ? activeFg : idleFg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={15} strokeWidth={on ? 2.4 : 1.9} />
      </button>
    );
  };

  return (
    // 34px to match the circular buttons it sits between — they're one cluster, so a 3px
    // height difference reads as a mistake rather than as a distinction.
    <div style={{ display: 'flex', alignItems: 'center', height: 34, boxSizing: 'border-box', background: track, borderRadius: 10, padding: 2, flexShrink: 0 }}>
      {item('swipe', 'Swipe', GalleryVerticalEnd)}
      {item('scroll', 'Scroll', LayoutList)}
      {item('audio', 'Listen', Headphones)}
    </div>
  );
}
