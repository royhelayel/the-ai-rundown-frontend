import React from 'react';

const border = 'rgba(0,0,0,0.08)';
const bg     = '#ffffff';
const bgSub  = '#f5f5f7';

// A single shimmer block — use className="sk" (CSS defined in App.js global style)
function S({ w = '100%', h, r = '6px', style = {} }) {
  return (
    <div
      className="sk"
      style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
    />
  );
}

// ── One story row stub ────────────────────────────────────────────────────────
function StoryRowSkeleton({ bgColor = bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '1.35rem 0.9rem',
      borderTop: `1px solid ${border}`,
      background: bgColor,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {/* Headline */}
        <S h="14px" w="82%" />
        {/* Excerpt line 1 */}
        <S h="12px" w="97%" />
        {/* Excerpt line 2 */}
        <S h="12px" w="90%" />
        {/* Excerpt line 3 */}
        <S h="12px" w="68%" />
        {/* Meta / sources */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
          <S h="18px" w="64px" r="999px" />
          <S h="18px" w="52px" r="999px" />
        </div>
      </div>
      {/* Play button */}
      <S h="30px" w="30px" r="50%" style={{ marginTop: '2px' }} />
    </div>
  );
}

// ── Category row skeleton (mimics CategoryRow) ────────────────────────────────
function CategoryRowSkeleton() {
  return (
    <div style={{
      marginBottom: '1rem',
      marginLeft: '1.25rem',
      marginRight: '1.25rem',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      {/* Image header placeholder */}
      <S h="130px" r="0" />
      {/* Story stubs */}
      <StoryRowSkeleton />
      <StoryRowSkeleton />
      <StoryRowSkeleton />
    </div>
  );
}

// ── Multiple category rows ────────────────────────────────────────────────────
export function SkeletonCategoryRows({ count = 3 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <CategoryRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Category page story list (mimics CategoryView inner card) ─────────────────
export function SkeletonCategoryView() {
  return (
    <div style={{
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
      marginBottom: '1rem',
    }}>
      {/* Hero image placeholder */}
      <S h="240px" r="0" />
      {/* Story stubs */}
      {Array.from({ length: 6 }).map((_, i) => (
        <StoryRowSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Popular story card skeleton ───────────────────────────────────────────────
function PopularCardSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.85rem 0.9rem',
      background: bgSub,
      borderRadius: '12px',
      border: `1px solid ${border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {/* Category label */}
        <S h="10px" w="18%" />
        {/* Headline */}
        <S h="14px" w="78%" />
        {/* Excerpt line 1 */}
        <S h="12px" w="97%" />
        {/* Excerpt line 2 */}
        <S h="12px" w="88%" />
        {/* Excerpt line 3 */}
        <S h="12px" w="62%" />
        {/* Sources + listens */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
          <S h="18px" w="60px" r="999px" />
          <S h="18px" w="48px" r="999px" />
        </div>
      </div>
      {/* Play button */}
      <S h="30px" w="30px" r="50%" style={{ marginTop: '2px' }} />
    </div>
  );
}

export function SkeletonPopularList({ count = 7 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <PopularCardSkeleton key={i} />
      ))}
    </div>
  );
}
