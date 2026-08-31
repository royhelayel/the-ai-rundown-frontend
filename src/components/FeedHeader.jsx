/**
 * FeedHeader — shared header for all four feed tabs.
 *
 * Structurally identical to the Swipe mode / Category Recap identity row + category pills +
 * "View as X" link (same padding/positioning/typography, just no story progress bar
 * since Scroll mode isn't paginated one-story-at-a-time).
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, SlidersHorizontal } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import LensToggle from './LensToggle';
import CorpusToggle from './CorpusToggle';
import { CATEGORY_SHORT, CATEGORY_COLORS } from '../theme';
import { centrePill } from '../utils';
import ProgressRail from './ProgressRail';
import ModeToggle from './ModeToggle';

function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date  = new Date(y, m - 1, d);
    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()) {
      return 'Today';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export default function FeedHeader({
  feedName = 'RadioNews',
  subtitle,
  user,
  onShowAuth,
  selectedDay,
  availableDays = [],
  onSelectDay,
  viewMode = 'feed',
  onChangeViewMode,
  onEnterStories,
  onEnterSummaries,
  onEnterAudio,
  categories = [],
  activeCategory = null,
  onSelectCategory,
  showAllPill = false,
  progressListened = 0,
  progressTotal = 0,
  showLens = false,
  lens = 'latest',
  onChangeLens,
  corpus = 'all',
  onChangeCorpus,
  onEditCategories, // My News only — the feed is defined by these, so it's editable here
}) {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [pickerOpen]);

  // Publish the sticky header's real height as --header-h.
  //
  // Everything that has to clear this header — where a category jump lands, where the
  // scroll-spy draws its line — used to hardcode its own guess at that number. They were
  // right when written and silently wrong the moment the header changed: adding the
  // wordmark grew it to 135px while the jump offset still said 100, so jumping to a
  // category parked its card 35px underneath the header. Measured once, read by all.
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the selected pill in view as the scroll-spy moves through categories — the same
  // behaviour Swipe mode's strip has. centrePill scrolls only this strip; see utils.
  const stripRef = useRef(null);
  const activePillRef = useRef(null);
  useEffect(() => {
    centrePill(stripRef.current, activePillRef.current);
  }, [activeCategory]);

  const effectiveDay = selectedDay || new Date().toISOString().split('T')[0];
  const canPickDay   = availableDays.length > 0;
  const dateLabel    = formatHeaderDate(effectiveDay);
  const linkStyle    = { padding: '2px 8px', border: 'none', background: 'transparent', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' };

  return (
    <>
    {/* Opaque, not blurred. At 95% opacity the blur was invisible, but backdrop-filter on
        a sticky element forces the compositor to re-blur the region behind it on every
        scroll frame — a known cause of scroll stutter and flicker on iOS Safari. */}
    <header ref={headerRef} style={{ position: 'sticky', top: 0, zIndex: 50, background: '#f5f5f7' }}>
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto' }}>

        {/* ── Wordmark. "Radio" carries the weight and "News" recedes, so the mark has a
               stress rather than reading as a flat monotone at this size. ── */}
        <div style={{ padding: '9px 16px 0', textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            <span style={{ color: 'rgba(10,10,15,0.46)' }}>Radio</span>
            <span style={{ color: 'rgba(10,10,15,0.24)' }}>News</span>
          </span>
        </div>

        {/* ── Scope row: corpus left, day right. The two ends of the same statement —
               "All news, today" — rather than a title with a subtitle under it.
               Tight to the topics below it: with the rule moved under the pills, these two
               rows are one header block, so the air between them is grouping, not separation.
               zIndex 8, above the category strip below it (zIndex 3): the day picker is an
               absolutely-positioned child of this row, so its own z-index only outranks
               siblings *within* this row's stacking context — against the strip, which ties
               on the old zIndex 3 and wins on DOM order, the dropdown painted underneath it
               and its lower half was clipped. ── */}
        <div style={{ position: 'relative', zIndex: 8, display: 'flex', alignItems: 'center', padding: '11px 16px 6px', gap: 10 }}>
          <CorpusToggle value={corpus} onChange={onChangeCorpus} theme="light" />
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button onClick={() => canPickDay && setPickerOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 0, background: 'transparent', border: 'none', cursor: canPickDay ? 'pointer' : 'default' }}>
              <Calendar size={12} color="#6b7280" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280' }}>{dateLabel}</span>
              {canPickDay && <ChevronDown size={12} color="#6b7280" />}
            </button>
            {pickerOpen && canPickDay && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20, width: 160, background: '#fff', borderRadius: 14, boxShadow: '0 12px 36px rgba(0,0,0,0.16)', border: '1px solid rgba(0,0,0,0.08)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {availableDays.map(day => {
                  const isActive = day.fullDate === selectedDay;
                  return (
                    <button
                      key={day.fullDate}
                      onClick={() => { onSelectDay?.(day.fullDate); setPickerOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 10px', borderRadius: 9, border: 'none',
                        background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                        color: isActive ? '#7c3aed' : '#374151',
                        fontSize: '0.78rem', fontWeight: isActive ? 800 : 500,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      {formatHeaderDate(day.fullDate)}
                      {isActive && <span style={{ fontSize: '0.6rem', color: '#7c3aed' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Category pills — quick jump across topics ── */}
        {categories.length > 0 && (
          /* Rule under the pills rather than over them, so the wordmark, the scope row and
             the topics read as one header block and the rule closes it off from the feed —
             rather than splitting the header's own two halves. Matches Swipe mode. */
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <style>{`.fh-cat-strip::-webkit-scrollbar { display: none; }`}</style>

            {/* Outside the scroller, so it stays put while the pills move. Icon rather than a
                labelled pill: the strip is the most contested row on the screen, and a word
                here cost more width than the control is worth. It opens the place where the
                topics actually live rather than duplicating that list in a sheet. */}
            {onEditCategories && (
              <button
                // Guests go to My News rather than straight to a sign-in box. That page
                // explains what a personalised feed is and asks to sign in *for* it — the
                // dialog on its own asks for an account with no reason attached.
                onClick={() => (user ? onEditCategories() : navigate('/my-feed'))}
                aria-label="Choose your topics"
                title="Choose your topics"
                style={{ flexShrink: 0, width: 26, height: 26, marginLeft: 16, borderRadius: 8, border: 'none',
                  background: 'transparent', color: '#6b7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SlidersHorizontal size={14} />
              </button>
            )}

            <div ref={stripRef} className="fh-cat-strip" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, padding: '8px 16px 9px', minWidth: 'max-content' }}>
              {showAllPill && (
                <button onClick={() => onSelectCategory?.(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 9, border: 'none',
                    background: activeCategory === null ? 'rgba(0,0,0,0.08)' : 'transparent', color: activeCategory === null ? '#0a0a0f' : '#9ca3af',
                    fontSize: '0.84rem', fontWeight: activeCategory === null ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer' }}>
                  All
                </button>
              )}
              {categories.map(cat => {
                const act = cat === activeCategory;
                // Selection carries the category's own colour; deselecting drops straight
                // back to the neutral grey, so only one pill is ever coloured.
                const c = act ? (CATEGORY_COLORS[cat] || '#0a0a0f') : '#9ca3af';
                return (
                  <button key={cat} ref={act ? activePillRef : null} onClick={() => onSelectCategory?.(cat)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 9, border: 'none',
                      background: act ? 'rgba(0,0,0,0.08)' : 'transparent', color: c,
                      fontSize: '0.84rem', fontWeight: act ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: act ? 'default' : 'pointer' }}>
                    <CategoryIcon category={cat} size={14} color={c} />
                    {CATEGORY_SHORT[cat] || cat}
                  </button>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {/* Right-aligned, last in the header, so it lands directly above the first story
            and reads as a property of the list rather than another piece of scope. */}
        {showLens && (
          /* Clear of the rule above it: butted straight against the pills' underline, the
             control read as part of that row rather than as a property of the list below. */
          <div style={{ padding: '12px 16px 12px' }}>
            <LensToggle value={lens} onChange={onChangeLens} theme="light" />
          </div>
        )}

      </div>
    </header>

    {/* Progress lives on a vertical rail beside the feed — a horizontal bar at the top
        read as Instagram Stories and implied a sideways gesture. Rendered outside the
        header because backdrop-filter would trap a fixed-position child. */}
    <ProgressRail filled={progressListened} total={progressTotal} theme="light" position="fixed" />
    </>
  );
}
