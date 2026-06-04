import React, { useState } from 'react';
import { X, Flame, ChevronRight } from 'lucide-react';

const ACCENT = '#7c3aed';

// Ring with count number inside
function RingWithCount({ pct = 0, count = 0, size = 44, stroke = 4 }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, pct);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ACCENT} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size <= 44 ? '0.82rem' : '0.95rem', fontWeight: '900', color: ACCENT, letterSpacing: '-0.03em' }}>
          {count > 99 ? '99+' : count}
        </span>
      </div>
    </div>
  );
}

// Segment bar — matches wireframe: thin dashes, purple filled, faded unfilled
function SegBar({ count, goal }) {
  const segs = Math.min(goal, 20);
  const filled = Math.min(count, segs);
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: segs }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: '3px', borderRadius: '2px',
          background: i < filled ? ACCENT : 'rgba(124,58,237,0.18)',
        }} />
      ))}
    </div>
  );
}

// Weekly day grid inside the challenge sheet
function WeekRow({ weekGrid }) {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {weekGrid.map(day => {
        const bg = day.met ? '#16a34a' : day.count > 0 ? '#d97706' : 'rgba(0,0,0,0.06)';
        return (
          <div key={day.key} title={`${day.key}: ${day.count}`} style={{
            flex: 1, height: '38px', borderRadius: '8px', background: bg,
            border: day.isToday ? `2px solid ${ACCENT}` : '1px solid transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
          }}>
            <span style={{ fontSize: '0.52rem', fontWeight: '700', color: day.count > 0 ? '#fff' : 'rgba(0,0,0,0.3)' }}>
              {day.day}
            </span>
            {day.count > 0 && (
              <span style={{ fontSize: '0.48rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>
                {day.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressPill({ challengeStats, style = {} }) {
  const [open, setOpen] = useState(false);

  const {
    todayCount = 0,
    dailyGoal  = 10,
    streakDays = 0,
    weeklyDays = 0,
    weeklyGoal = 6,
    weekGrid   = [],
  } = challengeStats || {};

  const pct  = Math.min(1, todayCount / dailyGoal);
  const done = todayCount >= dailyGoal;
  const overGoal = todayCount > dailyGoal ? todayCount - dailyGoal : 0;

  return (
    <>
      {/* ── Slim pill (matches wireframe exactly) ── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          margin: '0 16px 10px', padding: '8px 12px 8px 10px',
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.09)',
          borderRadius: '999px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          cursor: 'pointer', width: 'calc(100% - 32px)',
          ...style,
        }}
      >
        {/* Ring with count inside */}
        <RingWithCount pct={pct} count={todayCount} size={44} stroke={4} />

        {/* Text + bar block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0a0a0f', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {done
              ? `${todayCount} of ${dailyGoal} today${overGoal > 0 ? ` (+${overGoal})` : ''}`
              : `${todayCount} of ${dailyGoal} today`}
          </div>
          {/* Segment bar spanning full width */}
          <SegBar count={Math.min(todayCount, dailyGoal)} goal={dailyGoal} />
        </div>

        {/* Streak badge */}
        {streakDays > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            <Flame size={13} color="#f97316" fill="#f97316" />
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#f97316', whiteSpace: 'nowrap' }}>
              {streakDays}-day streak
            </span>
          </div>
        )}

        {/* Chevron */}
        <ChevronRight size={14} color="rgba(0,0,0,0.25)" style={{ flexShrink: 0, marginLeft: '2px' }} />
      </button>

      {/* ── Challenge bottom sheet ── */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 301,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 1.5rem)',
            maxHeight: '82vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          }}>
            {/* Handle + header */}
            <div style={{ padding: '0.65rem 1.25rem 0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,0.1)', margin: '0 auto 0.9rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>Daily Challenge</span>
                <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8a8a9a', padding: '2px' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '0 1.25rem 0.5rem' }}>

              {/* ── Daily Goal card ── */}
              <div style={{ background: 'linear-gradient(135deg, #18182a, #1e1b35)', borderRadius: '18px', padding: '1.1rem', marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.9rem', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
                  Daily Goal
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                    <svg width={64} height={64} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                      <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth={5} />
                      <circle cx={32} cy={32} r={26} fill="none" stroke={ACCENT} strokeWidth={5}
                        strokeDasharray={`${2 * Math.PI * 26 * pct} ${2 * Math.PI * 26}`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em' }}>
                        {Math.round(pct * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {todayCount}
                      <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}> / {dailyGoal}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      {done ? (overGoal > 0 ? `+${overGoal} bonus` : 'Goal reached!') : `${dailyGoal - todayCount} to go`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array.from({ length: Math.min(dailyGoal, 20) }, (_, i) => (
                    <div key={i} style={{ flex: 1, height: '8px', borderRadius: '3px', background: i < todayCount ? ACCENT : 'rgba(255,255,255,0.12)' }} />
                  ))}
                </div>
              </div>

              {/* ── Streak card ── */}
              <div style={{ background: streakDays >= 3 ? 'linear-gradient(135deg,#431407,#7c2d12)' : '#f5f5f7', borderRadius: '16px', padding: '1rem', marginBottom: '1rem', border: streakDays >= 3 ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <Flame size={20} color={streakDays >= 3 ? '#fb923c' : '#d97706'} fill={streakDays >= 3 ? '#fb923c' : 'none'} />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: streakDays >= 3 ? '#fed7aa' : '#0a0a0f' }}>
                      {streakDays}-day streak
                    </div>
                    <div style={{ fontSize: '0.68rem', color: streakDays >= 3 ? 'rgba(253,186,116,0.6)' : '#8a8a9a' }}>
                      {streakDays >= 3 ? 'On fire — keep it going!' : streakDays > 0 ? 'Building momentum…' : 'Hit your goal today to start!'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i < streakDays ? '#f97316' : streakDays >= 3 ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                  ))}
                </div>
              </div>

              {/* ── Weekly goal card ── */}
              <div style={{ background: '#f5f5f7', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0a0a0f' }}>Weekly Goal</div>
                    <div style={{ fontSize: '0.68rem', color: '#8a8a9a' }}>{weeklyGoal} of 7 days (1 rest day)</div>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: '900', color: weeklyDays >= weeklyGoal ? '#16a34a' : ACCENT, letterSpacing: '-0.03em' }}>
                    {weeklyDays} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8a8a9a' }}>/ {weeklyGoal}</span>
                  </span>
                </div>
                {weekGrid.length > 0 && <WeekRow weekGrid={weekGrid} />}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  {[{ color:'#16a34a', label:'Goal met' }, { color:'#d97706', label:'Partial' }, { color:'rgba(0,0,0,0.08)', label:'None' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
                      <span style={{ fontSize: '0.58rem', color: '#8a8a9a', fontWeight: '600' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </>
  );
}
