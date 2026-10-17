/**
 * StoryCard — a story in Scroll mode (All News, My News, Popular, Interesting).
 *
 * A white panel on the page (Roy, 2026-10-17 — back from the flat, line-separated version,
 * which read as one long column of text): topic and status, headline,
 * the summary as one paragraph of full sentences, then every source and the Interesting star on
 * one row. The paragraph ends in a quiet "… view more" on its third line, and "view less" when
 * open. There is no Go deeper and no Listen: summaries are short now, and the bottom bar is
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
import { storyParagraph } from '../lib/stories';

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
  const excerpt = storyParagraph(story);
  const [expanded, setExpanded] = React.useState(false);

  const expand = () => { onSeen?.(); setExpanded(true); };
  // Quiet: smaller than the text it ends and in its grey, so it reads as a way to open the
  // paragraph rather than a button competing with the headline (Roy, 2026-10-17).
  const toggleLink = { display: 'inline', padding: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--sub)', cursor: 'pointer', background: 'none', border: 'none' };

  return (
    <article className="rn-tp" onClick={() => !expanded && expand()}
      style={{ ...topicVars(category), background: 'var(--story-panel)', border: '1px solid var(--story-panel-edge)', borderRadius: 16,
        padding: '14px 16px 14px', marginBottom: 12, cursor: expanded ? 'default' : 'pointer', color: 'var(--ink)' }}>
      <StoryTopRow category={category} read={isRead} isNew={isNew} right={removeButton || undefined} />

      <h2 style={{ margin: '6px 0 8px', fontSize: 21, lineHeight: 1.18, letterSpacing: '-0.025em', fontWeight: 700 }}>
        {story.headline}
      </h2>

      {excerpt && (
        <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--sub)' }}>
          {expanded ? (
            <p style={{ margin: 0 }}>
              {excerpt}{' '}
              <button className="rn-btn" aria-expanded="true" onClick={(e) => { e.stopPropagation(); setExpanded(false); }} style={toggleLink}>view less</button>
            </p>
          ) : (
            /* Three lines, and "… view more" floated onto the end of the third so it reads as
               the end of the sentence it cuts off. The zero-width float occupies lines 1–2 so
               the button clears to line 3 without shortening the lines above it. */
            <div style={{ maxHeight: '4.8em', overflow: 'hidden' }}>
              <div style={{ float: 'right', width: 0, height: '3.2em' }} />
              <button className="rn-btn" aria-expanded="false" onClick={(e) => { e.stopPropagation(); expand(); }}
                style={{ ...toggleLink, float: 'right', clear: 'right', paddingLeft: 6, lineHeight: '25.6px', background: 'var(--story-panel)' }}>
                <span style={{ fontSize: 16, fontWeight: 400 }}>… </span>view more
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
        <SourcesRow sources={sources} bleed={16} />
        {onToggleSaved && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <StarButton active={!!isSaved} onClick={() => onToggleSaved()} />
          </div>
        )}
      </div>
    </article>
  );
}
