import React from 'react';

/**
 * CircleAction — a round icon button with a caption under it.
 *
 * Extracted from InterestingButton so the card's three actions share one shape. They used to
 * be a mixed set: Interesting as a circle-and-caption, then Summary as an outlined pill and
 * Listen as a filled one. Three different silhouettes for three peer actions made the row
 * read as a toolbar with an accent rather than a set of choices, and the two pills ate the
 * width that pushed Interesting into the far corner.
 *
 * `variant="filled"` keeps one of them primary — same silhouette, more weight — so Listen
 * still leads without needing a different shape or a label of its own.
 */
export default function CircleAction({
  Icon,
  label,
  onClick,
  active = false,
  variant = 'outline',
  accent,
  theme = 'light',
  iconProps = {},
  ...rest
}) {
  const dark = theme === 'dark';
  const activeColor = accent || (dark ? '#c4b5fd' : '#7c3aed');
  const idleColor   = dark ? 'rgba(255,255,255,0.6)'  : '#6b7280';
  const idleCaption = dark ? 'rgba(255,255,255,0.45)' : '#9ca3af';
  const idleBorder  = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.14)';

  const filled = variant === 'filled';
  // An accent wins in both themes. Dark used to ignore it and fill with white, so the same
  // Listen button was the category's colour in Scroll and a white disc in Swipe.
  const fillBg = accent || (dark ? 'rgba(255,255,255,0.92)' : '#7c3aed');
  const fillFg = accent ? '#fff' : (dark ? '#0a0a14' : '#fff');

  const circle = filled
    ? { border: '1.5px solid transparent', background: fillBg, color: fillFg }
    : {
        border: `1.5px solid ${active ? activeColor : idleBorder}`,
        background: active ? (dark ? 'rgba(167,139,250,0.18)' : 'rgba(124,58,237,0.10)') : 'transparent',
        color: active ? activeColor : idleColor,
      };

  const captionColor = filled ? (dark ? 'rgba(255,255,255,0.75)' : (accent || '#7c3aed'))
    : active ? activeColor : idleCaption;

  return (
    <button
      onClick={onClick}
      title={label}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
      {...rest}
    >
      <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...circle }}>
        <Icon size={13} {...iconProps} />
      </span>
      <span style={{ fontSize: '0.52rem', fontWeight: 700, color: captionColor, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}
