import React, { useState, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Sparkles, Repeat,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Headphones, Flame, Newspaper,
  LayoutList, GalleryVerticalEnd,
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

/* a faithful mini version of StoryCard */
function MiniStoryCard({ category, badge, faded, accentBtns = true }) {
  const color = CATEGORY_COLORS[category] || '#6366f1';
  const short = CATEGORY_SHORT[category] || category;
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', padding: '12px 12px', opacity: faded ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <CategoryIcon category={category} size={11} color={color} /> {short}
        </span>
        {badge}
      </div>
      <Skel w="92%" h={8} style={{ marginBottom: 6 }} />
      <Skel w="70%" h={8} style={{ marginBottom: 11 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Skel w={42} h={6} c="#eef0f4" style={{ flex: 1 }} />
        <span style={{ padding: '4px 11px', borderRadius: 7, fontSize: '0.6rem', fontWeight: 700, color, border: `1.4px solid ${accentBtns ? color : '#d6d9e0'}` }}>Summary</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 11px', borderRadius: 7, fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: color }}>
          <Play size={9} color="#fff" fill="#fff" /> Listen
        </span>
      </div>
    </div>
  );
}

const ReadBadge = ({ kind }) => {
  if (kind === 'new') return <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.06em', background: '#7c3aed', color: '#fff', textTransform: 'uppercase' }}>New</span>;
  if (kind === 'read') return <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#22c55e' }}>✓ Read</span>;
  return <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#9ca3af' }}>Unread</span>;
};

/* ── per-slide feature mocks ─────────────────────────── */
function FeedMock() {
  return (
    <div style={{ width: 286, background: '#f1f2f6', borderRadius: 24, padding: 12, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 0 12px' }}>
        <Logo size={20} color="#0a0a0f" />
        <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em', color: '#0a0a0f' }}>RadioNews</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <MiniStoryCard category="World News" badge={<ReadBadge kind="new" />} />
        <MiniStoryCard category="Technology" badge={<ReadBadge kind="unread" />} />
      </div>
    </div>
  );
}

function PlayerMock() {
  const cat = 'World News';
  const color = CATEGORY_COLORS[cat];
  const dots = [1, 1, 0, 0, 0, 0, 0, 0]; // 1 = past/current
  return (
    <div style={{ width: 252, background: '#09090f', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 60px rgba(20,10,40,0.35)' }}>
      {/* image header */}
      <div style={{ position: 'relative', height: 132, background: `linear-gradient(155deg, ${color} 0%, #312e81 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 40%, #09090f)' }} />
        {/* top bar */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 12px 0' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronDown size={15} color="#fff" />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 7.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>All News</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginTop: 1 }}>World News · 1 of 10</div>
          </div>
        </div>
        {/* segmented progress dots */}
        <div style={{ position: 'absolute', bottom: 44, left: 12, right: 12, display: 'flex', gap: 3 }}>
          {dots.map((d, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i === 1 ? '#fff' : d ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
        {/* headline over gradient */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
          <Skel w="95%" h={9} c="rgba(255,255,255,0.92)" style={{ marginBottom: 5 }} />
          <Skel w="60%" h={9} c="rgba(255,255,255,0.92)" />
        </div>
      </div>
      {/* body */}
      <div style={{ padding: '10px 14px 16px' }}>
        {/* depth toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: 3, width: 'fit-content', margin: '0 auto 12px' }}>
          {['Headlines', 'Summary'].map((t, i) => (
            <span key={t} style={{ padding: '3px 11px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: i === 1 ? color : 'transparent', color: i === 1 ? '#fff' : 'rgba(255,255,255,0.6)' }}>{t}</span>
          ))}
        </div>
        {/* progress bar */}
        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.12)', marginBottom: 14, overflow: 'hidden' }}>
          <div className="ob-progress" style={{ width: '38%', height: '100%', background: color, borderRadius: 99 }} />
        </div>
        {/* main controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, marginBottom: 12 }}>
          <SkipBack size={18} color="rgba(255,255,255,0.6)" />
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${color}80` }}>
            <Pause size={20} color="#fff" fill="#fff" />
          </div>
          <SkipForward size={18} color="rgba(255,255,255,0.6)" />
        </div>
        {/* secondary controls */}
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

function InterestingMock() {
  const color = CATEGORY_COLORS['Science'];
  return (
    <Card style={{ width: 272, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <CategoryIcon category="Science" size={11} color={color} /> Science
        </span>
        <ReadBadge kind="new" />
      </div>
      <Skel w="92%" h={8} style={{ marginBottom: 6 }} />
      <Skel w="68%" h={8} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 11, borderTop: '1px solid #f1f2f6' }}>
        <Skel w={42} h={6} c="#eef0f4" style={{ flex: 1 }} />
        <span style={{ padding: '5px 11px', borderRadius: 7, fontSize: '0.62rem', fontWeight: 700, color, border: `1.4px solid ${color}` }}>Summary</span>
        {/* active Interesting save */}
        <span className="ob-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.6)' }}>
          <Sparkles size={13} color="#7c3aed" fill="#7c3aed" /> Interesting
        </span>
      </div>
    </Card>
  );
}

function ChallengeRingMini({ pct, c0, c1, track, awardTitle, awardColor, Icon, count, total, label, earned, gid }) {
  const size = 62, strokeW = 5, r = (size - strokeW) / 2, circ = 2 * Math.PI * r, dash = circ * Math.min(1, pct);
  const arc0 = earned ? c0 : 'rgba(255,255,255,0.08)';
  const arc1 = earned ? c1 : 'rgba(255,255,255,0.2)';
  const titleColor = earned ? awardColor : 'rgba(255,255,255,0.25)';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon size={9} color={titleColor} />
        <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: titleColor }}>{awardTitle}</span>
      </div>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={arc0} /><stop offset="100%" stopColor={arc1} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={strokeW} />
          {dash > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={strokeW} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 6.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{count}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChallengeMock() {
  return (
    <div style={{ width: 290, background: 'linear-gradient(145deg, #0f0f1e, #181830)', borderRadius: 20, border: '1px solid rgba(205,127,50,0.30)', padding: '14px 8px', boxShadow: '0 24px 60px rgba(20,10,40,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ChallengeRingMini gid="ob-today" pct={1} earned c0="#7c3a1e" c1="#cd7f32" track="rgba(124,58,30,0.18)"
          awardTitle="Informed" awardColor="#cd7f32" Icon={LightbulbIcon} label="Today" count={10} total={10} />
        <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.07)' }} />
        <ChallengeRingMini gid="ob-streak" pct={0.66} c0="#2563eb" c1="#e2e8f0" track="rgba(37,99,235,0.15)"
          awardTitle="Sharp" awardColor="#94a3b8" Icon={LightningIcon} label="Streak" count={2} total={3} />
        <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.07)' }} />
        <ChallengeRingMini gid="ob-week" pct={0.66} c0="#92400e" c1="#ffd700" track="rgba(180,83,9,0.18)"
          awardTitle="Savvy" awardColor="#f59e0b" Icon={StarBadgeIcon} label="Week" count={4} total={6} />
      </div>
    </div>
  );
}

/* Scroll vs Swipe — a taller frame so the gesture maps onto a recognisable screen,
   with the front card rising away as the next one comes up behind it. */
function ModesMock() {
  const color = CATEGORY_COLORS['World News'];
  const chip = (active, Icon) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '5px 10px', borderRadius: 6,
      background: active ? '#0a0a0f' : 'transparent',
      color: active ? '#fff' : '#8a8a9a',
    }}>
      <Icon size={12} strokeWidth={active ? 2.4 : 1.9} />
    </span>
  );
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
  return (
    <div style={{ width: 250, background: '#f1f2f6', borderRadius: 22, padding: 11, boxShadow: '0 24px 60px rgba(20,10,40,0.22)' }}>
      {/* header: feed + day + the real mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 2px 9px' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.07)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#0a0a0f', letterSpacing: '-0.01em', lineHeight: 1.15 }}>All News</div>
          <div style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af' }}>Today</div>
        </div>
        <span style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.06)', borderRadius: 8, padding: 2, flexShrink: 0 }}>
          {chip(true, GalleryVerticalEnd)}
          {chip(false, LayoutList)}
        </span>
      </div>
      {/* category strip */}
      <div style={{ display: 'flex', gap: 5, padding: '0 2px 10px', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 9 }}>
        <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', background: '#0a0a0f', borderRadius: 5, padding: '3px 7px' }}>World</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af', padding: '3px 4px' }}>Tech</span>
        <span style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af', padding: '3px 4px' }}>Business</span>
      </div>
      {/* the moving stack */}
      <div style={{ position: 'relative', height: 128, overflow: 'hidden' }}>
        <div className="ob-card-in" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{cardFace(false)}</div>
        <div className="ob-card-out" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{cardFace(true)}</div>
        {/* thumb hint tracing the swipe */}
        <div className="ob-thumb" style={{ position: 'absolute', right: 14, bottom: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(10,10,20,0.55)', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 12px rgba(0,0,0,0.28)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 10, color: '#9ca3af', fontSize: 9, fontWeight: 600 }}>
        <ChevronUp size={11} /> swipe up for the next story
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

const SLIDES = [
  {
    Mock: FeedMock,
    title: <><span style={semi}>Welcome to</span> <span style={heavy}>RadioNews</span><LogoTitle /></>,
    body: 'The day’s news, boiled down. Every story gets a short summary — and every category gets a one‑minute recap, so you can be properly caught up in the time it takes to make coffee.',
  },
  {
    Mock: PlayerMock,
    title: <><span style={heavy}>Listen</span> <span style={reg}>like a</span> <span style={semi}>podcast</span><TitleIcon Icon={Headphones} /></>,
    body: 'Press play and let the news come to you. Every summary is narrated, so you can catch up on the commute, at the gym, or while making dinner.',
  },
  {
    Mock: ModesMock,
    title: <><span style={reg}>Skim by</span> <span style={heavy}>scroll or swipe</span><TitleIcon Icon={GalleryVerticalEnd} /></>,
    body: 'Scan the day in a list, or swipe through stories one at a time — the same easy motion you already use on social. Switch between the two whenever you like.',
  },
  {
    Mock: InterestingMock,
    title: <><span style={reg}>See what</span> <span style={heavy}>others are reading</span><TitleIcon Icon={Sparkles} /></>,
    body: 'Popular shows the stories people are reading most today. Interesting shows the ones readers thought were worth a second look — a good way to catch what you’d otherwise miss.',
  },
  {
    Mock: ChallengeMock,
    title: <><span style={heavy}>Keep</span> <span style={reg}>the</span> <span style={heavy}>streak</span><TitleIcon Icon={Flame} /></>,
    body: 'Set yourself a small daily goal, build a streak, and pick up badges along the way. A few minutes a day is genuinely enough to stay in the loop.',
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
        /* Slide 3 — demonstrates the swipe: the front card rises away while the next
           one comes up from below, then it repeats. */
        @keyframes obCardOut  { 0%,18% { transform: translateY(0); opacity: 1; }
                                46%,100% { transform: translateY(-64px); opacity: 0; } }
        @keyframes obCardIn   { 0%,18% { transform: translateY(58px) scale(0.94); opacity: 0.45; }
                                46%,100% { transform: translateY(0) scale(1); opacity: 1; } }
        /* the thumb hint that shows the gesture */
        @keyframes obThumb    { 0%,10% { transform: translateY(16px); opacity: 0; }
                                22% { opacity: 0.95; }
                                46% { transform: translateY(-18px); opacity: 0.95; }
                                58%,100% { transform: translateY(-18px); opacity: 0; } }
        /* generic bits */
        @keyframes obProgress { from { width: 12%; } to { width: 86%; } }
        @keyframes obEq       { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes obPulse    { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
        @keyframes obRing     { from { stroke-dashoffset: var(--ob-ring-from); } to { stroke-dashoffset: var(--ob-ring-to); } }
        .ob-card-out { animation: obCardOut 3.4s ease-in-out infinite; }
        .ob-card-in  { animation: obCardIn  3.4s ease-in-out infinite; }
        .ob-thumb    { animation: obThumb   3.4s ease-in-out infinite; }
        .ob-progress { animation: obProgress 6s ease-in-out infinite alternate; }
        .ob-eq       { animation: obEq 0.9s ease-in-out infinite; transform-origin: bottom; }
        .ob-pulse    { animation: obPulse 2.2s ease-in-out infinite; }
        .ob-ring     { animation: obRing 2.4s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .ob-card-out, .ob-card-in, .ob-thumb, .ob-progress, .ob-eq, .ob-pulse, .ob-ring { animation: none !important; }
          .ob-card-in { opacity: 1 !important; transform: none !important; }
          .ob-card-out { opacity: 1 !important; transform: none !important; }
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '1.25rem 0 1.3rem' }}>
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
