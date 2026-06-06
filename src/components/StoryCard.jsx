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
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import CategoryIcon from './CategoryIcon';


export default function StoryCard({
  story,
  category,
  isRead,
  listenCount,
  onRead,
  onPlay,
  removeButton,
}) {
  const color = CATEGORY_COLORS[category] || '#6366f1';
  const short = CATEGORY_SHORT[category]  || category;
  const sources    = (story.storySources || []).filter(s => s.outlet);
  const topSources = sources.slice(0, 2);
  const moreCount  = sources.length - topSources.length;

  const excerpt = story.allBullets?.[0]
    || story.tightBullets?.[0]
    || (story.summary ? story.summary.slice(0, 300) + (story.summary.length > 300 ? '…' : '') : '');

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
      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '20px 16px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.07)', cursor: 'pointer' }}
    >
      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Category label + badge row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <CategoryIcon category={category} size={12} color={color} />
            {short}
          </span>
          {badge}
        </div>

        {/* Headline */}
        <p style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: '700', color: '#0a0a0f', lineHeight: 1.3 }}>
          {story.headline}
        </p>

        {/* Excerpt */}
        {excerpt && (
          <p style={{ margin: '0 0 14px', fontSize: '0.92rem', color: '#6b7280', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {excerpt}
          </p>
        )}

        {/* Sources + actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

          {/* Source pills */}
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: '4px' }}>
            {topSources.map((s, i) => (
              <span
                key={i}
                onClick={e => e.stopPropagation()}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280' }}
              >
                {s.outlet}
              </span>
            ))}
            {moreCount > 0 && (
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af' }}>+{moreCount}</span>
            )}
            {listenCount > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginLeft: '2px' }}>
                · {listenCount.toLocaleString()} {listenCount === 1 ? 'listen' : 'listens'}
              </span>
            )}
          </div>

          {/* Read button */}
          <button
            onClick={e => { e.stopPropagation(); onRead?.(); }}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', background: '#7c3aed', color: '#fff', border: 'none', flexShrink: 0 }}
          >
            Read
          </button>

          {/* Play button */}
          <button
            onClick={e => { e.stopPropagation(); onPlay?.(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '6px 14px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', background: 'transparent', color, border: `1px solid ${color}50`, flexShrink: 0 }}
          >
            <Play size={10} fill={color} color={color} style={{ marginLeft: '1px' }} />
            Play
          </button>
        </div>
      </div>
    </div>
  );
}
