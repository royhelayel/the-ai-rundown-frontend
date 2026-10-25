/**
 * AppHeader — the one header every mode shares (Listen, Swipe, Scroll).
 *
 *   RADIONEWS                       📅 Today ▾
 *   [⚙]  [World] [Tech] [Business] …            topic chips
 *   Latest  Popular  Interesting  World recap   understated tabs
 *
 * Each mode used to draw its own copy of this, with its own recap strip and lens row. The
 * tabs replace the recap strip: "12 stories" is the topic story by story, "World recap" is
 * the whole topic in one piece. The control on the right belongs to whichever tab is open —
 * the collection (Latest / Popular / Interesting) for the stories, the period (Daily / Weekly
 * / Monthly) for the recap. The header date stays the news date in both.
 */
import React, { useEffect, useRef } from 'react';
import { Calendar, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_SHORT } from '../theme';
import { topicVars } from '../design';
import { centrePill } from '../utils';
import Dropdown from './Dropdown';
import Wordmark from './Wordmark';

export function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export const LENS_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popular', label: 'Popular' },
  { value: 'interesting', label: 'Interesting' },
];

export const PERIODS = ['Daily', 'Weekly', 'Monthly'];
const PERIOD_NAMES = { Daily: 'Daily', Weekly: 'Last week', Monthly: 'Last month' };

