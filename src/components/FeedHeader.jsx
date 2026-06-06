/**
 * FeedHeader — shared header for all four feed tabs.
 *
 * Shows:
 *   Row 1: "The Rundown" · [date button] · avatar
 *   Row 2: tab strip (My Feed | All News | Popular | Important)
 *
 * The date button opens a simple day-picker popover.
 * availableDays is optional; if absent the date button is hidden.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, ChevronDown } from 'lucide-react';

const TABS = [
  { label: 'My Feed',   path: '/my-feed'   },
  { label: 'All News',  path: '/'          },
  { label: 'Popular',   path: '/popular'   },
  { label: 'Important', path: '/important' },
];

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
  const navigate  = useNavigate();
  const location  = useLocation();
  const activePath = location.pathname === '/' ? '/' : location.pathname;
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
      padding: '10px 20px 0',
    }}>
      {/* ── Row 1: brand + date + avatar ── */}
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>

        {/* Brand */}
        <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em', flexShrink: 0 }}>
          The Rundown
        </span>

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

        {/* Avatar */}
        <button
          onClick={user ? () => navigate('/settings') : onShowAuth}
          style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(0,0,0,0.45)', flexShrink: 0 }}
        >
          <User size={16} />
        </button>
      </div>

      {/* ── Row 2: feed tab strip ── */}
      <div style={{
        maxWidth: 'var(--body-max)', margin: '0 auto',
        display: 'flex', gap: '2px',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingTop: '6px', paddingBottom: '6px',
      }}>
        <style>{`.feed-tab-strip::-webkit-scrollbar{display:none}`}</style>
        {TABS.map(tab => {
          const isActive = tab.path === '/'
            ? activePath === '/'
            : activePath.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                padding: '5px 13px', borderRadius: '8px',
                fontSize: '0.72rem', fontWeight: isActive ? '800' : '600',
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
                background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                color: isActive ? '#7c3aed' : '#6b7280',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
