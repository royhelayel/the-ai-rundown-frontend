/**
 * TopicRecap — "World recap": the whole topic in one piece, for Scroll (an article) and
 * Swipe (one scrolling panel per topic). Listen plays the same text through the player.
 *
 * One short paragraph per development, each ending in "Sources · N". The trigger names what
 * it opens: a panel with the story the paragraph came from, its outlet links, and a way into
 * the story. The outlet links live only inside that panel (Codex, 2026-10-15).
 *
 * Which story a sentence came from is recorded by the recap writer (`briefing_sources` on the
 * row). Recaps written before that existed have no record, so they show as plain paragraphs
 * with no trigger rather than a guessed attribution.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { NextLink } from './StoryBits';
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

// Swipe: one panel per topic holding the whole recap (Roy, 2026-10-17 — it used to be cut
// into pages of two paragraphs). A long recap scrolls inside its panel; once you reach the end,
// a swipe moves to the next topic's recap, exactly as a story card hands over to the next
// story: the panel follows the finger with the next one already underneath, a 70px pull
// commits with the same 260ms slide, and anything shorter springs back. Swiping back from the
// next topic lands at the end of this one.
const SLIDE = 'transform 0.26s cubic-bezier(0.22,0.61,0.36,1)';
const PANEL_GAP = 16;     // between two panels while they slide
const PULL = 70;          // the same commit distance as a story
const EDGE_SLOP = 4;      // fractional scroll positions never quite reach the edge
const WHEEL_QUIET_MS = 180;
// Outside the component: crossing into the next topic mounts a fresh recap, and a lock that
// lived inside it let the rest of the same fling turn a second topic.
const wheel = { locked: false, quiet: null };

// One topic's recap. `text` undefined means a neighbouring topic whose recap isn't loaded yet
// (weekly and monthly load per topic): its heading shows, the words follow on arrival.
function RecapCard({ category, period, text, sourcesMap, isToday, dateLabel, onCite }) {
  const name = CATEGORY_SHORT[category] || category;
  return (
    <article className="rn-tp" style={{ ...topicVars(category), flex: '1 0 auto', minWidth: 0, background: 'var(--tp-card)', color: 'var(--card-ink)',
      borderRadius: 19, padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 24, fontSize: 11.5, fontWeight: 650, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <Sparkles size={14} strokeWidth={1.8} />{name} · {LABEL[period]}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.045em', fontWeight: 700 }}>{TITLE[period](name, isToday, dateLabel)}</h1>
        {text && <span style={{ fontSize: 12.5, color: 'var(--card-sub)' }}>{readMinutes(text)} min read</span>}
      </div>
      {text === undefined ? null : !text ? (
        <div style={{ color: 'var(--card-sub)' }}><RecapEmpty category={category} period={period} /></div>
      ) : recapParts(text, sourcesMap).map((p, i) => (
        <p key={i} style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: 'var(--card-body)' }}>
          {p.text}<Cite stories={p.stories} onOpen={() => onCite(p)} onCard />
        </p>
      ))}
    </article>
  );
}

export function TopicRecapPanel({ category, period = 'Daily', text, sourcesMap, storyCount, onOpenStory, isToday = true, dateLabel,
  nextTopic = null, prevTopic = null, onLeave, startAtEnd = false }) {
  const [part, setPart] = useState(null);
  const hasPrev = !!prevTopic;
  const hasNext = !!nextTopic;

  // ── The strip: the drag offset is written straight to the layers, never through React
  // state, so following the finger costs no renders (StoryReader explains why at length). ──
  const stripRef = useRef(null);
  const stripH = useRef(typeof window !== 'undefined' ? window.innerHeight : 800);
  const layers = useRef(new Map());
  const curRef = useRef(null);
  const dragging = useRef(false);
  const committing = useRef(false);
  const register = (key, slot) => (el) => {
    if (el) layers.current.set(key, { el, slot });
    else layers.current.delete(key);
  };
  const applyOffset = (dy, animate) => {
    const transition = animate ? SLIDE : 'none';
    const step = stripH.current + PANEL_GAP;
    layers.current.forEach(({ el, slot }) => {
      const transform = `translate3d(0, ${dy + slot * step}px, 0)`;
      if (el.style.transform === transform && el.style.transition === transition) return;
      el.style.transition = transition;
      el.style.transform = transform;
    });
  };
  // Measure before the first paint, then seat the layers before every paint.
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (!h || h === stripH.current) return;
      stripH.current = h;
      if (!dragging.current && !committing.current) applyOffset(0, false);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!dragging.current && !committing.current) applyOffset(0, false);
  });
  // Coming back from the topic after lands where you left this one: at its end. A recap that
  // arrives after the panel opened (weekly, monthly) gets the same treatment.
  useLayoutEffect(() => {
    const el = curRef.current;
    if (el) el.scrollTop = startAtEnd ? el.scrollHeight : 0;
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitTo = (dir) => {
    if (committing.current || (dir === 'next' ? !hasNext : !hasPrev)) return;
    committing.current = true;
    const step = stripH.current + PANEL_GAP;
    applyOffset(dir === 'next' ? -step : step, true);
    setTimeout(() => { committing.current = false; onLeave?.(dir); }, 260);
  };

  // ── Touch and wheel: the same rules as a story card ──
  const touchY = useRef(null);
  const dragBase = useRef(null);
  const atTop = () => { const el = curRef.current; return !el || el.scrollTop <= EDGE_SLOP; };
  const atBottom = () => { const el = curRef.current; return !el || (el.scrollHeight - el.scrollTop - el.clientHeight) <= EDGE_SLOP; };
  const blocked = () => !!part;

  const onTouchStart = (e) => {
    if (blocked()) return;
    if (committing.current) { touchY.current = null; return; }
    if (dragging.current) { dragging.current = false; applyOffset(0, false); }
    touchY.current = e.touches[0].clientY;
    dragBase.current = null;
  };
  const onTouchMove = (e) => {
    if (blocked() || touchY.current == null || committing.current) return;
    const y = e.touches[0].clientY;
    const travel = y - touchY.current;
    if ((travel < 0 && atBottom() && hasNext) || (travel > 0 && atTop() && hasPrev)) {
      if (dragBase.current == null) dragBase.current = y;
      if (e.cancelable) e.preventDefault();
      dragging.current = true;
      applyOffset(y - dragBase.current, false);
    } else if (dragging.current) {
      dragging.current = false;
      dragBase.current = null;
      applyOffset(0, false);
    }
  };
  const onTouchEnd = (e) => {
    if (blocked() || touchY.current == null || committing.current) return;
    const dy = e.changedTouches[0].clientY - (dragBase.current ?? touchY.current);
    touchY.current = null;
    dragBase.current = null;
    dragging.current = false;
    if (dy < -PULL && atBottom() && hasNext) commitTo('next');
    else if (dy > PULL && atTop() && hasPrev) commitTo('prev');
    else applyOffset(0, true);
  };
  const onTouchCancel = () => {
    touchY.current = null;
    dragBase.current = null;
    if (dragging.current) { dragging.current = false; applyOffset(0, true); }
  };
  const onWheel = (e) => {
    if (blocked() || Math.abs(e.deltaY) < 14) return;
    // One fling is dozens of wheel events; the lock only lifts once they stop.
    if (wheel.quiet) clearTimeout(wheel.quiet);
    wheel.quiet = setTimeout(() => { wheel.locked = false; }, WHEEL_QUIET_MS);
    if (wheel.locked) return;
    if (e.deltaY > 0 && (!atBottom() || !hasNext)) return;
    if (e.deltaY < 0 && (!atTop() || !hasPrev)) return;
    wheel.locked = true;
    commitTo(e.deltaY > 0 ? 'next' : 'prev');
  };

  // The topic before, this one and the topic after, so what slides in is what you land on.
  const slots = [];
  if (prevTopic) slots.push([-1, `${prevTopic.category}:prev`, prevTopic]);
  slots.push([0, `${category}:here`, { category, text, sourcesMap }]);
  if (nextTopic) slots.push([1, `${nextTopic.category}:next`, nextTopic]);

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', touchAction: 'pan-y' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel} onWheel={onWheel}>
      <div ref={stripRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {slots.map(([slot, key, t]) => (
          <div key={key}
            ref={(el) => {
              register(key, slot)(el);
              if (slot === 0) curRef.current = el;
              // The topic before slides in showing its end — where swiping back lands.
              if (slot === -1 && el) el.scrollTop = el.scrollHeight;
            }}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto', overscrollBehavior: 'contain', willChange: 'transform', backfaceVisibility: 'hidden',
              display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
            <RecapCard category={t.category} text={t.text} sourcesMap={t.sourcesMap} period={period} isToday={isToday} dateLabel={dateLabel} onCite={setPart} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 44 }}>
        {nextTopic && (
          <NextLink dir="up" onClick={() => commitTo('next')}>Swipe up for {CATEGORY_SHORT[nextTopic.category] || nextTopic.category} recap</NextLink>
        )}
      </div>
      <SourcesSheet part={part} category={category} storyCount={storyCount} onClose={() => setPart(null)} onOpenStory={onOpenStory} />
    </div>
  );
}
