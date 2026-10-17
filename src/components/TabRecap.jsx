/**
 * TabRecap — the recap view inside Popular and Interesting in Scroll: the chosen topic's
 * recap as an article, the same one All News shows. Those two tabs had no recap tab at all,
 * so switching to them took it away (Roy, 2026-10-17).
 */
import React from 'react';
import { TopicRecapArticle } from './TopicRecap';

export default function TabRecap({ category, briefingData = {}, period = 'Daily', periodRecaps, selectedDay, onOpenStory }) {
  const text = period === 'Daily' ? (briefingData[category]?.briefing || null) : (periodRecaps?.[period]?.text || null);
  return (
    <div style={{ flex: 1, maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%', padding: '0 20px 120px' }}>
      <TopicRecapArticle
        category={category}
        period={period}
        text={text}
        sourcesMap={period === 'Daily' ? briefingData[category]?.briefingSources : periodRecaps?.[period]?.sources}
        dateLabel={selectedDay ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
        isToday={selectedDay === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date())}
        storyCount={briefingData[category]?.storyCount || 0}
        onOpenStory={(idx) => onOpenStory?.(category, idx)}
      />
    </div>
  );
}
