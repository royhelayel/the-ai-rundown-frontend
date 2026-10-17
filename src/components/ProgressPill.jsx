import React, { useState, useEffect, useRef } from 'react';

// ── Award definitions ─────────────────────────────────────────────────────────
// Ordered lowest → highest rank. Social profiles will use these colours.
export const AWARDS = [
  {
    id:       'informed',
    title:    'Informed',
    subtitle: "Today's challenge achieved",
    color:    '#a5b4fc',                                        // pale (lightest tier)
    glow:     'rgba(165,180,252,0.35)',
    check:    (s) => s.todayCount >= s.dailyGoal,
  },
  {
    id:       'sharp',
    title:    'Sharp',
    subtitle: '3-day streak achieved',
    color:    '#6366f1',                                        // prominent (mid tier)
    glow:     'rgba(99,102,241,0.35)',
    check:    (s) => s.streakDays >= 3,
  },
  {
    id:       'savvy',
    title:    'Savvy',
    subtitle: 'Weekly challenge achieved',
    color:    '#db2777',                                        // boldest (top tier)
    glow:     'rgba(219,39,119,0.40)',
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

// A compact ring — arc, count, and its short caption ("stories today" etc.) inside, same as
// the numbers always showed — just smaller, since the award's name and full description now
// sit right next to it instead of in a separate section.
function MiniRing({ size = 72, strokeW = 5, pct = 0, count, total, caption, color }) {
  const r    = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, pct));
  const exceeded = count > total;   // past the goal → show just the numerator

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={strokeW} />
        {dash > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '0 6px' }}>
        {exceeded ? (
          <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--ink)', lineHeight: 1 }}>{count}</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1, gap: 1 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--ink)' }}>{count}</span>
            <span style={{ fontSize: '0.56rem', fontWeight: 500, color: 'var(--sub)' }}>/</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink)' }}>{total}</span>
          </div>
        )}
        <span style={{ fontSize: '0.48rem', fontWeight: 700, color: 'var(--sub)', textAlign: 'center', lineHeight: 1.05 }}>
          {caption}
        </span>
      </div>
    </div>
  );
}

// One award, one row: ring on the left, name + what it takes on the right — the two things
// that used to live in separate sections (the rings up top, the explainer text buried behind
// a link at the bottom) are now the same row, so there's nothing left to go find.
function ChallengeRow({ pct, count, total, caption, awardTitle, awardColor, awardId, earned, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <MiniRing pct={pct} count={count} total={total} caption={caption} color={awardColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ width: 17, height: 17, borderRadius: 6, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AwardIcon awardId={awardId} size={9} color={awardColor} />
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 650, color: 'var(--ink)' }}>
            {awardTitle}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--sub)', lineHeight: 1.45 }}>{description}</p>
      </div>
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

// onShowAuth opens the sign-in dialog. This used to navigate to /settings instead: you
// asked to sign in and got taken to a settings page, losing your place and still having to
// find the control. Signing in is a dialog you dismiss, not a destination you travel to.
function GuestPromo({ onShowAuth }) {
  return (
    <button
      onClick={() => onShowAuth?.()}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        margin: '0 16px 12px', width: 'calc(100% - 32px)',
        background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: 18,
        padding: '15px 16px', cursor: 'pointer', textAlign: 'left',
        boxShadow: '0 6px 18px rgba(20,20,40,0.05)',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'var(--panel)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="var(--sub)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          <path d="M17 11a4 4 0 0 0 0 8"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--ink)', marginBottom: '3px', letterSpacing: '-0.01em' }}>
          Sign In to Track Progress
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--sub)', lineHeight: 1.5 }}>
          Customise your feed, complete reading challenges and access popular &amp; interesting stories in your circle.
        </div>
      </div>

      <div style={{
        padding: '8px 14px', borderRadius: '10px', flexShrink: 0,
        background: 'var(--accent)',
        color: 'var(--paper)', fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap',
      }}>
        Sign In
      </div>
    </button>
  );
}


// ── Main export ───────────────────────────────────────────────────────────────

