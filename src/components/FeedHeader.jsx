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
import { CATEGORY_SHORT, CATEGORY_COLORS, SPACE } from '../theme';
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

        {/* ── Identity and day, on one line. The wordmark moves off centre to the left
               edge, where it anchors the same gutter as everything under it — centred, it
               aligned with nothing and opened the header with an element outside the grid.
               The page is viewport-fit=cover, so this row is the first thing under the
               status bar: SPACE.md of its own plus whatever the device reserves. ── */}
        <div style={{ position: 'relative', zIndex: 8, display: 'flex', alignItems: 'center', gap: 10,
          padding: `calc(env(safe-area-inset-top, 0px) + ${SPACE.md}px) ${SPACE.md}px ${SPACE.md}px` }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            <span style={{ color: 'rgba(10,10,15,0.46)' }}>Radio</span>
            <span style={{ color: 'rgba(10,10,15,0.24)' }}>News</span>
          </span>
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
        {/* ── Scope and topics, as one row — Listen's header, part for part.
               There is no My/All mode any more: you see every topic until you edit them,
               and after that you see yours. So the pinned slot holds the editor, the one
               control that changes what this strip contains.
               The pills are text, not chips: weight and colour carry the state, and the
               active one is marked by an underline rather than a filled rectangle. ── */}
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'stretch', paddingTop: SPACE.sm }}>
          <style>{`.fh-cat-strip::-webkit-scrollbar { display: none; }`}</style>

          {/* Pinned, so it holds still while the topics move past it. Bottom-padded so its
              box centres on the tab labels rather than on the row. */}
          {onEditCategories && (
            <span style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: SPACE.md, paddingBottom: 11, flexShrink: 0 }}>
              <button
                // Guests go to My News rather than straight to a sign-in box. That page
                // explains what a personalised feed is and asks to sign in *for* it — the
                // dialog on its own asks for an account with no reason attached.
                onClick={() => (user ? onEditCategories() : navigate('/my-feed'))}
                aria-label="Choose your topics"
                title="Choose your topics"
                style={{ width: 26, height: 26, border: 'none', padding: 0, borderRadius: 8,
                  background: 'transparent', color: '#6b7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SlidersHorizontal size={14} />
              </button>
            </span>
          )}
          {categories.length > 0 && (
            <span aria-hidden style={{ width: 1, margin: `${SPACE.sm}px ${SPACE.sm}px ${SPACE.md}px`, background: 'rgba(0,0,0,0.12)', flexShrink: 0 }} />
          )}

          {/* `position: relative` is load-bearing: centrePill measures the active tab with
              offsetLeft, which is relative to the nearest *positioned* ancestor. Without it
              that is the outer row, and the pinned editor's width gets added to every
              target — the strip then scrolls past the tab it is trying to centre. */}
          <div ref={stripRef} className="fh-cat-strip" style={{ position: 'relative', flex: 1, minWidth: 0, overflowX: 'auto', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, paddingRight: SPACE.md, minWidth: 'max-content' }}>
              {showAllPill && (() => {
                const act = activeCategory === null;
                return (
                  <button onClick={() => onSelectCategory?.(null)}
                    aria-current={act ? 'page' : undefined}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      padding: `0 0 ${SPACE.md}px`, whiteSpace: 'nowrap', flexShrink: 0,
                      fontSize: '0.84rem', fontWeight: act ? 800 : 600,
                      color: act ? '#0a0a0f' : '#9ca3af',
                      boxShadow: act ? 'inset 0 -2px 0 0 #0a0a0f' : 'none' }}>
                    Top
                  </button>
                );
              })()}
              {categories.map(cat => {
                const act = cat === activeCategory;
                const c = act ? (CATEGORY_COLORS[cat] || '#0a0a0f') : '#9ca3af';
                return (
                  <button key={cat} ref={act ? activePillRef : null} onClick={() => onSelectCategory?.(cat)}
                    aria-current={act ? 'page' : undefined}
                    style={{ background: 'none', border: 'none', cursor: act ? 'default' : 'pointer',
                      padding: `0 0 ${SPACE.md}px`, whiteSpace: 'nowrap', flexShrink: 0,
                      fontSize: '0.84rem', fontWeight: act ? 800 : 600, color: c,
                      boxShadow: act ? `inset 0 -2px 0 0 ${c}` : 'none' }}>
                    {CATEGORY_SHORT[cat] || cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right-aligned, last in the header, so it lands directly above the first story
            and reads as a property of the list rather than another piece of scope. */}
        {showLens && (
          /* Clear of the rule above it: butted straight against the pills' underline, the
             control read as part of that row rather than as a property of the list below. */
          <div style={{ padding: `${SPACE.md}px ${SPACE.md}px 12px` }}>
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
