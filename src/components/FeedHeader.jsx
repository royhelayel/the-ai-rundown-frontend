/**
 * FeedHeader — shared header for all four feed tabs.
 *
 * Shows a single row: "[logo] RadioNews  ›  <Current Feed>"  [date]  [avatar]
 * The date button opens a day-picker popover when availableDays is provided.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronDown } from 'lucide-react';
import Logo from './Logo';

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
  user,
  onShowAuth,
  selectedDay,
  availableDays = [],
  onSelectDay,
}) {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [pickerOpen]);

  // Fall back to today if no selectedDay prop (e.g. Popular / Important tabs)
  const effectiveDay = selectedDay || new Date().toISOString().split('T')[0];
  const canPickDay   = availableDays.length > 0;
  const dateLabel    = formatHeaderDate(effectiveDay);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(245,245,247,0.95)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      padding: '10px 20px 10px',
    }}>
      {/* ── Single row: brand · active feed · date · avatar ── */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '6px' }}>

        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Logo size={22} color="#0a0a0f" />
          <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>
            RadioNews
          </span>
        </button>

        {/* Date button + picker — always shown */}
        <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              onClick={() => canPickDay && setPickerOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '3px 9px', borderRadius: '99px',
                background: pickerOpen ? 'rgba(124,58,237,0.12)' : 'rgba(0,0,0,0.06)',
                border: pickerOpen ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                color: pickerOpen ? '#7c3aed' : '#6b7280',
                fontSize: '0.72rem', fontWeight: '700',
                cursor: canPickDay ? 'pointer' : 'default', flexShrink: 0,
              }}
            >
              {dateLabel}
              {canPickDay && <ChevronDown size={11} style={{ opacity: 0.6 }} />}
            </button>

            {/* Day picker popover */}
            {pickerOpen && canPickDay && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                background: '#fff', borderRadius: '14px',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                padding: '6px', zIndex: 200,
                display: 'flex', flexDirection: 'column', gap: '2px',
                minWidth: '140px',
              }}>
                {availableDays.map(day => {
                  const isActive = day.fullDate === selectedDay;
                  const label = formatHeaderDate(day.fullDate);
                  return (
                    <button
                      key={day.fullDate}
                      onClick={() => { onSelectDay?.(day.fullDate); setPickerOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 10px', borderRadius: '9px', border: 'none',
                        background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                        color: isActive ? '#7c3aed' : '#374151',
                        fontSize: '0.78rem', fontWeight: isActive ? '800' : '500',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      {label}
                      {isActive && <span style={{ fontSize: '0.6rem', color: '#7c3aed' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Avatar — always goes to Settings; guests see sign-in options there */}
        <button
          onClick={() => navigate('/settings')}
          style={{
            width: '34px', height: '34px', borderRadius: '50%', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, overflow: 'hidden',
            background: user?.avatar_color || 'rgba(0,0,0,0.06)',
            color: user ? '#fff' : 'rgba(0,0,0,0.45)',
          }}
        >
          {user
            ? <span style={{ fontSize: '0.75rem', fontWeight: '800', lineHeight: 1 }}>
                {(user.display_name || user.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            : <User size={16} />
          }
        </button>
      </div>
    </header>
  );
}
