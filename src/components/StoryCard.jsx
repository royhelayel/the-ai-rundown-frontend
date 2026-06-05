/**
 * StoryCard — single source of truth for story presentation.
 *
 * Used by: StoryList (My Feed + All News), PopularTab, ImportantTab
 *
 * Props:
 *   story        — story object (headline, storySources, allBullets, etc.)
 *   category     — category name string
 *   index        — optional number label (0-based); omit to hide
 *   isRead       — optional boolean; shows Read/New badge when provided
 *   listenCount  — optional number; shows "N listens" when > 0
 *   onRead       — called when card or Read button is clicked
 *   onPlay       — called when Play button is clicked
 *   removeButton — optional JSX rendered in the top-right badge slot
 */
import React from 'react';
import { Play } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_SHORT } from '../theme';

function faviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch { return null; }
}

export default function StoryCard({
  story,
  category,
  index,
  isRead,
  listenCount,
  onRead,
  onPlay,
  removeButton,
}) {
  const color      = CATEGORY_COLORS[category] || '#6366f1';
  const icon       = CATEGORY_ICONS[category]  || '';
  const short      = CATEGORY_SHORT[category]  || category;
  const sources    = (story.storySources || []).filter(s => s.outlet);
  const topSources = sources.slice(0, 2);
  const moreCount  = sources.length - topSources.length;

  const excerpt = story.allBullets?.[0]
    || story.tightBullets?.[0]
    || (story.summary ? story.summary.slice(0, 160) + (story.summary.length > 160 ? '…' : '') : '');

  // Top-right slot: read badge, or custom removeButton, or nothing
  let badge = null;
  if (removeButton) {
    badge = removeButton;
  } else if (isRead === true) {
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
        ✓ Read
      </span>
    );
  } else if (isRead === false) {
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.22)' }}>
        ● New
      </span>
    );
  }

  return (
    <div
      onClick={onRead}
      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.07)', cursor: 'pointer' }}
    >
      {/* Optional index number */}
      {index != null && (
        <span style={{ fontSize: '0.65rem', fontWeight: '800', width: '16px', flexShrink: 0, paddingTop: '3px', color: 'rgba(0,0,0,0.2)', lineHeight: 1 }}>
          {index + 1}
        </span>
      )}

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Category label + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.58rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {icon ? `${icon} ` : ''}{short}
          </span>
          {badge}
        </div>

        {/* Headline */}
        <p style={{ margin: '0 0 5px', fontSize: '0.88rem', fontWeight: '700', color: '#0a0a0f', lineHeight: 1.32 }}>
          {story.headline}
        </p>

        {/* Excerpt */}
        {excerpt && (
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.48, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {excerpt}
          </p>
        )}

        {/* Sources + actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

          {/* Source pills */}
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: '4px' }}>
            {topSources.map((s, i) => {
              const fav = faviconUrl(s.url);
              return (
                <span
                  key={i}
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.6rem', fontWeight: '600', color: '#6b7280' }}
                >
                  {fav && <img src={fav} alt="" width={10} height={10} style={{ borderRadius: '2px', opacity: 0.7 }} />}
                  {s.outlet}
                </span>
              );
            })}
            {moreCount > 0 && (
              <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9ca3af' }}>+{moreCount}</span>
            )}
            {listenCount > 0 && (
              <span style={{ fontSize: '0.6rem', color: '#9ca3af', marginLeft: '2px' }}>
                · {listenCount.toLocaleString()} {listenCount === 1 ? 'listen' : 'listens'}
              </span>
            )}
          </div>

          {/* Read button */}
          <button
            onClick={e => { e.stopPropagation(); onRead?.(); }}
            style={{ padding: '4px 10px', borderRadius: '7px', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', border: 'none', flexShrink: 0 }}
          >
            Read
          </button>

          {/* Play button */}
          <button
            onClick={e => { e.stopPropagation(); onPlay?.(); }}
            style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1px solid ${color}40`, background: `${color}15`, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Play size={10} fill={color} color={color} style={{ marginLeft: '1px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
