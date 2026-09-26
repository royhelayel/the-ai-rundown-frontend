import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Calendar, Clock, Plus, Trash2, Search, Settings, Menu, ChevronDown, Volume2, VolumeX, Pause, Play, RotateCcw, Repeat, SkipBack, SkipForward, Headphones } from 'lucide-react';
import { rankStories } from './utils';
import BriefingFeed from './components/BriefingFeed';
import StorySummarySheet from './components/StorySummarySheet';
import FullPlayer from './components/FullPlayer';
import MiniPlayer from './components/MiniPlayer';
import CategoryTransition from './components/CategoryTransition';
import BottomNav from './components/BottomNav';
import MyFeedTab from './components/MyFeedTab';
import PopularTab from './components/PopularTab';
import ImportantTab from './components/ImportantTab';
import MySavesTab from './components/MySavesTab';
import ProfilePage from './components/ProfilePage';
import { headlineKey } from './components/PopularTab';
import OnboardingTour, { ONBOARDING_KEY } from './components/OnboardingTour';
import { CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT } from './theme';
import useListenHistory, { computeGamifiedStats, computeChallengeStats } from './hooks/useListenHistory';
import { buildStories, buildSnapshotBriefing } from './lib/stories';
import { readDayCache, writeDayCache } from './lib/dayCache';
import { toUAEDate, getUAEHour } from './lib/uaeTime';
import { STORY_TRANSITIONS, CAT_TRANSITION_TEMPLATES, pickRandom } from './audio/narrationText';
import { BACKEND_URL } from './lib/backend';
import { supabase } from './lib/supabaseClient';
import GlobalStyles from './views/GlobalStyles';
import AuthModal from './views/AuthModal';
import FeedPickerModal from './views/FeedPickerModal';
import RestoreTopicsDialog from './views/RestoreTopicsDialog';
import SettingsPage from './views/SettingsPage';
import SwipeReaderPage from './views/SwipeReaderPage';
import CategoryBriefingView from './views/CategoryBriefingView';
import { createNarrationEngine } from './audio/narrationEngine';
import { createPlaybackControls } from './audio/playbackControls';
import { createPlayActions } from './audio/playActions';
import useHeartbeat from './data/useHeartbeat';
import useSavesFeeds from './data/useSavesFeeds';
import useCompletedSlots from './data/useCompletedSlots';
import useBriefingData from './data/useBriefingData';
import usePeriodRecaps from './data/usePeriodRecaps';

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
  // Two-step, because restoring overwrites a list the reader built and ordered by hand.
  const [restoreArmed, setRestoreArmed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('World News');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [customCategoryDescriptions, setCustomCategoryDescriptions] = useState({});
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
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

  const MY_FEED_COLOR = '#7c3aed';
  const catColor = CATEGORY_COLORS[selectedCategory] || '#6366f1';
  // Each card takes its own category's colour when the list spans categories — the ranked
  // feeds tag every story with feedCatColor for exactly this.
  const storyCardColor = (stories[storyIndex]?.feedCatColor)
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

  const {
    speakWithBrowser,
  } = createNarrationEngine({
    setSelectedCategory, selectedTime, newsSummary, viewMode, depthLevel, depthLevelRef,
    storyIndex, setStoryIndex, setStories, storyNavRef, setIsNarrating, isNarrating, setIsPaused,
    setIsAudioLoading, repeatMode, playbackSpeed, setNarrationProgress, narrationDurationRef,
    repeatModeRef, playbackSpeedRef, narrationStateRef, narrationGenRef, narrateFnRef,
    ttsAudioCacheRef, ttsUrlPromisesRef, handleSelectCategoryRef, snapshotPlayRef, feedCategories,
    newsLanguage, setListenCounts, currentNarratingStoryRef, playlistCatsRef, setPlayerVisible,
    setPlayerMinimized, setPlayerContextCategories, addToHistory, location, defaultCategories,
  });

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


  useHeartbeat({ user });

  useSavesFeeds({ user, setMySaves, setInterestingStories });

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

  // The topic set the reading screens show. All three lost the My/All toggle, so the edit
  // itself is the choice: untouched shows the twelve defaults, edited shows yours. Without
  // this, removing the toggle would strand people on the default set with no way to reach
  // the topics they picked. "Restore default topics" in Settings is the way back.
  const topicsForReading = feedCategories.length ? feedCategories : defaultCategories;

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
        const savedFeed = userData.feedCategories || [];
        setFeedCategories(savedFeed);
        if (savedFeed.length > 0) setSelectedCategory(savedFeed[0]);
        // Your topics and language, read through the backend rather than straight from
        // Supabase on the anon key.
        //
        // These are per-user settings, so changing them on the phone must show up on the
        // laptop. The direct read only worked while a Supabase auth session was live, but
        // the app treats the newsdigest_user blob in localStorage as "signed in" and that
        // never expires — so once the session lapsed the read came back null and the line
        // below quietly kept serving that device's own stale copy. The backend reads with
        // the service role, the same way saving already writes with it.
        fetch(`${BACKEND_URL}/api/user/preferences?userId=${encodeURIComponent(userData.id)}`)
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
          .then(prefs => {
            const cats  = (prefs.customCategories || []).map(c => c.name);
            const descs = Object.fromEntries((prefs.customCategories || []).map(c => [c.name, c.description]));
            // ?? not ||: the server sends null for "never saved" and [] for "saved an empty
            // list", and those must not collapse to the same thing.
            const feed  = prefs.feedCategories ?? savedFeed;
            const lang  = prefs.newsLanguage || localStorage.getItem('rundown_news_language') || 'en';
            setCustomCategories(cats);
            setCustomCategoryDescriptions(descs);
            setFeedCategories(feed);
            setNewsLanguage(lang);
            localStorage.setItem('rundown_news_language', lang);
            if (feed.length > 0) setSelectedCategory(feed[0]);
            const updated = { ...userData, categories: cats, feedCategories: feed };
            localStorage.setItem('newsdigest_user', JSON.stringify(updated));
            setUser(updated);
          })
          // Logged, not swallowed: this failing silently is what made the bug invisible.
          // The device keeps the list it already had, which is the right offline behaviour.
          .catch(err => console.error('Could not load your settings from the server:', err.message));
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
    if (!newsSummary) { setStories([]); setHasPunchyBullets(false); storiesCategoryRef.current = null; return; }

    const { stories: built, hasPunchyBullets: punchy } = buildStories(
      newsSummary.content,
      newsSummary.stories_content
    );
    // Two places set `stories`, and they disagreed on how many there are. The feed map
    // merges a category's stories across time slots (see the briefingData effect: Morning
    // and Evening are concatenated, or Evening replaces Morning), while this row is a single
    // slot. cueStory seeds the player from the merged list, then setSelectedCategory triggers
    // the fetch that lands here and this narrowed it — the player opened showing a pill per
    // merged story and lost some of them a moment later.
    //
    // The merged list wins: it is the array Swipe and Scroll already page through, which is
    // what cueStory's own comment says the player should walk. Guarded on the day, because
    // briefingData is rebuilt per selectedDay and there is a window mid-change where it still
    // describes the previous one.
    const fromFeed = (!newsSummary.day || newsSummary.day === selectedDay)
      ? briefingData[newsSummary.category]?.allStories
      : null;
    const list = fromFeed?.length ? fromFeed : built;
    setStories(list);
    setHasPunchyBullets(punchy);
    storiesCategoryRef.current = newsSummary.category; // tag which category these stories are

    if (goToLastStoryRef.current && list.length > 0) {
      setStoryIndex(list.length - 1);
      goToLastStoryRef.current = false;
    }
    // briefingData is a dependency now, not just a read: if the feed map lands *after* the
    // summary this effect has to run again to pick the merged list up, otherwise the very
    // load this is meant to fix is the one it misses.
  }, [newsSummary, briefingData, selectedDay]); // eslint-disable-line react-hooks/exhaustive-deps

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
        feedCategories: feed,
      };
      localStorage.setItem('newsdigest_user', JSON.stringify(userData));
      setUser(userData); setCustomCategories(categories); setCustomCategoryDescriptions(descriptions);
      loadSocialData(authUser.id);
      setFeedCategories(feed);
      if (feed.length > 0) setSelectedCategory(feed[0]);
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
    if (viewMode === 'stories' && storiesCategoryRef.current !== selectedCategory) return;
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

  useCompletedSlots({ setCompletedSlots, setSlotsLoaded, newsLanguage });

  useBriefingData({
    selectedDay, briefingCacheRef, feedCategories, completedSlots, slotsLoaded, newsLanguage,
    setBriefingData, setBriefingLoading, defaultCategories,
  });

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
  // 'My Rundown' — the merged all-my-topics stream — used to lead this list, which is how you
  // could still page sideways into a category that no strip renders a tab for. It is gone.
  const navCategories = allCategories;
  const navCatIdx = navCategories.indexOf(selectedCategory);
  const prevCatNav = navCatIdx > 0 ? navCategories[navCatIdx - 1] : null;
  const nextCatNav = navCatIdx < navCategories.length - 1 ? navCategories[navCatIdx + 1] : null;

  const speechUnlockedRef = useRef(false);
  const {
    scheduleNarrate, goToSnapshotCategory, goNext, goPrev, unlockSpeech, onPlayFrom,
    handleSpeedCycle, handleRepeatToggle, handlePlayBriefing, handlePlayCategory,
  } = createPlaybackControls({
    setSelectedCategory, selectedCategory, setStoryIndex, storyIndex, setStories, stories,
    goToLastStoryRef, storyNavRef, storyGoRef, isNarrating, setIsNarrating, isPaused, setIsPaused,
    setIsAudioLoading, repeatMode, setRepeatMode, playbackSpeed, setPlaybackSpeed,
    setNarrationProgress, narrationDurationRef, repeatModeRef, playbackSpeedRef, narrationStateRef,
    narrateFnRef, snapshotPlayRef, feedCategories, playlistCatsRef, setPlayerVisible,
    setPlayerMinimized, setPlayerContextCategories, playerSourcePath, briefingData, navigate,
    location, defaultCategories, speakWithBrowser, handleSelectCategory, prevCatNav, nextCatNav,
    speechUnlockedRef,
  });

  // Build a one-briefing-per-category pseudo-story for the snapshot map.
  const {
    periodRecaps, periodCategory, setFeedPeriodCategory,
  } = usePeriodRecaps({
    selectedCategory, selectedDay, newsLanguage, today,
  });

  const PERIOD_LABEL = { Weekly: 'Weekly', Monthly: 'Monthly' };
  const periodMinutes = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 150));

  // Read: the same bottom sheet a story's "Go deeper" opens, given the recap as its full
  // picture — one prose block, which is exactly the shape that sheet already renders.
  const [periodReader, setPeriodReader] = useState(null);
  const openPeriodRecap = (period) => {
    const r = periodRecaps[period];
    if (!r) return;
    setPeriodReader({
      headline: `${CATEGORY_SHORT[periodCategory] || periodCategory} · ${period === 'Weekly' ? 'last week' : 'last month'}`,
      summary: r.text,
      tightBullets: [], allBullets: [], storySources: [],
      _isBriefing: true,
    });
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


  const {
    playPeriodRecap, handleNarrateBriefing, handlePlayStory, handlePlayFeed, handlePlayMyFeed,
  } = createPlayActions({
    setSelectedCategory, setStoryIndex, setStories, storyNavRef, isNarrating, setIsNarrating,
    setIsPaused, setIsAudioLoading, narrationStateRef, narrateFnRef, snapshotPlayRef,
    playlistCatsRef, setPlayerVisible, setPlayerMinimized, setPlayerContextCategories,
    unlockSpeech, periodRecaps, periodCategory, playerSourcePath, briefingData, location,
    selectedCategory, stories, feedCategories, navigate, defaultCategories, savesBriefingData,
    interestingBriefingData, handleSelectCategory,
  });

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
    setPlayerAllScope(false);
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

  // ── "All" scope on the player: play the ranking, not one category's slice of it ──
  //
  // Popular and Interesting are ranked lists that happen to span categories. Picking All
  // cues the ranking itself, in rank order, so skip walks from the top story to the second
  // wherever each one lives — rather than to the second story of whichever category the top
  // one happened to be in.
  //
  // `stories` becomes the ranked list with each entry tagged _category, and selectedCategory
  // is kept in step with whichever one is playing (see the effect below). Everything
  // downstream — colours, the card's category chip, the recap — reads selectedCategory, so
  // tagging plus syncing is all it takes; nothing else has to learn about scope.
  const [playerAllScope, setPlayerAllScope] = useState(false);
  const [playerSummary, setPlayerSummary] = useState(null);   // Go deeper, opened from the player
  const playerShowAllPill = playerSourcePath.current === '/popular' || playerSourcePath.current === '/important';

  const enterAllScope = () => {
    const path = playerSourcePath.current || '/';
    const playlist = playlistForTab(path);
    if (!playlist.length) return;
    const snapMap = path === '/saved' ? savesBriefingData
                  : path === '/important' ? interestingBriefingData
                  : null;
    const ranked = playlist.map(({ category: cat, storyIndex: idx }) => {
      const list = (snapMap ? snapMap[cat]?.allStories : briefingData[cat]?.allStories) || [];
      const st = list[idx];
      return st ? { ...st, _category: cat } : null;
    }).filter(Boolean);
    if (!ranked.length) return;
    narrateFnRef.current.stop();
    snapshotPlayRef.current = null;   // the ranking is its own list; don't also walk a snapshot
    setPlayerAllScope(true);
    setStories(ranked);
    setStoryIndex(0);
    setSelectedCategory(ranked[0]._category);
    setNarrationProgress(0);
    narrationDurationRef.current = 0;
  };

  // Keep the labelled category in step with the ranking as it plays.
  useEffect(() => {
    if (!playerAllScope) return;
    const cat = stories[storyIndex]?._category;
    if (cat && cat !== selectedCategory) setSelectedCategory(cat);
  }, [playerAllScope, storyIndex, stories]); // eslint-disable-line react-hooks/exhaustive-deps

  // The Listen tab: continue from wherever the reader is, cued but silent.
  const enterAudioMode = (tabPath) => {
    rememberReadMode('audio');
    const prev = playerSourcePath.current || '/';
    const base = tabPath && tabPath !== '/listen' ? tabPath : prev;
    // Listen has no My/All switch. Everyone starts on the full set of topics; once you have
    // edited them, that edit *is* the choice and the feed follows it. Only the two general
    // feeds are decided this way — Popular and Interesting are different lists, not a
    // narrower view of this one, so they pass through untouched.
    const next = (base === '/' || base === '/my-feed')
      ? (feedCategories.length ? '/my-feed' : '/')
      : base;
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
  // Leaving Listen stops playback outright rather than handing it to the mini player.
  //
  // The player on this tab is the screen, not something floating over what you were doing —
  // so switching to Swipe or Scroll is leaving it, not backgrounding it, and a mini bar
  // appearing at the bottom of the next screen reads as something you now have to dismiss.
  const leaveListenPlayer = () => {
    narrateFnRef.current.stop();
    setPlayerVisible(false);
    setPlayerMinimized(false);
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
  // are never contaminated by a merged-stories state.
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
      <GlobalStyles />

      {/* ── Onboarding Tour ── */}
      {showOnboarding && <OnboardingTour key={onboardingKey} onClose={dismissOnboarding} />}

      {/* ── Auth Modal ── */}
      {showAuth && (
        <AuthModal
          setShowAuth={setShowAuth}
          email={email}
          setEmail={setEmail}
          setPassword={setPassword}
          authMessage={authMessage}
          setAuthMessage={setAuthMessage}
          authLoading={authLoading}
          otpStep={otpStep}
          setOtpStep={setOtpStep}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          handleSendCode={handleSendCode}
          handleVerifyCode={handleVerifyCode}
        />
      )}

      {/* ── FeedPicker Modal ── */}
      {showFeedPicker && (
        <FeedPickerModal
          setShowFeedPicker={setShowFeedPicker}
          feedPickerDraft={feedPickerDraft}
          setFeedPickerDraft={setFeedPickerDraft}
          defaultCategories={defaultCategories}
          handleSelectCategory={handleSelectCategory}
          saveFeedCategories={saveFeedCategories}
          toggleFeedPickerCat={toggleFeedPickerCat}
        />
      )}

      {/* ── Main Content (URL-routed) ── */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div className="main-content-offset">
      {(isLatestHome || showHomeBg) && !isSummariesPage && (
        <BriefingFeed
          periodRecaps={periodRecaps}
          periodMinutes={periodMinutes}
          onOpenPeriodRecap={openPeriodRecap}
          onPlayPeriodRecap={playPeriodRecap}
          /* The feed's docked recap follows the section you scroll into; this is how it
             tells the period fetch which topic's week and month to go and get. */
          onActiveCategoryChange={setFeedPeriodCategory}
          briefingData={briefingData}
          briefingLoading={briefingLoading}
          selectedDay={selectedDay}
          selectedTime={selectedTime}
          availableDays={availableDays}
          availableTimes={availableTimes}
          onSelectDay={selectDay}
          onSelectTime={setSelectedTime}
          defaultCategories={topicsForReading}
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
          onShowSettings={() => navigate('/settings', { state: { from: location.pathname } })}
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

      {/* Restoring overwrites a list the reader built and ordered by hand, and there is no
             undo — so it asks, and says plainly what is lost and that it is not permanent. */}
      {restoreArmed && (
        <RestoreTopicsDialog
          setRestoreArmed={setRestoreArmed}
          defaultCategories={defaultCategories}
          saveFeedCategories={saveFeedCategories}
        />
      )}

      {/* ── Settings ── */}
      {isSettingsPath && (
        <SettingsPage
          user={user}
          setUser={setUser}
          openOnboarding={openOnboarding}
          setShowAuth={setShowAuth}
          setAuthMode={setAuthMode}
          setSignOutLoading={setSignOutLoading}
          signOutLoading={signOutLoading}
          setRestoreArmed={setRestoreArmed}
          setCustomCategories={setCustomCategories}
          setCustomCategoryDescriptions={setCustomCategoryDescriptions}
          setFontSize={setFontSize}
          fontSize={fontSize}
          setFeedCategories={setFeedCategories}
          feedCategories={feedCategories}
          newsLanguage={newsLanguage}
          dailyGoal={dailyGoal}
          handleSetDailyGoal={handleSetDailyGoal}
          setFollowing={setFollowing}
          setCircleSaves={setCircleSaves}
          setCirclePopular={setCirclePopular}
          navigate={navigate}
          location={location}
          myNewsCategories={myNewsCategories}
          MY_FEED_COLOR={MY_FEED_COLOR}
          saveFeedCategories={saveFeedCategories}
          saveNewsLanguage={saveNewsLanguage}
          preferredReadMode={preferredReadMode}
        />
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
          selectedDay={selectedDay}
          availableDays={availableDays}
          onSelectDay={selectDay}
          onOpenRecap={(cat) => navigate(`/category/${encodeURIComponent(cat)}/briefing`, { state: { from: playerSourcePath.current || '/' } })}
          onPlayRecap={() => handleNarrateBriefing(selectedCategory, [selectedCategory])}
          onEditCategories={() => navigate('/settings', { state: { scrollTo: 'myfeed', from: location.pathname } })}
          onGuestEdit={() => navigate('/my-feed')}
          user={user}
          isStoryRead={sessionSeenRef.current.has(`${selectedCategory}|${storyIndex}`) || readTodaySet.has(`${selectedCategory}|${storyIndex}`)}
          // Summary opens the story in the reader with its sheet already up — the same sheet
          // the Summary button opens from a card, rather than a second copy of it here.
          // Go deeper opens the sheet over the player. It used to navigate to the story's
          // own route, which dropped you out of Listen entirely — and because the state it
          // passed had no `asPage`, that route rendered as the Scroll view rather than even
          // Swipe. Nothing about wanting the detail of a story means wanting to leave the
          // player, and it keeps playing underneath.
          onOpenSummary={() => setPlayerSummary({ story: currentStory, category: selectedCategory, index: storyIndex })}
          showAllPill={playerShowAllPill}
          allScope={playerAllScope}
          onSelectAll={enterAllScope}
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

      {/* ── Go deeper, from the player. Same sheet, over the top, so Listen is never left. ── */}
      {playerSummary && (
        <StorySummarySheet
          fixed
          open
          story={playerSummary.story}
          category={playerSummary.category}
          onClose={() => setPlayerSummary(null)}
          onPlay={() => { setPlayerSummary(null); onPlayFrom(playerSummary.index); }}
          isInteresting={savedStories.some(x => headlineKey(x.headline || '') === headlineKey(playerSummary.story?.headline || ''))}
          onToggleInteresting={() => handleToggleSaved(playerSummary.story, playerSummary.category, playerSummary.index)}
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
      {(isStoriesPage || (readerExiting && isStoriesPage)) && (
        <SwipeReaderPage
          user={user}
          setShowAuth={setShowAuth}
          setAuthMode={setAuthMode}
          selectedDay={selectedDay}
          storyIndex={storyIndex}
          isNarrating={isNarrating}
          isPaused={isPaused}
          feedCategories={feedCategories}
          sessionSeenRef={sessionSeenRef}
          setFocus={setFocus}
          miniPlayerDock={miniPlayerDock}
          readerMounted={readerMounted}
          briefingData={briefingData}
          gamifiedStats={gamifiedStats}
          readTodaySet={readTodaySet}
          savedStories={savedStories}
          handleToggleSaved={handleToggleSaved}
          navigate={navigate}
          location={location}
          readerExiting={readerExiting}
          allCategories={allCategories}
          availableDays={availableDays}
          challengeStatsFull={challengeStatsFull}
          selectDay={selectDay}
          onPlayFrom={onPlayFrom}
          periodRecaps={periodRecaps}
          periodMinutes={periodMinutes}
          openPeriodRecap={openPeriodRecap}
          playPeriodRecap={playPeriodRecap}
          handleNarrateBriefing={handleNarrateBriefing}
          handleMarkRead={handleMarkRead}
          catFromUrl={catFromUrl}
          storyIdxFromUrl={storyIdxFromUrl}
          isStoriesPage={isStoriesPage}
          feedNameForPath={feedNameForPath}
          miniPlayerVisible={miniPlayerVisible}
          enterAudioMode={enterAudioMode}
          enterStoriesForTab={enterStoriesForTab}
          openFeedSummary={openFeedSummary}
          enterSummariesMode={enterSummariesMode}
          readerClose={readerClose}
          snapshotBriefing={snapshotBriefing}
          viewStories={viewStories}
        />
      )}

      {/* ── Category Briefing — bottom-up sheet, or a full page via the Category Recap entry point ── */}
      {isBriefingView && (
        <CategoryBriefingView
          user={user}
          setShowAuth={setShowAuth}
          setAuthMode={setAuthMode}
          selectedDay={selectedDay}
          briefingData={briefingData}
          navigate={navigate}
          location={location}
          availableDays={availableDays}
          challengeStatsFull={challengeStatsFull}
          selectDay={selectDay}
          handleNarrateBriefing={handleNarrateBriefing}
          briefingCat={briefingCat}
          briefingNavCats={briefingNavCats}
          isSummariesPage={isSummariesPage}
          feedNameForPath={feedNameForPath}
          enterStoriesForTab={enterStoriesForTab}
          enterSummariesMode={enterSummariesMode}
        />
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

export default TheAIRundown;
