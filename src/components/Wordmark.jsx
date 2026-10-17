import React from 'react';

/** Original uppercase wordmark with slightly tighter letter spacing. */
export default function Wordmark() {
  return (
    <span aria-label="RadioNews" style={{
      fontFamily: 'inherit', fontSize: 17, fontWeight: 800,
      letterSpacing: '0.17em', lineHeight: 1.1, whiteSpace: 'nowrap',
      color: 'var(--ink)', flexShrink: 0,
    }}>
      <span>RADIO</span><span style={{ color: 'var(--wordmark-dim)' }}>NEWS</span>
    </span>
  );
}
