/**
 * TopicRecap — "World recap": the whole topic in one piece, for Scroll (an article) and
 * Swipe (pages). Listen plays the same text through the player.
 *
 * One short paragraph per development, each ending in "Sources · N". The trigger names what
 * it opens: a panel with the story the paragraph came from, its outlet links, and a way into
 * the story. The outlet links live only inside that panel (Codex, 2026-10-15).
 *
 * Which story a sentence came from is recorded by the recap writer (`briefing_sources` on the
 * row). Recaps written before that existed have no record, so they show as plain paragraphs
 * with no trigger rather than a guessed attribution.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles, ChevronUp } from 'lucide-react';
import { CATEGORY_SHORT } from '../theme';
import { topicVars } from '../design';

// Sentences, keeping abbreviations and decimals ("1.2 billion", "U.S.") in one piece.
export function splitSentences(text) {
  return (text || '')
    .split(/\n\s*\n|\n/)
    .flatMap(p => p.match(/[^.!?]+(?:[.!?]+(?=\s+[A-Z"“‘(]|\s*$)|$)/g) || [p])
    .map(s => s.trim())
    .filter(Boolean)
    // A fragment that is only an abbreviation's tail ("S. officials") rejoins the one before.
    .reduce((acc, s) => {
      if (acc.length && /\b[A-Z]\.$/.test(acc[acc.length - 1])) acc[acc.length - 1] += ' ' + s;
      else acc.push(s);
      return acc;
    }, []);
}

// [{ text, stories: [{ headline, sources: [{ outlet, url }], index? }] }]
export function recapParts(text, sourcesMap) {
  if (Array.isArray(sourcesMap) && sourcesMap.length) {
    return sourcesMap.filter(p => p && p.text).map(p => ({ text: p.text, stories: p.stories || [] }));
  }
  return splitSentences(text).map(t => ({ text: t, stories: [] }));
}

const countSources = (stories) => stories.reduce((n, s) => n + (s.sources || []).filter(x => x.outlet).length, 0);

function Cite({ stories, onOpen, onCard }) {
  const n = countSources(stories);
  if (!n) return null;
  return (
    <button className="rn-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}
      aria-label={`Sources for this part (${n})`}
      style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 2, marginLeft: 5, padding: '3px 9px',
        borderRadius: 6, background: onCard ? 'var(--card-btn)' : 'var(--cite-bg)', color: onCard ? 'var(--card-ink)' : 'var(--cite-ink)',
        fontSize: 12, fontWeight: 600, lineHeight: '16px', whiteSpace: 'nowrap' }}>
      Sources · {n}
    </button>
  );
}

// The panel a "Sources · N" opens.
export function SourcesSheet({ part, category, storyCount, onClose, onOpenStory }) {
  const open = !!part;
  return (
    <>
      <div onClick={onClose} aria-hidden
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--overlay)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s' }} />
      <div role="dialog" aria-label="Where this part comes from" aria-hidden={!open}
        style={{ position: 'fixed', left: '50%', bottom: 0, zIndex: 401, width: '100%', maxWidth: 560,
          transform: `translateX(-50%) translateY(${open ? '0' : '100%'})`, transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
          background: 'var(--paper)', color: 'var(--ink)', borderRadius: '24px 24px 0 0', boxShadow: 'var(--menu-shadow)',
          padding: '10px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', maxHeight: '80dvh', overflowY: 'auto' }}>
        <span aria-hidden style={{ display: 'block', width: 38, height: 5, borderRadius: 5, background: 'var(--line)', margin: '0 auto 14px' }} />
        {(part?.stories || []).map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 18, marginBottom: 18,
            borderBottom: i < part.stories.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="rn-tp" style={{ ...topicVars(category), fontSize: 11.5, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tp-chip)' }}>
              {Number.isInteger(s.index) && storyCount ? `From story ${s.index + 1} of ${storyCount}` : `From ${CATEGORY_SHORT[category] || category}`}
            </span>
            <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.18, letterSpacing: '-0.025em', fontWeight: 700 }}>{s.headline}</h2>
            <div className="rn-hscroll" style={{ display: 'flex', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sub)' }}>
              {(s.sources || []).filter(x => x.outlet).map((x, j) => (
                <a key={j} href={x.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 36, padding: '0 12px', borderRadius: 10,
                    border: '1px solid var(--line)', whiteSpace: 'nowrap', flexShrink: 0, color: 'inherit', textDecoration: 'none' }}>
                  {x.outlet}<ArrowUpRight size={12} strokeWidth={2.2} />
                </a>
              ))}
            </div>
            {Number.isInteger(s.index) && onOpenStory && (
              <button className="rn-btn" onClick={() => { onClose(); onOpenStory(s.index); }}
                style={{ minHeight: 48, borderRadius: 14, background: 'var(--ink)', color: 'var(--paper)', fontSize: 14, fontWeight: 650 }}>
                Open the story
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function RecapEmpty({ category, period }) {
  const name = CATEGORY_SHORT[category] || category;
  return (
    <div style={{ padding: '40px 8px', textAlign: 'center', color: 'var(--sub)', lineHeight: 1.5 }}>
      <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 650, color: 'var(--ink)' }}>
        {period === 'Daily' ? `Today's ${name} recap isn't ready yet.` : `The ${period.toLowerCase()} ${name} recap isn't ready yet.`}
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        {period === 'Daily' ? 'It is written after the day\'s stories are checked. The stories are ready in the first tab.' : 'Pick another period from the menu.'}
      </p>
    </div>
  );
}

const TITLE = { Daily: (n, isToday, date) => (isToday || !date ? `Today in ${n}` : `${n}, ${date}`), Weekly: (n) => `${n} this week`, Monthly: (n) => `${n} this month` };
const LABEL = { Daily: 'Daily recap', Weekly: 'Weekly recap', Monthly: 'Monthly recap' };
export const readMinutes = (text) => Math.max(1, Math.round((text || '').split(/\s+/).filter(Boolean).length / 230));

// Scroll: an article.
export function TopicRecapArticle({ category, period = 'Daily', text, sourcesMap, dateLabel, isToday = true, storyCount, onOpenStory }) {
  const [part, setPart] = useState(null);
  if (!text) return <RecapEmpty category={category} period={period} />;
  const name = CATEGORY_SHORT[category] || category;
  const parts = recapParts(text, sourcesMap);
  return (
    <article style={{ padding: '4px 0 24px', color: 'var(--ink)' }}>
      <div className="rn-tp" style={{ ...topicVars(category), display: 'flex', alignItems: 'center', gap: 6, minHeight: 26,
        fontSize: 11.5, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tp-chip)' }}>
        <Sparkles size={14} strokeWidth={1.8} />{name} · {LABEL[period]}
      </div>
      <h1 style={{ margin: '6px 0 4px', fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.045em', fontWeight: 700 }}>{TITLE[period](name, isToday, dateLabel)}</h1>
      <div style={{ fontSize: 12.5, color: 'var(--sub)', marginBottom: 14 }}>{dateLabel ? `${dateLabel} · ` : ''}{readMinutes(text)} min read</div>
      {parts.map((p, i) => (
        <p key={i} style={{ margin: '0 0 12px', fontSize: 16.5, lineHeight: 1.6 }}>
          {p.text}<Cite stories={p.stories} onOpen={() => setPart(p)} />
        </p>
      ))}
      <SourcesSheet part={part} category={category} storyCount={storyCount} onClose={() => setPart(null)} onOpenStory={onOpenStory} />
    </article>
  );
}

// Swipe: pages that break only between whole paragraphs.
export function TopicRecapPages({ category, period = 'Daily', text, sourcesMap, storyCount, onOpenStory, perPage = 2, isToday = true, dateLabel }) {
  const [page, setPage] = useState(0);
  const [part, setPart] = useState(null);
  useEffect(() => { setPage(0); }, [category, period, text]);
  const touch = useRef(null);
  if (!text) return <div style={{ padding: '0 20px' }}><RecapEmpty category={category} period={period} /></div>;
  const name = CATEGORY_SHORT[category] || category;
  const parts = recapParts(text, sourcesMap);
  const pages = [];
  for (let i = 0; i < parts.length; i += perPage) pages.push(parts.slice(i, i + perPage));
  const last = pages.length - 1;
  const go = (d) => setPage(p => Math.max(0, Math.min(last, p + d)));
  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      onTouchStart={(e) => { touch.current = e.touches[0]?.clientY; }}
      onTouchEnd={(e) => { const y0 = touch.current; touch.current = null; const y1 = e.changedTouches[0]?.clientY; if (y0 == null || y1 == null) return; if (y0 - y1 > 50) go(1); else if (y1 - y0 > 50) go(-1); }}
      onWheel={(e) => { if (Math.abs(e.deltaY) > 30) go(e.deltaY > 0 ? 1 : -1); }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', padding: '0 20px' }}>
        <article className="rn-tp" style={{ ...topicVars(category), flex: 1, minWidth: 0, background: 'var(--tp-card)', color: 'var(--card-ink)',
          borderRadius: 19, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Sparkles size={14} strokeWidth={1.8} />{name} · {LABEL[period]}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Page {page + 1} of {pages.length}</span>
          </div>
          {page === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.045em', fontWeight: 700 }}>{TITLE[period](name, isToday, dateLabel)}</h1>
              <span style={{ fontSize: 12.5, color: 'var(--card-sub)' }}>{readMinutes(text)} min read</span>
            </div>
          )}
          {(pages[page] || []).map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: 'var(--card-body)' }}>
              {p.text}<Cite stories={p.stories} onOpen={() => setPart(p)} onCard />
            </p>
          ))}
        </article>
        <div aria-hidden style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          {pages.map((_, i) => (
            <span key={i} style={{ width: 5, height: i === page ? 16 : 5, borderRadius: 5, background: i === page ? 'var(--ink)' : 'var(--line)' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: 30, alignItems: 'center' }}>
        {page < last && (
          <button className="rn-btn" onClick={() => go(1)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--sub)', minHeight: 30 }}>
            <ChevronUp size={14} /> Swipe up for page {page + 2}
          </button>
        )}
      </div>
      <SourcesSheet part={part} category={category} storyCount={storyCount} onClose={() => setPart(null)} onOpenStory={onOpenStory} />
    </div>
  );
}
