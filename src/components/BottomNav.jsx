import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserCircle, Flame, Lightbulb, Zap, Star } from 'lucide-react';
import ProgressPill, { AWARDS } from './ProgressPill';
import { ListenIcon, ReadIcon } from './Logo';

// Read unfolds into Swipe / Scroll in the same track. Finish the motion before
// changing routes, so the new page inherits the settled navigation.
const MODES = ['audio', 'swipe', 'scroll'];
// The bar you tap moves first and the page changes when it has finished (Roy, 2026-10-18: Read
// was not smooth). Changing page first meant the motion waited for the new page to be built —
// nothing moved for the first ~170 ms on a 4x-slowed CPU, and the new bar's first frame was
// already partway through. Now the motion runs on the bar you touched, with nothing else
// happening, and the next page's bar is drawn already in its final place.
const MOTION_MS = 340;
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function BottomNav({
  fixed = true,
  center = null,
  utilitiesOnly = false,
  compactRead = false,
  mode = 'scroll',
  onChangeMode,
  challengeStats,
  user,
  onShowAuth,
}) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const challengePanel = useRef(null);
  useEffect(() => {
    if (!sheetOpen) return undefined;
    const previous = document.activeElement;
    challengePanel.current?.querySelector('button')?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); setSheetOpen(false); }
      if (e.key !== 'Tab') return;
      const nodes = challengePanel.current?.querySelectorAll('button,a[href],input');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, [sheetOpen]);

  const todayCount = challengeStats?.todayCount || 0;
  const dailyGoal  = challengeStats?.dailyGoal  || 10;
  const frac = Math.max(challengeStats?.todayAudioComplete ? 1 : 0, Math.min(1, dailyGoal ? todayCount / dailyGoal : 0));
  // Past the goal the goal stops mattering: "11", not "11/10" (Roy, 2026-10-17) — the same as
  // the challenge sheet's own ring.
  const exceeded = todayCount > dailyGoal;
  const earnedBadge = user ? [...AWARDS].reverse().find(award => award.check({
    todayCount, dailyGoal, todayAudioComplete: challengeStats?.todayAudioComplete, streakDays: challengeStats?.streakDays || 0,
    weeklyDays: challengeStats?.weeklyDays || 0, weeklyGoal: challengeStats?.weeklyGoal || 6,
  })) : null;
  const BadgeIcon = earnedBadge?.id === 'savvy' ? Star : earnedBadge?.id === 'sharp' ? Zap : Lightbulb;

  const goSettings = () => navigate('/settings', { state: { from: window.location.pathname } });

  const current = MODES.includes(mode) ? mode : 'scroll';
  const [shown, setShown] = useState(current);
  useEffect(() => { setShown(current); }, [current]);
  const open = !compactRead && shown !== 'audio';               // Read shown as Swipe | Scroll
  const goTimer = useRef(null);
  useEffect(() => () => clearTimeout(goTimer.current), []);
  const go = (value) => {
    if (value === current) return;
    if (reduceMotion()) { onChangeMode?.(value); return; }
    setShown(value);
    clearTimeout(goTimer.current);
    goTimer.current = setTimeout(() => onChangeMode?.(value), MOTION_MS);
  };
  const motion = reduceMotion() ? 'none' : null;
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  // Both ends are the same 44px circle in the modes' own grey, so they read as buttons and as
  // a pair, with the modes centred between them (Roy, 2026-10-17). The challenge's progress is
  // drawn on the edge of its circle rather than as a ring of its own, so it is never the bigger
  // of the two.
  const end = { width: 44, height: 44, borderRadius: '50%', background: 'var(--panel)', color: 'var(--ink)', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

  // The label lights with the highlight under it, so the two arrive together.
  const seg = (label, value, extra = {}) => {
    const on = current === value;
    const lit = shown === value;
    return (
      <button key={value} className="rn-btn" aria-current={on ? 'page' : undefined}
        onClick={() => !on && go(value)} {...extra.props}
        style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, minHeight: 38, borderRadius: 10, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          cursor: on ? 'default' : 'pointer', background: 'transparent',
          color: lit ? 'var(--ink)' : 'var(--sub)', fontWeight: lit ? 650 : 500,
          transition: motion || 'color 0.2s ease, opacity 0.2s ease', ...extra.style }}>
        {label === 'Listen' && <ListenIcon />}
        {label === 'Read' && <ReadIcon />}
        {label}
      </button>
    );
  };
  // Swipe and Scroll are there only while Read is open; folded, they cannot be reached.
  const inside = (label, value) => seg(label, value, {
    props: { tabIndex: open ? 0 : -1, 'aria-hidden': open ? undefined : true },
    style: { transform: open ? 'translateY(0)' : 'translateY(4px)', transition: motion || 'opacity .18s ease, transform .24s ease, color .2s ease', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transitionDelay: open ? '0.08s' : '0s' },
  });

  // Today's progress as a ring, with the count inside it.
  const R = 20.75, C = 2 * Math.PI * R;
  const ring = (
    <>
      {frac > 0 && (
        <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="22" cy="22" r={R} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} />
        </svg>
      )}
      <span style={{ position: 'relative', fontSize: exceeded ? 13 : 10.5, fontWeight: 750, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {challengeStats?.todayAudioComplete ? '✓' : exceeded ? todayCount : `${todayCount}/${dailyGoal}`}
      </span>
    </>
  );

  return (
    <>
      <nav style={{
        ...(fixed ? { position: 'fixed', bottom: 0, left: 0, right: 0 } : { position: 'relative' }),
        zIndex: 45, flexShrink: 0, background: 'var(--paper)',
        padding: '4px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 420 }}>
          <button className="rn-btn" aria-label="Settings" onClick={goSettings} style={end}>
            <UserCircle size={22} strokeWidth={1.8} />
          </button>
          {utilitiesOnly ? <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>{center}</div> : (
          <div role="group" aria-label="How you take in the news"
            style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', gap: 2, padding: 3, background: 'var(--panel)', borderRadius: 13 }}>
            {/* The highlight: one segment of the track — a half while Read is folded, a third while it
                is open — less the padding and gaps, moved a whole segment (its own width plus a
                gap) per step. */}
            <span aria-hidden style={{ position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 10,
              width: open ? 'calc((100% - 10px) / 3)' : 'calc((100% - 8px) / 2)',
              background: 'var(--raised)', boxShadow: 'var(--raised-shadow)',
              transform: `translateX(calc(${(compactRead ? (shown === 'audio' ? 0 : 1) : MODES.indexOf(shown))} * (100% + 2px)))`,
              transition: motion || `transform 0.34s ${ease}, width 0.34s ${ease}` }} />
            {seg('Listen', 'audio')}
            {compactRead && seg('Read', 'scroll')}
            {/* Read: one segment folded, two open. It widens as Swipe and Scroll fade in. */}
            <div style={{ display: compactRead ? 'none' : 'flex', position: 'relative', flex: `${open ? 2 : 1} 1 0`, minWidth: 0, gap: 2,
              transition: motion || `flex-grow 0.34s ${ease}` }}>
              {inside('Swipe', 'swipe')}
              {inside('Scroll', 'scroll')}
              <button className="rn-btn" aria-label="Read: Swipe or Scroll" aria-expanded={open}
                tabIndex={open ? -1 : 0} aria-hidden={open ? true : undefined}
                onClick={() => go('swipe')}
                style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: 10, fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'transparent', color: 'var(--sub)',
                  opacity: open ? 0 : 1, pointerEvents: open ? 'none' : 'auto',
                  transition: motion || 'opacity 0.15s ease' }}>
                <ReadIcon />Read
              </button>
            </div>
          </div>
          )}
          <button className="rn-btn" onClick={() => setSheetOpen(true)}
            aria-label={`${earnedBadge ? `${earnedBadge.title} earned. ` : ''}${!user ? 'Reading challenge — sign in to track progress'
              : challengeStats?.todayAudioComplete ? 'Challenge: listening mix completed' : exceeded ? `Reading challenge: ${todayCount} stories today, past the goal` : `Reading challenge: ${todayCount} of ${dailyGoal} stories today`}`}
            style={end}>
            {user ? ring : <Flame size={20} strokeWidth={1.8} />}
            {earnedBadge && <span aria-hidden="true" style={{ position: 'absolute', top: -2, right: -2,
              width: 19, height: 19, borderRadius: '50%', background: 'var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
              color: 'var(--accent)', boxShadow: '0 0 0 2px var(--paper)' }}>
              <BadgeIcon size={13} strokeWidth={2} />
            </span>}
          </button>
        </div>
      </nav>

      {/* Challenge sheet */}
      <div onClick={() => setSheetOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)', opacity: sheetOpen ? 1 : 0, pointerEvents: sheetOpen ? 'auto' : 'none', transition: 'opacity 0.3s' }} />
      <div ref={challengePanel} inert={!sheetOpen ? true : undefined} aria-hidden={!sheetOpen} role={sheetOpen ? 'dialog' : undefined} aria-modal={sheetOpen ? 'true' : undefined} aria-label="Reading challenge" style={{
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
