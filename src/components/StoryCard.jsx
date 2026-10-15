/**
 * StoryCard — a story in Scroll mode (All News, My News, Popular, Interesting).
 *
 * A flat item on the page, separated by a line rather than boxed: topic and status, headline,
 * the short summary, then every source and the Interesting star on one row. The summary ends
 * in "… view more" on its own last line, and "view less" when open — no separate Takeaways
 * line. There is no Go deeper and no Listen: summaries are short now, and the bottom bar is
 * how you choose to listen (Roy, 2026-10-15).
 *
 * Props:
 *   story, category
 *   isRead       — boolean for signed-in users, undefined for guests (no badge)
 *   isNew        — added in the evening run; reads "New" until opened
 *   listenCount, savedCount — audience counts (Popular / Interesting)
 *   isSaved, onToggleSaved — the Interesting star
 *   onSeen       — the reader opened the summary; counts as a read
 *   removeButton — optional JSX for the top-right slot (My Saves)
 */
import React from 'react';
import { StoryTopRow, StarButton, SourcesRow } from './StoryBits';
import { topicVars } from '../design';

export default function StoryCard({
  story,
  category,
  isRead,
  isNew,
  listenCount,
  savedCount,
  isSaved,
  onToggleSaved,
  onSeen,
  removeButton,
}) {
  const sources = (story.storySources || []).filter(s => s.outlet);
  const takeaways = story.tightBullets?.length
    ? story.tightBullets
    : (story.allBullets || []).slice(0, 3);
  const excerpt = takeaways.length ? takeaways.join(' ') : (story.summary || '');
  const [expanded, setExpanded] = React.useState(false);

  const expand = () => { onSeen?.(); setExpanded(true); };
  const toggleLink = { display: 'inline', padding: 0, font: 'inherit', fontWeight: 650, color: 'var(--tp-chip)', cursor: 'pointer', background: 'none', border: 'none' };

  return (
    <article className="rn-tp" onClick={() => !expanded && expand()}
      style={{ ...topicVars(category), borderBottom: '1px solid var(--line)', padding: '4px 0 16px', marginBottom: 14, cursor: expanded ? 'default' : 'pointer', color: 'var(--ink)' }}>
      <StoryTopRow category={category} read={isRead} isNew={isNew} right={removeButton || undefined} />

      <h2 style={{ margin: '6px 0 8px', fontSize: 21, lineHeight: 1.18, letterSpacing: '-0.025em', fontWeight: 700 }}>
        {story.headline}
      </h2>

      {excerpt && (
        <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--sub)' }}>
          {expanded ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {takeaways.map((b, i) => (
                <li key={i} style={{ display: 'flex', gap: 9 }}>
                  <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--tp-chip)', marginTop: 10, flexShrink: 0 }} />
                  <span>
                    {b}
                    {i === takeaways.length - 1 && (
                      <> <button className="rn-btn" aria-expanded="true" onClick={(e) => { e.stopPropagation(); setExpanded(false); }} style={toggleLink}>view less</button></>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            /* Three lines, and "… view more" floated onto the end of the third so it reads as
               the end of the sentence it cuts off. The zero-width float occupies lines 1–2 so
               the button clears to line 3 without shortening the lines above it. */
            <div style={{ maxHeight: '4.8em', overflow: 'hidden' }}>
              <div style={{ float: 'right', width: 0, height: '3.2em' }} />
              <button className="rn-btn" aria-expanded="false" onClick={(e) => { e.stopPropagation(); expand(); }}
                style={{ ...toggleLink, float: 'right', clear: 'right', paddingLeft: 6, lineHeight: 1.6, background: 'var(--paper)' }}>
                <span style={{ color: 'var(--sub)', fontWeight: 400 }}>… </span>view more
              </button>
              {excerpt}
            </div>
          )}
        </div>
      )}

      {(listenCount > 0 || savedCount > 0) && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--sub)' }}>
          {listenCount > 0 && `${listenCount.toLocaleString()} ${listenCount === 1 ? 'reader' : 'readers'}`}
          {listenCount > 0 && savedCount > 0 && ' · '}
          {savedCount > 0 && `${savedCount.toLocaleString()} interested`}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <SourcesRow sources={sources}
          star={onToggleSaved ? <StarButton active={!!isSaved} onClick={() => onToggleSaved()} /> : null} />
      </div>
    </article>
  );
}
