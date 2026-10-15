import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Dropdown — a plain menu under a quiet text button ("Latest ▾", "Daily ▾", the day).
 * Roy chose a plain dropdown over a bottom sheet for these (2026-10-15).
 */
export default function Dropdown({ value, options, onChange, label, icon = null, align = 'right', width = 180, ariaLabel, title, buttonStyle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    // Capture phase, and stopped there: the tap that closes the menu must not also land on
    // the story card underneath it.
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  const current = options.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button className="rn-btn" aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} title={title}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, minHeight: 44, fontSize: 13, fontWeight: 600, color: 'var(--sub)', ...buttonStyle }}>
        {icon}{label ?? current?.label}<ChevronDown size={14} strokeWidth={2.2} />
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% - 2px)', [align]: 0, zIndex: 60, width,
          background: 'var(--menu-bg)', border: '1px solid var(--line)', borderRadius: 14,
          boxShadow: 'var(--menu-shadow)', padding: '6px 0', color: 'var(--ink)' }}>
          {options.map(o => {
            const on = o.value === value;
            return (
              <button key={o.value} className="rn-btn" role="menuitemradio" aria-checked={on} disabled={o.disabled}
                onClick={() => { setOpen(false); if (!on) onChange?.(o.value); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  minHeight: 44, padding: '0 14px', fontSize: 14, textAlign: 'left',
                  fontWeight: on ? 650 : 500, opacity: o.disabled ? 0.45 : 1, cursor: o.disabled ? 'default' : 'pointer' }}>
                <span>{o.label}{o.note && <span style={{ color: 'var(--sub)', fontWeight: 500, fontSize: 12 }}> · {o.note}</span>}</span>
                {on && <Check size={16} strokeWidth={2.4} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
