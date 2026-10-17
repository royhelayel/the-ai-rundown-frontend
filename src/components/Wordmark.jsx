import React from 'react';

/** Compact editorial wordmark, matching the landing-page headline typography. */
export default function Wordmark() {
  return (
    <span aria-label="RadioNews" style={{
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 29, fontWeight: 900,
      letterSpacing: '-1.4px', lineHeight: 1.1, whiteSpace: 'nowrap',
      color: 'var(--wordmark-ink)', flexShrink: 0,
    }}>
      <span>Radio</span><span style={{ color: 'var(--wordmark-dim)' }}>News</span>
    </span>
  );
}
