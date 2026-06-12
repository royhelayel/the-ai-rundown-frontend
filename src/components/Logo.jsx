import React from 'react';

/**
 * RadioNews logo — centered newspaper/paragraph lines flanked by a headset.
 * Each side: a slim, detached rounded-capsule ear cushion nestled inside the
 * headband, whose leg runs outside the cushion and hooks inward at the bottom
 * (mirrored left/right).
 *
 * Props:
 *   size      — width in px (height scales to the 38×28 viewBox)
 *   color     — used when `gradient` is false (monochrome)
 *   gradient  — when true, strokes use the brand purple→blue gradient
 */
export default function Logo({ size = 24, color = '#0a0a0f', gradient = false }) {
  const idRef = React.useRef(`rn-grad-${Math.random().toString(36).slice(2, 9)}`);
  const gradId = idRef.current;
  const stroke = gradient ? `url(#${gradId})` : color;

  return (
    <svg
      width={size}
      height={size * (28 / 38)}
      viewBox="0 0 38 28"
      fill="none"
      aria-label="RadioNews"
      role="img"
    >
      {gradient && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="38" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      )}

      {/* Headband — arcs over the top; legs run outside each cushion and hook inward */}
      <path
        d="M10.5 24.5 C8.4 24.5 7.5 22.8 7.5 20.5 V14.5 a11.5 11.5 0 0 1 23 0 V20.5 C30.5 22.8 29.6 24.5 27.5 24.5"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Ear cushions — slim, detached rounded capsules */}
      <rect x="11" y="12" width="3" height="11" rx="1.5" stroke={stroke} strokeWidth="2" />
      <rect x="24" y="12" width="3" height="11" rx="1.5" stroke={stroke} strokeWidth="2" />

      {/* Newspaper / paragraph lines, centered between the ear cushions */}
      <line x1="16" y1="11"   x2="22"   y2="11"   stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="14.5" x2="22"   y2="14.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="18"   x2="20.5" y2="18"   stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
