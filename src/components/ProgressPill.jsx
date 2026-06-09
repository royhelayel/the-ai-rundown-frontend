import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dayKey } from '../hooks/useListenHistory';

// ── Award definitions ─────────────────────────────────────────────────────────
// Ordered lowest → highest rank. Social profiles will use these colours.
export const AWARDS = [
  {
    id:       'informed',
    title:    'Informed',
    subtitle: "Today's challenge achieved",
    color:    '#cd7f32',                                        // Bronze
    glow:     'rgba(205,127,50,0.35)',
    check:    (s) => s.todayCount >= s.dailyGoal,
  },
  {
    id:       'sharp',
    title:    'Sharp',
    subtitle: '3-day streak achieved',
    color:    '#94a3b8',                                        // Silver
    glow:     'rgba(148,163,184,0.35)',
    check:    (s) => s.streakDays >= 3,
  },
  {
    id:       'savvy',
    title:    'Savvy',
    subtitle: 'Weekly challenge achieved',
    color:    '#f59e0b',                                        // Gold
    glow:     'rgba(245,158,11,0.40)',
    check:    (s) => s.weeklyDays >= (s.weeklyGoal || 6),
  },
];

/** Returns the highest earned AWARD, or null. */
function getHighestAward(s) {
  for (let i = AWARDS.length - 1; i >= 0; i--) {
    if (AWARDS[i].check(s)) return AWARDS[i];
  }
  return null;
}

const LS_KEY = 'rundown_shown_award';

// ── Icons ─────────────────────────────────────────────────────────────────────

function LightbulbIcon({ size = 15, color = 'rgba(255,255,255,0.7)' }) {
  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 16 19" fill="none">
      <path d="M8 1a5.5 5.5 0 00-3.8 9.4c.5.5.8 1.2.8 1.9V14h6v-1.7c0-.7.3-1.4.8-1.9A5.5 5.5 0 008 1z"
        stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
      <line x1="5.5" y1="15.5" x2="10.5" y2="15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6.5" y1="17.5" x2="9.5" y2="17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function LightningIcon({ size = 13, color = 'rgba(255,255,255,0.7)' }) {
  return (
    <svg width={size} height={Math.round(size * 1.4)} viewBox="0 0 13 18" fill="none">
      <path d="M8.5 1.5L3 10h5.5l-2 6.5L13 8H7.5z"
        stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function StarIcon({ size = 15, color = 'rgba(255,255,255,0.7)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 2l1.8 4.5H16l-4 2.9 1.5 4.6L9 11.5l-4.5 2.5L6 9.4 2 6.5h5.2z"
        stroke={color} strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function AwardIcon({ awardId, size, color }) {
  if (awardId === 'informed') return <LightbulbIcon size={size} color={color} />;
  if (awardId === 'sharp')    return <LightningIcon size={size} color={color} />;
  return <StarIcon size={size} color={color} />;
}

// ── Single ring component ─────────────────────────────────────────────────────

function ChallengeRing({
  size = 84, strokeW = 6,
  pct = 0,
  gradId, color0, color1, trackColor,
  label, count, total, unit, toGo,
  icon,
  awardTitle, awardColor, awardId,
}) {
  const r    = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, pct));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Award title + icon above ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <AwardIcon awardId={awardId} size={10} color={awardColor} />
        <span style={{
          fontSize: '0.65rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: awardColor,
        }}>
          {awardTitle}
        </span>
      </div>
      {/* Ring */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}
          style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={color0} />
              <stop offset="100%" stopColor={color1} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={trackColor} strokeWidth={strokeW} />
          {dash > 0 && (
            <circle cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeW}
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
          )}
        </svg>

        {/* Inner content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 1,
        }}>
          {icon}
          <span style={{
            fontSize: '0.6rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.42)', marginTop: 2,
          }}>
            {label}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1, gap: 1 }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>{count}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{total}</span>
          </div>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'rgba(255,255,255,0.28)' }}>
            {unit}
          </span>
        </div>
      </div>

      {/* Below ring */}
      <span style={{
        fontSize: '0.6rem', fontWeight: 600,
        color: 'rgba(255,255,255,0.32)', textAlign: 'center', lineHeight: 1.3,
      }}>
        {toGo}
      </span>
    </div>
  );
}