export default function ProgressPill({ challengeStats, user, onShowAuth, style = {} }) {
  // All hooks must be called unconditionally before any early return
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
  if (!user) return <GuestPromo onShowAuth={onShowAuth} />;

  const todayPct  = todayCount / Math.max(1, dailyGoal);
  const streakPct = Math.min(streakDays, 3) / 3;
  const weekPct   = weeklyDays / Math.max(1, weeklyGoal);

  const todayLeft  = Math.max(0, dailyGoal - todayCount);
  const streakLeft = Math.max(0, 3 - Math.min(3, streakDays));
  const weekLeft   = Math.max(0, weeklyGoal - weeklyDays);

  // The calendar week from useListenHistory — the same grid the weekly ring counts, so the
  // two always agree. All seven days show, read or not, so the week reads as a fixed frame
  // rather than shrinking and growing as content is generated through the week.
  const weekDays = weekGrid
    .map(d => ({ key: d.key, letter: d.day, count: d.count, met: d.met, isToday: d.isToday }));

  const todayDone  = todayCount >= dailyGoal;
  const streakDone = streakDays >= 3;
  const weekDone   = weeklyDays >= weeklyGoal;

  // Collapsed bar: highest earned badge + the next one and how to earn it.
  //
  // The next award is whatever ranks just above the highest one already earned — not simply
  // the lowest of the three not currently true. Informed resets every morning, so once a
  // streak has carried Sharp (or Savvy) past it, Informed can read as "not met" again purely
  // because today hasn't started yet — .find from the bottom would land back on Informed and
  // talk the message backwards ("you achieved Sharp, read more to become Informed"), a lower
  // rank than the one already announced a few words earlier.
  const topIdx = topAward ? AWARDS.findIndex(a => a.id === topAward.id) : -1;
  const nextAward = topIdx + 1 < AWARDS.length ? AWARDS[topIdx + 1] : null;
  const nextReq = !nextAward ? null
    : nextAward.id === 'informed' ? `read ${todayLeft} more ${todayLeft === 1 ? 'story' : 'stories'} today`
    : nextAward.id === 'sharp'    ? `keep your streak ${streakLeft} more day${streakLeft !== 1 ? 's' : ''}`
    : `hit your goal ${weekLeft} more day${weekLeft !== 1 ? 's' : ''} this week`;
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // Inline badge: icon + name, in the badge colour, bold.
  const BadgeLabel = ({ award }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle', color: 'var(--ink)', fontWeight: 650 }}>
      <AwardIcon awardId={award.id} size={12} color="var(--accent)" />
      {award.title}
    </span>
  );

  const panelStyle = { background: 'var(--panel)', borderRadius: 16, padding: '16px 14px' };
  return (
    <>
      <div style={{ margin: '0 16px 12px', width: 'calc(100% - 32px)', ...style }}>
        <p style={{ margin: '8px 0 18px', fontSize: '0.85rem', color: 'var(--sub)', lineHeight: 1.55 }}>
          {!nextAward ? <>You achieved <BadgeLabel award={topAward} /> — top rank this week.</>
            : topAward ? <>You achieved <BadgeLabel award={topAward} />, {nextReq} to become <BadgeLabel award={nextAward} /></>
            : <>{capitalize(nextReq)} to become <BadgeLabel award={nextAward} /></>}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <section aria-label="Informed challenge" style={panelStyle}>
            <ChallengeRow pct={todayPct} count={todayCount} total={dailyGoal} caption="stories today" awardTitle="Informed" awardColor="var(--accent)" awardId="informed" earned={todayDone} description={`Read ${dailyGoal} stories today`} />
          </section>
          <section aria-label="Sharp challenge" style={panelStyle}>
            <ChallengeRow pct={streakPct} count={streakDays} total={3} caption="day streak" awardTitle="Sharp" awardColor="var(--accent)" awardId="sharp" earned={streakDone} description="Reach your daily goal 3 days in a row" />
          </section>
          <section aria-label="Savvy weekly challenge" style={panelStyle}>
            <ChallengeRow pct={weekPct} count={weeklyDays} total={weeklyGoal} caption="days this week" awardTitle="Savvy" awardColor="var(--accent)" awardId="savvy" earned={weekDone} description={`Reach your daily goal on ${weeklyGoal} days this week`} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '20px 0 14px', color: 'var(--sub)', fontSize: '0.72rem' }}>
              <span>{weeklyDays} of {weeklyGoal} days complete</span><span>{dailyGoal} stories / day</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {weekDays.map(d => {
                const R = 14, C = 2 * Math.PI * R;
                const pct = Math.min(1, d.count / Math.max(1, dailyGoal));
                return (
                  <div key={d.key} aria-label={`${d.key}: ${d.count} of ${dailyGoal} stories${d.met ? ', goal reached' : ''}${d.isToday ? ', today' : ''}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                    <span style={{ position: 'relative', display: 'flex', width: 32, height: 32 }}>
                      <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true">
                        <circle cx="17" cy="17" r={R} fill="none" stroke="var(--line)" strokeWidth="3.5" />
                        {pct > 0 && <circle cx="17" cy="17" r={R} fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 17 17)" />}
                        {d.met && <path d="M11 17l4 4 8-8" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                      </svg>
                      {!d.met && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.66rem', fontWeight: 650, color: d.count ? 'var(--ink)' : 'var(--sub)' }}>{d.count || '—'}</span>}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: d.isToday ? 800 : 500, color: d.isToday ? 'var(--ink)' : 'var(--sub)' }}>{d.letter}</span>
                  </div>
                );
              })}
            </div>
            {weeklyGoal === 6 && <p style={{ textAlign: 'center', margin: '18px 0 0', fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--sub)' }}>Six days to stay informed.<br />One day for a digital detox.</p>}
          </section>
        </div>
      </div>

      {/* ── Cosmic burst ──────────────────────────────────────────────────── */}
      {showConfetti && <Confetti award={toastAward} onDone={() => setShowConfetti(false)} />}

      {/* ── Award toast ───────────────────────────────────────────────────── */}
      {toastAward && (
        <AwardToast award={toastAward} onDone={() => setToastAward(null)} />
      )}
    </>
  );
}
