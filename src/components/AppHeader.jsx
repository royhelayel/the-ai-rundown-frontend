import { HOME_TYPE } from './homeTypography';
/** Shared identity, topics, summary type and headline order across Listen and Read. */
import React, { useEffect, useRef } from 'react';
import { Calendar, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_SHORT } from '../theme';
import { topicVars } from '../design';
import { centrePill } from '../utils';
import Dropdown from './Dropdown';
import Wordmark from './Wordmark';
import SummaryTypeSelector from './SummaryTypeSelector';

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
  { value: 'latest', label: 'Relevant' },
  { value: 'popular', label: 'Popular' },
  { value: 'interesting', label: 'Interesting' },
];

export const PERIODS = ['Daily', 'Weekly', 'Monthly'];

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
  period = 'Headlines', onChangePeriod, periodReady = {},
  gutter = 20,
}) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);
  useEffect(() => { centrePill(stripRef.current, activeRef.current); }, [activeCategory, categories.length, allActive]);

  const effectiveDay = selectedDay || new Date().toISOString().split('T')[0];
  const dayOptions = availableDays.map(d => ({ value: d.fullDate, label: formatHeaderDate(d.fullDate) }));

  const chip = (key, label, on, onClick, ref, style = {}, className) => (
    <button key={key} ref={ref} className={`rn-btn ${className || ''}`} aria-pressed={on} onClick={onClick}
      style={{ minHeight: 44, padding: '0 14px', borderRadius: 10, fontSize: HOME_TYPE.navigation, lineHeight: 1.25, whiteSpace: 'nowrap', flexShrink: 0,
        fontWeight: on ? 600 : 500,
        border: on ? '1px solid transparent' : '1px solid var(--line)',
        color: on ? 'var(--chip-on-ink)' : 'var(--sub)', ...style }}>
      {label}
    </button>
  );


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
            buttonStyle={{ fontSize: HOME_TYPE.ui, color: 'var(--ink)', gap: 6 }} />
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: HOME_TYPE.ui, fontWeight: 600 }}>
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
          <SummaryTypeSelector value={period} onChange={onChangePeriod} category={activeCategory || recapCategory} />
          {onChangeLens && (
            <Dropdown value={lens} onChange={onChangeLens} options={LENS_OPTIONS} ariaLabel={`News selection: ${LENS_OPTIONS.find(o => o.value === lens)?.label || 'Relevant'}`} buttonStyle={{ fontSize: HOME_TYPE.ui }} />
          )}
        </div>
      )}
    </div>
  );
}
