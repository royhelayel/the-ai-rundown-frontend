import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserCircle, Flame } from 'lucide-react';
import ProgressPill from './ProgressPill';

/**
 * BottomNav — [Settings] [Swipe | Listen | Scroll] [Challenge].
 *
 * The three modes are the one choice people make here every session, so they share one
 * rounded block in the middle, as words. Settings and the challenge are places rather than
 * modes, so they sit apart in squares of the same height and corners — icons, not words, which
 * is what tells the two kinds apart (Roy and Codex, 2026-10-15; Uber's button pair was the
 * reference). Calm on purpose: the play button is the one strong colour on a screen, and a
 * loud bar competed with it.
 *
 * The challenge shows today's progress as a ring and "4/5", no label (Roy, 2026-10-15).
 */
export default function BottomNav({
  fixed = true,
  mode = 'scroll',
  onChangeMode,
  challengeStats,
  user,
  onShowAuth,
}) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const todayCount = challengeStats?.todayCount || 0;
  const dailyGoal  = challengeStats?.dailyGoal  || 10;
  const frac = Math.min(1, dailyGoal ? todayCount / dailyGoal : 0);

  const goSettings = () => navigate('/settings', { state: { from: window.location.pathname } });

  const square = { height: 52, borderRadius: 14, background: 'var(--panel)', color: 'var(--ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

  const seg = (label, value) => {
    const on = mode === value;
    return (
      <button key={value} className="rn-btn" aria-current={on ? 'page' : undefined}
        onClick={() => !on && onChangeMode?.(value)}
        style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 10, fontSize: 13.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: on ? 'default' : 'pointer',
          background: on ? 'var(--raised)' : 'transparent', boxShadow: on ? 'var(--raised-shadow)' : 'none',
          color: on ? 'var(--ink)' : 'var(--sub)', fontWeight: on ? 650 : 500 }}>
        {label}
      </button>
    );
  };

  const R = 11.5, C = 2 * Math.PI * R;
  const ring = (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="13" cy="13" r={R} fill="none" stroke="var(--line)" strokeWidth="3" />
      {frac > 0 && <circle cx="13" cy="13" r={R} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} />}
    </svg>
  );

  return (
    <>
      <nav style={{
        ...(fixed ? { position: 'fixed', bottom: 0, left: 0, right: 0 } : { position: 'relative' }),
        zIndex: 45, flexShrink: 0, background: 'var(--paper)',
        padding: '6px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 420 }}>
          <button className="rn-btn" aria-label="Settings" onClick={goSettings} style={{ ...square, width: 52 }}>
            <UserCircle size={22} strokeWidth={1.8} />
          </button>
          <div role="group" aria-label="How you take in the news"
            style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, padding: 4, background: 'var(--panel)', borderRadius: 14 }}>
            {seg('Swipe', 'swipe')}
            {seg('Listen', 'audio')}
            {seg('Scroll', 'scroll')}
          </div>
          <button className="rn-btn" onClick={() => setSheetOpen(true)}
            aria-label={!user ? 'Reading challenge — sign in to track progress' : `Reading challenge: ${todayCount} of ${dailyGoal} stories today`}
            style={{ ...square, padding: '0 12px 0 10px', gap: 8 }}>
            {user ? ring : <Flame size={20} strokeWidth={1.9} />}
            {user && <span style={{ fontSize: 14, fontWeight: 750, fontVariantNumeric: 'tabular-nums' }}>{todayCount}/{dailyGoal}</span>}
          </button>
        </div>
      </nav>

      {/* Challenge sheet */}
      <div onClick={() => setSheetOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', opacity: sheetOpen ? 1 : 0, pointerEvents: sheetOpen ? 'auto' : 'none', transition: 'opacity 0.3s' }} />
      <div style={{
        position: 'fixed', left: '50%', bottom: 0, zIndex: 301,
        width: '100%', maxWidth: 560, transform: `translateX(-50%) translateY(${sheetOpen ? '0' : '100%'})`,
        transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)',
        background: 'var(--paper)', color: 'var(--ink)', borderRadius: '24px 24px 0 0',
        maxHeight: '85dvh', overflowY: 'auto', overscrollBehavior: 'contain',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 38, height: 5, borderRadius: 5, background: 'var(--line)', position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)' }} />
          <span style={{ fontSize: 11.5, fontWeight: 650, color: 'var(--sub)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Reading challenge</span>
          <button className="rn-btn" onClick={() => setSheetOpen(false)} aria-label="Close"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--panel)', color: 'var(--sub)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '4px 0 18px' }}>
          <ProgressPill challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} style={{ margin: '0 16px', width: 'calc(100% - 32px)' }} />
        </div>
      </div>
    </>
  );
}
