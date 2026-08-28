import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserCircle, LayoutList, GalleryVerticalEnd, Headphones, Flame } from 'lucide-react';
import ProgressPill from './ProgressPill';

const light = {
  // The nav container now matches the page's own background (#f5f5f7, used everywhere else
  // in Scroll mode) instead of white — the white bar read as a separate panel sitting on
  // top of the page rather than the page's own footer. With the container no longer
  // contrasting against the page, the dock needs its own surface to read as a control: white
  // with a hairline border, the same relationship every story card has to the page behind it.
  bg:        '#f5f5f7',
  border:    'rgba(0,0,0,0.06)',
  text:      '#0a0a0f',
  textMuted: '#9ca3af',
  track:     '#ffffff',
  trackBorder: 'rgba(0,0,0,0.07)',
  divider:   'rgba(0,0,0,0.10)',
  activeBg:  'rgba(99,102,241,0.12)',
  activeFg:  '#6366f1',
};

const dark = {
  bg:        '#0a0a14',
  border:    'rgba(255,255,255,0.08)',
  text:      '#ffffff',
  textMuted: 'rgba(255,255,255,0.55)',
  track:     'rgba(255,255,255,0.12)',
  trackBorder: 'transparent',
  divider:   'rgba(255,255,255,0.18)',
  activeBg:  'rgba(165,180,252,0.22)',
  activeFg:  '#c7d2fe',
};

/**
 * BottomNav — Settings · View · Challenge.
 *
 * It used to be four destinations plus an action, mixing two kinds of thing on one row.
 * Now the corpus (My news / All news) lives in the header where the rest of the scope
 * controls are, which leaves this bar holding exactly three items and no ambiguity about
 * what a tap does.
 *
 * View is the one control people touch every session — mode is chosen on open and then left
 * alone — so it sits centre, under the thumb, as a single segmented control rather than
 * three peers that would read as destinations.
 */
export default function BottomNav({
  theme = 'light',
  fixed = true,
  mode = 'scroll',
  onChangeMode,
  challengeStats,
  user,
  onShowAuth,
}) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const t = theme === 'dark' ? dark : light;

  const todayCount = challengeStats?.todayCount || 0;
  const dailyGoal  = challengeStats?.dailyGoal  || 10;
  const goalMet    = todayCount >= dailyGoal;

  // ── One dock, every button named ───────────────────────────────────────────
  //
  // A group label told you what the trio was for but nothing about what each icon does, so
  // you still had to decode a stack, a list and a pair of headphones. Naming each button
  // removes the guesswork, and the dividers keep the grouping without needing a caption.
  //
  // The tint wraps icon and label together, so the selected cell is one object rather than
  // a highlighted icon with a caption loose underneath it.
  const goSettings = () => navigate('/settings', { state: { from: window.location.pathname } });

  const key = (icon, text, onClick, aria, { active = false, width } = {}) => (
    <button key={aria} onClick={onClick} aria-label={aria} title={aria}
      style={{
        width, borderRadius: 8, border: 'none', padding: '4px 0 3px',
        cursor: active ? 'default' : 'pointer',
        background: active ? t.activeBg : 'transparent',
        color: active ? t.activeFg : t.textMuted,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}>
      <span style={{ height: 20, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: '0.64rem', fontWeight: 500, lineHeight: 1.2 }}>{text}</span>
    </button>
  );

  const divider = (k) => <span key={k} aria-hidden style={{ width: 1, alignSelf: 'stretch', background: t.divider, margin: '3px 5px', flexShrink: 0 }} />;

  return (
    <>
      <nav style={{
        ...(fixed ? { position: 'fixed', bottom: 0, left: 0, right: 0 } : { position: 'relative' }),
        zIndex: 45, flexShrink: 0,
        background: t.bg,
        padding: '12px 16px',
        // Clearance above env(safe-area-inset-bottom) — the inset itself already reserves
        // the home-indicator's gesture area, so this is on top of that, not instead of it.
        // Was 12px, which read as a second, unexplained gap once the inset was already
        // padding it out; 6px still keeps the dock clear of the gesture area.
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
        display: 'flex', justifyContent: 'center',
      }}>
        {/* The dock carries its own border now that the nav container no longer contrasts
            against the page — same idea as a story card's hairline against the gray page
            behind it. Transparent in dark mode: the track there is already visibly lighter
            than the near-black page, so it doesn't need a second edge. */}
        <div style={{ display: 'inline-flex', alignItems: 'stretch', background: t.track, border: `1px solid ${t.trackBorder}`, borderRadius: 12, padding: 5 }}>
          {key(<UserCircle size={19} strokeWidth={1.7} />, 'Settings', goSettings, 'Settings', { width: 54 })}
          {divider('d1')}
          {key(<GalleryVerticalEnd size={18} strokeWidth={mode === 'swipe' ? 2.3 : 1.9} />, 'Swipe', () => mode !== 'swipe' && onChangeMode?.('swipe'), 'Swipe', { active: mode === 'swipe', width: 48 })}
          {key(<LayoutList size={18} strokeWidth={mode === 'scroll' ? 2.3 : 1.9} />, 'Scroll', () => mode !== 'scroll' && onChangeMode?.('scroll'), 'Scroll', { active: mode === 'scroll', width: 48 })}
          {key(<Headphones size={18} strokeWidth={mode === 'audio' ? 2.3 : 1.9} />, 'Listen', () => onChangeMode?.('audio'), 'Listen', { active: mode === 'audio', width: 48 })}
          {divider('d2')}
          {key(
            // Guests have no count, so show the flame rather than a blank — an empty cell
            // reads as broken or disabled, which it isn't.
            user
              ? <span style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1 }}>{todayCount}</span>
              : <Flame size={18} strokeWidth={1.9} />,
            'Challenge',
            () => setSheetOpen(true),
            !user ? 'Reading challenge — sign in to track progress'
              : goalMet ? `Reading challenge complete — ${todayCount} stories today`
              : `Reading challenge — ${todayCount} of ${dailyGoal} stories today`,
            { width: 62 },
          )}
        </div>
      </nav>

      {/* Challenge bottom sheet */}
      <div onClick={() => setSheetOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', opacity: sheetOpen ? 1 : 0, pointerEvents: sheetOpen ? 'auto' : 'none', transition: 'opacity 0.3s' }} />
      <div style={{
        position: 'fixed', left: '50%', bottom: 0, zIndex: 301,
        width: '100%', maxWidth: 560, transform: `translateX(-50%) translateY(${sheetOpen ? '0' : '100%'})`,
        transition: 'transform 0.34s cubic-bezier(0.32,0.72,0,1)',
        background: '#fff', borderRadius: '20px 20px 0 0',
        maxHeight: '85dvh', overflowY: 'auto', overscrollBehavior: 'contain',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ padding: '10px 18px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)' }} />
          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reading Challenge</span>
          <button onClick={() => setSheetOpen(false)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#f5f5f7', border: 'none', color: '#8a8a9a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: '4px 0 18px' }}>
          <ProgressPill challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} style={{ margin: '0 16px', width: 'calc(100% - 32px)' }} />
        </div>
      </div>
    </>
  );
}
