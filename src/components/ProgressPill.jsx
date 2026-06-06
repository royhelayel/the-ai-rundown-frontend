import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
}) {
  const r    = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, pct));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{count}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{total}</span>
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
        {/* Line 1: Congrats! you are now ranked */}
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>
          Congrats! you are now ranked
        </span>
        {/* Line 2: Icon + Title (in award colour) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AwardIcon awardId={award.id} size={16} color={award.color} />
          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: award.color, letterSpacing: '-0.02em' }}>
            {award.title}
          </span>
        </div>
        {/* Line 3: subtitle */}
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
          {award.subtitle}
        </span>
      </div>
    </div>
  );
}

// ── WeekRow (detail sheet) ────────────────────────────────────────────────────

function WeekRow({ weekGrid }) {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {weekGrid.map(day => {
        const bg = day.met ? '#16a34a' : day.count > 0 ? '#d97706' : 'rgba(0,0,0,0.06)';
        return (
          <div key={day.key} title={`${day.key}: ${day.count}`} style={{
            flex: 1, height: '38px', borderRadius: '8px', background: bg,
            border: day.isToday ? '2px solid #7c3aed' : '1px solid transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '1px',
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

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProgressPill({ challengeStats, style = {} }) {
  const [open, setOpen] = useState(false);
  const [toastAward, setToastAward] = useState(null);
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
    if (!topAward) return;
    const stored = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
    const storedIdx = AWARDS.findIndex(a => a.id === stored);
    const curIdx    = AWARDS.findIndex(a => a.id === topAward.id);
    if (curIdx > storedIdx) {
      // New higher rank earned — show toast and persist
      try { localStorage.setItem(LS_KEY, topAward.id); } catch {}
      if (prevAwardId.current !== topAward.id) {
        setToastAward(topAward);
      }
    }
    prevAwardId.current = topAward?.id ?? null;
  }, [topAward?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayPct  = todayCount / Math.max(1, dailyGoal);
  const streakPct = Math.min(streakDays, 3) / 3;
  const weekPct   = weeklyDays / 7;

  const todayLeft  = Math.max(0, dailyGoal - todayCount);
  const streakLeft = Math.max(0, 3 - Math.min(3, streakDays));
  const weekLeft   = Math.max(0, 7 - weeklyDays);

  // Award-coloured icon when the ring's challenge is complete
  const todayDone  = todayCount >= dailyGoal;
  const streakDone = streakDays >= 3;
  const weekDone   = weeklyDays >= weeklyGoal;

  const todayIconColor  = todayDone  ? AWARDS[0].color : 'rgba(255,255,255,0.72)';
  const streakIconColor = streakDone ? AWARDS[1].color : 'rgba(255,255,255,0.72)';
  const weekIconColor   = weekDone   ? AWARDS[2].color : 'rgba(255,255,255,0.72)';

  // detail sheet
  const pct  = todayPct;
  const done = todayCount >= dailyGoal;
  const overGoal = todayCount > dailyGoal ? todayCount - dailyGoal : 0;

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
            gradId="cr-today" color0="#92400e" color1="#f59e0b"
            trackColor="rgba(146,64,14,0.18)"
            label="Today"
            count={todayCount} total={dailyGoal} unit="stories"
            toGo={todayLeft > 0 ? `${todayLeft} stories to go` : 'Goal complete!'}
            icon={<LightbulbIcon size={13} color={todayIconColor} />}
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
          />

          <div style={{ width: 1, height: 58, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          <ChallengeRing
            size={84} strokeW={6}
            pct={weekPct}
            gradId="cr-week" color0="#b45309" color1="#fbbf24"
            trackColor="rgba(180,83,9,0.18)"
            label="Week"
            count={weeklyDays} total={7} unit="days"
            toGo={weekLeft > 0 ? `${weekLeft} day${weekLeft !== 1 ? 's' : ''} to go` : 'Week complete!'}
            icon={<StarIcon size={12} color={weekIconColor} />}
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

      {/* ── Award toast ───────────────────────────────────────────────────── */}
      {toastAward && (
        <AwardToast award={toastAward} onDone={() => setToastAward(null)} />
      )}

      {/* ── Detail bottom sheet ───────────────────────────────────────────── */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }}
          />
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
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0a0a0f', letterSpacing: '-0.025em' }}>
                  Daily Challenge
                </span>
                <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8a8a9a', padding: '2px' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '0 1.25rem 0.5rem' }}>

              {/* Daily Goal card */}
              <div style={{ background: 'linear-gradient(135deg, #18182a, #1e1b35)', borderRadius: '18px', padding: '1.1rem', marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.9rem', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
                  Daily Goal
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                    <svg width={64} height={64} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                      <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth={5} />
                      <circle cx={32} cy={32} r={26} fill="none" stroke="#7c3aed" strokeWidth={5}
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
                    <div key={i} style={{ flex: 1, height: '8px', borderRadius: '3px', background: i < todayCount ? '#7c3aed' : 'rgba(255,255,255,0.12)' }} />
                  ))}
                </div>
              </div>

              {/* Streak card */}
              <div style={{
                background: streakDays >= 3 ? 'linear-gradient(135deg,#431407,#7c2d12)' : '#f5f5f7',
                borderRadius: '16px', padding: '1rem', marginBottom: '1rem',
                border: streakDays >= 3 ? 'none' : '1px solid rgba(0,0,0,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <LightningIcon size={18} color={streakDays >= 3 ? '#fb923c' : '#d97706'} />
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

              {/* Weekly goal card */}
              <div style={{ background: '#f5f5f7', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0a0a0f' }}>Weekly Goal</div>
                    <div style={{ fontSize: '0.68rem', color: '#8a8a9a' }}>{weeklyGoal} of 7 days</div>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: '900', color: weeklyDays >= weeklyGoal ? '#16a34a' : '#7c3aed', letterSpacing: '-0.03em' }}>
                    {weeklyDays} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8a8a9a' }}>/ {weeklyGoal}</span>
                  </span>
                </div>
                {weekGrid.length > 0 && <WeekRow weekGrid={weekGrid} />}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  {[{ color: '#16a34a', label: 'Goal met' }, { color: '#d97706', label: 'Partial' }, { color: 'rgba(0,0,0,0.08)', label: 'None' }].map(l => (
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
