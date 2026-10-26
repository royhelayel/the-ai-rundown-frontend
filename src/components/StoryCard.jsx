/**
 * StoryCard — a story in Scroll mode (All News, My News, Popular, Interesting).
 *
 * A white panel on the page (Roy, 2026-10-17 — back from the flat, line-separated version,
 * which read as one long column of text): topic and status, headline,
 * the summary as one paragraph of full sentences, then every source and the Interesting star on
 * one row. The paragraph ends in a quiet "… more" on its third line, and "less" when
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
import ExpandableSummary from './ExpandableSummary';
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

  return (
    <article className="rn-tp" onClick={() => !expanded && expand()}
      style={{ ...topicVars(category), background: 'var(--story-panel)', border: '1px solid var(--story-panel-edge)', borderRadius: 16,
        padding: '14px 16px 14px', marginBottom: 12, cursor: expanded ? 'default' : 'pointer', color: 'var(--ink)' }}>
      <StoryTopRow category={category} read={isRead} isNew={isNew} right={removeButton || undefined} />

      <h2 style={{ margin: '6px 0 8px', fontSize: 21, lineHeight: 1.18, letterSpacing: '-0.025em', fontWeight: 700 }}>
        {story.headline}
      </h2>

      {excerpt && <ExpandableSummary text={excerpt} expanded={expanded} onToggle={setExpanded} onExpand={onSeen} />}

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
