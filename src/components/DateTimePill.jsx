import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
  accent:    '#6366f1',
};

function isToday(dateStr) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  return dateStr === today;
}

export default function DateTimePill({
  selectedDay, selectedTime,
  availableDays, availableTimes,
  onSelectDay, onSelectTime,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const dayInfo  = availableDays?.find(d => d.fullDate === selectedDay);
  const dayLabel = isToday(selectedDay) ? 'Today' : dayInfo ? `${dayInfo.label} ${dayInfo.date}` : selectedDay;
  const timeLabel = availableTimes?.find(t => t.value === selectedTime)?.label || selectedTime;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Pill trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          padding: '0.3rem 0.65rem 0.3rem 0.55rem',
          background: open ? light.bgSub : light.bgSub,
          border: `1px solid ${open ? light.accent + '60' : light.border}`,
          borderRadius: '999px', cursor: 'pointer',
          fontSize: '0.78rem', fontWeight: '600', color: light.textSub,
          transition: 'border-color 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '0.82rem', lineHeight: 1 }}>📅</span>
        {dayLabel} · {timeLabel}
        <ChevronDown
          size={12}
          color={light.textMuted}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          zIndex: 200, background: light.bg,
          border: `1px solid ${light.border}`, borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          padding: '0.85rem 0.85rem 0.9rem',
          minWidth: '240px',
        }}>
          {/* Day chips */}
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Edition
          </p>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
            {availableDays?.map(day => {
              const active = day.fullDate === selectedDay;
              return (
                <button
                  key={day.fullDate}
                  onClick={() => { onSelectDay(day.fullDate); }}
                  style={{
                    padding: '0.3rem 0.65rem', borderRadius: '999px',
                    border: `1px solid ${active ? light.accent : light.border}`,
                    background: active ? `${light.accent}15` : 'transparent',
                    color: active ? light.accent : light.textSub,
                    fontSize: '0.75rem', fontWeight: active ? '700' : '500',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
                  }}
                >
                  {isToday(day.fullDate) ? 'Today' : `${day.label} ${day.date}`}
                </button>
              );
            })}
          </div>

          {/* Time pills */}
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Briefing
          </p>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {availableTimes?.map(t => {
              const active = t.value === selectedTime;
              return (
                <button
                  key={t.value}
                  onClick={() => { onSelectTime(t.value); setOpen(false); }}
                  style={{
                    flex: 1, padding: '0.38rem 0.5rem', borderRadius: '8px',
                    border: `1px solid ${active ? light.accent : light.border}`,
                    background: active ? `${light.accent}15` : 'transparent',
                    color: active ? light.accent : light.textSub,
                    fontSize: '0.78rem', fontWeight: active ? '700' : '500',
                    cursor: 'pointer', transition: 'all 0.12s', textAlign: 'center',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
