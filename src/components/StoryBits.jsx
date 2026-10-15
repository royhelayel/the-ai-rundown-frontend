/**
 * The small pieces every story card shares, so Listen, Swipe and Scroll show a story's
 * status, sources and Interesting the same way.
 */
import React from 'react';
import { ArrowUpRight, Check, Star } from 'lucide-react';
import { CATEGORY_SHORT } from '../theme';
import { topicVars } from '../design';
import CategoryIcon from './CategoryIcon';

// Read, New or Unread — nothing else (Roy dropped "Updated", 2026-10-15). New means the
// headline arrived in the evening run; it turns into Read once opened. Signed-in users only:
// pass `read` as undefined for guests and nothing renders.
export function StatusBadge({ read, isNew }) {
  if (read === undefined) return null;
  const base = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 };
  if (read) return <span style={{ ...base, color: 'var(--read)' }}><Check size={12} strokeWidth={2.6} />Read</span>;
  if (isNew) return <span style={{ ...base, color: 'inherit' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />New</span>;
  return <span style={{ ...base, color: 'var(--sub)', opacity: 0.9 }}>Unread</span>;
}

// "🌐 WORLD" on the left, the status on the right.
export function StoryTopRow({ category, read, isNew, onCard = false, right = null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 26 }}>
      <span className="rn-tp" style={{ ...topicVars(category), display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5,
        fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase', color: onCard ? 'inherit' : 'var(--tp-chip)' }}>
        <CategoryIcon category={category} size={14} color="currentColor" />
        {CATEGORY_SHORT[category] || category}
      </span>
      {right ?? <StatusBadge read={read} isNew={isNew} />}
    </div>
  );
}

export function StarButton({ active, onClick, onCard = false }) {
  return (
    <button className="rn-btn" aria-label={active ? 'Remove from Interesting' : 'Mark as Interesting'} aria-pressed={!!active}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: onCard ? 'var(--card-btn)' : 'var(--soft-btn)', color: 'inherit' }}>
      <Star size={17} strokeWidth={1.8} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

// Every source, in one row that scrolls sideways (Roy, 2026-10-15) — this used to be two
// names and "+3", with the full list only inside Go deeper, which is gone.
export function SourcesRow({ sources = [], onCard = false, star = null, bleed = false }) {
  const list = sources.filter(s => s.outlet);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="rn-hscroll" aria-label="Sources" onClick={(e) => e.stopPropagation()}
        style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, fontSize: 12.5, fontWeight: 600,
          color: onCard ? 'var(--card-sub)' : 'var(--sub)', ...(bleed ? { marginRight: -20, paddingRight: 20 } : {}) }}>
        {list.map((s, i) => {
          const style = { display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36, padding: '0 12px', borderRadius: 10,
            border: `1px solid ${onCard ? 'var(--card-line)' : 'var(--line)'}`, whiteSpace: 'nowrap', flexShrink: 0,
            color: 'inherit', textDecoration: 'none' };
          return s.url
            ? <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.title || s.outlet} style={style}>{s.outlet}<ArrowUpRight size={12} strokeWidth={2.2} /></a>
            : <span key={i} style={style}>{s.outlet}</span>;
        })}
      </div>
      {star}
    </div>
  );
}