// ── Cosmic burst ─────────────────────────────────────────────────────────────

function Confetti({ award, onDone }) {
  const base    = award?.color  || '#f59e0b';
  const glow    = award?.glow   || 'rgba(245,158,11,0.5)';

  const palette = React.useMemo(() => {
    const light = base + 'cc';
    return [base, base, base, light, '#ffffff', '#ffffff', light, base];
  }, [base]);

  const particles = React.useMemo(() => {
    const orbs = Array.from({ length: 28 }, (_, i) => {
      const angle = (i / 28) * 360 + (Math.random() - 0.5) * 18;
      const dist  = 14 + Math.random() * 32;
      const rad   = (angle * Math.PI) / 180;
      const tx    = Math.cos(rad) * dist;
      const ty    = Math.sin(rad) * dist;
      const size  = 3 + Math.random() * 6;
      const dur   = 0.5 + Math.random() * 0.25;
      const delay = Math.random() * 0.08;
      const color = palette[Math.floor(Math.random() * palette.length)];
      const glowR = Math.round(size * 2.5);
      return { id: `o${i}`, tx, ty, size, dur, delay, color, glowR, type: 'orb' };
    });

    const streaks = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * 360 + (Math.random() - 0.5) * 10;
      const dist  = 20 + Math.random() * 22;
      const rad   = (angle * Math.PI) / 180;
      const tx    = Math.cos(rad) * dist;
      const ty    = Math.sin(rad) * dist;
      const dur   = 0.4 + Math.random() * 0.15;
      const delay = Math.random() * 0.05;
      return { id: `s${i}`, tx, ty, size: 2, dur, delay, color: '#ffffff', glowR: 8, type: 'streak', angle };
    });

    return [...orbs, ...streaks];
  }, [palette]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const keyframes = [
    `@keyframes nova-flash {
      0%   { transform: translate(-50%,-50%) scale(0);   opacity: 1; }
      35%  { transform: translate(-50%,-50%) scale(2.5); opacity: 0.7; }
      100% { transform: translate(-50%,-50%) scale(5);   opacity: 0; }
    }`,
    ...particles.map(p => `
      @keyframes sp-${p.id} {
        0%   { transform: translate(-50%,-50%) scale(1.6); opacity: 1; }
        55%  { opacity: 0.85; }
        100% { transform: translate(calc(-50% + ${p.tx}vmin), calc(-50% + ${p.ty}vmin)) scale(0); opacity: 0; }
      }
    `),
  ].join('');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 550,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      <style>{keyframes}</style>

      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: '28px', height: '28px', borderRadius: '50%',
        background: `radial-gradient(circle, #fff 0%, ${base} 45%, transparent 75%)`,
        boxShadow: `0 0 24px 12px ${glow}`,
        animation: 'nova-flash 0.55s cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
      }} />

      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width:  p.type === 'streak' ? `${p.size * 7}px` : `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.glowR}px ${Math.round(p.glowR / 2)}px ${p.color}70`,
            ...(p.type === 'streak' ? {
              transform: `translate(-50%,-50%) rotate(${p.angle}deg)`,
              transformOrigin: 'left center',
            } : {}),
            animation: `sp-${p.id} ${p.dur}s ${p.delay}s cubic-bezier(0.15, 0.85, 0.25, 1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ── Award toast ───────────────────────────────────────────────────────────────

function AwardToast({ award, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tIn  = setTimeout(() => setVisible(true),  50);
    const tOut = setTimeout(() => { setVisible(false); }, 3800);
    const tDone = setTimeout(onDone, 4300);
    return () => { clearTimeout(tIn); clearTimeout(tOut); clearTimeout(tDone); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', bottom: '6rem', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      opacity: visible ? 1 : 0,
      transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
      zIndex: 500, pointerEvents: 'none',
      maxWidth: '340px', width: 'calc(100% - 32px)',
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0f0f1e, #181830)',
        borderRadius: '16px',
        border: `1.5px solid ${award.color}55`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${award.color}22, 0 4px 20px ${award.glow}`,
        padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>
          Congrats! you are now ranked
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AwardIcon awardId={award.id} size={16} color={award.color} />
          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: award.color, letterSpacing: '-0.02em' }}>
            {award.title}
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
          {award.subtitle}
        </span>
      </div>
    </div>
  );
}

