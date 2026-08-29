import React, { useState, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Sparkles, Repeat,
  ChevronLeft, ChevronRight, ChevronDown, Headphones, Flame, Newspaper,
  LayoutList, GalleryVerticalEnd, Sun, Moon, ArrowRight, Clock, TrendingUp, SlidersHorizontal, Check,
  UserCircle, ArrowDownUp,
} from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_SHORT } from '../theme';
import CategoryIcon from './CategoryIcon';
import Logo from './Logo';

export const ONBOARDING_KEY = 'rundown_onboarding_seen';

/* ── award icons (mirrors ProgressPill) ──────────────── */
const LightbulbIcon = ({ size = 13, color }) => (
  <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 16 19" fill="none">
    <path d="M8 1a5.5 5.5 0 00-3.8 9.4c.5.5.8 1.2.8 1.9V14h6v-1.7c0-.7.3-1.4.8-1.9A5.5 5.5 0 008 1z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    <line x1="5.5" y1="15.5" x2="10.5" y2="15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6.5" y1="17.5" x2="9.5" y2="17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const LightningIcon = ({ size = 11, color }) => (
  <svg width={size} height={Math.round(size * 1.4)} viewBox="0 0 13 18" fill="none">
    <path d="M8.5 1.5L3 10h5.5l-2 6.5L13 8H7.5z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
  </svg>
);
const StarBadgeIcon = ({ size = 12, color }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <path d="M9 2l1.8 4.5H16l-4 2.9 1.5 4.6L9 11.5l-4.5 2.5L6 9.4 2 6.5h5.2z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" fill="none" />
  </svg>
);

/* ── skeleton atoms ──────────────────────────────────── */
const Skel = ({ w = '100%', h = 8, r = 5, c = '#e7e9ef', style }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: c, flexShrink: 0, ...style }} />
);
const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(20,10,40,0.22)', color: '#0a0a0f', ...style }}>{children}</div>
);

const ReadBadge = ({ kind }) => {
  if (kind === 'new') return <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.06em', background: '#7c3aed', color: '#fff', textTransform: 'uppercase' }}>New</span>;
  if (kind === 'updated') return <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.06em', background: '#f59e0b', color: '#fff', textTransform: 'uppercase' }}>Updated</span>;
  if (kind === 'read') return <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#22c55e' }}>✓ Read</span>;
  return <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#9ca3af' }}>Unread</span>;
};

