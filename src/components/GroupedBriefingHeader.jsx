import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Ellipsis, Settings2, SlidersHorizontal, X } from 'lucide-react';
import Wordmark from './Wordmark';
import { createPortal } from 'react-dom';
import { CATEGORY_SHORT } from '../theme';
import { SUMMARY_TYPES } from './SummaryTypeSelector';
import useSheetMotion from './useSheetMotion';

const LENSES = [{ value: 'latest', label: 'Relevant' }, { value: 'popular', label: 'Popular' }, { value: 'interesting', label: 'Interesting' }];

function PickerSheet({ title, onClose, children }) {
  const { closing, dismiss } = useSheetMotion(onClose);
  const id = useId(), panel = useRef(null), close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
      if (e.key !== 'Tab') return;
      const nodes = panel.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.isConnected && previous.focus(); };
  }, [dismiss]);
  return createPortal(<div className="rn-motion-overlay rn-grouped-overlay" data-closing={closing} onClick={() => dismiss()}>
    <section ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} className="rn-motion-panel rn-grouped-sheet" data-closing={closing} onClick={e => e.stopPropagation()}>
      <div className="rn-grouped-grip" aria-hidden="true" />
      <header><h2 id={id}>{title}</h2><button ref={close} className="rn-btn" aria-label="Close briefing options" onClick={() => dismiss()}><X size={19} /></button></header>
      <div className="rn-grouped-sheet-body">{children(dismiss)}</div>
    </section>
  </div>, document.body);
}

export function BriefingDatePicker({ selectedDay, availableDays, onSelectDay, label, shortLabel }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="rn-btn rn-grouped-date" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{shortLabel}<ChevronDown size={12} /></button>
    {open && <PickerSheet title="Choose a day" onClose={() => setOpen(false)}>{dismiss => <>
      {availableDays.map(day => <button key={day.fullDate} className="rn-btn rn-grouped-option" aria-pressed={selectedDay === day.fullDate} onClick={() => dismiss(() => { setOpen(false); if (day.fullDate !== selectedDay) onSelectDay?.(day.fullDate); })}><span>{day.label}</span>{selectedDay === day.fullDate && <Check size={17} />}</button>)}
    </>}</PickerSheet>}
  </>;
}

export default function GroupedBriefingHeader({ categories, activeCategory, onSelectCategory, onEditCategories,
  lens, onChangeLens, period, onChangePeriod, onOpenSettings, onSpeedCycle, playbackSpeed, onRepeatToggle, repeatLabel, resumeProgramme, onResumeProgramme }) {
  const [sheet, setSheet] = useState(null);
  const currentBrief = SUMMARY_TYPES.find(item => item.value === period)?.label || 'Full brief';
  const currentTopic = CATEGORY_SHORT[activeCategory] || activeCategory || 'Topics';
  return <div className="rn-grouped-header">
    <header className="rn-grouped-masthead"><Wordmark /><button className="rn-btn rn-grouped-more" aria-label="More options" aria-haspopup="dialog" aria-expanded={sheet === 'menu'} onClick={() => setSheet('menu')}><Ellipsis size={21} /></button></header>
    <nav className="rn-grouped-context" aria-label="Current briefing">
      <button className="rn-btn" aria-label={`Topic: ${currentTopic}`} aria-haspopup="dialog" aria-expanded={sheet === 'topics'} onClick={() => setSheet('topics')}><span>{currentTopic}</span><ChevronDown size={13} /></button>
      <span className="rn-grouped-divider" aria-hidden="true" />
      <div role="group" aria-label="Summary type"><button className="rn-btn rn-grouped-brief" aria-pressed="true" aria-haspopup="dialog" aria-expanded={sheet === 'brief'} onClick={() => setSheet('brief')}>{currentBrief}<ChevronDown size={13} /></button></div>
    </nav>
    {sheet && <PickerSheet key={sheet} title={sheet === 'topics' ? 'Choose your news' : sheet === 'brief' ? 'Choose your brief' : 'Options'} onClose={() => setSheet(null)}>{dismiss => <>
      {sheet === 'topics' && <>
        <div className="rn-grouped-lenses" role="group" aria-label="News selection">{LENSES.map(item => <button key={item.value} className="rn-btn" aria-pressed={lens === item.value} onClick={() => onChangeLens?.(item.value)}>{item.label}</button>)}</div>
        <p className="rn-grouped-label">{lens === 'latest' ? 'Your topics' : 'Available topics'}</p>
        {categories.length === 0 && <p className="rn-grouped-empty">No topics are available for this selection. Try Relevant or another date.</p>}
        {categories.map(cat => <button key={cat} className="rn-btn rn-grouped-option" aria-pressed={cat === activeCategory} onClick={() => dismiss(() => { setSheet(null); if (cat !== activeCategory) onSelectCategory?.(cat); })}><span>{CATEGORY_SHORT[cat] || cat}</span>{cat === activeCategory && <Check size={17} />}</button>)}
        {onEditCategories && <button className="rn-btn rn-grouped-option rn-grouped-customise" onClick={() => dismiss(() => { setSheet(null); onEditCategories(); })}><span>Customise your mix</span><SlidersHorizontal size={17} /></button>}
      </>}
      {sheet === 'brief' && SUMMARY_TYPES.map(item => <button key={item.value} className="rn-btn rn-grouped-option" aria-label={item.label} aria-pressed={item.value === period} onClick={() => dismiss(() => { setSheet(null); if (period !== item.value) onChangePeriod?.(item.value); })}><span>{item.label}<small>{item.value === 'Daily' ? 'The essentials in less time' : item.value === 'Headlines' ? 'More detail, story by story' : item.value === 'Weekly' ? 'The week in perspective' : 'The bigger picture'}</small></span>{period === item.value && <Check size={17} />}</button>)}
      {sheet === 'menu' && <>
        {resumeProgramme && <button className="rn-btn rn-grouped-option" onClick={() => dismiss(() => { setSheet(null); onResumeProgramme?.(); })}><span>Continue listening<small>{CATEGORY_SHORT[resumeProgramme.category] || resumeProgramme.category} · {new Date(`${resumeProgramme.day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</small></span></button>}
        <button className="rn-btn rn-grouped-option" onClick={() => dismiss(() => { setSheet(null); onOpenSettings?.(); })}><span>Settings</span><Settings2 size={18} /></button>
        {onSpeedCycle && <button className="rn-btn rn-grouped-option" onClick={onSpeedCycle} aria-label={`Playback speed ${playbackSpeed}×`}><span>Playback speed</span><span>{playbackSpeed}×</span></button>}
        {onRepeatToggle && <button className="rn-btn rn-grouped-option" onClick={onRepeatToggle} aria-label={repeatLabel}><span>Repeat</span><span>{repeatLabel}</span></button>}
      </>}
    </>}</PickerSheet>}
  </div>;
}
