import React, { useState, useRef } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Sparkles, Repeat,
  ChevronLeft, ChevronRight, ChevronDown, Headphones, Zap, Star, Flame, Newspaper,
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
        <span style={{ padding: '4px 11px', borderRadius: 7, fontSize: '0.6rem', fontWeight: 700, color, border: `1.4px solid ${accentBtns ? color : '#d6d9e0'}` }}>Read</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 11px', borderRadius: 7, fontSize: '0.6rem', fontWeight: 700, color: '#fff', background: color }}>
          <Play size={9} color="#fff" fill="#fff" /> Play
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

function CategoryMock() {
  const cats = ['World News', 'Business', 'Technology', 'Sports'];
  const counts = { 'World News': 12, Business: 9, Technology: 15, Sports: 7 };
  return (
    <Card style={{ width: 278, padding: 14 }}>
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 12 }}>All News</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {cats.map(cat => {
          const c = CATEGORY_COLORS[cat];
          return (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, background: `${c}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CategoryIcon category={cat} size={17} color={c} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontWeight: 800, fontSize: 12.5 }}>{CATEGORY_SHORT[cat]}</span>
                <Skel w="55%" h={6} c="#eef0f4" />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: c, background: `${c}1a`, padding: '3px 9px', borderRadius: 999 }}>{counts[cat]}</span>
              <ChevronRight size={15} color="#c5c8d0" />
            </div>
          );
        })}
      </div>
    </Card>
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
          <div style={{ width: '38%', height: '100%', background: color, borderRadius: 99 }} />
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

function BriefingMock() {
  const cat = 'World News';
  const color = CATEGORY_COLORS[cat];
  return (
    <Card style={{ width: 280, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CategoryIcon category={cat} size={16} color={color} />
        </div>
        <span style={{ fontWeight: 900, fontSize: 13 }}>World News</span>
      </div>
      {/* the differentiated briefing button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#ec4899)', boxShadow: '0 8px 18px rgba(99,102,241,0.35)', marginBottom: 13 }}>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="#fff" fill="#fff" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 11.5 }}>Play the briefing</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9.5, fontWeight: 600 }}>60-sec summary of all stories</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <MiniStoryCard category="World News" faded badge={<ReadBadge kind="unread" />} />
      </div>
    </Card>
  );
}

function MyFeedMock() {
  const chips = [
    { c: 'Technology', on: true }, { c: 'Sports', on: false }, { c: 'Business', on: true },
    { c: 'Science', on: true }, { c: 'Entertainment', on: false }, { c: 'Health', on: true },
  ];
  return (
    <Card style={{ width: 280, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <Star size={15} color="#7c3aed" fill="#7c3aed" />
        <span style={{ fontWeight: 900, fontSize: 13 }}>My Feed</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {chips.map(ch => {
          const c = CATEGORY_COLORS[ch.c];
          return (
            <span key={ch.c} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11.5, fontWeight: 700, padding: '6px 11px', borderRadius: 999,
              background: ch.on ? c : '#fff',
              color: ch.on ? '#fff' : '#9aa0ab',
              border: ch.on ? `1px solid ${c}` : '1px solid #e1e3ea',
            }}>
              <CategoryIcon category={ch.c} size={12} color={ch.on ? '#fff' : '#b4b8c2'} />
              {CATEGORY_SHORT[ch.c]}
            </span>
          );
        })}
      </div>
    </Card>
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
        <span style={{ padding: '5px 11px', borderRadius: 7, fontSize: '0.62rem', fontWeight: 700, color, border: `1.4px solid ${color}` }}>Read</span>
        {/* active Interesting save */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.6)' }}>
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
    body: 'Your daily news, summarized for you and narrated like a radio broadcast.',
  },
  {
    Mock: CategoryMock,
    title: <><span style={heavy}>All the News,</span> <span style={reg}>by</span> <span style={semi}>category</span><TitleIcon Icon={Newspaper} /></>,
    body: 'Browse the day’s stories across every topic. Fresh briefings each morning, with an evening update on top.',
  },
  {
    Mock: PlayerMock,
    title: <><span style={heavy}>Listen,</span> <span style={reg}>totally</span> <span style={semi}>hands-free</span><TitleIcon Icon={Headphones} /></>,
    body: 'Tap play on any story or feed and have it narrated to you — perfect for your commute or the gym.',
  },
  {
    Mock: BriefingMock,
    title: <><span style={reg}>Quick</span> <span style={heavy}>Category Briefings</span><TitleIcon Icon={Zap} /></>,
    body: 'Short on time? Play a briefing for a spoken summary of a whole category — not just one story.',
  },
  {
    Mock: MyFeedMock,
    title: <><span style={reg}>Make it</span> <span style={heavy}>Your Feed</span><TitleIcon Icon={Star} /></>,
    body: 'Pick the categories you care about and My Feed keeps your daily rundown personal — only your topics.',
  },
  {
    Mock: InterestingMock,
    title: <><span style={reg}>What’s</span> <span style={heavy}>Popular &amp; Interesting</span><TitleIcon Icon={Sparkles} /></>,
    body: 'Follow trending news and the stories others marked as interesting — discover what’s resonating beyond your own feed.',
  },
  {
    Mock: ChallengeMock,
    title: <><span style={heavy}>Build</span> <span style={reg}>the</span> <span style={heavy}>Habit</span><TitleIcon Icon={Flame} /></>,
    body: 'Hit your daily goal, keep your streak alive, and earn badges as you stay on top of the news.',
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
      <style>{`@keyframes obIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

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
