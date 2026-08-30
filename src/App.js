import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Calendar, Clock, Mail, Plus, Trash2, LogOut, User, Search, Sparkles, Settings, Loader, Menu, ChevronLeft, ChevronRight, ChevronDown, X, Volume2, VolumeX, Pause, Play, RotateCcw, Repeat, SkipBack, SkipForward, Headphones } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { rankStories } from './utils';
import BriefingFeed from './components/BriefingFeed';
import StoryReader from './components/StoryReader';
import StorySummarySheet from './components/StorySummarySheet';
import CategoryBriefing from './components/CategoryBriefing';
import FullPlayer from './components/FullPlayer';
import MiniPlayer from './components/MiniPlayer';
import CategoryTransition from './components/CategoryTransition';
import BottomNav from './components/BottomNav';
import MyFeedTab from './components/MyFeedTab';
import PopularTab from './components/PopularTab';
import ImportantTab from './components/ImportantTab';
import MySavesTab from './components/MySavesTab';
import FeedCategoryEditor from './components/FeedCategoryEditor';
import ProfilePage from './components/ProfilePage';
import { headlineKey } from './components/PopularTab';
import OnboardingTour, { ONBOARDING_KEY } from './components/OnboardingTour';
import { CATEGORY_COLORS, CATEGORY_IMAGES } from './theme';
import useListenHistory, { computeGamifiedStats, computeChallengeStats } from './hooks/useListenHistory';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Build a briefingData-shaped map ({ [cat]: { storyCount, estimatedSec, allStories,
// previewStories } }) from a flat list of { category, story } items. Used to render
// snapshot-based feeds (My Saves, Interesting) through the same machinery as live news.
function buildSnapshotBriefing(items) {
  const byCat = {};
  items.forEach(({ category, story }) => {
    if (!category || !story) return;
    (byCat[category] = byCat[category] || []).push(story);
  });
  const out = {};
  Object.keys(byCat).forEach(cat => {
    const all = byCat[cat];
    const totalWords = all.reduce((acc, st) => {
      const fields = [...(st.allBullets || st.tightBullets || []), st.perspectives, st.why, st.headline].filter(Boolean);
      return acc + fields.join(' ').split(/\s+/).filter(Boolean).length;
    }, 0);
    const estimatedSec = Math.max(10, Math.round((totalWords / 200) * 60));
    out[cat] = { storyCount: all.length, estimatedSec, previewStories: all.slice(0, 3), allStories: all };
  });
  return out;
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const STORY_TRANSITIONS = [
  'Up next.',
  'Moving on.',
  'And now.',
  'Next story.',
  "Here's what else is happening.",
  'Our next story.',
];

const CAT_TRANSITION_TEMPLATES = [
  (cat) => `Now let's turn to ${cat}.`,
  (cat) => `Next up, ${cat}.`,
  (cat) => `Moving on to ${cat}.`,
  (cat) => `Coming up, ${cat}.`,
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TheAIRundown = () => {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY));
  const [onboardingKey, setOnboardingKey] = useState(0);
  const openOnboarding = () => { setOnboardingKey(k => k + 1); setShowOnboarding(true); };
  const dismissOnboarding = () => { localStorage.setItem(ONBOARDING_KEY, '1'); setShowOnboarding(false); };
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState(null); // { type: 'info'|'error'|'success', text: string }
  const [authLoading, setAuthLoading] = useState(false);
  const [otpStep, setOtpStep] = useState('email');     // 'email' | 'code' (passwordless OTP)
  const [otpCode, setOtpCode] = useState('');
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('World News');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [customCategoryDescriptions, setCustomCategoryDescriptions] = useState({});
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [emailPreferences, setEmailPreferences] = useState({
    categories: [],
    morning: false, evening: false,
  });
  const [categoryLockedToday, setCategoryLockedToday] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [selectedSharedKey, setSelectedSharedKey] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSummary, setNewsSummary] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('rundown_font_size') || 'normal');
  const [newsNotAvailable, setNewsNotAvailable] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [showAllSources, setShowAllSources] = useState(false);

  const categoryScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const timeScrollRef = useRef(null);
  const pollTimerRef = useRef(null);
  const briefingCacheRef = useRef({}); // keyed by "day|timeSlot|language" — avoids re-fetching already-loaded days
  const progressIntervalRef = useRef(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('rundown_view_mode') || 'stories');
  // 'headlines' was removed from the player's toggle, but it persists in localStorage for
  // anyone who last used it — migrate on read, or they'd load into a depth the UI no longer
  // offers and couldn't tell why the narration was so short.
  const [depthLevel, setDepthLevel] = useState(() => {
    const saved = localStorage.getItem('rundown_depth_level');
    if (!saved || saved === 'summary') return 'deep';
    if (saved === 'headlines') return 'takeaways';
    return saved;
  });
  const depthLevelRef = useRef(depthLevel);
  useEffect(() => { depthLevelRef.current = depthLevel; }, [depthLevel]);
  const handleSetDepth = (level) => {
    if (narrationStateRef.current.active) narrateFnRef.current.stop();
    setDepthLevel(level);
    localStorage.setItem('rundown_depth_level', level);
  };
  const [storiesPicker, setStoriesPicker] = useState(null); // null | 'category' | 'day' | 'time'

  const enterStories = () => {
    setViewMode('stories');
    // Only go fullscreen on mobile/tablet (< 1024px) — desktop keeps normal layout
    if (window.innerWidth < 1024) {
      try { document.documentElement.requestFullscreen?.(); } catch {}
    }
  };
  const exitStories = () => {
    setViewMode('digest');
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch {}
  };
  const [storyIndex, setStoryIndex] = useState(0);
  const [stories, setStories] = useState([]);
  const [hasPunchyBullets, setHasPunchyBullets] = useState(false);
  const goToLastStoryRef = useRef(false);
  const storyNavRef = useRef({ idx: 0, stories: [], cats: [], cat: '' });
  const storyGoRef = useRef({}); // exposes goNext/goPrev from the stories render block
  const swipeTouchRef = useRef(null); // tracks touch start position for swipe detection
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [narrationProgress, setNarrationProgress] = useState(0);   // 0-100 pct of current audio
  const narrationDurationRef = useRef(0); // seconds — ref avoids re-renders when set
  const repeatModeRef = useRef(false);
  const playbackSpeedRef = useRef(1);
  const narrationStateRef = useRef({ active: false, pendingLoad: false, pendingStartIndex: 0, paused: false, canceling: false, pendingCategoryName: null, pendingNarrateTimer: null });
  const narrationGenRef = useRef(0); // incremented on every cancel/stop; stale callbacks bail out
  const storiesCategoryRef = useRef(null); // which category the current `stories` state belongs to
  const narrateFnRef = useRef({});
  // TTS pre-load cache: text → HTMLAudioElement (pre-buffered, ready to play instantly)
  const ttsAudioCacheRef = useRef(new Map());
  // Shared URL-fetch promises: text → Promise<string|null> — deduplicates concurrent fetches
  const ttsUrlPromisesRef = useRef(new Map());
  const handleSelectCategoryRef = useRef(null);
  // When playing a snapshot feed (My Saves / Interesting), holds { category, stories }
  // so narration uses snapshot text and the live news fetch is suppressed.
  const snapshotPlayRef = useRef(null);

  const [feedCategories, setFeedCategories] = useState([]);
  const [completedSlots, setCompletedSlots] = useState(new Set()); // Set of "YYYY-MM-DD|Morning" etc.
  const [slotsLoaded, setSlotsLoaded] = useState(false); // true after first completedSlots fetch
  const [newsLanguage, setNewsLanguage] = useState(() => localStorage.getItem('rundown_news_language') || 'en');
  const [showFeedPicker, setShowFeedPicker] = useState(false);
  const [authReady, setAuthReady] = useState(false); // stored user applied — per-user prefs readable
  // Where the reader is, shared across modes so Scroll and Swipe continue from each other.
  const focusRef = useRef(null); // { category, index }
  // Stories seen this session in either mode — read badges stay consistent for guests too.
  const sessionSeenRef = useRef(new Set());
  const markSeen = (cat, idx) => { sessionSeenRef.current.add(`${cat}|${idx}`); };
  const setFocus = (category, index) => { focusRef.current = { category, index }; };
  // A one-shot handoff, set only when leaving Swipe mode. focusRef itself is rewritten
  // continuously by whichever feed you happen to be scrolling, so handing it to every list
  // meant opening any tab yanked you to a story belonging to the feed you were in before.
  // Switching tabs should just restore where you left that tab — which useScrollRestore
  // already does — and nothing more.
  const [pendingFocus, setPendingFocus] = useState(null);
  const [feedPickerDraft, setFeedPickerDraft] = useState([]);

  // ── Listen tracking (for Popular tab) ────────────────────────────────────────
  const [listenCounts, setListenCounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rundown_listen_counts') || '{}'); } catch { return {}; }
  });
  const currentNarratingStoryRef = useRef({ headline: '' });
  // playlist override: null = use navCategories; set to an array to restrict narration
  const playlistCatsRef = useRef(null);

  const [showCategoryLeftArrow, setShowCategoryLeftArrow] = useState(false);
  const [showCategoryRightArrow, setShowCategoryRightArrow] = useState(true);
  const [showDayLeftArrow, setShowDayLeftArrow] = useState(false);
  const [showDayRightArrow, setShowDayRightArrow] = useState(true);

  // ── New UI state ──────────────────────────────────────────────────────────────
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerMinimized, setPlayerMinimized] = useState(false);
  const [playerContextCategories, setPlayerContextCategories] = useState([]);
  const [miniPlayerDock, setMiniPlayerDock] = useState('bottom'); // 'bottom' | 'top'
  const [fullPlayerExiting, setFullPlayerExiting] = useState(false);
  const playerSourcePath = useRef('/');

  // ── Story Reader sheet animation ──────────────────────────────────────────
  const [readerMounted, setReaderMounted] = useState(false);
  const [briefingData, setBriefingData] = useState({});
  const [briefingLoading, setBriefingLoading] = useState(true);
  const { history: listenHistory, perfectDays, addToHistory, markPerfectDay } = useListenHistory(user?.id ?? null);
  const [selectedProgressDay, setSelectedProgressDay] = useState(null); // null = today
  const gamifiedStats = useMemo(
    // viewDay priority: explicit progress-day picker > content date being viewed > today
    () => computeGamifiedStats(listenHistory, perfectDays, briefingData, feedCategories, selectedTime || null, selectedProgressDay || selectedDay || null),
    [listenHistory, perfectDays, briefingData, feedCategories, selectedTime, selectedProgressDay, selectedDay]
  );

  // Whether a story has been read must not depend on which categories are in My Feed.
  // gamifiedStats above is scoped to feedCategories, so asking it about a story outside that
  // set silently answers "not read" — which is why a story read in All News came back as New
  // in Swipe mode after a reload. History knows nothing about scoping, so ask history.
  const readTodaySet = useMemo(() => {
    const day = selectedProgressDay || selectedDay || null;
    const s = new Set();
    (listenHistory || []).forEach(h => {
      if (day && h.date && h.date !== day) return;
      s.add(`${h.category}|${h.storyIndex ?? 0}`);
    });
    return s;
  }, [listenHistory, selectedDay, selectedProgressDay]);

  // ── Daily goal + challenge stats ──────────────────────────────────────────
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = parseInt(localStorage.getItem('rundown_daily_goal'), 10);
    return [5, 10, 15, 20].includes(saved) ? saved : 10;
  });
  const handleSetDailyGoal = (g) => {
    setDailyGoal(g);
    localStorage.setItem('rundown_daily_goal', String(g));
  };
  const challengeStats = useMemo(
    () => computeChallengeStats(listenHistory, dailyGoal, selectedDay || null),
    [listenHistory, dailyGoal, selectedDay]
  );

  // ── Saved / Important stories ─────────────────────────────────────────────
  const [savedStories, setSavedStories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rundown_saved_stories') || '[]'); } catch { return []; }
  });
  const [savedCounts, setSavedCounts] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('rundown_saved_counts') || '{}');
      // Backfill: if counts are missing, seed from saved stories list
      const savedList = JSON.parse(localStorage.getItem('rundown_saved_stories') || '[]');
      const merged = { ...stored };
      savedList.forEach(s => {
        if (s.headline) {
          const k = (s.headline || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().slice(0, 50);
          if (!merged[k]) merged[k] = 1;
        }
      });
      return merged;
    } catch { return {}; }
  });
  const handleToggleSaved = (story, category, storyIndex) => {
    if (!user) { setShowAuth(true); setAuthMode('signin'); return; }
    const key = headlineKey(story.headline || '');
    setSavedStories(prev => {
      const exists = prev.some(s => s.category === category && s.storyIndex === storyIndex);
      // Day the story belongs to: snapshot stories carry _day; otherwise it's the day being viewed.
      const storyDay = story._day || selectedDay || null;
      const next = exists
        ? prev.filter(s => !(s.category === category && s.storyIndex === storyIndex))
        : [{ category, storyIndex, headline: story.headline, preview: story.allBullets?.[0] || '', day: storyDay }, ...prev];
      try { localStorage.setItem('rundown_saved_stories', JSON.stringify(next)); } catch {}
      // Sync to Supabase (fire-and-forget)
      if (exists) {
        fetch(`${BACKEND_URL}/api/saves/remove`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, headline: story.headline }),
        }).catch(() => {});
      } else {
        fetch(`${BACKEND_URL}/api/saves/sync`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id, category, story_index: storyIndex,
            headline: story.headline, preview: story.allBullets?.[0] || '',
            day: storyDay, content_snapshot: story,
          }),
        }).catch(() => {});
        // Optimistically add to the My Saves feed so it appears without a refetch
        setMySaves(prevSaves => {
          if (prevSaves.some(s => headlineKey(s.headline || '') === key)) return prevSaves;
          return [{ category, story_index: storyIndex, headline: story.headline, preview: story.allBullets?.[0] || '', day: storyDay, content_snapshot: story, story_key: key }, ...prevSaves];
        });
      }
      // Keep My Saves feed in sync on removal too
      if (exists) {
        setMySaves(prevSaves => prevSaves.filter(s => headlineKey(s.headline || '') !== key));
      }
      // Update distinct saved count (binary: 1 when saved, 0 when removed)
      if (key) setSavedCounts(prevC => {
        const nextC = { ...prevC, [key]: exists ? Math.max(0, (prevC[key] || 0) - 1) : Math.min(1, (prevC[key] || 0) + 1) };
        try { localStorage.setItem('rundown_saved_counts', JSON.stringify(nextC)); } catch {}
        return nextC;
      });
      return next;
    });
  };
  const handleRemoveSaved = (category, storyIndex) => {
    setSavedStories(prev => {
      const item = prev.find(s => s.category === category && s.storyIndex === storyIndex);
      const next = prev.filter(s => !(s.category === category && s.storyIndex === storyIndex));
      try { localStorage.setItem('rundown_saved_stories', JSON.stringify(next)); } catch {}
      if (item?.headline) {
        const key = headlineKey(item.headline);
        setSavedCounts(prevC => {
          const nextC = { ...prevC, [key]: Math.max(0, (prevC[key] || 0) - 1) };
          try { localStorage.setItem('rundown_saved_counts', JSON.stringify(nextC)); } catch {}
          return nextC;
        });
      }
      return next;
    });
  };

  // ── Social / Following ──────────────────────────────────────────────────────
  const [following, setFollowing] = useState([]); // [{ id, username, display_name, avatar_color }]
  const [circleSaves, setCircleSaves] = useState([]); // saves by people I follow
  const [circlePopular, setCirclePopular] = useState([]); // popular among circle

  // ── Saves feeds ──────────────────────────────────────────────────────────────
  // mySaves: this user's saves with content_snapshot + day → powers the My Saves feed.
  // interestingStories: global most-saved stories across all users → powers Interesting.
  const [mySaves, setMySaves] = useState([]);
  const [interestingStories, setInterestingStories] = useState([]);

  const [categoryTransition, setCategoryTransition] = useState(null); // { category, storyCount, estimatedSec, nextStoryTitle }
  const navigate = useNavigate();
  const location = useLocation();

  // Reset the passwordless flow each time the auth modal opens.
  useEffect(() => {
    if (showAuth) { setOtpStep('email'); setOtpCode(''); setAuthMessage(null); }
  }, [showAuth]);

  // When navigated to Settings asking to edit My Feed, scroll that section into view.
  useEffect(() => {
    if (location.pathname === '/settings' && location.state?.scrollTo === 'myfeed') {
      const t = setTimeout(() => {
        document.getElementById('settings-myfeed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [location.pathname, location.state]);

  const CUSTOM_CATEGORIES_ENABLED = false;

  const defaultCategories = ['World News','Technology','Business','Politics','Sports','Entertainment','Science','Health','UAE','KSA','QAT','LEB'];
  const REGIONAL_CATEGORIES = ['UAE','KSA','QAT','LEB'];
  // My News picker only — All News (defaultCategories above) stays parent-level so every
  // visitor's discovery feed doesn't grow just because these exist. Subcategories are an
  // opt-in personalization layer, not a new top-level section. Parent immediately followed
  // by its children — FeedCategoryEditor relies on that order to nest their chips visually.
  const myNewsCategories = ['World News','Technology','AI','Crypto','Business','Politics','Sports','Football','Basketball','Entertainment','Science','Health','UAE','KSA','QAT','LEB'];

  const CATEGORY_COLORS = {
    'World News':    '#6366f1',
    'Technology':    '#0891b2',
    'Business':      '#d97706',
    'Politics':      '#e11d48',
    'Sports':        '#16a34a',
    'Entertainment': '#9333ea',
    'Science':       '#2563eb',
    'Health':        '#db2777',
    'UAE':           '#0369a1',
    'KSA':           '#166534',
    'QAT':           '#86198f',
    'LEB':           '#c2410c',
    'AI':            '#7c3aed',
    'Crypto':        '#b45309',
    'Football':      '#15803d',
    'Basketball':    '#ea580c',
  };
  const MY_FEED_COLOR = '#7c3aed';
  const catColor = selectedCategory === 'My Rundown'
    ? (feedCategories.length > 0 ? CATEGORY_COLORS[feedCategories[0]] || MY_FEED_COLOR : MY_FEED_COLOR)
    : CATEGORY_COLORS[selectedCategory] || '#6366f1';
  // In My Rundown stories mode, use the current story's per-category color so each card
  // reflects its source category rather than defaulting to the first feed category.
  const storyCardColor = (selectedCategory === 'My Rundown' && stories[storyIndex]?.feedCatColor)
    ? stories[storyIndex].feedCatColor : catColor;

  // Derive the mock-style dark gradient from the category colour.
  // Each stop is the category colour scaled down to 10/16/24% brightness, matching the mock design.
  const _darkenHex = (hex, f) => {
    const h = (hex.startsWith('#') ? hex.slice(1) : hex).padEnd(6, '0');
    const r = Math.round(parseInt(h.slice(0,2), 16) * f);
    const g = Math.round(parseInt(h.slice(2,4), 16) * f);
    const b = Math.round(parseInt(h.slice(4,6), 16) * f);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  };
  const _scRgb = (() => { const h = (storyCardColor.startsWith('#') ? storyCardColor.slice(1) : storyCardColor).padEnd(6,'0'); return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`; })();
  const storyDarkBg = `linear-gradient(160deg, ${_darkenHex(storyCardColor, 0.10)}, ${_darkenHex(storyCardColor, 0.16)}, ${_darkenHex(storyCardColor, 0.24)})`;
  const storyGlowBg = `radial-gradient(ellipse at 30% 30%, rgba(${_scRgb}, 0.22) 0%, transparent 65%)`;

  // Normalise a URL for matching: lower-case host+path, strip trailing slash & query/hash
  const normalizeUrl = (url) => {
    try {
      const u = new URL(url);
      return (u.hostname + u.pathname).replace(/\/+$/, '').toLowerCase();
    } catch { return url.toLowerCase(); }
  };

  // buildStories: single parse pass on `content` for structure + sources.
  // storiesContent (optional) overlays tightBullets per story matched by headline.
  // Returns { stories, hasPunchyBullets }
  const buildStories = (content, storiesContent) => {
    if (!content && !storiesContent) return { stories: [], hasPunchyBullets: false };

    const normalizeHeadline = (h) => h.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '').slice(0, 40);

    // ── Parse content for structure, bullets, perspectives, why, sources ──────
    const src = content || storiesContent || '';
    const sourcesStart = src.search(/^#{1,3}\s+(?:\[)?(?:Sources|المصادر)(?:\]|\()?/im);
    const body = sourcesStart > -1 ? src.slice(0, sourcesStart).trim() : src.trim();

    // Build source title map from ## Sources section
    const titleMap = {};
    if (sourcesStart > -1) {
      [...src.slice(sourcesStart).matchAll(/[-*\d.]\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
        .forEach(([, t, u]) => { const k = normalizeUrl(u); if (!titleMap[k]) titleMap[k] = t; });
    }

    // Single-pass: build story chunks + collect coverage URLs by story index
    const chunks = [];
    const urlToStoryIdx = {};
    let cur = null;
    let idx = -1;
    body.split('\n').forEach(line => {
      const hm = line.match(/^#{1,3} (.+)$/);
      if (hm) {
        if (cur) chunks.push(cur);
        idx++;
        const headingRaw = hm[1].trim();
        const headline = headingRaw
          .replace(/^\[(.+?)\]\(https?:\/\/[^)]+\)$/, '$1')
          .replace(/https?:\/\/\S+/g, '').replace(/[()[\]]/g, '').trim();
        cur = { headline, idx, bodyLines: [], coverageLinks: [] };
        return;
      }
      if (!cur) return;
      const cov = line.match(/^\s*\*\*(?:Coverage|التغطية|المصادر):\*\*\s*(.+)$/);
      if (cov) {
        [...cov[1].matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].forEach(([, outlet, url]) => {
          if (urlToStoryIdx[url] === undefined) urlToStoryIdx[url] = idx;
          cur.coverageLinks.push({ outlet, url, title: titleMap[normalizeUrl(url)] || '' });
        });
      } else {
        cur.bodyLines.push(line);
        [...line.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].forEach(([, url]) => {
          if (urlToStoryIdx[url] === undefined) urlToStoryIdx[url] = idx;
        });
      }
    });
    if (cur) chunks.push(cur);

    // ── Parse storiesContent for punchy bullets keyed by headline ─────────────
    // Also kept as an ordered list so a story's summary still attaches by position when
    // the digest/stories headlines don't match exactly (older data, or model rephrasing).
    const punchyMap = {};
    const punchyList = [];
    if (storiesContent) {
      const sSrc = storiesContent;
      const sSrcEnd = sSrc.search(/^#{1,3}\s+(?:\[)?(?:Sources|المصادر)(?:\]|\()?/im);
      const sBody = sSrcEnd > -1 ? sSrc.slice(0, sSrcEnd).trim() : sSrc.trim();
      sBody.split(/(?=^#{1,3} )/m).filter(c => /^#{1,3} /.test(c.trim())).forEach(chunk => {
        const lines = chunk.trim().split('\n');
        const h = lines[0].replace(/^#{1,3}\s+/, '').replace(/^\[(.+?)\]\(https?:\/\/[^)]+\)$/, '$1')
          .replace(/https?:\/\/\S+/g, '').replace(/[()[\]]/g, '').trim();
        const bodyText = lines.slice(1).join('\n');
        const bullets = [...bodyText.matchAll(/^[-*]\s+(.+)$/gm)].map(m => m[1]);
        // Stop capture at the next **Field:** boundary so adjacent fields aren't included
        const summaryMatch = bodyText.match(/\*\*Summary:\*\*\s*([\s\S]+?)(?=\n\*\*[A-Z]|\n#{1,3} |$)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : null;
        if (h && bullets.length > 0) {
          punchyMap[normalizeHeadline(h)] = { bullets, summary };
          punchyList.push({ bullets, summary });
        }
      });
    }

    // ── Build final story objects ─────────────────────────────────────────────
    let anyPunchy = false;
    // Index fallback is only safe when the two lists line up 1:1 (same story count).
    const canIndexMatch = punchyList.length === chunks.length;
    const builtStories = chunks.map((chunk, ci) => {
      const rest = chunk.bodyLines.join('\n');
      const allBullets = [...rest.matchAll(/^[-*]\s+(.+)$/gm)].map(m => m[1]);
      const perspMatch = rest.match(/\*\*(?:Perspectives differ|وجهات النظر تتباين|تباين وجهات النظر|آراء مختلفة):\*\*\s*(.+)/);
      const whyMatch = rest.match(/\*\*(?:Why this matters|لماذا هذا مهم|لماذا يهم هذا|أهمية الخبر):\*\*\s*(.+)/);
      // Only set on Evening's incremental-merge digest (see generateEveningUpdate on the
      // backend) — "Unchanged" carries no badge, only "Updated"/"New" do.
      const statusMatch = rest.match(/\*\*Status:\*\*\s*(Updated|New|Unchanged)/);
      const storySources = chunk.coverageLinks.filter((s, i, a) => a.findIndex(x => x.url === s.url) === i);
      const key = normalizeHeadline(chunk.headline);
      const punchy = punchyMap[key] || (canIndexMatch ? punchyList[ci] : undefined);
      if (punchy) anyPunchy = true;
      const tightBullets = punchy?.bullets || allBullets.slice(0, 3);
      if (!chunk.headline || allBullets.length === 0) return null;
      return {
        headline: chunk.headline,
        tightBullets,       // short: from storiesContent if available, else first 3 from content
        allBullets,         // full: all bullets from content
        perspectives: perspMatch?.[1] || null,
        why: whyMatch?.[1] || null,
        summary: punchy?.summary || null,  // elaborate narrative paragraph (new generation cycle only)
        status: statusMatch?.[1] === 'Updated' || statusMatch?.[1] === 'New' ? statusMatch[1] : null,
        storySources,
        bodyLines: chunk.bodyLines, // kept for Read mode renderer
      };
    }).filter(Boolean);

    return { stories: builtStories, hasPunchyBullets: anyPunchy };
  };

  // Sync mutable player state into refs so narration callbacks can read latest values
  repeatModeRef.current = repeatMode;
  playbackSpeedRef.current = playbackSpeed;

  // ── Narration helpers (ElevenLabs TTS via backend, all reads through refs) ──

  const stopNarration = () => {
    narrationGenRef.current++;
    const st = narrationStateRef.current;
    if (st.pendingNarrateTimer) { clearTimeout(st.pendingNarrateTimer); st.pendingNarrateTimer = null; }
    if (st.audio) { st.audio.onended = null; st.audio.pause(); st.audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    st.active = false;
    st.pendingLoad = false;
    st.paused = false;
    playlistCatsRef.current = null; // reset playlist on stop
    snapshotPlayRef.current = null; // resume live news fetching after snapshot playback
    setIsNarrating(false);
    setIsPaused(false);
    setIsAudioLoading(false);
    setNarrationProgress(0);
    narrationDurationRef.current = 0;
  };
  narrateFnRef.current.stop = stopNarration;

  const pauseNarration = () => {
    const st = narrationStateRef.current;
    if (!st.active || st.paused) return;
    if (st.audio) st.audio.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.pause();
    st.paused = true;
    setIsPaused(true);
  };
  narrateFnRef.current.pause = pauseNarration;

  const resumeNarration = () => {
    const st = narrationStateRef.current;
    if (!st.active || !st.paused) return;
    st.paused = false;
    setIsPaused(false);
    if (st.audio) {
      st.audio.play().catch(() => narrateFnRef.current.stop());
    } else if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      // Audio was cancelled while paused (e.g. user navigated to another story) — start fresh
      if (viewMode === 'stories') {
        narrateFnRef.current.narrateStory?.(storyIndex);
      } else {
        narrateFnRef.current.narrateDigest?.(narrateFnRef.current.getNarrationContent?.());
      }
    }
  };
  narrateFnRef.current.resume = resumeNarration;

  // ── Day cache ──────────────────────────────────────────────────────────────
  // A generated day+slot never changes once written, so it is safe to cache forever
  // and serve without hitting the database. This is the client half of publishing the
  // feed statically: repeat opens cost nothing, and it degrades gracefully offline —
  // which is what the native app will need. Keyed so language and slot can't collide.
  // `kind` namespaces the two shapes we cache: 'list' holds an array of slot rows for the
  // feed, 'one' holds a single row for the selected category. They previously shared a key
  // whenever a day had one slot, and the feed then read an object where it expected an
  // array — silently dropping that category from the feed.
  const dayCacheKey = (kind, cat, day, slot, lang) => `rundown_feed:${kind}:${lang}:${day}:${slot}:${cat}`;
  const readDayCache = (kind, cat, day, slot, lang) => {
    try {
      const raw = localStorage.getItem(dayCacheKey(kind, cat, day, slot, lang));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const writeDayCache = (kind, cat, day, slot, lang, data) => {
    try {
      localStorage.setItem(dayCacheKey(kind, cat, day, slot, lang), JSON.stringify(data));
    } catch {
      // Quota reached — drop older days rather than silently failing every write.
      try {
        Object.keys(localStorage)
          .filter(k => k.startsWith('rundown_feed:') && !k.includes(`:${day}:`))
          .forEach(k => localStorage.removeItem(k));
        localStorage.setItem(dayCacheKey(kind, cat, day, slot, lang), JSON.stringify(data));
      } catch {}
    }
  };

  // Returns the content to narrate based on the currently selected depth level
  const getNarrationContent = () => {
    if (depthLevel === 'headlines') {
      const src = newsSummary?.stories_content || newsSummary?.content || '';
      return src.split('\n')
        .filter(l => /^#{1,3} /.test(l))
        .map(l => l.replace(/^#{1,3} /, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim())
        .filter(Boolean)
        .join('. ');
    }
    if (depthLevel === 'summary' || depthLevel === 'takeaways') return newsSummary?.stories_content || newsSummary?.content;
    return newsSummary?.content; // deep
  };
  narrateFnRef.current.getNarrationContent = getNarrationContent;

  // Cancels in-flight audio without ending the narration session (keeps isNarrating=true)
  const cancelAudioKeepActive = () => {
    narrationGenRef.current++; // invalidate any stale canplay/fetch callbacks
    const st = narrationStateRef.current;
    if (st.pendingNarrateTimer) { clearTimeout(st.pendingNarrateTimer); st.pendingNarrateTimer = null; }
    st.canceling = true;
    if (st.audio) { st.audio.onended = null; st.audio.pause(); st.audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    // Clear the flag after a tick so onerror callbacks can see it, then reset
    setTimeout(() => { st.canceling = false; }, 100);
  };
  narrateFnRef.current.cancelAudioKeepActive = cancelAudioKeepActive;

  const restartNarration = () => {
    cancelAudioKeepActive();
    const st = narrationStateRef.current;
    st.pendingLoad = false;
    st.paused = false;
    setIsPaused(false);
    clearTimeout(st.pendingNarrateTimer);
    st.pendingNarrateTimer = setTimeout(() => {
      st.pendingNarrateTimer = null;
      if (viewMode === 'stories') {
        narrateFnRef.current.narrateStory?.(storyIndex);
      } else {
        narrateFnRef.current.narrateDigest?.(narrateFnRef.current.getNarrationContent?.());
      }
    }, 120); // wait for canceling flag to clear
  };
  narrateFnRef.current.restart = restartNarration;

  // Strip markdown and symbols that TTS engines read aloud literally
  const cleanForTTS = (text) => text
    .replace(/\*\*(?:Coverage|التغطية|المصادر):\*\*[^\n]*/g, '')   // remove coverage lines entirely
    .replace(/\*\*([^*]+)\*\*/g, '$1')                              // **bold** → bold
    .replace(/_([^_]+)_/g, '$1')                                    // _italic_ → italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')                       // [text](url) → text
    .replace(/https?:\/\/\S+/g, '')                                 // bare URLs
    .replace(/·/g, ', ')                                            // middle dot → comma
    .replace(/\.{2,}/g, '.')                                        // ... → single dot
    .replace(/[#*`[\]()]/g, '')                                     // leftover symbols
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Browser Web Speech API fallback — used when Fish Audio is unavailable
  // getVoices() is async in Chrome (returns [] until voiceschanged fires); we wait for it.
  const speakWithBrowser = (text, onDone) => {
    if (!('speechSynthesis' in window)) { narrateFnRef.current.stop(); return; }
    window.speechSynthesis.cancel();
    const isAr = newsLanguage === 'ar';

    const doSpeak = (voices) => {
      if (!narrationStateRef.current.active) return;
      const utter = new SpeechSynthesisUtterance(text.trim());
      utter.rate = (isAr ? 0.85 : 0.92) * playbackSpeedRef.current;
      utter.pitch = 1.0;
      utter.lang = isAr ? 'ar-SA' : 'en-US';
      // Pick a matching voice; for Arabic try multiple locale variants
      const targetVoice = isAr
        ? (voices.find(v => v.lang === 'ar-SA') ||
           voices.find(v => v.lang === 'ar-AE') ||
           voices.find(v => v.lang.startsWith('ar')))
        : (voices.find(v => v.lang.startsWith('en') && !v.localService === false) ||
           voices.find(v => v.lang.startsWith('en')));
      if (targetVoice) utter.voice = targetVoice;
      utter.onboundary = (e) => {
        if (e.name === 'word' && text.length > 0) {
          setNarrationProgress(Math.min(99, (e.charIndex / text.length) * 100));
        }
      };
      utter.onend = () => {
        setNarrationProgress(0);
        narrationDurationRef.current = 0;
        if (narrationStateRef.current.active && !narrationStateRef.current.canceling) onDone();
      };
      utter.onerror = () => { if (!narrationStateRef.current.canceling) narrateFnRef.current.stop(); };
      narrationStateRef.current.browserUtter = utter;
      window.speechSynthesis.speak(utter);
    };

    // Voices may not be loaded yet — wait for voiceschanged if empty
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak(voices);
    } else {
      const handler = () => doSpeak(window.speechSynthesis.getVoices());
      window.speechSynthesis.addEventListener('voiceschanged', handler, { once: true });
      // Safety timeout: if voiceschanged never fires, speak anyway (lang attr is usually enough)
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        doSpeak(window.speechSynthesis.getVoices());
      }, 1500);
    }
  };

  // Attach playback handlers and start playing — reusable for both cached and fresh Audio objects
  // Pass isTransition:true to suppress all progress-bar updates (seamless between stories)
  const setupAndPlayAudio = (audioIn, onDone, { isTransition = false } = {}) => {
    if (!narrationStateRef.current.active) return;
    // Capture generation so stale onended callbacks from prior sessions can't fire.
    // stop() / cancelAudioKeepActive() both increment narrationGenRef, so any audio
    // element left over from a previous session will bail when its onended fires.
    const capturedGen = narrationGenRef.current;
    // iOS Safari won't replay an already-ended Audio element — create a fresh one from the same URL
    const audio = (audioIn.ended && audioIn.src) ? new Audio(audioIn.src) : audioIn;
    narrationStateRef.current.audio = audio;
    audio.currentTime = 0;
    audio.playbackRate = playbackSpeedRef.current;
    // Clear any stale handlers from prior use of the same Audio element
    audio.onloadedmetadata = null;
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.onerror = null;
    audio.onloadedmetadata = () => {
      if (!isTransition && audio.duration > 0) narrationDurationRef.current = audio.duration;
    };
    let lastPct = -1;
    let halfwayFired = false;
    audio.ontimeupdate = () => {
      if (!isTransition && audio.duration > 0) {
        const pct = (audio.currentTime / audio.duration) * 100;
        if (pct - lastPct >= 0.5 || pct === 0) { lastPct = pct; setNarrationProgress(pct); }
        // Track listen for Popular rankings:
        // full stories → 50% threshold; headlines → 100% (they're too short for 50% to be meaningful)
        const threshold = depthLevelRef.current === 'headlines' ? 99 : 50;
        if (!halfwayFired && pct >= threshold) {
          halfwayFired = true;
          const key = headlineKey(currentNarratingStoryRef.current.headline);
          if (key) {
            setListenCounts(prev => {
              if (prev[key]) return prev; // already counted this user
              const next = { ...prev, [key]: 1 };
              localStorage.setItem('rundown_listen_counts', JSON.stringify(next));
              return next;
            });
          }
        }
      }
    };
    audio.onended = () => {
      narrationStateRef.current.audio = null;
      if (!isTransition) { setNarrationProgress(0); narrationDurationRef.current = 0; }
      // Gen check: if stop() or cancelAudioKeepActive() was called since this audio
      // was set up, the generation will have changed — bail to prevent a stale
      // onDone from advancing to the wrong story (the root cause of the skip-to-story-3 bug).
      if (narrationStateRef.current.active
          && !narrationStateRef.current.canceling
          && narrationGenRef.current === capturedGen) onDone();
    };
    audio.onerror = () => {
      if (narrationStateRef.current.canceling) return;
      narrationStateRef.current.audio = null;
      narrateFnRef.current.stop();
    };
    audio.play()
      .then(() => { setIsAudioLoading(false); })
      .catch(() => { setIsAudioLoading(false); if (!narrationStateRef.current.canceling) narrateFnRef.current.stop(); });
  };

  // Returns a shared promise for a blob: URL containing the audio bytes.
  // Deduplicates concurrent fetches — both prefetch and speakText share the same in-flight request.
  // Uses /api/tts-stream which: (a) pipes Unreal Speech bytes directly for cache misses (~200ms to
  // first byte), (b) returns Supabase-cached bytes for hits (~300ms). Either way the browser has a
  // local blob URL — no secondary CDN fetch, no canplay wait, no buffering delay.
  const getTTSAudio = (text) => {
    const existing = ttsUrlPromisesRef.current.get(text);
    if (existing) return existing;
    const promise = fetch(`${BACKEND_URL}/api/tts-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => { if (!r.ok) throw new Error('tts-stream failed'); return r.arrayBuffer(); })
      .then(buf => {
        const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
        return url;
      })
      .catch(() => null);
    ttsUrlPromisesRef.current.set(text, promise);
    if (ttsUrlPromisesRef.current.size > 12) {
      const oldest = ttsUrlPromisesRef.current.keys().next().value;
      ttsUrlPromisesRef.current.delete(oldest);
    }
    return promise;
  };

  const speakText = (text, onDone, opts = {}) => {
    if (!narrationStateRef.current.active || !text.trim()) { onDone(); return; }
    if (newsLanguage === 'ar') { setIsAudioLoading(false); speakWithBrowser(cleanForTTS(text), onDone); return; }

    // ── 1. Cache hit → play immediately (blob URL, already local) ──
    const preloaded = ttsAudioCacheRef.current.get(text);
    if (preloaded) {
      setupAndPlayAudio(preloaded, onDone, opts);
      return;
    }

    // ── 2. Cache miss — shared fetch promise; play the instant bytes arrive ──
    setIsAudioLoading(true);
    const gen = narrationGenRef.current;
    getTTSAudio(text.trim())
      .then(url => {
        if (!narrationStateRef.current.active || narrationGenRef.current !== gen) { setIsAudioLoading(false); return; }
        if (!url) throw new Error('no url');
        // Recheck cache — prefetch may have stored an element while we awaited bytes
        const fromCache = ttsAudioCacheRef.current.get(text);
        const audio = fromCache || (() => { const a = new Audio(url); a.preload = 'auto'; return a; })();
        setupAndPlayAudio(audio, onDone, opts);
      })
      .catch(() => {
        setIsAudioLoading(false);
        if (narrationStateRef.current.active && narrationGenRef.current === gen) speakWithBrowser(text, onDone);
      });
  };
  narrateFnRef.current.speakText = speakText;

  const goNextCategoryNarration = () => {
    // Snapshot feeds (My Saves / Interesting): advance within the snapshot map so
    // we don't drop into live news between categories.
    const snap = snapshotPlayRef.current;
    if (snap?.map) {
      const cats = Object.keys(snap.map);
      const catIdx = cats.indexOf(snap.category);
      const nextCat = catIdx >= 0 && catIdx < cats.length - 1 ? cats[catIdx + 1] : null;
      if (nextCat && narrationStateRef.current.active) {
        const nextStories = snap.map[nextCat].allStories;
        snapshotPlayRef.current = { category: nextCat, stories: nextStories, map: snap.map };
        const transition = pickRandom(CAT_TRANSITION_TEMPLATES)(nextCat);
        narrationStateRef.current.pendingCategoryName = transition;
        narrateFnRef.current.prefetchTTS?.(transition);
        setSelectedCategory(nextCat);
        setStories(nextStories);
        setStoryIndex(0);
        storyNavRef.current = { idx: 0, stories: nextStories, cats, cat: nextCat };
        setTimeout(() => narrateFnRef.current.narrateStory(0), 0);
      } else {
        narrateFnRef.current.stop();
      }
      return;
    }

    const { cats, cat } = storyNavRef.current;
    const catIdx = cats.indexOf(cat);
    const nextCat = catIdx >= 0 && catIdx < cats.length - 1 ? cats[catIdx + 1] : null;
    if (nextCat && narrationStateRef.current.active) {
      const transition = pickRandom(CAT_TRANSITION_TEMPLATES)(nextCat);
      narrationStateRef.current.pendingCategoryName = transition;
      // Pre-fetch while new category loads — will be instant by the time stories are ready
      narrateFnRef.current.prefetchTTS?.(transition);
      narrationStateRef.current.pendingLoad = true;
      handleSelectCategoryRef.current?.(nextCat);
    } else {
      narrateFnRef.current.stop();
    }
  };
  narrateFnRef.current.goNext = goNextCategoryNarration;

  const narrateStoryFrom = (idx) => {
    if (!narrationStateRef.current.active) return;
    const { stories } = storyNavRef.current;
    if (idx >= stories.length) {
      if (repeatModeRef.current) { setStoryIndex(0); narrateFnRef.current.narrateStory(0); return; }
      narrateFnRef.current.goNext(); return;
    }
    const story = stories[idx];
    setStoryIndex(idx);
    currentNarratingStoryRef.current = { headline: story.headline }; // for listen tracking
    addToHistory(story, storyNavRef.current.cat, idx, selectedTime || null);
    const isAr = newsLanguage === 'ar';
    const isHeadlines = depthLevel === 'headlines';
    // Takeaways = headline + the short bullets, nothing else. The spoken twin of the
    // Takeaways panel in Swipe mode; Summary adds perspectives and why-it-matters.
    const isTakeaways = depthLevel === 'takeaways';
    const cl = cleanForTTS;
    const parts = [cl(story.headline) + '.'];
    if (!isHeadlines) {
      (story.tightBullets || story.allBullets || []).forEach(b => parts.push(cl(b) + '.'));
      if (!isTakeaways) {
        if (story.perspectives) parts.push((isAr ? 'وجهات النظر تتباين. ' : 'On the other hand, ') + cl(story.perspectives) + '.');
        if (story.why) parts.push((isAr ? 'لماذا هذا مهم. ' : 'Here is why this matters. ') + cl(story.why) + '.');
      }
    }
    const script = parts.filter(Boolean).join(' ');

    const playStory = () => {
      narrateFnRef.current.speakText(script, () => {
        if (!narrationStateRef.current.active) return;
        const nextIdx = idx + 1;
        if (nextIdx < storyNavRef.current.stories.length) {
          // More stories ahead — play a brief transition (skip in headlines mode)
          const trans = (!isAr && !isHeadlines) ? pickRandom(STORY_TRANSITIONS) : null;
          if (trans) {
            narrateFnRef.current.speakText(trans, () => {
              if (!narrationStateRef.current.active) return;
              narrateFnRef.current.narrateStory(nextIdx);
            }, { isTransition: true });
          } else {
            const st = narrationStateRef.current;
            clearTimeout(st.pendingNarrateTimer);
            st.pendingNarrateTimer = setTimeout(() => { st.pendingNarrateTimer = null; narrateFnRef.current.narrateStory(nextIdx); }, isHeadlines ? 400 : 600);
          }
        } else {
          const st = narrationStateRef.current;
          clearTimeout(st.pendingNarrateTimer);
          st.pendingNarrateTimer = setTimeout(() => { st.pendingNarrateTimer = null; narrateFnRef.current.narrateStory(nextIdx); }, 600);
        }
      });
    };

    // Play category transition first if we just auto-advanced from another category
    const catTransition = narrationStateRef.current.pendingCategoryName;
    if (idx === 0 && catTransition && !isAr) {
      narrationStateRef.current.pendingCategoryName = null;
      narrateFnRef.current.speakText(catTransition, () => {
        if (!narrationStateRef.current.active) return;
        playStory();
      }, { isTransition: true });
    } else {
      playStory();
    }
  };
  narrateFnRef.current.narrateStory = narrateStoryFrom;

  // Build the exact TTS script for a story (mirrors narrateStoryFrom so cache keys align)
  const buildStoryScript = (story) => {
    if (!story) return '';
    const isAr = newsLanguage === 'ar';
    const cl = cleanForTTS;
    const parts = [cl(story.headline) + '.'];
    (story.tightBullets || story.allBullets || []).forEach(b => parts.push(cl(b) + '.'));
    if (story.perspectives) parts.push((isAr ? 'وجهات النظر تتباين. ' : 'On the other hand, ') + cl(story.perspectives) + '.');
    if (story.why) parts.push((isAr ? 'لماذا هذا مهم. ' : 'Here is why this matters. ') + cl(story.why) + '.');
    return parts.filter(Boolean).join(' ');
  };

  // Pre-fetches TTS audio for `text` in the background so play is instant when triggered.
  // Uses the shared getTTSUrl promise — no duplicate network requests even if speakText fires concurrently.
  const prefetchTTSAudio = async (text) => {
    if (!text?.trim() || newsLanguage === 'ar') return;
    if (ttsAudioCacheRef.current.has(text)) return;
    try {
      const url = await getTTSAudio(text.trim()); // shared promise — no duplicate fetch with speakText
      if (!url || ttsAudioCacheRef.current.has(text)) return;
      const audio = new Audio(url); // blob: URL — already fully local, instant play
      audio.preload = 'auto';
      ttsAudioCacheRef.current.set(text, audio);
      if (ttsAudioCacheRef.current.size > 10) {
        const oldest = ttsAudioCacheRef.current.keys().next().value;
        ttsAudioCacheRef.current.delete(oldest);
      }
      audio.addEventListener('error', () => { ttsAudioCacheRef.current.delete(text); }, { once: true });
    } catch { }
  };
  narrateFnRef.current.prefetchTTS = prefetchTTSAudio;
  narrateFnRef.current.buildStoryScript = buildStoryScript;

  const narrateDigestContent = (content) => {
    if (!narrationStateRef.current.active || !content) return;
    const isAr = newsLanguage === 'ar';
    const text = content
      .replace(/#{1,3}\s+\[?([^\]\n]+)\]?[^\n]*/g, '$1.')
      .replace(/\*\*(?:Perspectives differ|وجهات النظر تتباين|تباين وجهات النظر|آراء مختلفة):\*\*\s*/g, isAr ? 'وجهات النظر تتباين. ' : 'On the other hand, ')
      .replace(/\*\*(?:Why this matters|لماذا هذا مهم|لماذا يهم هذا|أهمية الخبر):\*\*\s*/g, isAr ? 'لماذا هذا مهم. ' : 'Here is why this matters. ')
      .replace(/\*\*(?:Coverage|التغطية|المصادر):\*\*[^\n]*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*]\s+/gm, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    narrateFnRef.current.speakText(cleanForTTS(text), () => narrateFnRef.current.goNext());
  };
  narrateFnRef.current.narrateDigest = narrateDigestContent;

  const startNarration = () => {
    if (isNarrating) { narrateFnRef.current.stop(); return; }
    const ctxCats = location.pathname === '/my-feed'
      ? feedCategories
      : defaultCategories;
    setPlayerContextCategories(ctxCats);
    const st = narrationStateRef.current;
    st.active = true;
    st.pendingLoad = false;
    st.audio = null;
    st.paused = false;
    setIsNarrating(true);
    setIsPaused(false);
    setIsAudioLoading(true);
    // Show the player sheet
    setPlayerVisible(true);
    setPlayerMinimized(false);
    if (viewMode === 'stories') {
      narrateFnRef.current.narrateStory(storyIndex);
    } else {
      narrateFnRef.current.narrateDigest(getNarrationContent());
    }
  };

  // ── Story reader sheet: mount / exit animations ──────────────────────────
  const isStoryViewForEffect = !!location.pathname.match(/^\/category\/([^/]+)\/story\/(\d+)$/);
  const [readerExiting, setReaderExiting] = useState(false);
  useEffect(() => {
    if (isStoryViewForEffect) {
      setReaderExiting(false);
      requestAnimationFrame(() => setReaderMounted(true));
    } else {
      setReaderMounted(false);
    }
  }, [isStoryViewForEffect]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Heartbeat — "on the website right now" counter ───────────────────────
  // Fires immediately on every page load (guest or signed-in) and every 60s.
  // localStorage, not sessionStorage: on mobile Safari (and PWA/home-screen launches
  // especially), reopening the app often starts a fresh browsing context with empty
  // sessionStorage, so a sessionStorage id looked like a brand-new visitor on every
  // reopen — one real person double- or triple-counted within the 2-minute expiry
  // window. localStorage survives that, so one device stays one counted session.
  // The backend stores this in an in-memory map (no DB writes).
  useEffect(() => {
    let sid = localStorage.getItem('_hb_sid');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('_hb_sid', sid);
    }
    const ping = () => fetch(`${BACKEND_URL}/api/metrics/heartbeat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, userId: user?.id || null }),
    }).catch(() => {});
    ping();
    const t = setInterval(ping, 60_000);
    return () => clearInterval(t);
  }, [user?.id]); // re-fires when auth state changes so userId is always current

  // ── My Saves: fetch this user's saved stories (with snapshots) for the feed ──
  useEffect(() => {
    if (!user?.id) { setMySaves([]); return; }
    fetch(`${BACKEND_URL}/api/saves?userId=${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setMySaves(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [user?.id]);

  // ── Interesting: fetch global most-saved stories across all users ────────────
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/saves/interesting`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setInterestingStories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // ── My Saves feed: snapshots for the selected day, shaped like briefingData ──
  const savesBriefingData = useMemo(() => {
    const items = (mySaves || [])
      .filter(s => s.content_snapshot && (!selectedDay || s.day === selectedDay))
      .map(s => ({ category: s.category, story: { ...s.content_snapshot, _day: s.day } }));
    return buildSnapshotBriefing(items);
  }, [mySaves, selectedDay]);

  // ── Interesting feed: most-saved stories for the selected day across all users,
  // ranked by global save count within each category. ───────────────────────────
  const interestingBriefingData = useMemo(() => {
    const items = (interestingStories || [])
      .filter(it => it.content_snapshot && (!selectedDay || it.day === selectedDay))
      .map(it => ({ category: it.category, story: { ...it.content_snapshot, _day: it.day, _interestCount: it.count } }));
    const map = buildSnapshotBriefing(items);
    Object.keys(map).forEach(cat => {
      map[cat].allStories.sort((a, b) => (b._interestCount || 0) - (a._interestCount || 0));
      map[cat].previewStories = map[cat].allStories.slice(0, 3);
    });
    return map;
  }, [interestingStories, selectedDay]);

  // Pre-fetch TTS audio for the current + next story as soon as the card is visible.
  // By the time the user presses play the audio is already buffered → instant playback.
  useEffect(() => {
    if (viewMode !== 'stories' || !stories.length || newsLanguage === 'ar') return;
    const fn = narrateFnRef.current;
    [storyIndex, storyIndex + 1].forEach(idx => {
      if (idx < stories.length) {
        const script = fn.buildStoryScript?.(stories[idx]);
        if (script) fn.prefetchTTS?.(script);
      }
    });
  }, [stories, storyIndex, viewMode, newsLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fetch TTS for the first story of the NEXT category so navigating forward is instant.
  // Runs once per category load (not per story scroll) — one Supabase query in the background.
  useEffect(() => {
    if (viewMode !== 'stories' || !stories.length || newsLanguage === 'ar') return;
    const { cats, cat } = storyNavRef.current;
    const catIdx = cats.indexOf(cat);
    const nextCat = catIdx >= 0 && catIdx < cats.length - 1 ? cats[catIdx + 1] : null;
    if (!nextCat) return;

    const fn = narrateFnRef.current;

    (async () => {
      try {
        const isCustom = customCategories.includes(nextCat);
        const fetchTimeSlot = isCustom ? 'Daily' : selectedTime;
        let q;
        if (isCustom) {
          const sharedKey = (customCategoryDescriptions[nextCat] || nextCat).toLowerCase().trim();
          q = supabase.from('news_summaries').select('content, stories_content')
            .eq('shared_key', sharedKey).is('user_id', null).eq('day', selectedDay).eq('time_slot', 'Daily');
        } else {
          q = supabase.from('news_summaries').select('content, stories_content')
            .eq('category', nextCat).eq('day', selectedDay).eq('time_slot', fetchTimeSlot)
            .eq('language', newsLanguage).is('user_id', null).is('shared_key', null);
        }
        const { data } = await q.maybeSingle();
        if (!data) return;
        const { stories: nextStories } = buildStories(data.content, data.stories_content);
        if (!nextStories.length) return;
        // Prefetch TTS for the first story + the category transition phrase
        const script = fn.buildStoryScript?.(nextStories[0]);
        if (script) fn.prefetchTTS?.(script);
        const catPhrase = pickRandom(CAT_TRANSITION_TEMPLATES)(nextCat);
        fn.prefetchTTS?.(catPhrase);
      } catch { /* silently ignore — this is best-effort */ }
    })();
  }, [stories, viewMode, newsLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  const timesOfDay = [
    { value: 'Morning', label: 'Morning', time: '6 AM' },
    { value: 'Evening', label: 'Evening', time: '6 PM' },
  ];

  // Returns the current UAE date as YYYY-MM-DD, correctly for all browser timezones
  const toUAEDate = (d = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(d);

  // Returns current UAE hour 0–23, correctly for all browser timezones
  const getUAEHour = () => {
    const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai', hour: 'numeric', hour12: false }));
    return h === 24 ? 0 : h;
  };

  // Memoized: only recomputes when completedSlots or slotsLoaded actually changes,
  // preventing a new array reference (and downstream re-renders) on every render.
  const daysOfWeek = useMemo(() => {
    let anchorStr = toUAEDate();
    if (slotsLoaded && completedSlots.size > 0) {
      const dates = [...completedSlots].map(s => s.split('|')[0]);
      dates.sort();
      anchorStr = dates[dates.length - 1];
    }
    const [y, m, d] = anchorStr.split('-').map(Number);
    const anchor = new Date(y, m - 1, d, 12, 0, 0);
    const days = [];
    for (let i = -6; i <= 0; i++) {
      const date = new Date(anchor);
      date.setDate(date.getDate() + i);
      const fullDate = toUAEDate(date);
      const dayName = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Dubai' }).format(date);
      const dateNum = parseInt(new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: 'Asia/Dubai' }).format(date));
      days.push({ label: dayName, date: dateNum, fullDate });
    }
    return days;
  }, [slotsLoaded, completedSlots]); // eslint-disable-line react-hooks/exhaustive-deps
  const allCategories = [...defaultCategories, ...customCategories];

  const getCurrentTimeSlot = () => getUAEHour() >= 18 ? 'Evening' : 'Morning';

  const currentTimeSlot = getCurrentTimeSlot();
  const today = toUAEDate();

  const isCustomCategory = customCategories.includes(selectedCategory);

  // Last completed slot
  const lastCompletedTimeSlot = getUAEHour() >= 18 ? 'Evening' : 'Morning';

  // A slot is unavailable if no __completed__ marker exists for that day+time.
  const isSlotUnavailable = (day, timeSlot) => !completedSlots.has(`${day}|${timeSlot}`);

  const availableTimes = timesOfDay;
  const todayHasSlot = timesOfDay.some(t => completedSlots.has(`${today}|${t.value}`));

  // Hide days that have no news at all (both slots unavailable) once slots have loaded.
  const availableDays = isCustomCategory
    ? daysOfWeek.filter(d => d.fullDate === today)
    : daysOfWeek;

  // Days a briefing was actually generated for. The challenge chart shows a day only once
  // its news exists — an empty column for a day that was never generated reads as "you read
  // nothing that day", which isn't true, it just hadn't happened yet.
  const challengeStatsFull = useMemo(() => ({
    ...challengeStats,
    contentDays: new Set([...completedSlots].map(s => s.split('|')[0])),
  }), [challengeStats, completedSlots]);

  // Selects a day and auto-corrects selectedTime to the first available slot for that day.
  const selectDay = (fullDate) => {
    setSelectedDay(fullDate);
    if (slotsLoaded && isSlotUnavailable(fullDate, selectedTime)) {
      const avail = timesOfDay.find(t => completedSlots.has(`${fullDate}|${t.value}`));
      if (avail) setSelectedTime(avail.value);
    }
  };

  const handleSelectCategory = (category) => {
    snapshotPlayRef.current = null; // returning to live news — resume normal fetching
    setSelectedCategory(category);
    // Custom categories only support today — reset day and time for them.
    // Default/regional categories preserve whatever day AND time the user has selected.
    if (customCategories.includes(category)) {
      setSelectedDay(today);
      setSelectedTime(currentTimeSlot);
    }
  };

  useEffect(() => {
    setSelectedDay(toUAEDate()); // default to today; slots-loaded effect will correct to latest news day
    setSelectedTime(lastCompletedTimeSlot);
    try {
      const savedUser = localStorage.getItem('newsdigest_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setEmailPreferences(normalizeEmailPrefs(userData.emailPreferences || {}));
        const savedFeed = userData.feedCategories || [];
        setFeedCategories(savedFeed);
        if (savedFeed.length > 0) setSelectedCategory('My Rundown');
        // Refresh categories, email preferences, and feed_categories from Supabase
        Promise.all([
          supabase.from('custom_categories').select('category_name, category_description').eq('user_id', userData.id).is('deleted_at', null),
          supabase.from('users').select('email_preferences, feed_categories, news_language').eq('id', userData.id).single()
        ]).then(([catRes, prefRes]) => {
          const cats = catRes.data?.map(c => c.category_name) || [];
          const descs = Object.fromEntries((catRes.data || []).map(c => [c.category_name, c.category_description || c.category_name]));
          const rawPrefs = prefRes.data?.email_preferences || userData.emailPreferences || {};
          const prefs = normalizeEmailPrefs(rawPrefs);
          const feed = prefRes.data?.feed_categories || savedFeed;
          // Prefer DB value; fall back to whatever is stored locally (avoids overwriting
          // an Arabic selection made before the user logged in)
          const lang = prefRes.data?.news_language || localStorage.getItem('rundown_news_language') || 'en';
          setCustomCategories(cats);
          setCustomCategoryDescriptions(descs);
          setEmailPreferences(prefs);
          setFeedCategories(feed);
          setNewsLanguage(lang);
          localStorage.setItem('rundown_news_language', lang);
          if (feed.length > 0) setSelectedCategory('My Rundown');
          const updated = { ...userData, categories: cats, emailPreferences: prefs, feedCategories: feed };
          localStorage.setItem('newsdigest_user', JSON.stringify(updated));
          setUser(updated);
        });
        // Load social data for returning signed-in user
        loadSocialData(userData.id);
      }
    } catch (error) { console.error('Init error:', error); }
    setAuthReady(true); // the stored user (if any) is now applied — safe to read per-user prefs
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once slots have loaded (or change), fix selectedDay/selectedTime if they point at an empty slot.
  useEffect(() => {
    if (!slotsLoaded || isCustomCategory) return;
    const currentDayHasNews = timesOfDay.some(t => completedSlots.has(`${selectedDay}|${t.value}`));
    if (!currentDayHasNews) {
      // Find the most recent available day (daysOfWeek is oldest→newest so last = most recent)
      const validDays = daysOfWeek.filter(d => timesOfDay.some(t => completedSlots.has(`${d.fullDate}|${t.value}`)));
      if (validDays.length > 0) {
        const newDay = validDays[validDays.length - 1].fullDate;
        // Pick the latest slot for that day (Evening before Morning) — reverse so newest wins
        const avail = [...timesOfDay].reverse().find(t => completedSlots.has(`${newDay}|${t.value}`));
        setSelectedDay(newDay);
        if (avail) setSelectedTime(avail.value);
      }
    } else if (!completedSlots.has(`${selectedDay}|${selectedTime}`)) {
      // Day is fine but selected time slot is unavailable — pick latest available slot for this day
      const avail = [...timesOfDay].reverse().find(t => completedSlots.has(`${selectedDay}|${t.value}`));
      if (avail) setSelectedTime(avail.value);
    }
  }, [slotsLoaded, completedSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) setShowMobileMenu(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { localStorage.setItem('rundown_view_mode', viewMode); }, [viewMode]);

  // ── Mark today as a perfect day when all feed categories are caught up ────────
  useEffect(() => {
    if (gamifiedStats.allCaughtUp) markPerfectDay();
  }, [gamifiedStats.allCaughtUp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize === 'large' ? '18px' : '16px';
    localStorage.setItem('rundown_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (selectedCategory === 'My Rundown') return;
    if (!newsSummary) { setStories([]); setHasPunchyBullets(false); storiesCategoryRef.current = null; return; }

    const { stories: built, hasPunchyBullets: punchy } = buildStories(
      newsSummary.content,
      newsSummary.stories_content
    );
    setStories(built);
    setHasPunchyBullets(punchy);
    storiesCategoryRef.current = newsSummary.category; // tag which category these stories are

    if (goToLastStoryRef.current && built.length > 0) {
      setStoryIndex(built.length - 1);
      goToLastStoryRef.current = false;
    }
  }, [newsSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!goToLastStoryRef.current) setStoryIndex(0);
  }, [selectedCategory, selectedDay, selectedTime]);

  useEffect(() => {
    if (viewMode !== 'stories') return;
    const handler = (e) => {
      const { idx, stories, cats, cat } = storyNavRef.current;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (idx < stories.length - 1) { setStoryIndex(i => i + 1); }
        else { const ci = cats.indexOf(cat); if (ci < cats.length - 1) { handleSelectCategory(cats[ci + 1]); setStoryIndex(0); } }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (idx > 0) { setStoryIndex(i => i - 1); }
        else { const ci = cats.indexOf(cat); if (ci > 0) { goToLastStoryRef.current = true; handleSelectCategory(cats[ci - 1]); } }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode]);

  useEffect(() => {
    const categoryRef = categoryScrollRef.current;
    const dayRef = dayScrollRef.current;
    const handleCategoryScroll = () => checkScrollPosition(categoryScrollRef, setShowCategoryLeftArrow, setShowCategoryRightArrow);
    const handleDayScroll = () => checkScrollPosition(dayScrollRef, setShowDayLeftArrow, setShowDayRightArrow);
    if (categoryRef) categoryRef.addEventListener('scroll', handleCategoryScroll);
    if (dayRef) dayRef.addEventListener('scroll', handleDayScroll);
    handleCategoryScroll(); handleDayScroll();
    const t = setTimeout(() => { handleCategoryScroll(); handleDayScroll(); }, 100);
    return () => {
      if (categoryRef) categoryRef.removeEventListener('scroll', handleCategoryScroll);
      if (dayRef) dayRef.removeEventListener('scroll', handleDayScroll);
      clearTimeout(t);
    };
  }, [customCategories, daysOfWeek]);

  const handleFetchNews = async () => {
    // While a snapshot feed is playing, keep the snapshot stories — don't fetch live news.
    if (snapshotPlayRef.current) return;
    if (!selectedCategory || !selectedDay || !selectedTime) return;

    // ── Slot-status gate: never fetch until we know which slots are complete ──
    // Without this, the very first call races against the completedSlots fetch
    // and can read partial rows before __completed__ has been written.
    if (!slotsLoaded) return;

    // ── My Rundown: parallel fetch for all selected categories ──
    if (selectedCategory === 'My Rundown') {
      if (!user || feedCategories.length === 0) return;
      // Generation guard: don't show partial My Rundown while slot is still generating
      if (slotsLoaded && isSlotUnavailable(selectedDay, selectedTime)) {
        setNewsSummary(null); setNewsNotAvailable(false); return;
      }
      // Already loaded for this day/slot — don't re-fetch or interrupt narration
      if (newsSummary?.category === 'My Rundown' && newsSummary?.day === selectedDay && newsSummary?.time_slot === selectedTime) return;
      // Content is actually changing — now safe to cancel narration and queue restart
      if (narrationStateRef.current.active) {
        narrateFnRef.current.cancelAudioKeepActive?.();
        narrationStateRef.current.pendingLoad = true;
        narrationStateRef.current.paused = false;
        setIsPaused(false);
      }
      setNewsLoading(true); setNewsNotAvailable(false); setNewsSummary(null);
      try {
        const results = await Promise.all(
          feedCategories.map(cat =>
            // Deliberately NOT selecting source_articles: it's a JSONB blob of 150-200 KB
            // per row (embedded base64 thumbnails), and we only ever read one image URL
            // out of it. Falling back to the category image costs nothing and saves
            // megabytes per feed load. See lead_image_url proposal to the backend.
            supabase.from('news_summaries').select('content, stories_content')
              .eq('category', cat).eq('day', selectedDay).eq('time_slot', selectedTime)
              .eq('language', newsLanguage)
              .is('user_id', null).is('shared_key', null).maybeSingle()
          )
        );
        const merged = [];
        let anyPunchy = false;
        results.forEach(({ data }, idx) => {
          if (!data) return;
          const cat = feedCategories[idx];
          const color = CATEGORY_COLORS[cat] || '#6366f1';
          const storyImage = CATEGORY_IMAGES[cat] || '';
          const { stories: catStories, hasPunchyBullets: catPunchy } = buildStories(data.content, data.stories_content);
          if (catPunchy) anyPunchy = true;
          catStories.forEach(s => merged.push({ ...s, feedCategory: cat, feedCatColor: color, storyImage }));
        });
        if (merged.length === 0) { setNewsNotAvailable(true); setNewsSummary(null); return; }
        setStories(merged);
        storiesCategoryRef.current = 'My Rundown';
        setHasPunchyBullets(anyPunchy);
        setNewsSummary({ category: 'My Rundown', day: selectedDay, time_slot: selectedTime, generated_at: new Date().toISOString() });
        setNewsNotAvailable(false);
      } catch (err) {
        console.error('My Rundown fetch error:', err);
        setNewsNotAvailable(true); setNewsSummary(null);
      } finally { setNewsLoading(false); }
      return;
    }

    const isCustom = customCategories.includes(selectedCategory);
    // For custom, always use 'Daily' time slot
    const fetchTimeSlot = isCustom ? 'Daily' : selectedTime;

    // ── Generation guard: don't fetch partial content while a slot is still generating ──
    // slotsLoaded ensures we wait for the first completedSlots fetch before deciding.
    if (slotsLoaded && !isCustom && isSlotUnavailable(selectedDay, fetchTimeSlot)) {
      setNewsSummary(null); setNewsNotAvailable(false);
      return; // render will show "generating / not available" via the slot-unavailable path
    }
    // Already loaded for this selection — don't re-fetch or interrupt narration
    if (newsSummary && newsSummary.category === selectedCategory && newsSummary.day === selectedDay && newsSummary.time_slot === fetchTimeSlot && (newsSummary.language || 'en') === newsLanguage) {
      return;
    }
    // Content is actually changing — now safe to cancel narration and queue restart
    if (narrationStateRef.current.active) {
      narrateFnRef.current.cancelAudioKeepActive?.();
      narrationStateRef.current.pendingLoad = true;
      narrationStateRef.current.paused = false;
      setIsPaused(false);
    }
    // Serve an already-downloaded day straight from cache — no request, no spinner.
    if (!isCustom) {
      const hit = readDayCache('one', selectedCategory, selectedDay, selectedTime, newsLanguage);
      if (hit) { setNewsSummary(hit); setNewsNotAvailable(false); setShowAllSources(false); setNewsLoading(false); return; }
    }
    setNewsLoading(true);
    setNewsNotAvailable(false);
    try {
      let data;
      if (isCustom) {
        const sharedKey = (customCategoryDescriptions[selectedCategory] || selectedCategory).toLowerCase().trim();
        const q = supabase.from('news_summaries').select('category, day, time_slot, language, content, stories_content, generated_at, briefing')
          .eq('shared_key', sharedKey).is('user_id', null).eq('day', selectedDay).eq('time_slot', 'Daily');
        const r = await q.maybeSingle();
        if (r.error) throw r.error;
        data = r.data;
      } else {
        // Routed through /api/news (a Vercel serverless function) instead of straight to
        // Supabase — it sets a Cache-Control header so repeat requests for the same
        // day/category/slot, from ANY visitor, are served from Vercel's edge cache instead
        // of hitting the database again. See api/news.js for the cache-duration logic.
        const params = new URLSearchParams({ mode: 'one', category: selectedCategory, day: selectedDay, timeSlot: selectedTime, language: newsLanguage });
        const r = await fetch(`/api/news?${params}`);
        if (!r.ok) throw new Error('news fetch failed');
        data = await r.json();
      }
      if (!data) { setNewsNotAvailable(true); setNewsSummary(null); return; }
      if (!isCustom) writeDayCache('one', selectedCategory, selectedDay, selectedTime, newsLanguage, data);
      setNewsSummary(data); setNewsNotAvailable(false); setShowAllSources(false);
      if (user) {
        fetch(`${BACKEND_URL}/api/metrics/track`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, eventType: 'news_view', category: selectedCategory, day: selectedDay, time: selectedTime })
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsNotAvailable(true); setNewsSummary(null);
    } finally { setNewsLoading(false); }
  };

  const startProgressBar = () => {
    setGenerationProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    // Advance to ~88% over 15 seconds, then hold until poll completes
    let pct = 0;
    progressIntervalRef.current = setInterval(() => {
      pct += (88 - pct) * 0.07;
      setGenerationProgress(Math.min(pct, 88));
    }, 400);
  };

  const finishProgressBar = (cb) => {
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
    setGenerationProgress(100);
    setTimeout(() => { setGenerationProgress(0); cb(); }, 400);
  };

  const handleGenerateCustomCategory = async () => {
    if (!customCategories.includes(selectedCategory)) return;
    if (selectedDay !== today) return;
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
    try {
      setNewsLoading(true);
      startProgressBar();
      const sharedKey = (customCategoryDescriptions[selectedCategory] || selectedCategory).toLowerCase().trim();
      const description = customCategoryDescriptions[selectedCategory] || selectedCategory;
      const response = await fetch(`${BACKEND_URL}/api/generate/custom-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, category: selectedCategory, description, day: selectedDay, timeSlot: 'Daily' })
      });
      if (!response.ok) { finishProgressBar(() => setNewsLoading(false)); return; }
      const res = await response.json();
      const category = selectedCategory, day = selectedDay;
      // If already exists, start polling immediately
      const initialDelay = res.status === 'already_exists' ? 0 : 5000;
      let attempts = 0;
      const poll = async () => {
        attempts++;
        // Named columns, not '*' — '*' drags source_articles (and any future wide
        // column) along on a poll that runs every 5s for up to 3 minutes.
        const { data } = await supabase.from('news_summaries')
          .select('category, day, time_slot, language, content, stories_content')
          .eq('shared_key', sharedKey).is('user_id', null).eq('day', day).eq('time_slot', 'Daily').maybeSingle();
        if (data) {
          finishProgressBar(() => { setNewsSummary(data); setNewsNotAvailable(false); setNewsLoading(false); });
          pollTimerRef.current = null;
        } else if (attempts < 36) { pollTimerRef.current = setTimeout(poll, 5000); }
        else { finishProgressBar(() => { setNewsLoading(false); setNewsNotAvailable(true); }); pollTimerRef.current = null; }
      };
      pollTimerRef.current = setTimeout(poll, initialDelay);
    } catch (error) { console.error('Error generating:', error); finishProgressBar(() => setNewsLoading(false)); }
  };


  useEffect(() => {
    if (selectedCategory && selectedDay && selectedTime) handleFetchNews();
  }, [selectedCategory, selectedDay, selectedTime, newsLanguage, completedSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const isCurrentSlot = selectedTime === currentTimeSlot && selectedDay === today;
    if (newsNotAvailable && customCategories.includes(selectedCategory) && user && isCurrentSlot)
      handleGenerateCustomCategory();
  }, [newsNotAvailable, selectedCategory, selectedTime, selectedDay]);

  // Load (or bootstrap) the app profile after a successful Supabase auth, then sign in.
  const completeSignIn = async (authUser) => {
    try {
      // OTP creates the auth user but not our `users` row — ensure it exists (verified).
      const ensure = await fetch(`${BACKEND_URL}/api/auth/ensure-profile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authUser.id, email: authUser.email }),
      }).then(r => r.ok ? r.json() : null).catch(() => null);
      const userProfile = ensure?.profile || {};

      const { data: categoriesData } = await supabase.from('custom_categories').select('category_name, category_description').eq('user_id', authUser.id).is('deleted_at', null);
      const categories = categoriesData?.map(c => c.category_name) || [];
      const descriptions = Object.fromEntries((categoriesData || []).map(c => [c.category_name, c.category_description || c.category_name]));
      const feed = userProfile.feed_categories || [];
      const socialProfile = await fetch(`${BACKEND_URL}/api/social/setup-username`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: authUser.id, email: authUser.email }),
      }).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      const userData = {
        id: authUser.id,
        email: authUser.email,
        username: socialProfile.username || userProfile.username || null,
        display_name: socialProfile.display_name || userProfile.display_name || null,
        avatar_color: socialProfile.avatar_color || userProfile.avatar_color || '#6366f1',
        categories,
        emailPreferences: normalizeEmailPrefs(userProfile.email_preferences || {}),
        feedCategories: feed,
      };
      localStorage.setItem('newsdigest_user', JSON.stringify(userData));
      setUser(userData); setCustomCategories(categories); setCustomCategoryDescriptions(descriptions); setEmailPreferences(userData.emailPreferences);
      loadSocialData(authUser.id);
      setFeedCategories(feed);
      if (feed.length > 0) setSelectedCategory('My Rundown');
      setShowAuth(false); setShowMobileMenu(false); setEmail(''); setOtpCode(''); setOtpStep('email'); setAuthMessage(null);
      navigate('/my-feed');
    } catch (error) {
      setAuthMessage({ type: 'error', text: 'Signed in, but failed to load your profile. Please refresh.' });
    }
  };

  // Passwordless: email a 6-digit code (creates the account on first use).
  const handleSendCode = async () => {
    const addr = email.trim();
    if (!addr) { setAuthMessage({ type: 'error', text: 'Enter your email.' }); return; }
    setAuthMessage(null); setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true } });
    setAuthLoading(false);
    if (error) { setAuthMessage({ type: 'error', text: error.message }); return; }
    setOtpStep('code');
    setAuthMessage({ type: 'success', text: `We emailed a code to ${addr}. Enter it below to continue.` });
  };

  // Verify the code → sign in / create the session.
  const handleVerifyCode = async () => {
    const code = otpCode.trim();
    // Supabase's OTP length is a project setting (6-10 digits), so don't hard-code 6 —
            // a longer code was being truncated on entry, which made sign-in impossible.
    if (code.length < 6) { setAuthMessage({ type: 'error', text: 'Enter the code from your email.' }); return; }
    setAuthMessage(null); setAuthLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (error || !data?.user) {
      setAuthLoading(false);
      setAuthMessage({ type: 'error', text: error?.message || 'That code is invalid or expired. Try again.' });
      return;
    }
    await completeSignIn(data.user);
    setAuthLoading(false);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;
    const title = newCategory.trim().slice(0, 25);
    const description = newCategoryDescription.trim() || title;
    const body = { user_id: user.id, category_name: title, category_description: description };
    if (selectedSharedKey) body.shared_key_override = selectedSharedKey;
    const res = await fetch(`${BACKEND_URL}/api/user/custom-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const e = await res.json();
      setAuthMessage({ type: 'error', text: e.error || 'Failed to save category.' });
      return;
    }
    // Replace existing category in state (only 1 allowed)
    const updated = { ...user, categories: [title] };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated);
    setCustomCategories([title]);
    setCustomCategoryDescriptions({ [title]: description });
    setNewCategory(''); setNewCategoryDescription(''); setSelectedSharedKey(null); setShowCategoryModal(false);
    setSelectedCategory(title); setSelectedDay(today);
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    const res = await fetch(`${BACKEND_URL}/api/user/custom-category`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, category_name: categoryToDelete })
    });
    if (!res.ok) { console.error('Error deleting category'); return; }
    const updated = { ...user, categories: [] };
    localStorage.setItem('newsdigest_user', JSON.stringify(updated));
    setUser(updated); setCustomCategories([]);
    setCustomCategoryDescriptions({});
    setCategoryLockedToday(true);
    if (selectedCategory === categoryToDelete) setSelectedCategory('World News');
  };

  const normalizeEmailPrefs = (raw) => {
    const slots = ['morning', 'evening'];
    const out = {};
    // Categories: new flat format has raw.categories array; old per-slot format had categories inside each slot
    if (Array.isArray(raw.categories) && raw.categories.length) {
      out.categories = raw.categories;
    } else {
      const firstSlotWithCats = slots.find(s => raw[s]?.categories?.length);
      out.categories = firstSlotWithCats ? raw[firstSlotWithCats].categories : [...defaultCategories];
    }
    // Slot enabled flags
    slots.forEach(slot => {
      const pref = raw[slot];
      if (typeof pref === 'boolean') out[slot] = pref;
      else if (pref && typeof pref === 'object') out[slot] = pref.enabled || false;
      else out[slot] = false;
    });
    return out;
  };

  const saveEmailPrefs = (updated) => {
    setEmailPreferences(updated);
    if (user) {
      const userData = { ...user, emailPreferences: updated };
      localStorage.setItem('newsdigest_user', JSON.stringify(userData));
      setUser(userData);
      fetch(`${BACKEND_URL}/api/user/email-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, preferences: updated })
      }).catch(err => console.error('Failed to save email preferences:', err));
    }
  };

  const saveFeedCategories = (cats) => {
    setFeedCategories(cats);
    const userData = { ...user, feedCategories: cats };
    localStorage.setItem('newsdigest_user', JSON.stringify(userData));
    setUser(userData);
    fetch(`${BACKEND_URL}/api/user/feed-categories`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, categories: cats })
    }).catch(err => console.error('Failed to save feed categories:', err));
  };


  const saveNewsLanguage = (lang) => {
    setNewsLanguage(lang);
    localStorage.setItem('rundown_news_language', lang);
    if (user) {
      fetch(`${BACKEND_URL}/api/user/news-language`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, language: lang })
      }).catch(err => console.error('Failed to save news language:', err));
    }
  };

  const toggleFeedPickerCat = (cat) => {
    setFeedPickerDraft(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleEmailSlotToggle = (slotKey) => {
    saveEmailPrefs({ ...emailPreferences, [slotKey]: !emailPreferences[slotKey] });
  };

  const handleCategoryEmailToggle = (category) => {
    const cats = emailPreferences.categories || [];
    const newCats = cats.includes(category) ? cats.filter(c => c !== category) : [...cats, category];
    saveEmailPrefs({ ...emailPreferences, categories: newCats });
  };

  const checkScrollPosition = (ref, setLeftArrow, setRightArrow) => {
    if (ref.current) {
      setLeftArrow(ref.current.scrollLeft > 0);
      setRightArrow(ref.current.scrollLeft < ref.current.scrollWidth - ref.current.clientWidth - 10);
    }
  };

  const isMobile = windowWidth < 768;

  /* ── Shared pill styles (inspired by attached image) ── */
  const dayPill = (active, disabled = false) => ({
    padding: '0.45rem 1rem',
    background: active ? '#111827' : 'white',
    color: active ? 'white' : disabled ? '#d1d5db' : '#374151',
    border: active ? 'none' : '1.5px solid #e5e7eb',
    borderRadius: '999px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontSize: '0.82rem',
    fontWeight: active ? '700' : '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    lineHeight: 1.4,
  });

  const timePill = (active, disabled = false) => ({
    padding: '0.35rem 1.1rem',
    background: active ? '#111827' : disabled ? '#f3f4f6' : 'white',
    color: active ? 'white' : disabled ? '#b0b0b8' : '#374151',
    border: active ? 'none' : `1.5px solid ${disabled ? '#e5e7eb' : '#d1d5db'}`,
    borderRadius: '999px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.78rem',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1.2,
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
  });

  const navArrow = (disabled) => ({
    padding: '0.3rem 0.5rem',
    background: 'none',
    border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#e5e7eb' : '#6b7280',
    flexShrink: 0,
    fontSize: '1.1rem',
    lineHeight: 1,
    userSelect: 'none',
    opacity: disabled ? 0.4 : 1,
  });

  // Keep handleSelectCategory ref always fresh (used by narration callbacks)
  handleSelectCategoryRef.current = handleSelectCategory;

  // Trigger narration when new category content finishes loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!narrationStateRef.current.pendingLoad || !narrationStateRef.current.active) return;
    // Don't consume pendingLoad until content is actually ready (avoids premature clear on null).
    if (viewMode === 'stories' && stories.length === 0) return;
    // Critical: only fire once `stories` actually belongs to the category we're loading.
    // The [newsSummary] effect runs setStories() but its commit lags one render; without
    // this guard the consumer fired on the newsSummary change with the PREVIOUS category's
    // stories, consumed pendingLoad, and narration silently never started (worked on retry).
    if (viewMode === 'stories' && selectedCategory !== 'My Rundown'
        && storiesCategoryRef.current !== selectedCategory) return;
    if (viewMode !== 'stories' && !newsSummary?.content && !newsSummary?.stories_content) return;
    narrationStateRef.current.pendingLoad = false;
    const st = narrationStateRef.current;
    clearTimeout(st.pendingNarrateTimer);
    if (viewMode === 'stories') {
      const startIdx = st.pendingStartIndex || 0;
      st.pendingStartIndex = 0;
      setStoryIndex(startIdx);
      // Store in pendingNarrateTimer so stop() can cancel it if the user triggers
      // a new play action before the delay fires — prevents two narrations running
      // simultaneously with the same generation counter.
      st.pendingNarrateTimer = setTimeout(() => {
        st.pendingNarrateTimer = null;
        narrateFnRef.current.narrateStory?.(startIdx);
      }, 200);
    } else {
      const content = narrateFnRef.current.getNarrationContent?.() || newsSummary?.content;
      st.pendingNarrateTimer = setTimeout(() => {
        st.pendingNarrateTimer = null;
        narrateFnRef.current.narrateDigest?.(content);
      }, 200);
    }
    // Depend on `stories` ONLY: this effect must run after setStories() actually
    // commits (not on the earlier newsSummary change, when stories is still stale).
  }, [stories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop narration on unmount
  useEffect(() => { return () => { window.speechSynthesis?.cancel(); }; }, []);

  // Pre-warm TTS cache with all static story transition phrases at startup
  useEffect(() => {
    const fn = narrateFnRef.current;
    STORY_TRANSITIONS.forEach(t => fn.prefetchTTS?.(t));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // No day/time fallback needed — all days and slots are always visible.
  // Disabled slots show "News Not Available" in the body if somehow selected.

  // Fetch completion markers — tells us which day+slot combos have finished generating
  // Re-runs when newsLanguage changes so Arabic/English slots are tracked separately
  const completedInFlight = useRef(false);
  const completedFailures = useRef(0);
  useEffect(() => {
    let cancelled = false;
    let timer = null;

    // Content lands twice a day, at fixed times. A 30s interval meant ~2,880 requests per
    // open tab per day, all but a couple of them byte-identical — polling to catch a
    // predictable event. We fetch once, refetch when the user returns to the app (which is
    // both cheaper and more timely than any interval), and otherwise only retry on failure.
    // This is also the right shape for the native app, where foreground is the real signal.
    const schedule = (overrideMs) => {
      if (cancelled) return;
      const n = completedFailures.current;
      if (overrideMs == null && n === 0) return;   // healthy: wait for a focus event instead
      const delay = overrideMs != null ? overrideMs : Math.min(30000 * 2 ** n, 300000);
      timer = setTimeout(fetchCompleted, delay);
    };

    const fetchCompleted = async () => {
      if (cancelled) return;
      // Never stack these requests — but always leave a retry queued. Returning bare
      // here deadlocks: StrictMode (and any effect re-run) starts a second call while
      // the first is still in flight, the second bails, and the first — now cancelled —
      // schedules nothing. completedSlots then stays empty and the feed renders blank.
      if (completedInFlight.current) { schedule(250); return; } // retry shortly, not a full poll cycle
      if (typeof document !== 'undefined' && document.hidden) { schedule(); return; } // don't poll hidden tabs
      completedInFlight.current = true;
      try {
        let q = supabase
          .from('news_summaries')
          .select('day, time_slot')
          .eq('category', '__completed__')
          .is('user_id', null)
          .is('shared_key', null);
        // Filter by language if the column exists (graceful: missing column returns all rows)
        if (newsLanguage) q = q.eq('language', newsLanguage);
        // supabase-js resolves (it does not throw) on an HTTP error, so `error` must be
        // read explicitly — otherwise a 5xx looks like "no data yet" and the UI waits forever.
        const { data, error } = await q;
        if (cancelled) return;
        if (error || !data) {
          completedFailures.current += 1;
        } else {
          completedFailures.current = 0;
          // Use functional update so we only replace the Set when content actually changes.
          // A new Set reference (even with same entries) triggers the handleFetchNews effect
          // which would cancel narration — so we must return the same `prev` when unchanged.
          setCompletedSlots(prev => {
            const incoming = data.map(r => `${r.day}|${r.time_slot}`);
            if (prev.size === incoming.length && incoming.every(k => prev.has(k))) return prev;
            return new Set(incoming);
          });
        }
      } catch (_) {
        completedFailures.current += 1;
      } finally {
        completedInFlight.current = false;
        // Always unblock the UI. This flag gates the news fetch, so leaving it false on a
        // failed request is what turns a backend hiccup into an app that loads forever.
        if (!cancelled) setSlotsLoaded(true);
        schedule();
      }
    };

    fetchCompleted();
    // Retry promptly when the user comes back to a tab that failed while hidden.
    // Returning to the app is exactly when fresh data matters — and it's when a native
    // app would fire onResume. Refetch on focus, not on a timer.
    const onVisible = () => { if (!document.hidden) fetchCompleted(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [newsLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Briefing feed: fetch metadata for all categories ────────────────────────
  // Fetches all completed slots for selectedDay. Evening's digest already carries every
  // Morning story forward (updated in place or unchanged) plus new ones appended, so once
  // Evening exists its row is used on its own — see the `hasEvening` filter below.
  // Each story is tagged with generatedSlot ('Morning'|'Evening') for display/tracking.
  // Cache key includes which slots are present so it self-invalidates when Evening arrives.
  useEffect(() => {
    if (!selectedDay || !slotsLoaded) return;
    // Determine which slots have completed for this day
    const slotOrder = ['Evening', 'Daily', 'Morning'];
    const presentSlots = slotOrder.filter(t => completedSlots.has(`${selectedDay}|${t}`));
    // No completed slot for this day yet (generation running late, paused, or genuinely
    // no news for this day) — bail out of the loading state instead of leaving
    // briefingLoading stuck at its initial `true` forever, which reads as an infinite
    // skeleton with nothing ever telling the UI to stop waiting.
    //
    // Clear the data too. Bailing without clearing left the *previous* day's stories in
    // briefingData under the new day's date — Scroll happens to guard on its own and shows
    // "No stories available", but the player page read straight from briefingData and
    // cheerfully played Friday's news under a Wednesday header.
    if (presentSlots.length === 0) { setBriefingData({}); setBriefingLoading(false); return; }
    // Extra categories beyond the default 12 (subcategories picked into My News) change
    // what this fetch covers, so they have to be part of the key — otherwise adding one
    // would serve a stale cache entry from before it existed.
    const extraCats = feedCategories.filter(c => !defaultCategories.includes(c)).sort().join(',');
    const cacheKey = `${selectedDay}|${presentSlots.join(',')}|${newsLanguage}|${extraCats}`;
    // Serve from cache — avoids re-fetching when user switches back to an already-loaded day
    if (briefingCacheRef.current[cacheKey]) {
      setBriefingData(briefingCacheRef.current[cacheKey]);
      setBriefingLoading(false);
      return;
    }
    setBriefingLoading(true);
    // Subcategories (e.g. Football, AI) aren't in defaultCategories — All News stays
    // parent-level only — but a user can still pick one into My News. Without folding
    // feedCategories in here, briefingData would simply never have an entry for it and
    // My Feed would render it as empty every day, silently.
    const cats = [...new Set([...defaultCategories, ...feedCategories])];
    Promise.allSettled(cats.map(async (cat) => {
      try {
        // This is the heavy one: full article text for every category, on every load.
        // A generated day+slot is immutable, so a cache hit skips the request entirely.
        const slotKey = presentSlots.join('+');
        const cached = readDayCache('list', cat, selectedDay, slotKey, newsLanguage);
        let data = Array.isArray(cached) ? cached : null;  // never trust a non-array here
        if (!data) {
          // Same shared edge cache as the single-category fetch above — see api/news.js.
          const params = new URLSearchParams({ mode: 'list', category: cat, day: selectedDay, slots: presentSlots.join(','), language: newsLanguage });
          const res = await fetch(`/api/news?${params}`);
          data = res.ok ? await res.json() : null;
          if (data && data.length) writeDayCache('list', cat, selectedDay, slotKey, newsLanguage, data);
        }
        if (!data || data.length === 0) return [cat, null];
        // Sort Evening first so incremental stories appear on top
        let sorted = [...data].sort((a, b) => slotOrder.indexOf(a.time_slot) - slotOrder.indexOf(b.time_slot));
        // Evening's digest already reproduces every Morning story (updated in place or
        // carried over unchanged) plus any new ones appended — see generateEveningUpdate
        // on the backend. Showing Morning's row alongside it would duplicate every story
        // that Evening didn't touch, so once Evening exists it fully replaces Morning.
        if (sorted.some(r => r.time_slot === 'Evening')) sorted = sorted.filter(r => r.time_slot !== 'Morning');
        // Category briefing — prefer the newest slot's summary (Evening over Morning)
        const briefing = sorted.find(r => r.briefing && r.briefing.trim())?.briefing || null;
        // Merge stories across slots, tagging each with its source slot
        const s = sorted.flatMap(row => {
          const { stories } = buildStories(row.content, row.stories_content);
          return stories.map(story => ({ ...story, generatedSlot: row.time_slot }));
        });
        if (s.length === 0) return [cat, null];
        const totalWords = s.reduce((acc, story) => {
          const fields = [
            ...(story.allBullets || story.tightBullets || []),
            story.perspectives,
            story.why,
            story.headline,
          ].filter(Boolean);
          return acc + fields.join(' ').split(/\s+/).filter(Boolean).length;
        }, 0);
        const estimatedSec = Math.max(10, Math.round((totalWords / 200) * 60));
        return [cat, { storyCount: s.length, estimatedSec, previewStories: s.slice(0, 3), allStories: s, briefing }];
      } catch { return [cat, null]; }
    })).then(results => {
      const out = {};
      results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value[1]) out[cats[i]] = r.value[1]; });
      briefingCacheRef.current[cacheKey] = out; // store in cache for this session
      setBriefingData(out);
      setBriefingLoading(false);
    });
  }, [selectedDay, newsLanguage, slotsLoaded, completedSlots, feedCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync URL → selectedCategory for /category/:name routes ──────────────────
  useEffect(() => {
    const match = location.pathname.match(/^\/category\/([^/]+)/);
    if (match) {
      const cat = decodeURIComponent(match[1]);
      if (cat !== selectedCategory) handleSelectCategoryRef.current?.(cat);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Force stories mode (new audio-first design) ─────────────────────────────
  useEffect(() => { if (viewMode !== 'stories') { setViewMode('stories'); localStorage.setItem('rundown_view_mode', 'stories'); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation helpers ────────────────────────────────────────────────────────
  const navCategories = (user && feedCategories.length > 0) ? ['My Rundown', ...allCategories] : allCategories;
  const navCatIdx = navCategories.indexOf(selectedCategory);
  const prevCatNav = navCatIdx > 0 ? navCategories[navCatIdx - 1] : null;
  const nextCatNav = navCatIdx < navCategories.length - 1 ? navCategories[navCatIdx + 1] : null;

  const scheduleNarrate = (idx, delay = 150) => {
    const st = narrationStateRef.current;
    clearTimeout(st.pendingNarrateTimer);
    st.pendingNarrateTimer = setTimeout(() => { st.pendingNarrateTimer = null; narrateFnRef.current.narrateStory?.(idx); }, delay);
  };

  // Switch the player to another category WITHIN the active snapshot feed (My Saves /
  // Interesting), keeping snapshot mode so it never falls back into live news.
  const goToSnapshotCategory = (cat, idx) => {
    const map = snapshotPlayRef.current?.map;
    const snapStories = map?.[cat]?.allStories;
    if (!snapStories?.length) return false;
    const cats = Object.keys(map);
    snapshotPlayRef.current = { category: cat, stories: snapStories, map };
    playlistCatsRef.current = cats;
    setPlayerContextCategories(cats);
    setSelectedCategory(cat);
    setStories(snapStories);
    setStoryIndex(idx);
    setNarrationProgress(0);
    narrationDurationRef.current = 0;
    storyNavRef.current = { idx, stories: snapStories, cats, cat };
    if (isNarrating) { narrateFnRef.current.cancelAudioKeepActive?.(); setTimeout(() => narrateFnRef.current.narrateStory(idx), 0); }
    return true;
  };

  const goNext = () => {
    const isLast = storyIndex === stories.length - 1;
    if (!isLast) {
      const newIdx = storyIndex + 1;
      setStoryIndex(newIdx);
      if (isNarrating && !isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); scheduleNarrate(newIdx); }
      else if (isNarrating && isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); setNarrationProgress(0); narrationDurationRef.current = 0; }
    } else if (repeatMode) {
      setStoryIndex(0);
      if (isNarrating && !isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); scheduleNarrate(0); }
      else if (isNarrating && isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); setNarrationProgress(0); narrationDurationRef.current = 0; }
    } else if (snapshotPlayRef.current) {
      // Advance to the next category within the snapshot feed (stays in My Saves / Interesting)
      const cats = Object.keys(snapshotPlayRef.current.map);
      const i = cats.indexOf(selectedCategory);
      const next = i >= 0 && i < cats.length - 1 ? cats[i + 1] : null;
      if (next) goToSnapshotCategory(next, 0);
    } else if (nextCatNav) {
      handleSelectCategory(nextCatNav); setStoryIndex(0);
      if (isNarrating) { narrateFnRef.current.cancelAudioKeepActive?.(); narrationStateRef.current.pendingLoad = !isPaused; }
    }
  };

  const goPrev = () => {
    const isFirst = storyIndex === 0;
    if (!isFirst) {
      const newIdx = storyIndex - 1;
      setStoryIndex(newIdx);
      if (isNarrating && !isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); scheduleNarrate(newIdx); }
      else if (isNarrating && isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); setNarrationProgress(0); narrationDurationRef.current = 0; }
    } else if (snapshotPlayRef.current) {
      // Retreat to the previous category within the snapshot feed (its last story)
      const cats = Object.keys(snapshotPlayRef.current.map);
      const i = cats.indexOf(selectedCategory);
      const prev = i > 0 ? cats[i - 1] : null;
      if (prev) goToSnapshotCategory(prev, Math.max(0, (snapshotPlayRef.current.map[prev].allStories.length - 1)));
    } else if (prevCatNav) {
      if (isNarrating) { narrateFnRef.current.cancelAudioKeepActive?.(); narrationStateRef.current.pendingLoad = !isPaused; }
      else { goToLastStoryRef.current = true; }
      handleSelectCategory(prevCatNav);
    }
  };

  storyGoRef.current = { goNext, goPrev };

  // iOS Safari only lets speechSynthesis start from inside a user gesture. The browser voice
  // is our fallback when TTS fails (no credit, network, 5xx), but by then we're several
  // hundred milliseconds past the tap — inside a promise callback — so Safari refuses it and
  // the story just never plays. Speaking one empty utterance on the tap itself unlocks the
  // API for the rest of the session; after that the late fallback is allowed to speak.
  const speechUnlockedRef = useRef(false);
  const unlockSpeech = () => {
    if (speechUnlockedRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      synth.speak(u);
      speechUnlockedRef.current = true;
    } catch {}
  };

  const onPlayFrom = (idx) => {
    if (isNarrating) narrateFnRef.current.stop();
    unlockSpeech();
    // '/listen' is the player itself, not a feed — recording it here lost which feed the
    // player was playing, so the corpus toggle fell back to "All news" and the Swipe
    // hand-off had no playlist to look up. Keep whatever feed we came from.
    const srcPath = location.pathname === '/listen'
      ? (playerSourcePath.current || '/')
      : location.pathname;
    playerSourcePath.current = srcPath;
    const ctxCats = srcPath === '/my-feed'
      ? feedCategories
      : defaultCategories;
    setPlayerContextCategories(ctxCats);
    const st = narrationStateRef.current;
    st.active = true; st.pendingLoad = false; st.audio = null; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(idx);
    narrateFnRef.current.narrateStory(idx);
  };

  const handleSpeedCycle = () => {
    const SPEEDS_LIST = [0.75, 1, 1.25, 1.5, 2];
    const si = SPEEDS_LIST.indexOf(playbackSpeed);
    const next = SPEEDS_LIST[(si + 1) % SPEEDS_LIST.length];
    playbackSpeedRef.current = next;
    setPlaybackSpeed(next);
    if (narrationStateRef.current.audio) narrationStateRef.current.audio.playbackRate = next;
  };

  const handleRepeatToggle = () => {
    const next = !repeatModeRef.current;
    repeatModeRef.current = next;
    setRepeatMode(next);
  };

  const handlePlayBriefing = () => {
    const firstCat = defaultCategories.find(c => briefingData[c]?.storyCount > 0) || defaultCategories[0];
    const startIdx = 0;
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    setPlayerContextCategories(defaultCategories);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(startIdx);
    const fromPath = location.pathname;
    navigate(`/category/${encodeURIComponent(firstCat)}`, { state: { from: fromPath } });
    if (selectedCategory === firstCat && stories.length > 0) {
      narrateFnRef.current.narrateStory(startIdx);
    } else {
      st.pendingLoad = true;
      st.pendingStartIndex = startIdx;
      handleSelectCategory(firstCat);
    }
  };

  const handlePlayCategory = (cat) => {
    const startIdx = 0;
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    // Use the feed/context categories matching where the user played from
    const ctxCats = location.pathname === '/my-feed'
      ? feedCategories
      : defaultCategories;
    setPlayerContextCategories(ctxCats);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(startIdx);
    const fromPath = location.pathname;
    navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: fromPath } });
    if (selectedCategory === cat && stories.length > 0) {
      narrateFnRef.current.narrateStory(startIdx);
    } else {
      st.pendingLoad = true;
      st.pendingStartIndex = startIdx;
      handleSelectCategory(cat);
    }
  };

  // Build a one-briefing-per-category pseudo-story for the snapshot map.
  // ── Period recaps (the week, the month) ─────────────────────────────────────
  //
  // Generated on the backend and stored under the sentinel category `__period__`, keyed on
  // the period's LAST day — so they come back through the same read layer as everything
  // else, with no new endpoint. A chip only appears when its row exists, which means the
  // feature is invisible until the day it has something to say.
  const [periodRecaps, setPeriodRecaps] = useState({ Weekly: null, Monthly: null });

  const periodEnds = useMemo(() => {
    const base = selectedDay || today;
    const d = new Date(`${base}T00:00:00Z`);
    // The most recent Sunday on or before the day being viewed.
    const week = new Date(d);
    week.setUTCDate(week.getUTCDate() - week.getUTCDay());
    // The last day of the month being viewed — unless that is still ahead of today, in
    // which case the month isn't over and the one to offer is the month before.
    let month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    if (month.toISOString().slice(0, 10) > today) {
      month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
    }
    return { Weekly: week.toISOString().slice(0, 10), Monthly: month.toISOString().slice(0, 10) };
  }, [selectedDay, today]);

  useEffect(() => {
    let cancelled = false;
    const load = async (period) => {
      const day = periodEnds[period];
      if (!day) return [period, null];
      try {
        const params = new URLSearchParams({ mode: 'one', category: '__period__', day, timeSlot: period, language: newsLanguage });
        const res = await fetch(`/api/news?${params}`);
        if (!res.ok) return [period, null];
        const row = await res.json();
        const text = (row?.briefing || row?.content || '').trim();
        return [period, text ? { day, text } : null];
      } catch { return [period, null]; }
    };
    Promise.all([load('Weekly'), load('Monthly')]).then(pairs => {
      if (cancelled) return;
      setPeriodRecaps(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
  }, [periodEnds, newsLanguage]);

  const PERIOD_LABEL = { Weekly: 'Weekly', Monthly: 'Monthly' };
  const periodMinutes = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 150));

  // Read: the same bottom sheet a story's "Go deeper" opens, given the recap as its full
  // picture — one prose block, which is exactly the shape that sheet already renders.
  const [periodReader, setPeriodReader] = useState(null);
  const openPeriodRecap = (period) => {
    const r = periodRecaps[period];
    if (!r) return;
    setPeriodReader({
      headline: period === 'Weekly' ? 'Your week' : 'Your month',
      summary: r.text,
      tightBullets: [], allBullets: [], storySources: [],
      _isBriefing: true,
    });
  };

  // Listen: narrated through the same pseudo-story path the category recap uses.
  const playPeriodRecap = (period) => {
    const r = periodRecaps[period];
    if (!r) return;
    if (isNarrating) narrateFnRef.current.stop();
    const label = period === 'Weekly' ? 'Your week' : 'Your month';
    const stories = [{ headline: label, tightBullets: [r.text], allBullets: [r.text], storySources: [], _isBriefing: true }];
    snapshotPlayRef.current = { category: label, stories, map: { [label]: { allStories: stories } } };
    playlistCatsRef.current = [label];
    setPlayerContextCategories([label]);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false; st.pendingLoad = false;
    unlockSpeech();
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setSelectedCategory(label);
    setStories(stories);
    setStoryIndex(0);
    storyNavRef.current = { idx: 0, stories, cats: [label], cat: label };
    setTimeout(() => narrateFnRef.current.narrateStory(0), 0);
  };

  const briefingPseudoStory = (cat, text) => ([{
    headline: `${cat} Recap`,
    tightBullets: [text],
    allBullets: [text],
    storySources: [],
    _isBriefing: true,
  }]);

  // Play the category briefings of the source feed as a playlist. Modeled as a snapshot
  // map (one briefing per category) so the player's next/prev and category strip move
  // between category briefings — exactly like My Saves / Interesting cross-category playback.
  const handleNarrateBriefing = (cat, cats) => {
    const orderedCats = (cats && cats.length ? cats : [cat])
      .filter(c => briefingData[c]?.briefing && briefingData[c].briefing.trim());
    if (!orderedCats.includes(cat) || !briefingData[cat]?.briefing?.trim()) return;
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    const map = {};
    orderedCats.forEach(c => { map[c] = { allStories: briefingPseudoStory(c, briefingData[c].briefing) }; });
    snapshotPlayRef.current = { category: cat, stories: map[cat].allStories, map };
    playlistCatsRef.current = orderedCats;
    setPlayerContextCategories(orderedCats);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false; st.pendingLoad = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setSelectedCategory(cat);
    setStories(map[cat].allStories);
    setStoryIndex(0);
    storyNavRef.current = { idx: 0, stories: map[cat].allStories, cats: orderedCats, cat };
    setTimeout(() => narrateFnRef.current.narrateStory(0), 0);
  };

  const handlePlayStory = (cat, idx) => {
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    const fromPath = location.pathname;

    // ── Snapshot feeds (My Saves / Interesting): narrate from snapshot text ──
    const snapMap = fromPath === '/saved' ? savesBriefingData
                  : fromPath === '/important' ? interestingBriefingData
                  : null;
    if (snapMap && snapMap[cat]?.allStories?.length) {
      const snapStories = snapMap[cat].allStories;
      snapshotPlayRef.current = { category: cat, stories: snapStories, map: snapMap };
      playlistCatsRef.current = Object.keys(snapMap); // keep storyNavRef.cats stable across renders
      setPlayerContextCategories(Object.keys(snapMap));
      const st = narrationStateRef.current;
      st.active = true; st.paused = false; st.pendingLoad = false;
      setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
      setPlayerVisible(true); setPlayerMinimized(false);
      setSelectedCategory(cat);
      setStories(snapStories);
      setStoryIndex(idx);
      navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: fromPath } });
      // storyNavRef is rebuilt from `stories` on the next render; set it now so the
      // immediate narrateStory call reads the snapshot list rather than stale stories.
      storyNavRef.current = { idx, stories: snapStories, cats: Object.keys(snapMap), cat };
      setTimeout(() => narrateFnRef.current.narrateStory(idx), 0);
      return;
    }

    const ctxCats = location.pathname === '/my-feed'
      ? feedCategories
      : defaultCategories;
    setPlayerContextCategories(ctxCats);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(idx);
    navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: fromPath } });
    if (selectedCategory === cat && stories.length > 0) {
      narrateFnRef.current.narrateStory(idx);
    } else {
      st.pendingLoad = true;
      st.pendingStartIndex = idx;
      handleSelectCategory(cat);
    }
  };

  // ── Social helpers ────────────────────────────────────────────────────────────
  const loadSocialData = (userId) => {
    if (!userId) return;
    // Load who I follow
    fetch(`${BACKEND_URL}/api/social/following?userId=${userId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setFollowing(data || []);
        if (data?.length) {
          // Load circle saves + circle popular
          fetch(`${BACKEND_URL}/api/social/circle/saves?userId=${userId}`)
            .then(r => r.ok ? r.json() : []).then(d => setCircleSaves(d || [])).catch(() => {});
          fetch(`${BACKEND_URL}/api/social/circle/popular?userId=${userId}`)
            .then(r => r.ok ? r.json() : []).then(d => setCirclePopular(d || [])).catch(() => {});
        }
      })
      .catch(() => {});
  };

  // Mark a story as read when user navigates into it (separate from play)
  const handleMarkRead = (story, cat, idx) => {
    markSeen(cat, idx);   // session-level, so read badges work for guests and across modes
    setFocus(cat, idx);   // keeps Scroll and Swipe pointing at the same story
    if (!user) return; // guests: no history, no popular contribution
    addToHistory(story, cat, idx, selectedTime || null, selectedDay || null);
    // Count reads toward Popular rankings (same key used by audio listen counter)
    if (story?.headline) {
      const key = headlineKey(story.headline);
      setListenCounts(prev => {
        if (prev[key]) return prev; // already counted this user
        const next = { ...prev, [key]: 1 };
        try { localStorage.setItem('rundown_listen_counts', JSON.stringify(next)); } catch {}
        return next;
      });
    }
    // Track in backend: metrics + social reads table (fire-and-forget).
    // Deferred off the current task: reads arrive in bursts from the scroll flush, and
    // building/dispatching two requests per story alongside the re-render they trigger is
    // enough main-thread work to drop frames. Nothing here is needed for what's on screen.
    if (user) setTimeout(() => {
      fetch(`${BACKEND_URL}/api/metrics/track`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, eventType: 'story_read',
          category: cat, day: selectedDay,
          metadata: { story_index: idx },
        }),
      }).catch(() => {});
      if (story?.headline) {
        fetch(`${BACKEND_URL}/api/reads/sync`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, category: cat, story_index: idx, headline: story.headline }),
        }).catch(() => {});
      }
    }, 0);
  };


  const handlePlayFeed = (cats) => {
    const playable = cats.filter(c => briefingData[c]?.storyCount > 0);
    if (playable.length === 0) return;
    const firstCat = playable[0];
    const startIdx = 0;
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    playlistCatsRef.current = playable;
    setPlayerContextCategories(playable);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(startIdx);
    navigate(`/category/${encodeURIComponent(firstCat)}`, { state: { from: location.pathname } });
    if (selectedCategory === firstCat && stories.length > 0) {
      narrateFnRef.current.narrateStory(startIdx);
    } else {
      st.pendingLoad = true;
      st.pendingStartIndex = startIdx;
      handleSelectCategory(firstCat);
    }
  };

  const handlePlayMyFeed = () => {
    if (feedCategories.length === 0) return;
    const playable = feedCategories.filter(c => briefingData[c]?.storyCount > 0);
    if (playable.length === 0) return;
    const firstCat = playable[0];
    const startIdx = 0;
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    playlistCatsRef.current = playable; // restrict narration to feed categories only
    setPlayerContextCategories(playable);
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(startIdx);
    navigate(`/category/${encodeURIComponent(firstCat)}`, { state: { from: location.pathname } });
    if (selectedCategory === firstCat && stories.length > 0) {
      narrateFnRef.current.narrateStory(startIdx);
    } else {
      st.pendingLoad = true;
      st.pendingStartIndex = startIdx;
      handleSelectCategory(firstCat);
    }
  };

  // ── URL-based routing ────────────────────────────────────────────────────────
  const isSettingsPath  = location.pathname === '/settings';
  const isMyFeedPath    = location.pathname === '/my-feed';
  const isPopularPath   = location.pathname === '/popular';
  const isImportantPath = location.pathname === '/important';
  const isSavedPath     = location.pathname === '/saved';
  // The Listen tab — the player as a page rather than a sheet over a feed.
  const isListenPath    = location.pathname === '/listen';
  const profileRouteMatch = location.pathname.match(/^\/profile\/([^/]+)$/);
  const isProfilePath   = !!profileRouteMatch;
  const storyRouteMatch = location.pathname.match(/^\/category\/([^/]+)\/story\/(\d+)$/);
  const catFromUrl      = storyRouteMatch ? decodeURIComponent(storyRouteMatch[1]) : null;
  const storyIdxFromUrl = storyRouteMatch ? parseInt(storyRouteMatch[2]) : null;
  const briefingRouteMatch = location.pathname.match(/^\/category\/([^/]+)\/briefing$/);
  const isBriefingView  = !!briefingRouteMatch;
  const briefingCat     = briefingRouteMatch ? decodeURIComponent(briefingRouteMatch[1]) : null;

  // Cold loads onto a lingering story/briefing URL arrive with no location.state at all —
  // every in-app navigate() to these routes sets at least { from }, so state is only ever
  // missing when the browser (a mobile PWA resuming its last tab is the common case) opens
  // straight to that URL rather than us routing there. Read as a normal open, that reads as
  // "no asPage", which drops you straight into the summary sheet — or the Category Recap —
  // stacked over an empty background, instead of the tab you'd actually expect on a fresh
  // visit. Send it back to the plain feed once, on the very first render only.
  const coldLoadRedirectedRef = useRef(false);
  useEffect(() => {
    if (coldLoadRedirectedRef.current) return;
    coldLoadRedirectedRef.current = true;
    if ((storyRouteMatch || briefingRouteMatch) && !location.state) {
      navigate('/', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Resolve the category set a given tab path represents — used to pick which
  // sibling categories the Category Recap page can page through.
  const catsForFrom = (from) => {
    if (from === '/my-feed') return feedCategories;
    if (from === '/popular') {
      return defaultCategories.filter(c => (briefingData[c]?.allStories || []).some((s, idx) => {
        const key = headlineKey(s.headline);
        const stored = listenCounts[key] || 0;
        const readToday = gamifiedStats?.todayProgress?.[c]?.listenedIndices;
        const userRead = readToday?.has(idx) ? 1 : 0;
        return Math.max(stored, userRead) > 0;
      }));
    }
    if (from === '/important') return Object.keys(interestingBriefingData);
    return allCategories;
  };
  // Ordered categories (with a briefing) of the feed the briefing was opened from —
  // lets the reader + player move between sibling category briefings.
  const briefingNavCats = isBriefingView
    ? catsForFrom(location.state?.from)
        .filter(c => briefingData[c]?.briefing && briefingData[c].briefing.trim())
    : [];
  const isLatestHome    = !catFromUrl && !isSettingsPath && !isMyFeedPath && !isPopularPath && !isImportantPath && !isSavedPath && !isProfilePath && !isListenPath;
  const isHome          = isLatestHome; // kept for backward compat
  const isStoryView     = !!storyRouteMatch;
  // Opened via the Feed/Stories toggle: the reader IS the page, not a sheet over a tab.
  const isStoriesPage    = isStoryView && !!location.state?.asPage;
  // A story route without asPage is now just the summary sheet over whatever tab you were on.
  const isStorySummary   = isStoryView && !location.state?.asPage;
  // Opened via the Category Recap entry point: same idea, for the briefing view.
  const isSummariesPage  = isBriefingView && !!location.state?.asPage;

  // When the reader sheet is open, which feed sits behind it?
  const storyFrom       = isStoryView ? (location.state?.from || '/') : null;
  const showHomeBg      = isStoryView && !isStoriesPage && (!storyFrom || storyFrom === '/');
  const showMyFeedBg    = isStoryView && !isStoriesPage && storyFrom === '/my-feed';
  const showPopularBg   = isStoryView && !isStoriesPage && storyFrom === '/popular';
  const showImportantBg = isStoryView && !isStoriesPage && storyFrom === '/important';
  const showSavedBg     = isStoryView && !isStoriesPage && storyFrom === '/saved';

  const currentStory    = stories[storyIdxFromUrl ?? storyIndex] || null;
  // Map a source path (handles both '/popular' and 'popular' style values) to the feed's display name.
  const feedNameForPath = (p) => {
    if (!p || p === '/' || p === 'home' || p === 'category') return 'All News';
    if (p === '/my-feed')                      return 'My News';
    if (p === '/popular'   || p === 'popular')  return 'Popular';
    if (p === '/important' || p === 'important') return 'Interesting';
    if (p === '/saved')                        return 'My Interesting';
    return 'All News';
  };
  const miniPlayerVisible = playerVisible && playerMinimized;
  // Show bottom nav everywhere except settings and when full player is open.
  // The summary sheet sits over a live tab, so that tab keeps its nav.
  // Listen is excluded for the same reason Swipe is: it's a full page that renders its own
  // dark nav inside its container, so the global one would be a second bar underneath it.
  const showBottomNav   = !isSettingsPath && !isStoriesPage && !isBriefingView && !isListenPath && !(playerVisible && !playerMinimized && !fullPlayerExiting);

  // ── Feed / Stories toggle — flatten a tab's stories into a swipeable playlist ──
  // Mirrors the ordering each tab already uses for its card list.
  const buildFeedStoriesPlaylist = () => {
    const list = [];
    allCategories.forEach(cat => {
      (briefingData[cat]?.allStories || []).forEach((story, idx) => list.push({ category: cat, storyIndex: idx }));
    });
    return list;
  };
  const buildMyFeedStoriesPlaylist = () => {
    const list = [];
    feedCategories.forEach(cat => {
      (briefingData[cat]?.allStories || []).forEach((story, idx) => list.push({ category: cat, storyIndex: idx }));
    });
    return list;
  };
  const buildPopularStoriesPlaylist = () => {
    const all = [];
    defaultCategories.forEach(cat => {
      const d = briefingData[cat];
      if (!d?.allStories?.length) return;
      const readToday = gamifiedStats?.todayProgress?.[cat]?.listenedIndices;
      d.allStories.forEach((story, idx) => {
        const key = headlineKey(story.headline);
        const stored = listenCounts[key] || 0;
        const userRead = readToday?.has(idx) ? 1 : 0;
        all.push({
          category: cat, storyIndex: idx,
          listenCount: Math.max(stored, userRead),
          interestCount: savedCounts[key] || 0, rankKey: key,
        });
      });
    });
    // Same comparator as the visible list in PopularTab — if these two ever disagree, the
    // order you swipe through stops matching the order you tapped from.
    return rankStories(all.filter(s => s.listenCount > 0), 'reads')
      .map(({ category, storyIndex }) => ({ category, storyIndex }));
  };
  const buildInterestingStoriesPlaylist = () => {
    const all = [];
    Object.keys(interestingBriefingData).forEach(cat => {
      (interestingBriefingData[cat]?.allStories || []).forEach((story, idx) => {
        all.push({ category: cat, storyIndex: idx, interestCount: story._interestCount || 0 });
      });
    });
    return all.sort((a, b) => b.interestCount - a.interestCount).map(({ category, storyIndex }) => ({ category, storyIndex }));
  };
  // Enter the Reels-style reader as a real page for the given tab, starting at story 1.
  const enterStoriesMode = (fromPath, playlist) => {
    // Empty feed (e.g. Interesting before anything is saved): don't swallow the tap.
    // Show the tab in Scroll mode so the empty state explains itself.
    if (!playlist.length) { rememberReadMode('scroll'); navigate(fromPath); return; }
    // Continue from wherever Scroll mode was, when that story is in this playlist.
    const f = focusRef.current;
    const start = (f && playlist.find(p => p.category === f.category && p.storyIndex === f.index)) || playlist[0];
    const first = start;
    handleSelectCategory(first.category);
    navigate(`/category/${encodeURIComponent(first.category)}/story/${first.storyIndex}`, {
      state: { from: fromPath, playlist, asPage: true },
    });
  };
  // Audio mode from the toggle: open the player on the story the reader is currently on,
  // so listening continues from where they were rather than restarting the category.
  // Cue a story up without starting it. The Listen page opens paused — it's a destination
  // you land on (it's the default tab now), not something you asked to play, so autoplaying
  // would talk at you the moment the app opens. Play is one tap away on the page itself.
  const cueStory = (cat, idx) => {
    narrateFnRef.current.stop();
    // Read the stories straight off the feed's own map — the same array Swipe and Scroll page
    // through. handlePlayStory gets there indirectly, by selecting the category and waiting
    // on a fetch, which is fine when you've asked to play but leaves the page showing
    // "1 of 0" on a cold load. Nothing to wait for here: the feed is already in memory.
    //
    // Interesting and My Saves are snapshots, not live news: their stories live in their own
    // maps and are absent from briefingData entirely. Reading only briefingData is why
    // switching the player to Interesting produced an empty player — there was nothing under
    // that category to find.
    const snapMap = playerSourcePath.current === '/saved' ? savesBriefingData
                  : playerSourcePath.current === '/important' ? interestingBriefingData
                  : null;
    const all = (snapMap ? snapMap[cat]?.allStories : briefingData[cat]?.allStories) || [];
    if (snapMap && all.length) {
      // Keep the snapshot pointer in step, so skip/next walks this feed rather than
      // wandering back into live news at the category boundary.
      snapshotPlayRef.current = { category: cat, stories: all, map: snapMap };
      playlistCatsRef.current = Object.keys(snapMap);
      setPlayerContextCategories(Object.keys(snapMap));
    } else {
      snapshotPlayRef.current = null;
      setPlayerContextCategories(playerSourcePath.current === '/my-feed' ? feedCategories : defaultCategories);
    }
    setSelectedCategory(cat);
    setStories(all);
    setStoryIndex(idx);
    setNarrationProgress(0);
    narrationDurationRef.current = 0;
    setFocus(cat, idx);          // keeps Swipe and Scroll pointing at the same story
  };

  // The Listen tab: continue from wherever the reader is, cued but silent.
  const enterAudioMode = (tabPath) => {
    rememberReadMode('audio');
    const prev = playerSourcePath.current || '/';
    const next = tabPath && tabPath !== '/listen' ? tabPath : prev;
    playerSourcePath.current = next;
    // Resume where the reader is — but only within the same feed. Switching feed (the lens,
    // or the corpus toggle) kept resuming the remembered story regardless, so picking Popular
    // or Interesting changed the label and nothing else: same category, same story, same
    // list. A different feed is a different list, so it starts at that list's top.
    const f = next === prev ? focusRef.current : null;
    if (f?.category) { cueStory(f.category, f.index ?? 0); navigate('/listen'); return; }
    const playlist = playlistForTab(next);
    if (playlist.length) cueStory(playlist[0].category, playlist[0].storyIndex);
    else { setStories([]); setStoryIndex(0); focusRef.current = null; }
    navigate('/listen');
  };

  // Switch tabs from inside the Stories page — mode stays "stories", only the source feed
  // changes. Every caller is already inside (or returning to) Swipe mode, so this must never
  // drop into Scroll — that was the bug: an empty target (e.g. Interesting's global-saves
  // list before anything's been marked today) used to fall back to navigate(tabPath), which
  // reads as "no asPage" and lands on the plain Scroll tab, kicking you clean out of Swipe.
  // With nothing to swipe through, staying exactly where you are is the only option that
  // keeps the promise "this stays in Swipe" — a switch to an empty lens is a no-op, not an
  // exit.
  // Leaving the Listen page for another mode. See the nav handler for why this is needed.
  const leaveListenPlayer = () => {
    if (isNarrating) { setPlayerMinimized(true); setPlayerVisible(true); }
    else { setPlayerVisible(false); setPlayerMinimized(false); }
  };

  const enterStoriesForTab = (tabPath) => {
    const playlist = playlistForTab(tabPath);
    if (!playlist.length) return;
    enterStoriesMode(tabPath, playlist);
  };
  const playlistForTab = (tabPath) => (
    tabPath === '/my-feed'   ? buildMyFeedStoriesPlaylist()
    : tabPath === '/popular'   ? buildPopularStoriesPlaylist()
    : tabPath === '/important' ? buildInterestingStoriesPlaylist()
    : buildFeedStoriesPlaylist()
  );

  // ── Preferred reading mode, remembered per user (guests get their own key).
  // New users land on Listen — narrated news is the point of the app, so that's what a first
  // run should open on. After that the app opens whichever mode they last chose, so someone
  // who prefers reading isn't sent back to the player every launch.
  const readModeKey = (u) => `rundown_read_mode${u?.id ? `_${u.id}` : ''}`;
  const rememberReadMode = (m) => { try { localStorage.setItem(readModeKey(user), m); } catch {} };
  const preferredReadMode = () => {
    try { return localStorage.getItem(readModeKey(user)) || 'audio'; } catch { return 'audio'; }
  };

  // Open the remembered mode once, on the first tab we land on. Runs only after auth has
  // rehydrated (so we read the right user's key) and after the feed has stories to page
  // through — until then the playlist is empty and there's nothing to open.
  const autoModeDoneRef = useRef(false);
  useEffect(() => {
    if (autoModeDoneRef.current || !authReady) return;
    const tabPaths = ['/', '/my-feed', '/popular', '/important'];
    if (!tabPaths.includes(location.pathname)) return;
    const mode = preferredReadMode();
    if (mode !== 'swipe' && mode !== 'audio') { autoModeDoneRef.current = true; return; }
    const playlist = playlistForTab(location.pathname);
    if (!playlist.length) return; // data still loading — retry on the next render
    autoModeDoneRef.current = true;
    if (mode === 'audio') enterAudioMode(location.pathname);
    else enterStoriesMode(location.pathname, playlist);
  }, [authReady, location.pathname, briefingData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Landing on /listen without a cued story — a reload, a bookmark, or a shared link. The
  // page renders off selectedCategory/storyIndex, so without this it shows "1 of 0" and an
  // empty card. Cues the shared cursor's story, or the tab's first, and stays paused.
  useEffect(() => {
    if (!isListenPath || !authReady) return;
    if (stories.length > 0) return;               // already cued
    const f = focusRef.current;
    if (f?.category) { cueStory(f.category, f.index ?? 0); return; }
    const playlist = playlistForTab(playerSourcePath.current || '/');
    if (playlist.length) cueStory(playlist[0].category, playlist[0].storyIndex);
  }, [isListenPath, authReady, briefingData, stories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changing the day on the player page drops whatever is cued, so the effect above re-cues
  // from the new day. `stories` is a snapshot copied out of briefingData at cue time, so it
  // outlives the day it came from: pick a different date and the header changed while the
  // card kept playing the old day's story. Clearing the shared cursor too — it points at an
  // index in the old day's list, which means nothing in the new one.
  const cuedDayRef = useRef(null);
  useEffect(() => {
    if (!isListenPath) return;
    if (cuedDayRef.current === selectedDay) return;
    const first = cuedDayRef.current === null;
    cuedDayRef.current = selectedDay;
    if (first) return;              // arriving, not switching — leave the cue alone
    focusRef.current = null;
    setStories([]);
    setStoryIndex(0);
  }, [isListenPath, selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Moving on the Listen page moves the shared cursor, exactly as swiping does in Swipe mode
  // (StoryReader publishes its position the same way, via onFocusStory).
  //
  // Skip / previous / the progress dots / the category pills all changed storyIndex without
  // touching focusRef, so the player's position was invisible to the other two modes: skip
  // to story 4, tap Swipe, and you landed back on story 1. That was survivable while the
  // player was only a sheet you opened on one story and dismissed — now it's a tab you
  // navigate in, so it has to report where it is. Gated on isListenPath: as a sheet it's
  // playing *over* a reader that owns the cursor, and moving it there would drag the reader
  // along behind the overlay.
  //
  // Only once something is actually cued: on a cold load selectedCategory already holds a
  // default while briefingData is still in flight, and publishing that would hand the cue
  // effect above a cursor pointing at a category with no stories in it — which it prefers
  // over the playlist fallback, leaving the page stuck on "1 of 0".
  useEffect(() => {
    if (!isListenPath || !selectedCategory || stories.length === 0) return;
    setFocus(selectedCategory, storyIndex);
  }, [isListenPath, selectedCategory, storyIndex, stories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // "{Feed} Summary" link in the Stories page — opens the browsable category-briefing sheet.
  const openFeedSummary = (fromPath, cats) => {
    const first = (cats || []).find(c => briefingData[c]?.briefing && briefingData[c].briefing.trim());
    if (!first) return;
    navigate(`/category/${encodeURIComponent(first)}/briefing`, { state: { from: fromPath } });
  };
  // Category Recap — opens the browsable category-briefing view as a real page.
  const enterSummariesMode = (fromPath, fromMode = 'scroll') => {
    const cats = catsForFrom(fromPath).filter(c => briefingData[c]?.briefing && briefingData[c].briefing.trim());
    if (!cats.length) return;
    navigate(`/category/${encodeURIComponent(cats[0])}/briefing`, { state: { from: fromPath, asPage: true, fromMode } });
  };

  // ── Reader close: animate sheet down, then navigate away ─────────────────
  const readerGoBack = () => {
    const from = location.state?.from;
    if (!from || from === 'home' || from === '/') navigate('/');
    else if (from === '/my-feed') navigate('/my-feed');
    else if (from === '/popular') navigate('/popular');
    else if (from === '/important') navigate('/important');
    else navigate('/');
  };
  const readerClose = () => {
    // Leaving the full-page reader means the user picked Scroll — remember that choice.
    if (isStoriesPage) { rememberReadMode('scroll'); setPendingFocus(focusRef.current); readerGoBack(); return; }
    setReaderExiting(true);
    setTimeout(() => {
      setReaderExiting(false);
      readerGoBack();
    }, 400);
  };

  const handleMinimizePlayer = () => {
    setFullPlayerExiting(true);
    // Navigate back to source screen as the player slides down
    const src = playerSourcePath.current;
    if (src && src !== location.pathname) {
      navigate(src);
    } else if (catFromUrl && catFromUrl !== selectedCategory) {
      // Staying on the same category URL but selectedCategory drifted because
      // narration auto-advanced to another category — re-sync so the displayed
      // stories match the URL the user is actually looking at.
      handleSelectCategory(catFromUrl);
    }
    setTimeout(() => {
      setPlayerMinimized(true);
      setFullPlayerExiting(false);
    }, 420);
  };

  // Keep narration refs in sync on every render
  // playlistCatsRef overrides navCategories so "Play My Feed" only iterates feed categories
  storyNavRef.current = { idx: storyIndex, stories, cats: playlistCatsRef.current || navCategories, cat: selectedCategory };

  // ── View-stories: use briefingData for default categories so CategoryView / StoryReader
  // are never contaminated by the My Rundown merged-stories state.
  // Custom categories have no briefingData entry, so they still rely on the stories state.
  // Snapshot feeds (My Saves / Interesting) render from their own snapshot maps, chosen
  // by where the reader was opened from (location.state.from).
  const readerFrom = location.state?.from;
  const snapshotBriefing = readerFrom === '/saved'
    ? savesBriefingData
    : readerFrom === '/important'
      ? interestingBriefingData
      : null;
  const isViewingCustomCat = catFromUrl && customCategories.includes(catFromUrl);
  const viewStories = (snapshotBriefing && catFromUrl && snapshotBriefing[catFromUrl]?.allStories?.length > 0)
    ? snapshotBriefing[catFromUrl].allStories
    : (!isViewingCustomCat && catFromUrl && briefingData[catFromUrl]?.allStories?.length > 0)
      ? briefingData[catFromUrl].allStories
      : stories;
  const viewIsLoading = snapshotBriefing
    ? false
    : !isViewingCustomCat && catFromUrl
      ? (briefingLoading && !briefingData[catFromUrl])
      : newsLoading;

  return (
    <div style={{ background: '#09090f', minHeight: '100dvh' }}>
      <style>{`
        :root { --body-max: 600px; }
        * { box-sizing: border-box; }
        html, body { background: #09090f; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sk-shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .sk { background: linear-gradient(90deg, #e8e8eb 25%, #f2f2f5 50%, #e8e8eb 75%); background-size: 1200px 100%; animation: sk-shimmer 1.4s ease-in-out infinite; }
        /* ── Animated gradient buttons ── */
        @keyframes border-flow {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        /* Read — cool blues / purples / cyans */
        .ai-btn-wrap-read {
          position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#6366f1,#3b82f6,#0891b2,#06b6d4,#8b5cf6,#6366f1,#0ea5e9,#6366f1);
          background-size: 300% 100%;
          animation: border-flow 6s ease-in-out infinite;
        }
        /* Play — warm ambers / oranges / reds / pinks */
        .ai-btn-wrap-play {
          position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#f59e0b,#f97316,#ef4444,#e11d48,#ec4899,#d97706,#f59e0b,#f97316);
          background-size: 300% 100%;
          animation: border-flow 6s ease-in-out infinite;
        }
        /* keep old name as alias for play (backward compat) */
        .ai-btn-wrap { position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#f59e0b,#f97316,#ef4444,#e11d48,#ec4899,#d97706,#f59e0b,#f97316);
          background-size: 300% 100%; animation: border-flow 6s ease-in-out infinite;
        }
        .ai-btn-inner {
          width: auto; padding: 0.6rem 1.4rem; border-radius: 11px;
          background: linear-gradient(135deg,#18182a 0%,#1e1b35 100%);
          border: none; color: white; font-size: 0.88rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; letter-spacing: -0.01em; transition: opacity 0.15s; font-family: inherit;
        }
        .ai-btn-inner:hover { opacity: 0.9; }
        .ai-btn-inner-white {
          width: auto; padding: 0.6rem 1.4rem; border-radius: 11px;
          background: #ffffff;
          border: none; color: #0a0a0f; font-size: 0.88rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; letter-spacing: -0.01em; transition: opacity 0.15s; font-family: inherit;
        }
        .ai-btn-inner-white:hover { opacity: 0.9; }
        /* ── Hero row responsive layout ── */
        .hero-row { display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.25rem; }
        .hero-title-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: nowrap; justify-content: space-between; }
        .hero-play-row .ai-btn-wrap, .hero-play-row .ai-btn-wrap-play, .hero-play-row .ai-btn-wrap-read { display: block; width: 100%; }
        .hero-play-row .ai-btn-inner { width: 100%; justify-content: center; border-radius: 14px; }
      `}</style>

      {/* ── Onboarding Tour ── */}
      {showOnboarding && <OnboardingTour key={onboardingKey} onClose={dismissOnboarding} />}

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#18181f', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.4rem', textAlign: 'center', color: 'white' }}>
              {otpStep === 'email' ? 'Sign in or sign up' : 'Enter your code'}
            </h2>
            <p style={{ margin: '0 0 1.4rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              {otpStep === 'email'
                ? 'Enter your email and we’ll send you a 6-digit code — no password needed.'
                : <>We sent a code to <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{email}</span></>}
            </p>
            {authMessage && (
              <div style={{ marginBottom: '1.1rem', padding: '0.85rem 1rem', borderRadius: '12px', fontSize: '0.88rem', lineHeight: '1.5',
                background: authMessage.type === 'error' ? 'rgba(239,68,68,0.1)' : authMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                color: authMessage.type === 'error' ? '#f87171' : authMessage.type === 'success' ? '#4ade80' : '#a5b4fc',
                border: `1px solid ${authMessage.type === 'error' ? 'rgba(239,68,68,0.3)' : authMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`
              }}>
                {authMessage.text}
              </div>
            )}

            {otpStep === 'email' ? (
              <>
                <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); setAuthMessage(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !authLoading) handleSendCode(); }}
                  style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '0.93rem', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={handleSendCode} disabled={authLoading}
                  style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem', opacity: authLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {authLoading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending code…</> : 'Send code'}
                </button>
              </>
            ) : (
              <>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="Enter code" value={otpCode}
                  onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 10)); setAuthMessage(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !authLoading) handleVerifyCode(); }}
                  autoFocus
                  style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '1.4rem', letterSpacing: '0.35em', textAlign: 'center', fontWeight: 800, background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
                <button onClick={handleVerifyCode} disabled={authLoading}
                  style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem', opacity: authLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {authLoading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying…</> : 'Verify & continue'}
                </button>
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <button onClick={() => { setOtpStep('email'); setOtpCode(''); setAuthMessage(null); }}
                    style={{ flex: 1, padding: '0.7rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.84rem' }}>
                    Change email
                  </button>
                  <button onClick={handleSendCode} disabled={authLoading}
                    style={{ flex: 1, padding: '0.7rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: '999px', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.84rem' }}>
                    Resend code
                  </button>
                </div>
              </>
            )}

            <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); setOtpCode(''); setOtpStep('email'); setAuthMessage(null); }}
              style={{ width: '100%', padding: '0.7rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.88rem' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── FeedPicker Modal ── */}
      {showFeedPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowFeedPicker(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#18181f', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: '540px', maxHeight: '82vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px', margin: '0 auto 1.25rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>Customize My Rundown</h3>
              <button onClick={() => setShowFeedPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '0.25rem' }}><X size={18} /></button>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Tap to select. Numbers show the order stories appear.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {defaultCategories.map(cat => {
                const pos = feedPickerDraft.indexOf(cat); const isSel = pos !== -1; const color = CATEGORY_COLORS[cat] || '#6366f1';
                return (
                  <button key={cat} onClick={() => toggleFeedPickerCat(cat)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: isSel ? '0.38rem 0.75rem 0.38rem 0.45rem' : '0.38rem 0.85rem', borderRadius: '999px', background: isSel ? color : 'transparent', color: isSel ? 'white' : 'rgba(255,255,255,0.7)', border: `1.5px solid ${isSel ? color : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                    {isSel && <span style={{ background: 'rgba(255,255,255,0.28)', borderRadius: '999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.63rem', fontWeight: '900', flexShrink: 0 }}>{pos + 1}</span>}
                    {cat}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{feedPickerDraft.length} {feedPickerDraft.length === 1 ? 'category' : 'categories'} selected</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {feedPickerDraft.length > 0 && <button onClick={() => setFeedPickerDraft([])} style={{ padding: '0.55rem 1rem', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '999px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '600' }}>Clear</button>}
                <button disabled={feedPickerDraft.length === 0} onClick={() => { saveFeedCategories(feedPickerDraft); setShowFeedPicker(false); handleSelectCategory('My Rundown'); }}
                  style={{ padding: '0.55rem 1.4rem', background: feedPickerDraft.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: feedPickerDraft.length === 0 ? 'rgba(255,255,255,0.25)' : 'white', border: 'none', borderRadius: '999px', cursor: feedPickerDraft.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>Save Feed</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content (URL-routed) ── */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="main-content-offset">
      {(isLatestHome || showHomeBg) && !isSummariesPage && (
        <BriefingFeed
          briefingData={briefingData}
          briefingLoading={briefingLoading}
          selectedDay={selectedDay}
          selectedTime={selectedTime}
          availableDays={availableDays}
          availableTimes={availableTimes}
          onSelectDay={selectDay}
          onSelectTime={setSelectedTime}
          defaultCategories={defaultCategories}
          customCategories={customCategories}
          onPlayBriefing={handlePlayBriefing}
          onPlayCategory={handlePlayCategory}
          onSelectCategory={handleSelectCategory}
          isNarrating={isNarrating}
          isPaused={isPaused}
          selectedCategory={selectedCategory}
          currentStoryIndex={storyIndex}
          onPlayStory={handlePlayStory}
          onMarkRead={handleMarkRead}
          focusStory={pendingFocus}
          onFocusRestored={() => setPendingFocus(null)}
          onFocusStory={setFocus}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          onShowSettings={() => navigate('/settings')}
          playerVisible={playerVisible}
          newsLanguage={newsLanguage}
          todayProgress={gamifiedStats.todayProgress}
          challengeStats={challengeStatsFull}
          gamifiedStats={gamifiedStats}
          listenHistory={listenHistory}
          perfectDays={perfectDays}
          onEnterAudio={() => enterAudioMode('/')}
          onEnterStories={() => { rememberReadMode('swipe'); enterStoriesMode('/', buildFeedStoriesPlaylist()); }}
          onEnterSummaries={() => enterSummariesMode('/')}
          savedStories={savedStories}
          onToggleSaved={handleToggleSaved}
        />
      )}

      {(isMyFeedPath || showMyFeedBg) && !isSummariesPage && (
        <MyFeedTab
          briefingData={briefingData}
          briefingLoading={briefingLoading}
          feedCategories={feedCategories}
          selectedDay={selectedDay}
          selectedTime={selectedTime}
          availableDays={availableDays}
          availableTimes={availableTimes}
          onSelectDay={selectDay}
          onSelectTime={setSelectedTime}
          onPlayFeed={handlePlayFeed}
          onPlayMyFeed={handlePlayMyFeed}
          onPlayCategory={handlePlayCategory}
          onSelectCategory={handleSelectCategory}
          onPlayStory={handlePlayStory}
          onMarkRead={handleMarkRead}
          focusStory={pendingFocus}
          onFocusRestored={() => setPendingFocus(null)}
          onFocusStory={setFocus}
          isNarrating={isNarrating}
          selectedCategory={selectedCategory}
          currentStoryIndex={storyIndex}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          playerVisible={playerVisible}
          challengeStats={challengeStatsFull}
          gamifiedStats={gamifiedStats}
          onEnterAudio={() => enterAudioMode('/my-feed')}
          onEnterStories={() => { rememberReadMode('swipe'); enterStoriesMode('/my-feed', buildMyFeedStoriesPlaylist()); }}
          onEnterSummaries={() => enterSummariesMode('/my-feed')}
          savedStories={savedStories}
          onToggleSaved={handleToggleSaved}
        />
      )}

      {(isPopularPath || showPopularBg) && !isSummariesPage && (
        <PopularTab
          briefingData={briefingData}
          briefingLoading={briefingLoading}
          listenCounts={listenCounts}
          savedCounts={savedCounts}
          onMarkRead={handleMarkRead}
          defaultCategories={defaultCategories}
          onSelectCategory={handleSelectCategory}
          onPlayCategory={handlePlayCategory}
          isNarrating={isNarrating}
          playerVisible={playerVisible}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          challengeStats={challengeStatsFull}
          gamifiedStats={gamifiedStats}
          circlePopular={circlePopular}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
          onEnterAudio={() => enterAudioMode('/popular')}
          onEnterStories={() => { rememberReadMode('swipe'); enterStoriesMode('/popular', buildPopularStoriesPlaylist()); }}
          onEnterSummaries={() => enterSummariesMode('/popular')}
          savedStories={savedStories}
          onToggleSaved={handleToggleSaved}
        />
      )}

      {(isImportantPath || showImportantBg) && !isSummariesPage && (
        <ImportantTab
          briefingData={interestingBriefingData}
          onSelectCategory={handleSelectCategory}
          onPlayStory={handlePlayStory}
          onPlayCategory={handlePlayCategory}
          onMarkRead={handleMarkRead}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          playerVisible={playerVisible}
          challengeStats={challengeStatsFull}
          gamifiedStats={gamifiedStats}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
          onEnterAudio={() => enterAudioMode('/important')}
          onEnterStories={() => { rememberReadMode('swipe'); enterStoriesMode('/important', buildInterestingStoriesPlaylist()); }}
          onEnterSummaries={() => enterSummariesMode('/important')}
          savedStories={savedStories}
          onToggleSaved={handleToggleSaved}
        />
      )}

      {(isSavedPath || showSavedBg) && (
        <MySavesTab
          briefingData={savesBriefingData}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
          onSelectCategory={handleSelectCategory}
          onPlayStory={handlePlayStory}
          onPlayCategory={handlePlayCategory}
          onPlayFeed={() => { const cats = Object.keys(savesBriefingData); if (cats[0]) handlePlayStory(cats[0], 0); }}
          gamifiedStats={gamifiedStats}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          isNarrating={isNarrating}
          selectedCategory={selectedCategory}
          currentStoryIndex={storyIndex}
          playerVisible={playerVisible}
          challengeStats={challengeStatsFull}
        />
      )}

      {isProfilePath && (
        <ProfilePage
          username={profileRouteMatch ? profileRouteMatch[1] : ''}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          briefingData={briefingData}
          onSelectCategory={handleSelectCategory}
          onPlayStory={handlePlayStory}
          playerVisible={playerVisible}
          gamifiedStats={gamifiedStats}
        />
      )}

      {/* StoryReader rendered as bottom sheet — see overlay below */}

      {/* ── Settings ── */}
      {isSettingsPath && (
        <main style={{ background: '#f5f5f7', minHeight: '100dvh', maxWidth: '680px', margin: '0 auto', padding: '0 0 4rem' }}>
          <style>{`html, body { background: #ffffff !important; }`}</style>
          {/* Sticky header */}
          <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem' }}>
            <button onClick={() => {
              // Prefer real history back: it restores the full state (asPage, playlist,
              // returnTo…) of whatever screen we came from. navigate(back) only had the
              // path string, which meant returning from Swipe mode arrived with no state,
              // and StoryReader — reading state.asPage to decide page vs. sheet — rendered
              // the Summary sheet instead of the Swipe page. state.from only exists when we
              // navigated here from inside the app, so a previous entry is guaranteed.
              if (location.state?.from) navigate(-1);
              else navigate('/');
            }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '999px', color: '#8a8a9a', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
              <ChevronLeft size={16} /> Back
            </button>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0a0a0f', flex: 1 }}>Settings</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1rem 0' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                <User size={18} color="#8a8a9a" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>Account</h3>
              </div>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {/* Avatar + email row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: user.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
                      {(user.display_name || user.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0a0a0f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.display_name || user.email}</div>
                      {user.username && <div style={{ fontSize: '0.75rem', color: '#8a8a9a', marginTop: '1px' }}>@{user.username}</div>}
                    </div>
                  </div>
                  {/* My Interesting — the stories this user flagged. It used to hang off the
                      Interesting tab, which is the *shared* view of what readers found
                      interesting; a personal shortcut at the top of it put two scopes on one
                      screen. It belongs with the rest of "things that are mine". */}
                  <button onClick={() => navigate('/saved')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '999px', color: '#0a0a0f', cursor: 'pointer', fontWeight: '700', fontSize: '0.83rem', width: '100%' }}>
                    <Sparkles size={15} color="#7c3aed" />
                    <span style={{ flex: 1, textAlign: 'left' }}>My Interesting</span>
                    <ChevronRight size={15} color="#8a8a9a" />
                  </button>
                  {/* View profile link */}
                  {user.username && (
                    <button onClick={() => navigate(`/profile/${user.username}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.5rem 1rem', background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '999px', color: '#0a0a0f', cursor: 'pointer', fontWeight: '700', fontSize: '0.83rem', width: '100%' }}>
                      View My Profile
                    </button>
                  )}
                  {/* Sign out */}
                  <button onClick={async () => {
                    setSignOutLoading(true);
                    await supabase.auth.signOut();
                    setUser(null); setFeedCategories([]); setCustomCategories([]);
                    setCustomCategoryDescriptions({}); setFollowing([]); setCircleSaves([]); setCirclePopular([]);
                    localStorage.removeItem('newsdigest_user');
                    setSignOutLoading(false);
                    navigate('/');
                  }} disabled={signOutLoading}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', color: '#dc2626', cursor: signOutLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.83rem', width: '100%', opacity: signOutLoading ? 0.7 : 1 }}>
                    {signOutLoading
                      ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing Out…</>
                      : <><LogOut size={14} /> Sign Out</>}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>Sign In</button>
                  <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'none', border: '1.5px solid rgba(0,0,0,0.08)', color: '#0a0a0f', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Create Account</button>
                </div>
              )}
            </div>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🌐</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>News Language</h3>
                </div>
                <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '999px', padding: '3px', gap: '2px' }}>
                  {[['en', 'English'], ['ar', 'عربي']].map(([val, label]) => (
                    <button key={val} onClick={() => saveNewsLanguage(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: newsLanguage === val ? '#0a0a0f' : 'transparent', color: newsLanguage === val ? 'white' : '#8a8a9a', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {user && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🎯</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>Daily Goal</h3>
                    <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: '#8a8a9a' }}>Stories to read or listen to each day</p>
                  </div>
                </div>
                <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '999px', padding: '3px', gap: '2px' }}>
                  {[5, 10, 15, 20].map(g => (
                    <button key={g} onClick={() => handleSetDailyGoal(g)} style={{ padding: '0.3rem 0.7rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: dailyGoal === g ? '#0a0a0f' : 'transparent', color: dailyGoal === g ? 'white' : '#8a8a9a', transition: 'all 0.15s' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔤</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>Font Size</h3>
                </div>
                <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: '999px', padding: '3px', gap: '2px' }}>
                  {[['normal', 'Normal'], ['large', 'Large']].map(([val, label]) => (
                    <button key={val} onClick={() => setFontSize(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: fontSize === val ? '#0a0a0f' : 'transparent', color: fontSize === val ? 'white' : '#8a8a9a', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>✨</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>Intro Tour</h3>
                    <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: '#8a8a9a' }}>Replay the walkthrough of the app's features</p>
                  </div>
                </div>
                <button onClick={openOnboarding} style={{ flexShrink: 0, padding: '0.45rem 1.1rem', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.08)', background: '#f5f5f7', color: '#0a0a0f', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>
                  Replay
                </button>
              </div>
            </div>
            {user && (
            <div id="settings-myfeed" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem', position: 'relative', overflow: 'hidden', scrollMarginTop: '72px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MY_FEED_COLOR} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>My News</h3>
              </div>
              <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.78rem', color: '#8a8a9a' }}>Add the categories you want, then drag to rank them — the order sets your story order.</p>
              <FeedCategoryEditor allCategories={myNewsCategories} selected={feedCategories} onChange={saveFeedCategories} />
            </div>
            )}
            {user && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                <Mail size={18} color="#8a8a9a" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0a0a0f' }}>Email Digest</h3>
              </div>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Newsletter selection</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {[['My Rundown', MY_FEED_COLOR], ...defaultCategories.map(c => [c, CATEGORY_COLORS[c] || '#6366f1'])].map(([cat, color]) => {
                  const active = (emailPreferences.categories || []).includes(cat);
                  return (
                    <button key={cat} onClick={() => handleCategoryEmailToggle(cat)} style={{ padding: '0.32rem 0.8rem', fontSize: '0.8rem', fontWeight: active ? '700' : '500', background: active ? color : 'transparent', color: active ? 'white' : '#0a0a0f', border: `1.5px solid ${active ? color : 'rgba(0,0,0,0.08)'}`, borderRadius: '999px', cursor: 'pointer' }}>
                      {cat === 'My Rundown' ? '★ My Rundown' : cat}
                    </button>
                  );
                })}
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.08)', margin: '0 0 1rem' }} />
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Delivery times</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.55rem' }}>
                {timesOfDay.map(time => {
                  const slotKey = time.value.toLowerCase(); const isEnabled = !!emailPreferences[slotKey];
                  return (
                    <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: isEnabled ? 'rgba(99,102,241,0.06)' : '#f5f5f7', border: `1.5px solid ${isEnabled ? '#6366f1' : 'rgba(0,0,0,0.08)'}`, borderRadius: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isEnabled} onChange={() => handleEmailSlotToggle(slotKey)} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0a0a0f' }}>{time.label}</div>
                        <div style={{ fontSize: '0.73rem', color: '#8a8a9a' }}>{time.time}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            )}
            </div>
        </main>
      )}
      {/* ── FullPlayer overlay ── */}
      {/* One player, two shells. On /listen it's the page (always mounted, playing or not);
          everywhere else it's the sheet, which only exists while something is playing. */}
      {(isListenPath || (playerVisible && (!playerMinimized || fullPlayerExiting))) && (
        <FullPlayer
          asPage={isListenPath}
          visible={isListenPath ? true : !fullPlayerExiting}
          isExiting={isListenPath ? false : fullPlayerExiting}
          footer={isListenPath ? (
            <BottomNav theme="dark" fixed={false} mode="audio"
              onChangeMode={(m) => {
                // Step out of the page's player state before leaving. On /listen the player
                // is the page, so playerVisible has no bearing on what you see — but the
                // moment the route changes, that same flag renders the *sheet* over Swipe or
                // Scroll. Leaving with audio running hands it to the mini player, which is
                // what "keep listening while I read" already means everywhere else; leaving
                // silent just closes it.
                leaveListenPlayer();
                if (m === 'swipe') { rememberReadMode('swipe'); enterStoriesForTab(playerSourcePath.current || '/'); }
                // Hand the cursor over the same way leaving Swipe does, so Scroll opens on
                // the story you were listening to rather than at the top of the feed.
                else if (m === 'scroll') { rememberReadMode('scroll'); setPendingFocus(focusRef.current); navigate(playerSourcePath.current || '/'); }
              }}
              challengeStats={challengeStatsFull} user={user}
              onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }} />
          ) : null}
          corpus={playerSourcePath.current === '/my-feed' ? 'mine' : 'all'}
          onChangeCorpus={(c) => enterAudioMode(c === 'mine' ? '/my-feed' : '/')}
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
          onOpenRecap={(cat) => navigate(`/category/${encodeURIComponent(cat)}/briefing`, { state: { from: playerSourcePath.current || '/' } })}
          onPlayRecap={() => handleNarrateBriefing(selectedCategory, [selectedCategory])}
          onEditCategories={() => navigate('/settings', { state: { scrollTo: 'myfeed' } })}
          onGuestEdit={() => navigate('/my-feed')}
          user={user}
          isStoryRead={sessionSeenRef.current.has(`${selectedCategory}|${storyIndex}`) || readTodaySet.has(`${selectedCategory}|${storyIndex}`)}
          // Summary opens the story in the reader with its sheet already up — the same sheet
          // the Summary button opens from a card, rather than a second copy of it here.
          onOpenSummary={() => {
            const from = playerSourcePath.current || '/';
            narrateFnRef.current.stop();
            setPlayerVisible(false);
            navigate(`/category/${encodeURIComponent(selectedCategory)}/story/${storyIndex}`, { state: { from, openSummary: true } });
          }}
          periodRecaps={periodRecaps}
          periodMinutes={periodMinutes}
          onOpenPeriodRecap={openPeriodRecap}
          onPlayPeriodRecap={playPeriodRecap}
          lens={playerSourcePath.current === '/popular' ? 'popular' : playerSourcePath.current === '/important' ? 'interesting' : 'latest'}
          onChangeLens={(l) => {
            const tabPath = l === 'popular' ? '/popular' : l === 'interesting' ? '/important' : '/';
            enterAudioMode(tabPath);
          }}
          onMinimize={handleMinimizePlayer}
          onClose={() => { setPlayerVisible(false); narrateFnRef.current.stop(); }}
          category={selectedCategory}
          story={currentStory}
          storyIndex={storyIndex}
          storyCount={stories.length}
          stories={stories}
          feedName={feedNameForPath(playerSourcePath.current)}
          user={user}
          isInteresting={!!(currentStory && savedStories.some(s => headlineKey(s.headline || '') === headlineKey(currentStory.headline || '')))}
          onToggleInteresting={() => currentStory && handleToggleSaved(currentStory, selectedCategory, storyIndex)}
          onRead={() => {
            const cat = selectedCategory;
            const isBr = !!currentStory?._isBriefing;
            const from = playerSourcePath.current || '/';
            narrateFnRef.current.stop();
            setPlayerVisible(false);
            if (isBr) navigate(`/category/${encodeURIComponent(cat)}/briefing`, { state: { from } });
            else navigate(`/category/${encodeURIComponent(cat)}/story/${storyIndex}`, { state: { from } });
          }}
          isNarrating={isNarrating}
          isPaused={isPaused}
          isLoading={isAudioLoading}
          narrationProgress={narrationProgress}
          playbackSpeed={playbackSpeed}
          repeatMode={repeatMode}
          depthLevel={depthLevel}
          onPlay={() => onPlayFrom(storyIndex)}
          onPause={() => narrateFnRef.current.pause()}
          onResume={() => narrateFnRef.current.resume()}
          onNext={goNext}
          onPrev={goPrev}
          onSpeedCycle={handleSpeedCycle}
          onRepeatToggle={handleRepeatToggle}
          onSetDepth={handleSetDepth}
          onGoToStory={(idx) => {
            setStoryIndex(idx);
            if (isNarrating && !isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); scheduleNarrate(idx); }
            else if (isNarrating && isPaused) { narrateFnRef.current.cancelAudioKeepActive?.(); setNarrationProgress(0); narrationDurationRef.current = 0; }
          }}
          contextCategories={playerContextCategories}
          onSelectCategory={(cat) => {
            // Snapshot feeds: switch category within the snapshot, don't drop to live news
            if (snapshotPlayRef.current) { goToSnapshotCategory(cat, 0); return; }
            setSelectedCategory(cat);
            setStoryIndex(0);
            setNarrationProgress(0);
            narrationDurationRef.current = 0;
            if (isNarrating) { narrateFnRef.current.cancelAudioKeepActive?.(); scheduleNarrate(0); }
          }}
        />
      )}
      </div>{/* end .main-content-offset */}

      {/* ── MiniPlayer bar ── */}
      {miniPlayerVisible && (
        <MiniPlayer
          category={selectedCategory}
          storyHeadline={stories[storyIndex]?.headline || ''}
          isNarrating={isNarrating}
          isPaused={isPaused}
          isLoading={isAudioLoading}
          narrationProgress={narrationProgress}
          onPlay={() => onPlayFrom(storyIndex)}
          onPause={() => narrateFnRef.current.pause()}
          onResume={() => narrateFnRef.current.resume()}
          onExpand={() => setPlayerMinimized(false)}
          onClose={() => { setPlayerVisible(false); narrateFnRef.current.stop(); }}
          dockPosition={miniPlayerDock}
          onDockChange={setMiniPlayerDock}
          bottomOffset={isStoryView ? 56 : (showBottomNav && typeof window !== 'undefined' && window.innerWidth < 1024 ? 56 : 0)}
          topOffset={0}
        />
      )}

      {/* ── Bottom Navigation ── */}
      {showBottomNav && (
        <div className="bottom-nav-wrap">
          <BottomNav
            mode="scroll"
            onChangeMode={(m) => {
              if (m === 'swipe') { rememberReadMode('swipe'); enterStoriesForTab(location.pathname); }
              else if (m === 'audio') enterAudioMode(location.pathname);
            }}
            challengeStats={challengeStatsFull} user={user} onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }} />
        </div>
      )}

      {/* ── Story summary — opened from a story card in Scroll mode. Just the sheet over the
             feed; the old bottom-up reader underneath it is gone now that Swipe mode is a page. ── */}
      {isStorySummary && (
        <StorySummarySheet
          fixed
          open={!readerExiting}
          story={viewStories[storyIdxFromUrl] || null}
          category={catFromUrl}
          onClose={readerClose}
          onPlay={() => handlePlayStory(catFromUrl, storyIdxFromUrl)}
          isInteresting={!!(viewStories[storyIdxFromUrl] && savedStories.some(s => headlineKey(s.headline || '') === headlineKey(viewStories[storyIdxFromUrl].headline || '')))}
          onToggleInteresting={() => viewStories[storyIdxFromUrl] && handleToggleSaved(viewStories[storyIdxFromUrl], catFromUrl, storyIdxFromUrl)}
        />
      )}

      {/* ── Period recap reader. The same sheet a story's "Go deeper" opens: a recap is one
             prose block, which is the shape that sheet's "full picture" already renders, so
             it needs no view of its own. ── */}
      {periodReader && (
        <StorySummarySheet
          fixed
          open
          story={periodReader}
          category={selectedCategory}
          onClose={() => setPeriodReader(null)}
        />
      )}

      {/* ── Story Reader — full-page Swipe mode ── */}
      {(isStoriesPage || (readerExiting && isStoriesPage)) && (() => {
        const readerTranslateY = (readerMounted && !readerExiting) ? '0px' : '100%';
        const contextCats = (() => {
          const from     = location.state?.from;
          const playlist = location.state?.playlist;
          // Playlist mode (Popular / Interesting): pills show only categories in that list, in order
          let cats;
          if (playlist?.length) {
            const seen = new Set();
            cats = playlist.map(p => p.category).filter(c => !seen.has(c) && seen.add(c));
          } else if (from === '/my-feed') {
            cats = feedCategories;
          } else {
            cats = allCategories;
          }
          // location.state survives across every in-reader navigate() — each one does a
          // history replace that carries the same state forward unchanged (see navTo in
          // StoryReader). A playlist or feedCategories snapshot from wherever the reader was
          // FIRST opened can outlive its relevance: swipe far enough and catFromUrl drifts
          // outside that original list. When that happens the pill strip's own length>1 gate
          // flips between a real list and a stale one-or-zero-category list, which is the
          // strip appearing and disappearing. If the category actually being viewed isn't in
          // the resolved list, the list is stale — fall back to the full set instead of
          // trusting state that no longer describes what's on screen.
          return cats.includes(catFromUrl) ? cats : allCategories;
        })();
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 160, pointerEvents: 'auto' }}>
            {/* Backdrop — dims behind sheet; fades out on exit. Not shown when opened as a full page. */}
            {!isStoriesPage && (
              <div
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', transition: 'opacity 0.38s', opacity: readerExiting ? 0 : 1 }}
                onClick={readerClose}
              />
            )}
            {/* Sheet (or full page, when opened via the Feed/Stories toggle) */}
            <div
              style={{
                position: 'absolute', left: '50%', bottom: 0,
                width: '100%', maxWidth: '560px', height: '100dvh',
                background: '#ffffff', borderRadius: isStoriesPage ? 0 : '20px 20px 0 0',
                transform: isStoriesPage ? 'translateX(-50%)' : `translateX(-50%) translateY(${readerTranslateY})`,
                transition: isStoriesPage ? 'none' : 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                willChange: 'transform',
              }}
            >
              {/* Reader content */}
              <StoryReader
                category={catFromUrl}
                story={viewStories[storyIdxFromUrl] || null}
                storyIndex={storyIdxFromUrl}
                isAlreadyRead={!!(gamifiedStats.todayProgress[catFromUrl]?.listenedIndices?.has(storyIdxFromUrl))}
                stories={viewStories}
                onPlayFrom={onPlayFrom}
                isNarrating={isNarrating && storyIndex === storyIdxFromUrl}
                isPaused={isPaused}
                miniPlayerVisible={miniPlayerVisible && miniPlayerDock === 'bottom'}
                user={user}
                onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
                onMarkRead={handleMarkRead}
                savedStories={savedStories}
                onToggleSaved={handleToggleSaved}
                contextCategories={contextCats}
                playlist={location.state?.playlist || null}
                feedName={feedNameForPath(location.state?.from)}
                categoryBriefing={briefingData[catFromUrl]?.briefing || null}
                onPlayRecap={() => handleNarrateBriefing(catFromUrl, contextCats.filter(c => briefingData[c]?.briefing && briefingData[c].briefing.trim()))}
                inSheet
                onClose={readerClose}
                asPage={isStoriesPage}
                challengeStats={challengeStatsFull}
                selectedDay={selectedDay}
                availableDays={availableDays}
                onSelectDay={selectDay}
                activeTabPath={location.state?.from || '/'}
                onSwitchStoriesTab={enterStoriesForTab}
                onOpenFeedSummary={() => openFeedSummary(location.state?.from || '/', contextCats)}
                onEnterSummaries={() => enterSummariesMode(location.state?.from || '/', 'swipe')}
                onEnterAudio={() => enterAudioMode(location.state?.from || '/')}
                // Recap opens as a bottom sheet over Swipe mode — no asPage, so the
                // full-page Category Recap is no longer used.
                // Carry the exact route we're leaving, so closing the recap returns to this
                // story in Swipe mode. `from` alone is the tab path, which always resolved
                // to Scroll — so opening a recap from Swipe used to dump you into the feed.
                onOpenCategoryRecap={(cat) => navigate(`/category/${encodeURIComponent(cat)}/briefing`, {
                  state: { from: location.state?.from || '/', returnTo: location.pathname, returnState: location.state },
                })}
                storiesForCategory={(cat) => (
                  (snapshotBriefing && snapshotBriefing[cat]?.allStories?.length > 0)
                    ? snapshotBriefing[cat].allStories
                    : (briefingData[cat]?.allStories || [])
                )}
                isStoryRead={(cat, idx) => sessionSeenRef.current.has(`${cat}|${idx}`) || readTodaySet.has(`${cat}|${idx}`)}
                onFocusStory={setFocus}
                periodRecaps={periodRecaps}
                periodMinutes={periodMinutes}
                onOpenPeriodRecap={openPeriodRecap}
                onPlayPeriodRecap={playPeriodRecap}
                onEditCategories={() => navigate('/settings', { state: { scrollTo: 'myfeed' } })}
                // The lens control rendered in Swipe mode but nothing was wired to it, so
                // tapping Popular or Interesting did nothing. Reuse enterStoriesForTab — the
                // same switch the mode toggle already uses to move between feeds within
                // Swipe — so Popular/Interesting behave exactly like the other tab switches,
                // including the empty-feed fallback to the plain tab.
                lens={
                  location.state?.from === '/popular' ? 'popular'
                  : location.state?.from === '/important' ? 'interesting'
                  : 'latest'
                }
                onChangeLens={(l) => {
                  const tabPath = l === 'popular' ? '/popular' : l === 'interesting' ? '/important' : '/';
                  enterStoriesForTab(tabPath);
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Category Briefing — bottom-up sheet, or a full page via the Category Recap entry point ── */}
      {isBriefingView && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 165, pointerEvents: 'auto' }}>
          <style>{`@keyframes briefingIn { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }`}</style>
          {!isSummariesPage && (
            <div
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
              onClick={() => navigate(location.state?.from || '/')}
            />
          )}
          <div style={{
            position: 'absolute', left: '50%', bottom: 0,
            width: '100%', maxWidth: '560px', height: '100dvh',
            background: '#fff', borderRadius: isSummariesPage ? 0 : '20px 20px 0 0',
            transform: 'translate(-50%, 0)',
            animation: isSummariesPage ? 'none' : 'briefingIn 0.38s cubic-bezier(0.32,0.72,0,1)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <CategoryBriefing
              category={briefingCat}
              briefing={briefingData[briefingCat]?.briefing || null}
              feedName={feedNameForPath(location.state?.from)}
              cats={briefingNavCats}
              onSelectCat={(c) => navigate(`/category/${encodeURIComponent(c)}/briefing`, { state: { from: location.state?.from || '/', asPage: isSummariesPage, fromMode: location.state?.fromMode || 'scroll', returnTo: location.state?.returnTo, returnState: location.state?.returnState } })}
              onListen={() => handleNarrateBriefing(briefingCat, briefingNavCats)}
              onReadStories={() => navigate(`/category/${encodeURIComponent(briefingCat)}/story/0`, { state: { from: location.state?.from || '/' } })}
              onClose={() => {
                const back = location.state?.returnTo;
                if (back) navigate(back, { state: location.state?.returnState });
                else navigate(location.state?.from || '/');
              }}
              asPage={isSummariesPage}
              onSwitchTab={(tabPath) => enterSummariesMode(tabPath)}
              activeTabPath={location.state?.from || '/'}
              onExitToFeed={() => navigate(location.state?.from || '/')}
              onExitToStories={() => enterStoriesForTab(location.state?.from || '/')}
              onBack={() => {
                const back = location.state?.from || '/';
                if (location.state?.fromMode === 'swipe') enterStoriesForTab(back);
                else navigate(back);
              }}
              challengeStats={challengeStatsFull}
              user={user}
              onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
              selectedDay={selectedDay}
              availableDays={availableDays}
              onSelectDay={selectDay}
            />
          </div>
        </div>
      )}

      {/* ── Category transition overlay ── */}
      <CategoryTransition
        visible={categoryTransition !== null}
        category={categoryTransition?.category || ''}
        storyCount={categoryTransition?.storyCount || 0}
        estimatedSec={categoryTransition?.estimatedSec || 0}
        nextStoryTitle={categoryTransition?.nextStoryTitle || ''}
        onDone={() => setCategoryTransition(null)}
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<TheAIRundown />} />
      </Routes>
    </Router>
  );
}

export default App;
