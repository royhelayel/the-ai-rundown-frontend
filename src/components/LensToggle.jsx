import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownUp, ChevronDown, Check } from 'lucide-react';

export const LENSES = [
  // 'latest' is still the id everywhere — this is the label only. "Latest" described the
  // sort; "Relevant" describes what you get, which is what the other two options do too.
  { id: 'latest',  label: 'Relevant' },
  { id: 'popular', label: 'Popular' },
  { id: 'interesting', label: 'Interesting' },
];

/**
 * LensToggle — how the current list is ordered, as a right-aligned dropdown above the stories.
 *
 * A dropdown rather than three visible words: it sits on the same line as nothing else and
 * only reports one value at a time, so it stays quiet while the categories above keep the
 * visual weight. The trade is that Popular and Interesting are one tap less discoverable — worth
 * revisiting if they turn out to be used often.
 *
 * Popular and Interesting currently open the existing ranked feeds; only the label lives here.
 */
export default function LensToggle({ value = 'latest', onChange, theme = 'light' }) {
  const dark = theme === 'dark';
  const fg = dark ? 'rgba(255,255,255,0.7)' : '#6b7280';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Capture phase, and stops the event there: a mousedown/touchstart listener closes the
    // menu, but the click that follows keeps going to whatever's underneath regardless —
    // over the story card, that meant a tap that landed on the headline both dismissed the
    // dropdown *and* opened the summary sheet in the same tap. Catching the actual click
    // before it bubbles down to the card, and stopping it there, makes the first outside tap
    // just close the menu, the way a dropdown is supposed to work.
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  const current = LENSES.find(l => l.id === value) || LENSES[0];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 2px', border: 'none', background: 'transparent',
          color: fg, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
        }}
      >
        <ArrowDownUp size={13} />
        {current.label}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
          width: 150, background: '#fff', borderRadius: 12,
          boxShadow: '0 12px 36px rgba(0,0,0,0.22)', border: '1px solid rgba(0,0,0,0.08)',
          padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {LENSES.map(lens => {
            const active = lens.id === value;
            return (
              <button
                key={lens.id}
                onClick={() => { setOpen(false); if (!active) onChange?.(lens.id); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', borderRadius: 9, border: 'none',
                  background: active ? 'rgba(99,102,241,0.10)' : 'transparent',
                  color: active ? '#6366f1' : '#374151',
                  fontSize: '0.8rem', fontWeight: active ? 800 : 500,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                {lens.label}
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