export default function AppHeader({
  selectedDay, availableDays = [], onSelectDay,
  categories = [], activeCategory = null, onSelectCategory,
  onEditCategories, user, radioOnly = false,
  showAllPill = false, allActive = false, onSelectAll,
  // The tabs
  showTabs = true,
  storyCount = 0,
  recapView = false,
  onChangeRecapView,
  canRecap = true,
  // Which topic the recap tab opens. Defaults to the active chip; Popular and Interesting pass
  // one even on "Top", so their recap tab doesn't disappear (Roy, 2026-10-17).
  recapCategory,
  // The control on the right of the tabs
  lens = 'latest', onChangeLens,
  period = 'Daily', onChangePeriod, periodReady = {},
  gutter = 20,
}) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);
  useEffect(() => { centrePill(stripRef.current, activeRef.current); }, [activeCategory, categories.length, allActive]);

  const effectiveDay = selectedDay || new Date().toISOString().split('T')[0];
  const dayOptions = availableDays.map(d => ({ value: d.fullDate, label: formatHeaderDate(d.fullDate) }));
  const recapCat = recapCategory || (allActive ? null : activeCategory);
  const catLabel = recapCat ? (CATEGORY_SHORT[recapCat] || recapCat) : '';

  const chip = (key, label, on, onClick, ref, style = {}, className) => (
    <button key={key} ref={ref} className={`rn-btn ${className || ''}`} aria-pressed={on} onClick={onClick}
      style={{ minHeight: 38, padding: '0 14px', borderRadius: 10, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
        fontWeight: on ? 600 : 500,
        border: on ? '1px solid transparent' : '1px solid var(--line)',
        color: on ? 'var(--chip-on-ink)' : 'var(--sub)', ...style }}>
      {label}
    </button>
  );

  const tab = (label, on, onClick, disabled = false) => (
    <button className="rn-btn" aria-pressed={on} onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ position: 'relative', minHeight: 44, fontSize: 14, whiteSpace: 'nowrap',
        fontWeight: on ? 650 : 500, color: on ? 'var(--ink)' : 'var(--sub)',
        ...(disabled ? { opacity: 0.4, cursor: 'default' } : {}) }}>
      {label}
      {on && <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 7, height: 3, borderRadius: 3, background: 'var(--accent)' }} />}
    </button>
  );

  const showRecapTab = canRecap && !!recapCat;

  return (
    <div style={{ color: 'var(--ink)' }}>
      {/* ── Identity and day ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 50,
        padding: `calc(env(safe-area-inset-top, 0px) + 6px) ${gutter}px 0` }}>
        <Wordmark />
        {dayOptions.length > 0 ? (
          <Dropdown value={effectiveDay} options={dayOptions} onChange={onSelectDay} width={170}
            label={formatHeaderDate(effectiveDay)} title="Pick a day"
            icon={<Calendar size={16} strokeWidth={1.8} />}
            buttonStyle={{ fontSize: 14, color: 'var(--ink)', gap: 6 }} />
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
            <Calendar size={16} strokeWidth={1.8} />{formatHeaderDate(effectiveDay)}
          </span>
        )}
      </div>

      {/* ── Topics ── */}
      {(categories.length > 0 || showAllPill || onEditCategories) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 48, paddingLeft: onEditCategories && !showAllPill ? gutter - 10 : gutter }}>
          {onEditCategories && !showAllPill && (
            <button className="rn-btn" aria-label="Choose your topics" title="Choose your topics"
              onClick={onEditCategories}
              style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SlidersHorizontal size={20} strokeWidth={1.8} />
            </button>
          )}
          <div ref={stripRef} className="rn-hscroll" style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', gap: 7, paddingRight: gutter }}>
            {showAllPill && chip('__all', 'Top', allActive, () => onSelectAll?.(), allActive ? activeRef : null,
              allActive ? { background: 'var(--ink)', color: 'var(--paper)' } : {})}
            {categories.map(cat => {
              const on = !allActive && cat === activeCategory;
              return chip(cat, CATEGORY_SHORT[cat] || cat, on, () => { if (!on) onSelectCategory?.(cat); },
                on ? activeRef : null, on ? { ...topicVars(cat), background: 'var(--tp-chip)' } : {}, on ? 'rn-tp' : '');
            })}
          </div>

        </div>
      )}

      {/* ── Story by story, or the whole topic ── */}
      {showTabs && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          margin: '2px 0 6px', padding: `0 ${gutter}px` }}>
          {/* Radio: the period is the one choice, so it is the tabs — Daily, Last week, Last month —
              in place of a "Radio · daily recap" title the card already says (Roy, 2026-10-18).
              A period with no recap yet is shown but cannot be picked. */}
          {radioOnly ? (
            <div role="group" aria-label="Recap period" style={{ display: 'flex', gap: 22, minWidth: 0 }}>
              {PERIODS.map(p => (
                <React.Fragment key={p}>{tab(PERIOD_NAMES[p], period === p, () => period !== p && onChangePeriod?.(p), periodReady[p] === false)}</React.Fragment>
              ))}
            </div>
          ) : (
          // Reading: which stories are the tabs — Latest, Popular, Interesting — in place of a
          // story count, beside the topic's recap (Roy, 2026-10-18). Picking one from the recap
          // leaves the recap. A screen with no choice of stories keeps the count.
          <div role="group" aria-label="Which stories" style={{ display: 'flex', gap: 18, minWidth: 0 }}>
            {onChangeLens
              ? LENS_OPTIONS.map(o => (
                  <React.Fragment key={o.value}>{tab(o.label, !recapView && lens === o.value, () => {
                    if (recapView) onChangeRecapView?.(false);
                    if (lens !== o.value) onChangeLens(o.value);
                  })}</React.Fragment>
                ))
              : tab(`${storyCount} ${storyCount === 1 ? 'story' : 'stories'}`, !recapView, () => recapView && onChangeRecapView?.(false))}
            {showRecapTab && tab(`${catLabel} recap`, recapView, () => !recapView && onChangeRecapView?.(true))}
          </div>
          )}
          {!radioOnly && recapView && showRecapTab && onChangePeriod && (
            <Dropdown value={period} onChange={onChangePeriod} ariaLabel="Recap period"
              options={PERIODS.map(p => ({ value: p, label: p, disabled: periodReady[p] === false, note: periodReady[p] === false ? 'not ready' : null }))} />
          )}
        </div>
      )}
    </div>
  );
}
