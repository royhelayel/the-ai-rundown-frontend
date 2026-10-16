/**
 * Reading history — your own record: the summaries you read, and the ones you marked
 * Interesting. It replaces "View My Profile" (followers, following, a public page) and the
 * separate "My Interesting" feed, which had no way back to where you came from (Roy, 2026-10-16).
 */
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORY_SHORT } from '../theme';
import { topicVars } from '../design';
import { formatHeaderDate } from '../components/AppHeader';
import StoryCard from '../components/StoryCard';
import CategoryIcon from '../components/CategoryIcon';

const byDay = (items, dayOf) => {
  const groups = new Map();
  for (const it of items) {
    const d = dayOf(it) || '';
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d).push(it);
  }
  return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
};

function DayHeading({ day }) {
  return (
    <h3 style={{ margin: '18px 0 8px', fontSize: 12, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sub)' }}>
      {day ? formatHeaderDate(day) : 'Earlier'}
    </h3>
  );
}

function ReadRow({ entry, onOpen }) {
  return (
    <button className="rn-btn rn-tp" onClick={() => onOpen(entry)}
      style={{ ...topicVars(entry.category), display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        padding: '12px 0', borderBottom: '1px solid var(--line)', minHeight: 56 }}>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tp-chip)' }}>
          <CategoryIcon category={entry.category} size={12} color="currentColor" />
          {CATEGORY_SHORT[entry.category] || entry.category}
        </span>
        <span style={{ fontSize: 16.5, lineHeight: 1.3, fontWeight: 650, color: 'var(--ink)' }}>{entry.headline}</span>
      </span>
      <ChevronRight size={18} color="var(--sub)" style={{ flexShrink: 0 }} />
    </button>
  );
}

export default function ReadingHistoryPage({ user, listenHistory = [], mySaves = [], onOpenRead, onToggleSaved, onBack, onShowAuth }) {
  const [tab, setTab] = useState('read');

  const tabBtn = (value, label) => {
    const on = tab === value;
    return (
      <button className="rn-btn" aria-pressed={on} onClick={() => setTab(value)}
        style={{ position: 'relative', minHeight: 44, fontSize: 14, whiteSpace: 'nowrap', fontWeight: on ? 650 : 500, color: on ? 'var(--ink)' : 'var(--sub)' }}>
        {label}
        {on && <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 7, height: 3, borderRadius: 3, background: 'var(--accent)' }} />}
      </button>
    );
  };

  // One row per story, newest first — a story read on two devices is still one read.
  const seen = new Set();
  const reads = [...listenHistory]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .filter(h => { const k = `${h.date}|${(h.headline || '').toLowerCase()}`; if (seen.has(k)) return false; seen.add(k); return true; });

  return (
    <main style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100dvh', maxWidth: 'var(--body-max)', margin: '0 auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--paper)', padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 50 }}>
          <button className="rn-btn" onClick={onBack} aria-label="Back"
            style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 40, padding: '0 14px 0 10px', borderRadius: 999, border: '1px solid var(--line)', fontSize: 14, fontWeight: 650 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 750, letterSpacing: '-0.01em' }}>Reading history</h2>
        </div>
        <div role="group" aria-label="Which history" style={{ display: 'flex', gap: 22, marginTop: 4 }}>
          {tabBtn('read', 'Summaries I read')}
          {tabBtn('interesting', 'My interesting summaries')}
        </div>
      </div>

      <div style={{ padding: '0 20px 80px' }}>
        {!user ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--sub)' }}>
            <p style={{ margin: '0 0 14px' }}>Sign in to keep your reading history across your devices.</p>
            <button className="rn-btn" onClick={onShowAuth} style={{ minHeight: 44, padding: '0 20px', borderRadius: 14, background: 'var(--play-bg)', color: 'var(--play-fg)', fontWeight: 700 }}>Sign in</button>
          </div>
        ) : tab === 'read' ? (
          reads.length === 0
            ? <p style={{ padding: '48px 0', textAlign: 'center', color: 'var(--sub)' }}>Summaries you open or listen to will appear here.</p>
            : byDay(reads, h => h.date).map(([day, items]) => (
              <section key={day}>
                <DayHeading day={day} />
                {items.map(h => <ReadRow key={h.id || `${h.date}|${h.category}|${h.storyIndex}`} entry={h} onOpen={onOpenRead} />)}
              </section>
            ))
        ) : (
          mySaves.length === 0
            ? <p style={{ padding: '48px 0', textAlign: 'center', color: 'var(--sub)' }}>Tap the star on a story to keep it here.</p>
            : byDay(mySaves, s => s.day).map(([day, items]) => (
              <section key={day}>
                <DayHeading day={day} />
                {items.map(s => {
                  const story = s.content_snapshot
                    ? { ...s.content_snapshot, _day: s.day }
                    : { headline: s.headline, allBullets: s.preview ? [s.preview] : [], storySources: [], _day: s.day };
                  return (
                    <StoryCard key={s.story_key || `${s.day}|${s.headline}`} story={story} category={s.category}
                      isSaved onToggleSaved={() => onToggleSaved?.(story, s.category, s.story_index)} />
                  );
                })}
              </section>
            ))
        )}
      </div>
    </main>
  );
}
