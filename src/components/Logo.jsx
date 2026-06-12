import React from 'react';

/**
 * RadioNews logo — a newspaper with a headset arcing around it.
 * Monochrome; inherits `color`. Use `size` to scale (square viewBox).
 */
export default function Logo({ size = 24, color = '#0a0a0f' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="RadioNews"
      role="img"
    >
      {/* Newspaper / paper, centered */}
      <rect x="9" y="11" width="14" height="15.5" rx="1.6" stroke={color} strokeWidth="1.6" />
      <line x1="11.6" y1="15"   x2="20.4" y2="15"   stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.6" y1="18.2" x2="20.4" y2="18.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.6" y1="21.4" x2="17.4" y2="21.4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

      {/* Headset band arcing over the top, from ear cup to ear cup */}
      <path
        d="M5 18.5 V15 a11 11 0 0 1 22 0 V18.5"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
      />

      {/* Ear cups hugging the paper's sides */}
      <rect x="3.1"  y="17" width="3.8" height="6.4" rx="1.9" fill={color} />
      <rect x="25.1" y="17" width="3.8" height="6.4" rx="1.9" fill={color} />
    </svg>
  );
}
