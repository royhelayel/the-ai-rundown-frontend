/**
 * The small pieces every story card shares, so Listen, Swipe and Scroll show a story's
 * status, sources and Interesting the same way.
 */
import React from 'react';
import { ArrowUpRight, Check, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORY_SHORT } from '../theme';
import { topicVars } from '../design';
import CategoryIcon from './CategoryIcon';

// Read, New or Unread — nothing else (Roy dropped "Updated", 2026-10-15). New means the
// headline arrived in the evening run; it turns into Read once opened. Signed-in users only:
// pass `read` as undefined for guests and nothing renders. Read is a bright green so it can be
// told apart at a glance in every mode (Roy, 2026-10-17): the old dark green all but vanished on
// the tinted cards, and a pill behind it was more than it needed.
export function StatusBadge({ read, isNew }) {
  if (read === undefined) return null;
  const base = { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--rn-home-meta, .75rem)', fontWeight: 600,
    letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 };
  if (read) return <span style={{ ...base, color: 'var(--read)' }}><Check size={13} strokeWidth={3} />Read</span>;
  if (isNew) return <span style={{ ...base, color: 'inherit' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />New</span>;
  return <span style={{ ...base, color: 'var(--sub)' }}>Unread</span>;
}

// "🌐 WORLD" on the left, the status on the right. On Scroll's panels the topic is written in
// its own colour, as vivid as reads clearly there — no pill (Roy, 2026-10-18); on Swipe's and
// Listen's cards the whole card is already that tint.
export function StoryTopRow({ category, read, isNew, onCard = false, right = null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 26 }}>
      <span className="rn-tp" style={{ ...topicVars(category), display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5,
        fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: onCard ? 'inherit' : 'var(--tp-label)' }}>
        <CategoryIcon category={category} size={14} color="currentColor" />
        {CATEGORY_SHORT[category] || category}
      </span>
      {right ?? <StatusBadge read={read} isNew={isNew} />}
    </div>
  );
}

// The star says what it is — a bare star read as "favourite" or "rate this" (Roy, 2026-10-17) —
// as one compact pill on a line of its own under the outlets, in every mode, so it never sits on
// them as they scroll (Roy, 2026-10-18).
export function StarButton({ active, onClick, onCard = false }) {
  return (
    <button className="rn-btn" aria-label={active ? 'Remove from Interesting' : 'Mark as Interesting'} aria-pressed={!!active}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, padding: '0 12px 0 10px', borderRadius: 999,
        background: onCard ? 'var(--card-btn)' : 'var(--soft-btn)', color: 'inherit', fontSize: 12.5, fontWeight: 600 }}>
      <Star size={15} strokeWidth={1.9} fill={active ? 'currentColor' : 'none'} />
      Interesting
    </button>
  );
}

// Every source, in one row that scrolls sideways (Roy, 2026-10-15) — this used to be two
// names and "+3", with the full list only inside Go deeper, which is gone. The row has the
// width to itself and runs to the card's edge (`bleed` is the card's side padding), fading out.
export function SourcesRow({ sources = [], onCard = false, bleed = 0 }) {
  const list = sources.filter(s => s.outlet);
  const edge = bleed === true ? 20 : Number(bleed) || 0;
  return (
    <div style={{ display: 'flex' }}>
      <div className="rn-hscroll" aria-label="Sources" onClick={(e) => e.stopPropagation()}
        style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, fontSize: 12.5, fontWeight: 600,
          color: onCard ? 'var(--card-sub)' : 'var(--sub)', ...(edge ? { marginRight: -edge, paddingRight: edge } : {}) }}>
        {list.map((s, i) => {
          const style = { display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36, padding: '0 12px', borderRadius: 10,
            border: `1px solid ${onCard ? 'var(--card-line)' : 'var(--line)'}`, whiteSpace: 'nowrap', flexShrink: 0,
            color: 'inherit', textDecoration: 'none' };
          return s.url
            ? <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.title || s.outlet} style={style}>{s.outlet}<ArrowUpRight size={12} strokeWidth={2.2} /></a>
            : <span key={i} style={style}>{s.outlet}</span>;
        })}
      </div>
    </div>
  );
}

// "Swipe up for next story", "View 6 more World stories", "View less World stories" and
// "Swipe up for page 2" are one family — the way on from where you are — so they share one
// quiet style in Listen, Swipe and Scroll instead of four sizes, two weights and a box
// (Roy, 2026-10-17). The chevron leads and points the way the content will move.
export const NextLink = React.forwardRef(function NextLink({ dir = 'down', as: Tag = 'button', style, children, ...rest }, ref) {
  const Icon = dir === 'up' ? ChevronUp : ChevronDown;
  return (
    <Tag ref={ref} className={Tag === 'button' ? 'rn-btn' : undefined} {...rest}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 34, padding: '0 12px',
        color: 'var(--sub)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', ...style }}>
      <Icon size={15} strokeWidth={2.2} aria-hidden />
      {children}
    </Tag>
  );
});