/* ── 1. Welcome + a (deliberately silly) taste of what a takeaway looks like ── */
function TakeawaysMock() {
  const color = CATEGORY_COLORS['World News'];
  const jokes = [
    'Man discovers coffee machine is broken. Nation holds its breath.',
    'Local raccoon "cautiously optimistic" after landslide mayoral win.',
    'Scientists confirm Mondays remain undefeated.',
  ];
  return (
    <div style={{ width: 288 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 0 12px' }}>
        <Logo size={20} color="#fff" />
        <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em', color: '#fff' }}>RadioNews</span>
      </div>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          <CategoryIcon category="World News" size={11} color={color} /> Takeaways (a demo)
        </div>
        <div style={{ fontSize: '1.0rem', fontWeight: 800, lineHeight: 1.3, marginBottom: 12, color: '#0a0a0f' }}>
          Everything, everywhere — boiled down to three lines
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {jokes.map((j, i) => (
            <div key={i} className="ob-bullet-in" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', animationDelay: `${i * 0.45 + 0.15}s` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5 }}>{j}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── 2. My News — pick the topics that actually matter to you ── */
function CustomizeMock() {
  const cats = ['World News', 'Technology', 'Business', 'Sports', 'Science', 'Culture'];
  const alwaysOn = new Set(['World News', 'Technology']);
  return (
    <div style={{ width: 272, background: '#f1f2f6', borderRadius: 22, padding: 16, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0a0a0f', marginBottom: 3 }}>My News</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', marginBottom: 13 }}>Pick the topics you actually care about</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {cats.map(c => {
          const color = CATEGORY_COLORS[c] || '#6366f1';
          const forcedOn = alwaysOn.has(c);
          const toggling = c === 'Sports';
          return (
            <span key={c} className={toggling ? 'ob-toggle-chip' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999,
                border: `1.4px solid ${forcedOn ? color : 'rgba(0,0,0,0.12)'}`,
                background: forcedOn ? `${color}18` : '#fff',
                color: forcedOn ? color : '#9ca3af',
                fontSize: 10.5, fontWeight: 700,
              }}>
              <CategoryIcon category={c} size={11} color={forcedOn || toggling ? 'currentColor' : '#9ca3af'} />
              {CATEGORY_SHORT[c] || c}
              {forcedOn && <Check size={10} color={color} />}
              {toggling && <Check size={10} color="currentColor" className="ob-check-pop" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── 3. Category recap — the "catch up faster" entry point ── */
function RecapEntryMock() {
  const cats = ['World', 'Tech', 'Business'];
  return (
    <div style={{ width: 282, background: '#f1f2f6', borderRadius: 22, padding: 12, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 11 }}>
        {cats.map((c, i) => (
          <span key={c} style={{ fontSize: 9, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#fff' : '#9ca3af', background: i === 0 ? '#0a0a0f' : 'transparent', borderRadius: 7, padding: '5px 9px' }}>{c}</span>
        ))}
      </div>
      <div className="ob-recap-glow" style={{ background: '#fff', borderRadius: 14, padding: '11px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Newspaper size={14} color="#6366f1" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0a0a0f' }}>World Category recap</div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, marginTop: 1 }}>60 sec · every story, one paragraph</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <span style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 7, fontSize: 10, fontWeight: 700, color: '#6366f1', border: '1.4px solid #6366f1' }}>Read</span>
          <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0', borderRadius: 7, fontSize: 10, fontWeight: 700, color: '#fff', background: '#6366f1' }}>
            <Play size={9} color="#fff" fill="#fff" /> Listen
          </span>
        </div>
      </div>
      {/* what the recap is standing in for */}
      <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.4 }}>
        <Skel w="88%" h={7} />
        <Skel w="66%" h={7} />
      </div>
    </div>
  );
}

/* ── 4. The player — narrates the day like a podcast ── */
function PlayerMock() {
  const cat = 'World News';
  const color = CATEGORY_COLORS[cat];
  const dots = [1, 1, 0, 0, 0, 0, 0, 0];
  return (
    <div style={{ width: 252, background: '#09090f', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 60px rgba(20,10,40,0.35)' }}>
      <div style={{ position: 'relative', height: 132, background: `linear-gradient(155deg, ${color} 0%, #312e81 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 40%, #09090f)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 12px 0' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronDown size={15} color="#fff" />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>All News</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginTop: 1 }}>World News · 1 of 10</div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 44, left: 12, right: 12, display: 'flex', gap: 3 }}>
          {dots.map((d, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i === 1 ? '#fff' : d ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
          <Skel w="95%" h={9} c="rgba(255,255,255,0.92)" style={{ marginBottom: 5 }} />
          <Skel w="60%" h={9} c="rgba(255,255,255,0.92)" />
        </div>
      </div>
      <div style={{ padding: '10px 14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: 3, width: 'fit-content', margin: '0 auto 12px' }}>
          {['Headlines', 'Summary'].map((t, i) => (
            <span key={t} style={{ padding: '3px 11px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: i === 1 ? color : 'transparent', color: i === 1 ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t}</span>
          ))}
        </div>
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.12)', marginBottom: 14, overflow: 'hidden' }}>
          <div className="ob-progress" style={{ width: '38%', height: '100%', background: color, borderRadius: 99 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, marginBottom: 12 }}>
          <SkipBack size={18} color="rgba(255,255,255,0.6)" />
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${color}80` }}>
            <Pause size={20} color="#fff" fill="#fff" />
          </div>
          <SkipForward size={18} color="rgba(255,255,255,0.6)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>1×</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>
            <Sparkles size={12} color="rgba(255,255,255,0.6)" /> Interesting
          </span>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Repeat size={14} color="rgba(255,255,255,0.6)" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── 5. Morning generation, evening update — full-day coverage ── */
function FullDayMock() {
  const color = CATEGORY_COLORS['World News'];
  const pill = (Icon, label, cls) => (
    <span className={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
      <Icon size={12} color="currentColor" /> {label}
    </span>
  );
  return (
    <div style={{ width: 272, background: '#f1f2f6', borderRadius: 22, padding: 14, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
        {pill(Sun, 'Morning', 'ob-chip2-a')}
        {pill(Moon, 'Evening', 'ob-chip2-b')}
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, minHeight: 15 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <CategoryIcon category="World News" size={11} color={color} /> World
          </span>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span className="ob-show2-a" style={{ position: 'relative' }}><ReadBadge kind="unread" /></span>
            <span className="ob-show2-b" style={{ position: 'absolute', top: 0, right: 0 }}><ReadBadge kind="updated" /></span>
          </span>
        </div>
        <Skel w="92%" h={8} style={{ marginBottom: 6 }} />
        <Skel w="70%" h={8} style={{ marginBottom: 8 }} />
        <div className="ob-bullet-slide" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
          <Skel w="58%" h={7} c="#eef0f4" />
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>
        <span className="ob-show2-a" style={{ position: 'relative' }}>fresh at sunrise</span>
        <span className="ob-show2-b" style={{ position: 'absolute' }}>folded in by nightfall</span>
      </div>
    </div>
  );
}

/* ── 6. Scroll, swipe, or listen — the real control is the bottom dock
       (Settings · Swipe · Scroll · Listen · Challenge), not a top-right toggle.
       Three scenes crossfade in the frame above it, one per mode, in step with the
       dock cell that lights up — so the picture always matches the highlighted mode.
       Crossfading whole scenes (rather than animating one set of cards through all
       three states) also means each scene's own loop resets while it's invisible. ── */
function ModesMock() {
  const color = CATEGORY_COLORS['World News'];
  const cardFace = (faded) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: 11 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.58rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <CategoryIcon category="World News" size={10} color={color} /> World
      </span>
      <div style={{ marginTop: 8 }}>
        <Skel w="94%" h={7} style={{ marginBottom: 5 }} />
        <Skel w={faded ? '58%' : '76%'} h={7} style={{ marginBottom: 9 }} />
        <Skel w="88%" h={5} c="#eef0f4" style={{ marginBottom: 4 }} />
        <Skel w="66%" h={5} c="#eef0f4" />
      </div>
    </div>
  );
  const listRow = (w) => (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.07)', padding: 9, marginBottom: 7 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.52rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <CategoryIcon category="World News" size={8} color={color} /> World
      </span>
      <div style={{ marginTop: 6 }}>
        <Skel w="92%" h={6} style={{ marginBottom: 4 }} />
        <Skel w={w} h={6} />
      </div>
    </div>
  );
  // Mirrors BottomNav: icon over label, active cell tinted indigo, dividers around the trio.
  const dockCell = (Icon, label, cls) => (
    <span className={cls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '3px 0 2px', borderRadius: 6, width: 40 }}>
      <Icon size={13} strokeWidth={1.9} color="currentColor" />
      <span style={{ fontSize: 6.5, fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
    </span>
  );
  const divider = <span aria-hidden style={{ width: 1, alignSelf: 'stretch', background: 'rgba(0,0,0,0.10)', margin: '2px 3px', flexShrink: 0 }} />;
  const scene = { position: 'absolute', inset: 0 };
  return (
    <div style={{ width: 250, background: '#f1f2f6', borderRadius: 22, padding: 11, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      <div style={{ display: 'flex', gap: 5, padding: '2px 2px 10px' }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', background: '#0a0a0f', borderRadius: 5, padding: '3px 7px' }}>World</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af', padding: '3px 4px' }}>Tech</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af', padding: '3px 4px' }}>Business</span>
      </div>

      <div style={{ position: 'relative', height: 122, overflow: 'hidden' }}>
        {/* Swipe — one story at a time, the front card flying up as the next rises */}
        <div className="ob-show3-a" style={scene}>
          <div className="ob-card-in" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{cardFace(false)}</div>
          <div className="ob-card-out" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{cardFace(true)}</div>
          <div className="ob-thumb" style={{ position: 'absolute', right: 14, bottom: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(10,10,20,0.55)', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 12px rgba(0,0,0,0.28)' }} />
        </div>

        {/* Scroll — the same stories as a list, drifting under the thumb */}
        <div className="ob-show3-b" style={scene}>
          <div className="ob-scroll-drift">
            {listRow('64%')}{listRow('78%')}{listRow('58%')}
          </div>
        </div>

        {/* Listen — the story with the player docked over it */}
        <div className="ob-show3-c" style={scene}>
          {cardFace(false)}
          <div style={{ position: 'absolute', left: 4, right: 4, bottom: 4, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(10,10,20,0.88)', borderRadius: 10, padding: '7px 9px' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={9} color="#fff" fill="#fff" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, flex: 1 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} className="ob-eq" style={{ width: 3, height: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.85)', animationDelay: `${i * 0.11}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The dock itself — white pill on the page background, same as BottomNav */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 11 }}>
        <div style={{ display: 'inline-flex', alignItems: 'stretch', background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 11, padding: 4 }}>
          {dockCell(UserCircle, 'Settings', 'ob-dock-idle')}
          {divider}
          {dockCell(GalleryVerticalEnd, 'Swipe', 'ob-dock-a')}
          {dockCell(LayoutList, 'Scroll', 'ob-dock-b')}
          {dockCell(Headphones, 'Listen', 'ob-dock-c')}
          {divider}
          {dockCell(Flame, 'Challenge', 'ob-dock-idle')}
        </div>
      </div>
    </div>
  );
}

/* ── 7. Latest, Popular, or Interesting — the real LensToggle is a right-aligned
       dropdown above the list, not a pill row. Shown open, with the highlight
       cycling through the three options. ── */
function FilterMock() {
  const color = CATEGORY_COLORS['Politics'];
  const row = (label, cls) => (
    <div className={cls} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 9px', borderRadius: 8, fontSize: 10 }}>
      {label}
      <Check size={11} className={`${cls}-check`} />
    </div>
  );
  return (
    <div style={{ width: 272, background: '#f1f2f6', borderRadius: 22, padding: 14, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      {/* The trigger, right-aligned — ArrowDownUp + current label + chevron */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, color: '#6b7280' }}>
          <ArrowDownUp size={11} />
          <span style={{ position: 'relative', display: 'inline-block', minWidth: 54, textAlign: 'left' }}>
            <span className="ob-show3-a" style={{ position: 'relative' }}>Latest</span>
            <span className="ob-show3-b" style={{ position: 'absolute', left: 0, top: 0 }}>Popular</span>
            <span className="ob-show3-c" style={{ position: 'absolute', left: 0, top: 0 }}>Interesting</span>
          </span>
          <ChevronDown size={10} />
        </span>
      </div>
      {/* The open menu, right-aligned under it */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{ width: 132, background: '#fff', borderRadius: 11, boxShadow: '0 12px 36px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.08)', padding: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {row('Latest', 'ob-lens-a')}
          {row('Popular', 'ob-lens-b')}
          {row('Interesting', 'ob-lens-c')}
        </div>
      </div>
      {/* The story underneath, its meta line changing with the chosen lens */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, minHeight: 15 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <CategoryIcon category="Politics" size={11} color={color} /> Politics
          </span>
          <span style={{ position: 'relative', display: 'inline-block', fontSize: 9.5, fontWeight: 700 }}>
            <span className="ob-show3-a" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3, color: '#9ca3af' }}><Clock size={10} /> 2m ago</span>
            <span className="ob-show3-b" style={{ position: 'absolute', top: 0, right: 0, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', color: '#6b7280' }}><TrendingUp size={10} /> 3.2k readers</span>
            <span className="ob-show3-c" style={{ position: 'absolute', top: 0, right: 0, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', color: '#7c3aed' }}><Sparkles size={10} /> Interesting</span>
          </span>
        </div>
        <Skel w="92%" h={8} style={{ marginBottom: 6 }} />
        <Skel w="70%" h={8} />
      </div>
    </div>
  );
}

/* ── 8. The challenge — mirrors the real ProgressPill card: white, one row per
       award (ring + name + what it takes), then the week strip underneath. ── */
const AWARD_COLORS = { informed: '#a5b4fc', sharp: '#6366f1', savvy: '#db2777' };

function MiniRing({ size = 54, strokeW = 4, pct, count, total, caption, color }) {
  const r = (size - strokeW) / 2, circ = 2 * Math.PI * r, dash = circ * Math.min(1, pct);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth={strokeW} />
        {dash > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />}
      </svg>
      {/* Caption wraps inside the ring rather than spilling past it — same as the real
          MiniRing, which pads it in and lets "stories today" break over two lines. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '0 7px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, lineHeight: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#0a0a0f' }}>{count}</span>
          <span style={{ fontSize: 6.5, fontWeight: 500, color: '#9ca3af' }}>/</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#0a0a0f' }}>{total}</span>
        </div>
        <span style={{ fontSize: 5.5, fontWeight: 700, color: '#9ca3af', textAlign: 'center', lineHeight: 1.15 }}>{caption}</span>
      </div>
    </div>
  );
}

function ChallengeRow({ pct, count, total, caption, title, color, Icon, earned, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <MiniRing pct={pct} count={count} total={total} caption={caption} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <span style={{ width: 14, height: 14, borderRadius: 5, background: `${color}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={8} color={color} />
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: earned ? color : '#0a0a0f' }}>{title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 9, color: '#8a8a9a', lineHeight: 1.4 }}>{description}</p>
      </div>
    </div>
  );
}

function ChallengeMock() {
  const week = [
    { d: 'M', met: true }, { d: 'T', met: true }, { d: 'W', met: true },
    { d: 'T', met: true }, { d: 'F', met: false, today: true }, { d: 'S', met: false }, { d: 'S', met: false },
  ];
  return (
    <div style={{ width: 288, background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 18, boxShadow: '0 24px 60px rgba(20,10,40,0.22)', overflow: 'hidden' }}>
      <div style={{ padding: '13px 14px 11px' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#6b7280', lineHeight: 1.5 }}>
          You achieved <span style={{ color: AWARD_COLORS.sharp, fontWeight: 800 }}>Sharp</span>, hit your goal 2 more days this week to become <span style={{ color: AWARD_COLORS.savvy, fontWeight: 800 }}>Savvy</span>
        </p>
      </div>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(10,10,15,0.08), transparent)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '13px 14px' }}>
        <ChallengeRow pct={1} count={10} total={10} caption="stories today" title="Informed" color={AWARD_COLORS.informed} Icon={LightbulbIcon} earned description="Read your daily goal in a single day." />
        <ChallengeRow pct={1} count={3} total={3} caption="day streak" title="Sharp" color={AWARD_COLORS.sharp} Icon={LightningIcon} earned description="Hit that daily goal three days in a row." />
        <ChallengeRow pct={0.66} count={4} total={6} caption="days this week" title="Savvy" color={AWARD_COLORS.savvy} Icon={StarBadgeIcon} description="Hit the goal 6 days this week — the 7th is your detox day." />
      </div>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(10,10,15,0.08), transparent)' }} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
          <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>This week</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af' }}>goal 10/day</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {week.map((d, i) => {
            const R = 11, S = 26, C = 2 * Math.PI * R;
            const col = d.met ? AWARD_COLORS.sharp : d.today ? '#6366f1' : '#b6bac4';
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ position: 'relative', width: S, height: S }}>
                  <svg width={S} height={S} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke="#eef0f4" strokeWidth={3} />
                    {d.met && <circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke={col} strokeWidth={3} strokeDasharray={`${C} ${C}`} strokeLinecap="round" />}
                  </svg>
                  {d.met && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={10} color={col} strokeWidth={3} /></div>}
                </div>
                <span style={{ fontSize: 7.5, fontWeight: d.today ? 800 : 600, color: d.today ? '#6366f1' : '#9ca3af' }}>{d.d}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── slides: funky title (mixed weight) + flat trailing icon + mock ── */
const reg = { fontWeight: 400 };
const semi = { fontWeight: 600 };
const heavy = { fontWeight: 900 };
const TitleIcon = ({ Icon }) => <Icon size={26} color="#fff" strokeWidth={2.4} style={{ verticalAlign: '-5px', marginLeft: 8 }} />;
const LogoTitle = () => <span style={{ display: 'inline-flex', verticalAlign: '-5px', marginLeft: 8 }}><Logo size={26} color="#fff" /></span>;
const DayNightTitleIcon = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: '-5px', marginLeft: 8 }}>
    <Sun size={19} color="#fff" strokeWidth={2.4} />
    <ArrowRight size={13} color="rgba(255,255,255,0.6)" />
    <Moon size={17} color="#fff" strokeWidth={2.4} fill="#fff" />
  </span>
);
const ModesTitleIcon = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: '-5px', marginLeft: 8 }}>
    <LayoutList size={17} color="#fff" strokeWidth={2.2} />
    <GalleryVerticalEnd size={17} color="#fff" strokeWidth={2.2} />
    <Headphones size={17} color="#fff" strokeWidth={2.2} />
  </span>
);

const SLIDES = [
  {
    Mock: TakeawaysMock,
    title: <><span style={semi}>The news,</span> <span style={heavy}>minus the noise</span></>,
    body: 'Every story lands as a headline and a few sharp takeaways — not a wall of text. (These particular takeaways are made up. The real ones are, we promise, less unhinged.)',
  },
  {
    Mock: CustomizeMock,
    title: <><span style={reg}>Make it</span> <span style={heavy}>yours</span><TitleIcon Icon={SlidersHorizontal} /></>,
    body: 'Pick the topics you actually want — a personal feed of just the categories that matter to you, nothing else in the way.',
  },
  {
    Mock: RecapEntryMock,
    title: <><span style={reg}>Too busy to scroll?</span> <span style={heavy}>One recap catches you up</span><TitleIcon Icon={Newspaper} /></>,
    body: 'Every category gets a 60‑second recap — tap Read or Listen and you’re caught up without opening a single story.',
  },
  {
    Mock: PlayerMock,
    title: <><span style={heavy}>Or just</span> <span style={reg}>press</span> <span style={heavy}>play</span><TitleIcon Icon={Headphones} /></>,
    body: 'Every story is narrated. Press play and let the news come to you — hands‑free, on the commute, at the gym, wherever.',
  },
  {
    Mock: FullDayMock,
    title: <><span style={heavy}>Morning</span> <span style={reg}>news,</span> <span style={heavy}>evening</span> <span style={reg}>updates</span><DayNightTitleIcon /></>,
    body: 'We publish fresh stories every morning, then fold in what’s changed by evening — so you’re never stuck reading yesterday’s version of today.',
  },
  {
    Mock: ModesMock,
    title: <><span style={heavy}>Scroll</span><span style={reg}>,</span> <span style={heavy}>swipe</span><span style={reg}>, or</span> <span style={heavy}>listen</span><ModesTitleIcon /></>,
    body: 'Read the day like a list, swipe through it one story at a time, or let it play like a podcast — same news, however you like it.',
  },
  {
    Mock: FilterMock,
    title: <><span style={heavy}>Latest</span><span style={reg}>,</span> <span style={heavy}>Popular</span><span style={reg}>, or</span> <span style={heavy}>Interesting</span><TitleIcon Icon={SlidersHorizontal} /></>,
    body: 'Sort by what just happened, what everyone’s reading, or what readers flagged as worth a second look.',
  },
  {
    Mock: ChallengeMock,
    title: <><span style={reg}>Read</span> <span style={heavy}>6 days</span><span style={reg}>, earn</span> <span style={heavy}>Savvy</span><TitleIcon Icon={Flame} /></>,
    body: 'Hit your daily goal six days a week and you’ll earn Savvy status. Day seven is yours — even we think a digital detox day is healthy.',
  },
];

export default function OnboardingTour({ onClose }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Mock = slide.Mock;

  const goNext = () => { if (isLast) onClose(); else setIndex(i => Math.min(i + 1, SLIDES.length - 1)); };
  const goPrev = () => setIndex(i => Math.max(i - 1, 0));

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -45 && !isLast) setIndex(i => i + 1);
    else if (dx > 45 && index > 0) setIndex(i => i - 1);
    touchStartX.current = null;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'linear-gradient(160deg, #4f46e5 0%, #7c3aed 46%, #ec4899 100%)',
        display: 'flex', flexDirection: 'column', color: 'white',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        @keyframes obIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        /* Modes mock — demonstrates the swipe: the front card rises away while the next
           one comes up from below, then it repeats. */
        @keyframes obCardOut  { 0%,18% { transform: translateY(0); opacity: 1; }
                                46%,100% { transform: translateY(-64px); opacity: 0; } }
        @keyframes obCardIn   { 0%,18% { transform: translateY(58px) scale(0.94); opacity: 0.45; }
                                46%,100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes obThumb    { 0%,10% { transform: translateY(16px); opacity: 0; }
                                22% { opacity: 0.95; }
                                46% { transform: translateY(-18px); opacity: 0.95; }
                                58%,100% { transform: translateY(-18px); opacity: 0; } }
        /* generic bits */
        @keyframes obProgress { from { width: 12%; } to { width: 86%; } }
        @keyframes obEq       { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        @keyframes obPulse    { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
        .ob-card-out { animation: obCardOut 3.4s ease-in-out infinite; }
        .ob-card-in  { animation: obCardIn  3.4s ease-in-out infinite; }
        .ob-thumb    { animation: obThumb   3.4s ease-in-out infinite; }
        .ob-progress { animation: obProgress 6s ease-in-out infinite alternate; }
        .ob-eq       { animation: obEq 0.9s ease-in-out infinite; transform-origin: bottom; }

        /* Takeaways — bullets type themselves out, once, on arrival */
        @keyframes obBulletFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .ob-bullet-in { animation: obBulletFadeUp 0.5s ease-out both; }

        /* Category recap — a soft pulse around the entry point, like a tap hint */
        @keyframes obGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.35); } 50% { box-shadow: 0 0 0 8px rgba(99,102,241,0); } }
        .ob-recap-glow { animation: obGlow 2.2s ease-in-out infinite; }

        /* My News — one chip switches itself on, to show it's a tap, not a wall of text */
        @keyframes obToggleChip { 0%,20% { border-color: rgba(0,0,0,0.12); background: #fff; color: #9ca3af; } 35%,100% { border-color: #16a34a; background: rgba(22,163,74,0.1); color: #16a34a; } }
        @keyframes obCheckPop   { 0%,20% { opacity: 0; transform: scale(0.4); } 35%,100% { opacity: 1; transform: scale(1); } }
        .ob-toggle-chip { animation: obToggleChip 3.2s ease-in-out infinite; }
        .ob-check-pop   { animation: obCheckPop 3.2s ease-in-out infinite; }

        /* Two-phase loop (morning / evening) — shared by the day-pill toggle, the
           story's Unread→Updated badge, and its caption. */
        @keyframes obChip2A  { 0%,42% { background: #0a0a0f; color: #fff; } 50%,100% { background: transparent; color: #9ca3af; } }
        @keyframes obChip2B  { 0%,42% { background: transparent; color: #9ca3af; } 50%,100% { background: #0a0a0f; color: #fff; } }
        @keyframes obShow2A  { 0%,42% { opacity: 1; } 50%,100% { opacity: 0; } }
        @keyframes obShow2B  { 0%,42% { opacity: 0; } 50%,100% { opacity: 1; } }
        @keyframes obBulletSlide { 0%,42% { opacity: 0; transform: translateY(4px); } 50%,100% { opacity: 1; transform: translateY(0); } }
        .ob-chip2-a  { animation: obChip2A 5s ease-in-out infinite; }
        .ob-chip2-b  { animation: obChip2B 5s ease-in-out infinite; }
        .ob-show2-a  { animation: obShow2A 5s ease-in-out infinite; }
        .ob-show2-b  { animation: obShow2B 5s ease-in-out infinite; }
        .ob-bullet-slide { animation: obBulletSlide 5s ease-in-out infinite; }

        /* Three-phase loop (used by both Modes' Scroll/Swipe/Listen toggle and the
           Latest/Popular/Interesting filter pills) — same three windows, reused. */
        @keyframes obShow3A  { 0%,26% { opacity: 1; } 30%,100% { opacity: 0; } }
        @keyframes obShow3B  { 0%,30% { opacity: 0; } 33%,59% { opacity: 1; } 63%,100% { opacity: 0; } }
        @keyframes obShow3C  { 0%,63% { opacity: 0; } 66%,92% { opacity: 1; } 96%,100% { opacity: 0; } }
        .ob-show3-a  { animation: obShow3A 6.5s ease-in-out infinite; }
        .ob-show3-b  { animation: obShow3B 6.5s ease-in-out infinite; }
        .ob-show3-c  { animation: obShow3C 6.5s ease-in-out infinite; }

        /* The bottom dock's selected cell — BottomNav's own light-theme colours
           (activeBg rgba(99,102,241,0.12) on activeFg #6366f1, idle #9ca3af). */
        @keyframes obDockA { 0%,26% { background: rgba(99,102,241,0.12); color: #6366f1; } 30%,100% { background: transparent; color: #9ca3af; } }
        @keyframes obDockB { 0%,30% { background: transparent; color: #9ca3af; } 33%,59% { background: rgba(99,102,241,0.12); color: #6366f1; } 63%,100% { background: transparent; color: #9ca3af; } }
        @keyframes obDockC { 0%,63% { background: transparent; color: #9ca3af; } 66%,92% { background: rgba(99,102,241,0.12); color: #6366f1; } 96%,100% { background: transparent; color: #9ca3af; } }
        .ob-dock-idle { color: #9ca3af; }
        .ob-dock-a { animation: obDockA 6.5s ease-in-out infinite; }
        .ob-dock-b { animation: obDockB 6.5s ease-in-out infinite; }
        .ob-dock-c { animation: obDockC 6.5s ease-in-out infinite; }
        /* Scroll scene — the list drifting under the thumb */
        @keyframes obScrollDrift { from { transform: translateY(0); } to { transform: translateY(-24px); } }
        .ob-scroll-drift { animation: obScrollDrift 3.2s ease-in-out infinite alternate; }

        /* The open lens menu — LensToggle's own selected row styling */
        @keyframes obLensA { 0%,26% { background: rgba(99,102,241,0.10); color: #6366f1; font-weight: 800; } 30%,100% { background: transparent; color: #374151; font-weight: 500; } }
        @keyframes obLensB { 0%,30% { background: transparent; color: #374151; font-weight: 500; } 33%,59% { background: rgba(99,102,241,0.10); color: #6366f1; font-weight: 800; } 63%,100% { background: transparent; color: #374151; font-weight: 500; } }
        @keyframes obLensC { 0%,63% { background: transparent; color: #374151; font-weight: 500; } 66%,92% { background: rgba(99,102,241,0.10); color: #6366f1; font-weight: 800; } 96%,100% { background: transparent; color: #374151; font-weight: 500; } }
        .ob-lens-a { animation: obLensA 6.5s ease-in-out infinite; }
        .ob-lens-b { animation: obLensB 6.5s ease-in-out infinite; }
        .ob-lens-c { animation: obLensC 6.5s ease-in-out infinite; }
        /* Each row's tick shares the phase window of its row */
        .ob-lens-a-check { animation: obShow3A 6.5s ease-in-out infinite; }
        .ob-lens-b-check { animation: obShow3B 6.5s ease-in-out infinite; }
        .ob-lens-c-check { animation: obShow3C 6.5s ease-in-out infinite; }

        /* Reduced motion: every loop stops on its first phase, so each mock still reads
           as one coherent still frame rather than a half-finished transition. */
        @media (prefers-reduced-motion: reduce) {
          .ob-card-out, .ob-card-in, .ob-thumb, .ob-progress, .ob-eq, .ob-scroll-drift,
          .ob-chip2-a, .ob-chip2-b, .ob-show2-a, .ob-show2-b, .ob-bullet-slide,
          .ob-show3-a, .ob-show3-b, .ob-show3-c,
          .ob-dock-a, .ob-dock-b, .ob-dock-c,
          .ob-lens-a, .ob-lens-b, .ob-lens-c,
          .ob-lens-a-check, .ob-lens-b-check, .ob-lens-c-check,
          .ob-recap-glow, .ob-toggle-chip, .ob-check-pop { animation: none !important; }
          .ob-card-in, .ob-show2-a, .ob-show3-a { opacity: 1 !important; transform: none !important; }
          .ob-card-out, .ob-show2-b, .ob-show3-b, .ob-show3-c { opacity: 0 !important; }
          .ob-toggle-chip { border-color: #16a34a !important; background: rgba(22,163,74,0.1) !important; color: #16a34a !important; }
          .ob-check-pop { opacity: 1 !important; transform: none !important; }
          .ob-chip2-a { background: #0a0a0f !important; color: #fff !important; }
          .ob-chip2-b { background: transparent !important; color: #9ca3af !important; }
          /* Phase-one cells stay selected; the rest stay idle */
          .ob-dock-a { background: rgba(99,102,241,0.12) !important; color: #6366f1 !important; }
          .ob-dock-b, .ob-dock-c { background: transparent !important; color: #9ca3af !important; }
          .ob-lens-a { background: rgba(99,102,241,0.10) !important; color: #6366f1 !important; font-weight: 800 !important; }
          .ob-lens-b, .ob-lens-c { background: transparent !important; color: #374151 !important; font-weight: 500 !important; }
          .ob-lens-a-check { opacity: 1 !important; }
          .ob-lens-b-check, .ob-lens-c-check { opacity: 0 !important; }
        }
      `}</style>

      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem 0' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', padding: '0.4rem 0.5rem' }}>Skip</button>
      </div>

      {/* Mock stage */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 1.5rem', minHeight: 0 }}>
        <div key={index} style={{ animation: 'obIn 0.4s cubic-bezier(0.2,0.8,0.2,1)' }}>
          <Mock />
        </div>
      </div>

      {/* Funky title + body */}
      <div style={{ textAlign: 'center', padding: '0 1.75rem 0.25rem' }}>
        <h2 style={{ margin: '0 0 0.7rem', fontSize: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {slide.title}
        </h2>
        <p style={{ margin: '0 auto', fontSize: '0.96rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.9)', maxWidth: 340 }}>
          {slide.body}
        </p>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1.25rem 0 1.3rem', flexWrap: 'wrap' }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`}
            style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', background: i === index ? 'white' : 'rgba(255,255,255,0.4)', transition: 'width 0.25s ease, background 0.25s ease', padding: 0 }} />
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1.5rem' }}>
        <button onClick={goPrev} disabled={index === 0}
          style={{ width: 52, height: 52, flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>
          <ChevronLeft size={24} color="white" />
        </button>
        <button onClick={goNext}
          style={{ flex: 1, height: 52, borderRadius: '999px', background: 'white', color: '#5b21b6', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {isLast ? 'Get Started' : 'Next'}
          {!isLast && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}