// ── Guest sign-in promo card ──────────────────────────────────────────────────

function GuestPromo() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/settings')}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        margin: '0 16px 12px', width: 'calc(100% - 32px)',
        background: 'linear-gradient(145deg, #0f0f1e, #181830)',
        border: 'none', borderRadius: 20,
        padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.55)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          <path d="M17 11a4 4 0 0 0 0 8"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#fff', marginBottom: '4px', letterSpacing: '-0.01em' }}>
          Sign In to Track Progress
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Customise your feed, complete reading challenges and access popular &amp; interesting stories in your circle.
        </div>
      </div>

      <div style={{
        padding: '8px 14px', borderRadius: '10px', flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1, #ec4899)',
        color: '#fff', fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap',
      }}>
        Sign In
      </div>
    </button>
  );
}

// ── Challenge Detail Sheet ────────────────────────────────────────────────────

function StatusBadge({ done, onTrack }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.03em',
    whiteSpace: 'nowrap', flexShrink: 0,
  };
  if (done) return (
    <span style={{ ...base, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
      ✓ Complete
    </span>
  );
  if (onTrack) return (
    <span style={{ ...base, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
      ⚡ On Track
    </span>
  );
  return (
    <span style={{ ...base, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}>
      · Not started
    </span>
  );
}

function SheetSectionLabel({ children }) {
  return (
    <p style={{
      margin: '0 0 0.55rem',
      fontSize: '0.58rem', fontWeight: '800',
      textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'rgba(255,255,255,0.28)',
    }}>
      {children}
    </p>
  );
}

function ChallengeSheet({ open, onClose, challengeStats }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef    = useRef(null);
  const dragStartY  = useRef(0);
  const dragActive  = useRef(false);

  // Open: mount → next frame → slide in
  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setVisible(true), 16);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      setDragOffset(0);
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleTouchStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    dragActive.current = false;
  };

  const handleTouchMove = (e) => {
    const delta     = e.touches[0].clientY - dragStartY.current;
    const scrollTop = sheetRef.current?.scrollTop ?? 0;
    // Only take over when at the very top of scroll and moving downward
    if (!dragActive.current && delta > 6 && scrollTop === 0) {
      dragActive.current = true;
    }
    if (dragActive.current && delta > 0) {
      setDragOffset(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragActive.current) {
      if (dragOffset > 80) {
        onClose();
      } else {
        setDragOffset(0);
      }
      dragActive.current = false;
    }
    dragStartY.current = 0;
  };

  if (!mounted) return null;

  const {
    todayCount = 0,
    dailyGoal  = 10,
    streakDays = 0,
    weeklyDays = 0,
    weeklyGoal = 6,
    weekGrid   = [],
    dailyCountMap = {},
  } = challengeStats || {};

  const todayPct = Math.min(1, todayCount / Math.max(1, dailyGoal));
  const todayDone = todayCount >= dailyGoal;
  const todayOnTrack = !todayDone && todayCount >= Math.ceil(dailyGoal / 2);
  const streakDone = streakDays >= 3;
  const weekDone = weeklyDays >= weeklyGoal;

  // 3 cells: day-before-yesterday, yesterday, today
  const DAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const threeDays = [2, 1, 0].map(daysAgo => {
    const ts  = Date.now() - daysAgo * 86400000;
    const k   = dayKey(ts);
    const d   = new Date(ts);
    const cnt = dailyCountMap?.[k] || 0;
    const met = cnt >= dailyGoal;
    return {
      key: k,
      label: daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : DAY_FULL[d.getDay()],
      dayLetter: DAY_FULL[d.getDay()].slice(0, 1),
      cnt,
      met,
      isToday: daysAgo === 0,
    };
  });

  // Motivational message
  const getMotivation = () => {
    if (weekDone) return { emoji: '🏆', text: 'You nailed the weekly challenge. You\'re a Savvy reader!' };
    if (streakDone && todayDone) return { emoji: '🔥', text: 'On fire! Keep the streak alive tomorrow.' };
    if (todayDone) return { emoji: '✅', text: `Goal done! Read ${weeklyGoal - weeklyDays} more day${weeklyGoal - weeklyDays !== 1 ? 's' : ''} this week to earn Savvy.` };
    if (streakDays > 0) return { emoji: '⚡', text: `${streakDays}-day streak! Read ${dailyGoal - todayCount} more ${dailyGoal - todayCount === 1 ? 'story' : 'stories'} today to extend it.` };
    if (todayCount > 0) return { emoji: '📖', text: `${dailyGoal - todayCount} more stories to hit today's goal. You're getting there!` };
    return { emoji: '🌅', text: `Start with ${dailyGoal} stories today to kick off your streak.` };
  };
  const motivation = getMotivation();

  // Arc SVG for the daily ring (in the sheet)
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * todayPct;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 400,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.32s ease',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          zIndex: 401,
          background: 'linear-gradient(180deg, #111127 0%, #0a0a15 100%)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
          paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 1.5rem)',
          maxHeight: '88vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          transform: dragOffset > 0
            ? `translateY(${dragOffset}px)`
            : visible ? 'translateY(0)' : 'translateY(100%)',
          transition: dragOffset > 0 ? 'none' : 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Sticky header */}
        <div style={{
          padding: '0.65rem 1.25rem 0',
          position: 'sticky', top: 0,
          background: 'linear-gradient(180deg, #111127 0%, #111127cc 100%)',
          backdropFilter: 'blur(12px)',
          zIndex: 1,
        }}>
          {/* Drag handle */}
          <div style={{
            width: '36px', height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.14)', margin: '0 auto 0.85rem',
          }} />
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '1rem',
          }}>
            <div>
              <span style={{
                fontSize: '1.05rem', fontWeight: '900', color: '#fff',
                letterSpacing: '-0.025em',
              }}>
                Your Challenges
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', fontWeight: '500' }}>
                Build a daily reading habit
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                border: 'none', borderRadius: '50%', cursor: 'pointer',
                width: 32, height: 32,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '0 1rem 0.5rem' }}>

          {/* ── Card 1: Daily Goal ─────────────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '1.1rem',
            marginBottom: '0.75rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle purple glow */}
            <div style={{
              position: 'absolute', top: -30, right: -30,
              width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '0.9rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SheetSectionLabel>Challenge 1</SheetSectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                  <LightbulbIcon size={14} color={todayDone ? AWARDS[0].color : 'rgba(255,255,255,0.7)'} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                    Daily Goal
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                  Read {dailyGoal} stories today to earn the{' '}
                  <span style={{ color: AWARDS[0].color, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' }}>
                    <LightbulbIcon size={11} color={AWARDS[0].color} /> Informed
                  </span> badge
                </p>
              </div>
              <StatusBadge done={todayDone} onTrack={todayOnTrack} />
            </div>

            {/* Ring + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                <svg width={96} height={96} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                  <defs>
                    <linearGradient id="sheet-daily-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(99,102,241,0.14)" strokeWidth={7} />
                  {dash > 0 && (
                    <circle cx={48} cy={48} r={r} fill="none" stroke="url(#sheet-daily-grad)" strokeWidth={7}
                      strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
                  )}
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {todayCount}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>of {dailyGoal}</span>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.6rem' }}>
                  {todayDone
                    ? `All ${todayCount} stories read today! ${todayCount > dailyGoal ? `+${todayCount - dailyGoal} bonus` : ''}`
                    : `${dailyGoal - todayCount} more ${dailyGoal - todayCount === 1 ? 'story' : 'stories'} to go`}
                </div>
                {/* Story dots progress */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {Array.from({ length: dailyGoal }, (_, i) => (
                    <div key={i} style={{
                      width: '10px', height: '10px', borderRadius: '3px',
                      background: i < todayCount
                        ? `linear-gradient(135deg, #6366f1, #ec4899)`
                        : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 2: 3-Day Streak ───────────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '1.1rem',
            marginBottom: '0.75rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -30, left: -30,
              width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '0.9rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SheetSectionLabel>Challenge 2</SheetSectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                  <LightningIcon size={13} color={streakDone ? AWARDS[1].color : 'rgba(255,255,255,0.7)'} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                    3-Day Streak
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                  Hit your daily goal 3 days running to earn the{' '}
                  <span style={{ color: AWARDS[1].color, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' }}>
                    <LightningIcon size={11} color={AWARDS[1].color} /> Sharp
                  </span> badge
                </p>
              </div>
              {streakDone
                ? <StatusBadge done={true} onTrack={false} />
                : streakDays > 0
                  ? <StatusBadge done={false} onTrack={true} />
                  : <StatusBadge done={false} onTrack={false} />
              }
            </div>

            {/* 3 day cells */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '0.8rem' }}>
              {threeDays.map(day => {
                const cellDone = day.met;
                const cellActive = day.isToday && !cellDone && day.cnt > 0;
                const borderColor = cellDone
                  ? 'rgba(148,163,184,0.4)'
                  : day.isToday
                    ? 'rgba(99,102,241,0.4)'
                    : 'rgba(255,255,255,0.08)';
                const bg = cellDone
                  ? 'linear-gradient(145deg, #1e3a5f, #1e293b)'
                  : day.isToday
                    ? 'rgba(99,102,241,0.1)'
                    : 'rgba(255,255,255,0.03)';

                return (
                  <div key={day.key} style={{
                    flex: 1,
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '14px',
                    padding: '0.8rem 0.5rem',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '5px',
                  }}>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: '800',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: day.isToday ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                    }}>
                      {day.label}
                    </span>

                    {/* Check or count */}
                    {cellDone ? (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(148,163,184,0.2)',
                        border: `1.5px solid ${AWARDS[1].color}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l4 4 6-7" stroke={AWARDS[1].color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: day.isToday ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                        border: day.isToday ? '1.5px solid rgba(99,102,241,0.35)' : '1.5px dashed rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {day.cnt > 0 ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#a5b4fc' }}>{day.cnt}</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)' }}>—</span>
                        )}
                      </div>
                    )}

                    <span style={{
                      fontSize: '0.58rem', fontWeight: '700',
                      color: cellDone ? AWARDS[1].color : day.cnt > 0 ? '#a5b4fc' : 'rgba(255,255,255,0.2)',
                    }}>
                      {cellDone ? `${day.cnt} ✓` : day.cnt > 0 ? `${day.cnt}/${dailyGoal}` : 'No reads'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current streak indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${Math.min(100, (streakDays / 3) * 100)}%`,
                  background: streakDone ? `linear-gradient(90deg, #2563eb, ${AWARDS[1].color})` : 'rgba(99,102,241,0.6)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: streakDone ? AWARDS[1].color : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                {streakDays} / 3 days
              </span>
            </div>
          </div>

          {/* ── Card 3: Weekly Challenge ───────────────────────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '1.1rem',
            marginBottom: '0.75rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -30, right: -10,
              width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '0.9rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SheetSectionLabel>Challenge 3</SheetSectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                  <StarIcon size={14} color={weekDone ? AWARDS[2].color : 'rgba(255,255,255,0.7)'} />
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                    Weekly Goal
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
                  Reach your daily goal on {weeklyGoal} of 7 days to earn the{' '}
                  <span style={{ color: AWARDS[2].color, fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px', verticalAlign: 'middle' }}>
                    <StarIcon size={11} color={AWARDS[2].color} /> Savvy
                  </span> badge
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: weekDone ? AWARDS[2].color : '#fff', letterSpacing: '-0.04em' }}>
                  {weeklyDays}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>/ {weeklyGoal}</span>
              </div>
            </div>

            {/* 7-day grid */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '0.75rem' }}>
              {weekGrid.map(day => {
                const bg = day.met
                  ? 'linear-gradient(145deg, #78350f, #d97706)'
                  : day.count > 0
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(255,255,255,0.05)';
                const border = day.isToday
                  ? '1.5px solid rgba(99,102,241,0.6)'
                  : day.met
                    ? '1px solid rgba(245,158,11,0.35)'
                    : '1px solid rgba(255,255,255,0.07)';

                return (
                  <div key={day.key} style={{
                    flex: 1, height: 52, borderRadius: '10px',
                    background: bg, border,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '3px',
                  }}>
                    <span style={{
                      fontSize: '0.55rem', fontWeight: '800',
                      letterSpacing: '0.05em',
                      color: day.met ? '#fef3c7' : day.isToday ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
                    }}>
                      {day.day}
                    </span>
                    {day.met ? (
                      <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fef3c7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : day.count > 0 ? (
                      <span style={{ fontSize: '0.55rem', fontWeight: '900', color: '#fbbf24' }}>{day.count}</span>
                    ) : (
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { color: '#d97706', label: 'Goal met' },
                { color: 'rgba(245,158,11,0.3)', label: 'Partial', border: '1px solid rgba(245,158,11,0.4)' },
                { color: 'rgba(255,255,255,0.06)', label: 'No reads', border: '1px solid rgba(255,255,255,0.1)' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '3px', background: l.color, border: l.border }} />
                  <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Motivation / Tip card ──────────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(236,72,153,0.07) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '16px',
            padding: '1rem 1.1rem',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1.2, flexShrink: 0 }}>{motivation.emoji}</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '700', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                {motivation.text}
              </p>
              <p style={{ margin: '5px 0 0', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                Tip: Reading stories in different categories builds broader awareness.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProgressPill({ challengeStats, user, onShowAuth, style = {} }) {
  // All hooks must be called unconditionally before any early return
  const [open, setOpen] = useState(false);
  const [toastAward, setToastAward] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevAwardId = useRef(null);

  const {
    todayCount = 0,
    dailyGoal  = 10,
    streakDays = 0,
    weeklyDays = 0,
    weeklyGoal = 6,
    weekGrid   = [],
  } = challengeStats || {};

  const stats = { todayCount, dailyGoal, streakDays, weeklyDays, weeklyGoal };
  const topAward = getHighestAward(stats);

  // Detect when a new (higher) award is earned and fire the toast once per session
  useEffect(() => {
    if (!user || !topAward) return;
    const stored = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
    const storedIdx = AWARDS.findIndex(a => a.id === stored);
    const curIdx    = AWARDS.findIndex(a => a.id === topAward.id);
    if (curIdx > storedIdx) {
      try { localStorage.setItem(LS_KEY, topAward.id); } catch {}
      if (prevAwardId.current !== topAward.id) {
        setToastAward(topAward);
        setShowConfetti(true);
      }
    }
    prevAwardId.current = topAward?.id ?? null;
  }, [topAward?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guest: render promo card
  if (!user) return <GuestPromo />;

  const todayPct  = todayCount / Math.max(1, dailyGoal);
  const streakPct = Math.min(streakDays, 3) / 3;
  const weekPct   = weeklyDays / Math.max(1, weeklyGoal);

  const todayLeft  = Math.max(0, dailyGoal - todayCount);
  const streakLeft = Math.max(0, 3 - Math.min(3, streakDays));
  const weekLeft   = Math.max(0, weeklyGoal - weeklyDays);

  const todayDone  = todayCount >= dailyGoal;
  const streakDone = streakDays >= 3;
  const weekDone   = weeklyDays >= weeklyGoal;

  const todayIconColor  = todayDone  ? AWARDS[0].color : 'rgba(205,127,50,0.45)';  // bronze dimmed
  const streakIconColor = streakDone ? AWARDS[1].color : 'rgba(148,163,184,0.45)'; // silver dimmed
  const weekIconColor   = weekDone   ? AWARDS[2].color : 'rgba(245,158,11,0.45)';  // gold dimmed

  return (
    <>
      {/* ── Three-ring card ───────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0,
          margin: '0 16px 12px',
          width: 'calc(100% - 32px)',
          background: 'linear-gradient(145deg, #0f0f1e, #181830)',
          border: topAward ? `1px solid ${topAward.color}30` : 'none',
          borderRadius: 20,
          padding: '14px 10px 10px',
          cursor: 'pointer',
          boxShadow: topAward
            ? `0 4px 24px rgba(0,0,0,0.18), 0 0 0 1px ${topAward.color}15`
            : '0 4px 24px rgba(0,0,0,0.18)',
          ...style,
        }}
      >
        {/* Rings row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <ChallengeRing
            size={84} strokeW={6}
            pct={todayPct}
            gradId="cr-today" color0="#7c3a1e" color1="#cd7f32"
            trackColor="rgba(124,58,30,0.18)"
            label="Today"
            count={todayCount} total={dailyGoal} unit="stories"
            toGo={todayLeft > 0 ? `${todayLeft} stories to go` : 'Goal complete!'}
            icon={<LightbulbIcon size={13} color={todayIconColor} />}
            awardTitle="Informed" awardColor={AWARDS[0].color} awardId="informed"
          />

          <div style={{ width: 1, height: 58, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          <ChallengeRing
            size={84} strokeW={6}
            pct={streakPct}
            gradId="cr-streak" color0="#2563eb" color1="#e2e8f0"
            trackColor="rgba(37,99,235,0.15)"
            label="Streak"
            count={streakDays} total={3} unit="days"
            toGo={streakLeft > 0 ? `${streakLeft} day${streakLeft !== 1 ? 's' : ''} to go` : 'Streak complete!'}
            icon={<LightningIcon size={11} color={streakIconColor} />}
            awardTitle="Sharp" awardColor={AWARDS[1].color} awardId="sharp"
          />

          <div style={{ width: 1, height: 58, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          <ChallengeRing
            size={84} strokeW={6}
            pct={weekPct}
            gradId="cr-week" color0="#92400e" color1="#ffd700"
            trackColor="rgba(180,83,9,0.18)"
            label="Week"
            count={weeklyDays} total={weeklyGoal} unit="days"
            toGo={weekLeft > 0 ? `${weekLeft} day${weekLeft !== 1 ? 's' : ''} to go` : 'Week complete!'}
            icon={<StarIcon size={12} color={weekIconColor} />}
            awardTitle="Savvy" awardColor={AWARDS[2].color} awardId="savvy"
          />
        </div>

        {/* ── Persistent award badge ── */}
        {topAward && (
          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: `1px solid ${topAward.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <AwardIcon awardId={topAward.id} size={13} color={topAward.color} />
            <span style={{
              fontSize: '0.7rem', fontWeight: '800',
              color: topAward.color, letterSpacing: '0.02em',
            }}>
              {topAward.title}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: '500' }}>
              · {topAward.subtitle}
            </span>
          </div>
        )}
      </button>

      {/* ── Cosmic burst ──────────────────────────────────────────────────── */}
      {showConfetti && <Confetti award={toastAward} onDone={() => setShowConfetti(false)} />}

      {/* ── Award toast ───────────────────────────────────────────────────── */}
      {toastAward && (
        <AwardToast award={toastAward} onDone={() => setToastAward(null)} />
      )}

      {/* ── Detail bottom sheet ───────────────────────────────────────────── */}
      <ChallengeSheet
        open={open}
        onClose={() => setOpen(false)}
        challengeStats={challengeStats}
      />
    </>
  );
}
