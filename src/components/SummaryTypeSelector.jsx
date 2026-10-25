import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import useSheetMotion from './useSheetMotion';

export const SUMMARY_TYPES = [
  { value: 'Headlines', label: 'Headlines', detail: 'Individual story summaries' },
  { value: 'Daily', label: 'Daily recap', detail: 'Your selected topic in one short briefing' },
  { value: 'Weekly', label: 'Last week', detail: 'The topic’s weekly roundup' },
  { value: 'Monthly', label: 'Last month', detail: 'The topic’s monthly roundup' },
];
function SummarySheet({ value, onChange, onClose }) {
  const { closing, dismiss } = useSheetMotion(onClose);
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('[aria-checked="true"]')?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
      if (e.key !== 'Tab') return;
      const nodes = panel.current?.querySelectorAll('button');
      const first = nodes?.[0], last = nodes?.[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, [dismiss]);
  return createPortal(<div className="rn-motion-overlay" data-closing={closing} onClick={() => dismiss()}
    style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--overlay)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    <section ref={panel} className="rn-motion-panel" data-closing={closing} role="dialog" aria-modal="true" aria-labelledby="summary-type-title"
      onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto', borderRadius: '24px 24px 0 0', background: 'var(--paper)', color: 'var(--ink)', padding: '10px 20px calc(20px + env(safe-area-inset-bottom, 0px))' }}>
      <div aria-hidden="true" style={{ width: 34, height: 4, borderRadius: 4, background: 'var(--line)', margin: '0 auto 10px' }} />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 id="summary-type-title" style={{ fontSize: 20 }}>Choose your summary</h2>
        <button className="rn-btn" onClick={() => dismiss()} aria-label="Close summary choices" style={{ width: 44, height: 44 }}><X size={20} /></button>
      </header>
      <div role="radiogroup" aria-label="Summary type">
        {SUMMARY_TYPES.map(option => <button key={option.value} className="rn-btn" role="radio" aria-checked={value === option.value}
          onClick={() => option.value === value ? dismiss() : dismiss(() => { onClose(); onChange?.(option.value); })}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'start', minHeight: 72, padding: '12px 14px', marginBottom: 6, borderRadius: 14, background: value === option.value ? 'var(--panel)' : 'transparent' }}>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 16, fontWeight: 650 }}>{option.label}</span>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>{option.detail}</span></span>
          {value === option.value && <Check size={20} />}
        </button>)}
      </div>
    </section>
  </div>, document.body);
}
export default function SummaryTypeSelector({ value = 'Headlines', onChange }) {
  const [open, setOpen] = useState(false);
  const label = SUMMARY_TYPES.find(option => option.value === value)?.label || 'Headlines';
  return <>
    <button className="rn-btn" aria-label={`Summary type: ${label}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, fontSize: 14, fontWeight: 650, color: 'var(--ink)' }}>{label}<ChevronDown size={16} /></button>
    {open && <SummarySheet value={value} onChange={onChange} onClose={() => setOpen(false)} />}
  </>;
}
