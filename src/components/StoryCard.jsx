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
import { Play, FileText } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import CategoryIcon from './CategoryIcon';
import InterestingButton from './InterestingButton';
import CircleAction from './CircleAction';


export default function StoryCard({
  story,
  category,
  isRead,
  isNew,        // story added in the evening incremental load — shows "New" until read
  isUpdated,    // existing story with a fresh evening development merged in — shows "Updated" until read
  listenCount,
  savedCount,
  isSaved,       // whether this story is in the user's Interesting list
  onToggleSaved, // toggles it
  onRead,
  onPlay,
  onSeen,        // called when the reader opens the story's takeaways or summary
  removeButton,
}) {
  const color = CATEGORY_COLORS[category] || '#6366f1';
  const short = CATEGORY_SHORT[category]  || category;
  const sources = (story.storySources || []).filter(s => s.outlet);

  // The card used to show a single bullet as a blind excerpt. The takeaways are what the
  // story actually says, and they're already the summary elsewhere — same set here, so the
  // card, the sheet and Swipe mode all lead with the same three lines.
  const takeaways = story.tightBullets?.length
    ? story.tightBullets
    : (story.allBullets || []).slice(0, 3);
  const excerpt = takeaways.length
    ? takeaways.join(' ')
    : (story.summary || '');

  const [expanded, setExpanded] = React.useState(false);

  // Opening the takeaways or the summary is the moment the story was actually read — both
  // routes record it, so the count reflects what you chose to read rather than what
  // happened to scroll past.
  const openSummary = () => { onSeen?.(); onRead?.(); };
  const openTakeaways = () => { onSeen?.(); setExpanded(true); };

  // Top-right slot: read badge, or custom removeButton, or nothing.
  // A read story always shows "Read" (so a NEW evening story flips to Read once read).
  let badge = null;
  if (removeButton) {
    badge = removeButton;
  } else if (isRead === true) {
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, background: 'none', color: '#22c55e' }}>
        ✓ Read
      </span>
    );
  } else if (isNew) {
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, background: 'none', color: '#9ca3af' }}>
        New
      </span>
    );
  } else if (isUpdated) {
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, background: 'none', color: '#9ca3af' }}>
        Updated
      </span>
    );
  } else if (isRead === false) {
    badge = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', fontSize: '0.55rem', fontWeight: '700', flexShrink: 0, background: 'none', color: '#9ca3af' }}>
        Unread
      </span>
    );
  }

  return (
    <div
      onClick={openSummary}
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

        {/* Takeaways — three lines, expanding in place.
            The affordance is floated rather than parked on its own row, so the text wraps
            around it and it lands at the end of the last visible line. That keeps it read
            as the continuation of the sentence it interrupts, and costs no extra height. */}
        {excerpt && (
          <div style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#6b7280', lineHeight: 1.65 }}>
            {expanded ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {takeaways.map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.6rem' }} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(false); }}
                  style={{ marginTop: 8, padding: 0, background: 'none', border: 'none', cursor: 'pointer', color, fontSize: '0.8rem', fontWeight: 800 }}
                >
                  View less
                </button>
              </>
            ) : (
              <div style={{ maxHeight: '4.95em', overflow: 'hidden' }}>
                {/* Zero-width float spanning the first two lines. Floating the button alone
                    would reserve the right edge of every line, wrapping lines 1–2 short for
                    no reason; this occupies those lines without taking any width, and the
                    button clears it so it lands on line 3 only. */}
                <div style={{ float: 'right', width: 0, height: '3.3em' }} />
                <button
                  onClick={e => { e.stopPropagation(); openTakeaways(); }}
                  style={{ float: 'right', clear: 'right', padding: '0 0 0 6px', background: 'none', border: 'none', cursor: 'pointer', color, fontSize: '0.8rem', fontWeight: 800, lineHeight: 1.65 }}
                >
                  <span style={{ color: '#9ca3af', fontWeight: 400 }}>… </span>Takeaways
                </button>
                {excerpt}
              </div>
            )}
          </div>
        )}

        {/* Sources row — horizontally scrollable, all sources shown */}
        {sources.length > 0 && (
          <div
            onClick={e => e.stopPropagation()}
            style={{ overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '10px' }}
          >
            <style>{`.sc-sources::-webkit-scrollbar { display: none; }`}</style>
            <div className="sc-sources" style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 'max-content' }}>
              {sources.map((s, i) => (
                s.url ? (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0, textDecoration: 'none' }}
                  >
                    {s.outlet}
                  </a>
                ) : (
                  <span
                    key={i}
                    style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', background: 'rgba(0,0,0,0.05)', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {s.outlet}
                  </span>
                )
              ))}
            </div>
          </div>
        )}

        {/* Actions row — Interesting anchors the bottom-left corner, the same slot it
            occupies on the Swipe-mode card, so the two line up. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>

          {onToggleSaved && (
            <InterestingButton active={!!isSaved} onClick={e => { e.stopPropagation(); onToggleSaved(); }} />
          )}

          {/* Audience counts only — the read time was noise on every card */}
          <span style={{ flex: 1, fontSize: '0.72rem', fontWeight: '600', color: '#9ca3af' }}>
            {listenCount > 0 && `${listenCount.toLocaleString()} ${listenCount === 1 ? 'reader' : 'readers'}`}
            {listenCount > 0 && savedCount > 0 && ' · '}
            {savedCount > 0 && `${savedCount.toLocaleString()} interested`}
          </span>

          {/* Summary and Listen in the same circle-and-caption shape as Interesting, pinned
              to the right. They were an outlined pill and a filled one — three peer actions
              in three different silhouettes, with the two pills wide enough to push
              Interesting into the far corner. Listen stays filled so it still leads. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <CircleAction
              Icon={FileText}
              label="Go deeper"
              accent={color}
              onClick={e => { e.stopPropagation(); openSummary(); }}
              aria-label="Go deeper"
            />
            <CircleAction
              Icon={Play}
              label="Listen"
              variant="filled"
              accent={color}
              iconProps={{ fill: '#fff', color: '#fff', style: { marginLeft: 1 } }}
              onClick={e => { e.stopPropagation(); onPlay?.(); }}
              aria-label="Listen to story"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
