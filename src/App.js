import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Calendar, Clock, Mail, Plus, Trash2, LogOut, User, Search, Sparkles, Settings, Loader, Menu, ChevronLeft, ChevronRight, ChevronDown, X, Volume2, VolumeX, Pause, Play, RotateCcw, Repeat, SkipBack, SkipForward, Headphones } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { VerificationPage } from './components/VerificationPage';
import BriefingFeed from './components/BriefingFeed';
import CategoryView from './components/CategoryView';
import StoryReader from './components/StoryReader';
import FullPlayer from './components/FullPlayer';
import MiniPlayer from './components/MiniPlayer';
import CategoryTransition from './components/CategoryTransition';
import BottomNav from './components/BottomNav';
import SideNav from './components/SideNav';
import FeedPage from './components/FeedPage';
import MyFeedTab from './components/MyFeedTab';
import PopularTab from './components/PopularTab';
import CustomizeTab from './components/CustomizeTab';
import { headlineKey } from './components/PopularTab';
import { CATEGORY_COLORS, CATEGORY_IMAGES } from './theme';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

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
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState(null); // { type: 'info'|'error'|'success', text: string }
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
  const progressIntervalRef = useRef(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('rundown_view_mode') || 'stories');
  const [depthLevel, setDepthLevel] = useState(() => { const saved = localStorage.getItem('rundown_depth_level'); return (saved === 'summary' || !saved) ? 'deep' : saved; });
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
  const narrateFnRef = useRef({});
  // TTS pre-load cache: text → HTMLAudioElement (pre-buffered, ready to play instantly)
  const ttsAudioCacheRef = useRef(new Map());
  // Shared URL-fetch promises: text → Promise<string|null> — deduplicates concurrent fetches
  const ttsUrlPromisesRef = useRef(new Map());
  const handleSelectCategoryRef = useRef(null);

  const [feedCategories, setFeedCategories] = useState([]);
  const [userFeeds, setUserFeeds] = useState([]); // [{ id, name, categories }]
  const [completedSlots, setCompletedSlots] = useState(new Set()); // Set of "YYYY-MM-DD|Morning" etc.
  const [slotsLoaded, setSlotsLoaded] = useState(false); // true after first completedSlots fetch
  const [newsLanguage, setNewsLanguage] = useState(() => localStorage.getItem('rundown_news_language') || 'en');
  const [showFeedPicker, setShowFeedPicker] = useState(false);
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
  const [fullPlayerExiting, setFullPlayerExiting] = useState(false);
  const playerSourcePath = useRef('/');
  const [briefingData, setBriefingData] = useState({});
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [categoryTransition, setCategoryTransition] = useState(null); // { category, storyCount, estimatedMin, nextStoryTitle }
  const navigate = useNavigate();
  const location = useLocation();

  const CUSTOM_CATEGORIES_ENABLED = false;

  const defaultCategories = ['World News','Technology','Business','Politics','Sports','Entertainment','Science','Health','UAE','KSA','QAT','LEB'];
  const REGIONAL_CATEGORIES = ['UAE','KSA','QAT','LEB'];

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
    const punchyMap = {};
    if (storiesContent) {
      const sSrc = storiesContent;
      const sSrcEnd = sSrc.search(/^#{1,3}\s+(?:\[)?(?:Sources|المصادر)(?:\]|\()?/im);
      const sBody = sSrcEnd > -1 ? sSrc.slice(0, sSrcEnd).trim() : sSrc.trim();
      sBody.split(/(?=^#{1,3} )/m).filter(c => /^#{1,3} /.test(c.trim())).forEach(chunk => {
        const lines = chunk.trim().split('\n');
        const h = lines[0].replace(/^#{1,3}\s+/, '').replace(/^\[(.+?)\]\(https?:\/\/[^)]+\)$/, '$1')
          .replace(/https?:\/\/\S+/g, '').replace(/[()[\]]/g, '').trim();
        const bullets = [...lines.slice(1).join('\n').matchAll(/^[-*]\s+(.+)$/gm)].map(m => m[1]);
        if (h && bullets.length > 0) punchyMap[normalizeHeadline(h)] = bullets;
      });
    }

    // ── Build final story objects ─────────────────────────────────────────────
    let anyPunchy = false;
    const builtStories = chunks.map(chunk => {
      const rest = chunk.bodyLines.join('\n');
      const allBullets = [...rest.matchAll(/^[-*]\s+(.+)$/gm)].map(m => m[1]);
      const perspMatch = rest.match(/\*\*(?:Perspectives differ|وجهات النظر تتباين|تباين وجهات النظر|آراء مختلفة):\*\*\s*(.+)/);
      const whyMatch = rest.match(/\*\*(?:Why this matters|لماذا هذا مهم|لماذا يهم هذا|أهمية الخبر):\*\*\s*(.+)/);
      const storySources = chunk.coverageLinks.filter((s, i, a) => a.findIndex(x => x.url === s.url) === i);
      const key = normalizeHeadline(chunk.headline);
      const punchy = punchyMap[key];
      if (punchy) anyPunchy = true;
      const tightBullets = punchy || allBullets.slice(0, 3);
      if (!chunk.headline || allBullets.length === 0) return null;
      return {
        headline: chunk.headline,
        tightBullets,   // short: from storiesContent if available, else first 3 from content
        allBullets,     // full: all bullets from content
        perspectives: perspMatch?.[1] || null,
        why: whyMatch?.[1] || null,
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
    if (st.audio) { st.audio.pause(); st.audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    st.active = false;
    st.pendingLoad = false;
    st.paused = false;
    playlistCatsRef.current = null; // reset playlist on stop
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
    if (depthLevel === 'summary') return newsSummary?.stories_content || newsSummary?.content;
    return newsSummary?.content; // deep
  };
  narrateFnRef.current.getNarrationContent = getNarrationContent;

  // Cancels in-flight audio without ending the narration session (keeps isNarrating=true)
  const cancelAudioKeepActive = () => {
    narrationGenRef.current++; // invalidate any stale canplay/fetch callbacks
    const st = narrationStateRef.current;
    if (st.pendingNarrateTimer) { clearTimeout(st.pendingNarrateTimer); st.pendingNarrateTimer = null; }
    st.canceling = true;
    if (st.audio) { st.audio.pause(); st.audio = null; }
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
    setTimeout(() => {
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
        // Track 50% listen for Popular rankings
        if (!halfwayFired && pct >= 50) {
          halfwayFired = true;
          const key = headlineKey(currentNarratingStoryRef.current.headline);
          if (key) {
            setListenCounts(prev => {
              const next = { ...prev, [key]: (prev[key] || 0) + 1 };
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
      if (narrationStateRef.current.active && !narrationStateRef.current.canceling) onDone();
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
    const isAr = newsLanguage === 'ar';
    const isHeadlines = depthLevel === 'headlines';
    const cl = cleanForTTS;
    const parts = [cl(story.headline) + '.'];
    if (!isHeadlines) {
      (story.tightBullets || story.allBullets || []).forEach(b => parts.push(cl(b) + '.'));
      if (story.perspectives) parts.push((isAr ? 'وجهات النظر تتباين. ' : 'On the other hand, ') + cl(story.perspectives) + '.');
      if (story.why) parts.push((isAr ? 'لماذا هذا مهم. ' : 'Here is why this matters. ') + cl(story.why) + '.');
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

  function getDaysOfWeek(offset = 0) {
    const days = [];
    const base = offset * 7;
    for (let i = base - 6; i <= base; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const fullDate = toUAEDate(date);
      const dayName = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Dubai' }).format(date);
      const dateNum = parseInt(new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: 'Asia/Dubai' }).format(date));
      days.push({ label: dayName, date: dateNum, fullDate });
    }
    return days;
  }

  const daysOfWeek = getDaysOfWeek(weekOffset);
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
    : slotsLoaded
      ? daysOfWeek.filter(d => timesOfDay.some(t => completedSlots.has(`${d.fullDate}|${t.value}`)))
      : daysOfWeek;

  // Selects a day and auto-corrects selectedTime to the first available slot for that day.
  const selectDay = (fullDate) => {
    setSelectedDay(fullDate);
    if (slotsLoaded && isSlotUnavailable(fullDate, selectedTime)) {
      const avail = timesOfDay.find(t => completedSlots.has(`${fullDate}|${t.value}`));
      if (avail) setSelectedTime(avail.value);
    }
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    // Custom categories only support today — reset day and time for them.
    // Default/regional categories preserve whatever day AND time the user has selected.
    if (customCategories.includes(category)) {
      setSelectedDay(today);
      setSelectedTime(currentTimeSlot);
    }
  };

  useEffect(() => {
    setSelectedDay(getDaysOfWeek(0)[6].fullDate);
    setSelectedTime(lastCompletedTimeSlot);
    try {
      const savedUser = localStorage.getItem('newsdigest_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setEmailPreferences(normalizeEmailPrefs(userData.emailPreferences || {}));
        const savedFeed = userData.feedCategories || [];
        setFeedCategories(savedFeed);
        // Hydrate named feeds; migrate legacy flat array if needed
        if (userData.userFeeds) {
          setUserFeeds(userData.userFeeds);
        } else if (savedFeed.length > 0) {
          setUserFeeds([{ id: 'default', name: 'My Feed', categories: savedFeed }]);
        }
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
          // Hydrate named feeds from DB; migrate legacy flat array if needed
          const dbFeeds = prefRes.data?.user_feeds || userData.userFeeds || null;
          if (dbFeeds) {
            setUserFeeds(dbFeeds);
          } else if (feed.length > 0) {
            setUserFeeds([{ id: 'default', name: 'My Feed', categories: feed }]);
          }
          setNewsLanguage(lang);
          localStorage.setItem('rundown_news_language', lang);
          if (feed.length > 0) setSelectedCategory('My Rundown');
          const updated = { ...userData, categories: cats, emailPreferences: prefs, feedCategories: feed, userFeeds: dbFeeds || userData.userFeeds };
          localStorage.setItem('newsdigest_user', JSON.stringify(updated));
          setUser(updated);
        });
      }
    } catch (error) { console.error('Init error:', error); }
  }, []);

  // Once slots have loaded (or change), fix selectedDay/selectedTime if they point at an empty slot.
  useEffect(() => {
    if (!slotsLoaded || isCustomCategory) return;
    const currentDayHasNews = timesOfDay.some(t => completedSlots.has(`${selectedDay}|${t.value}`));
    if (!currentDayHasNews) {
      // Find the most recent available day (daysOfWeek is oldest→newest so last = most recent)
      const validDays = daysOfWeek.filter(d => timesOfDay.some(t => completedSlots.has(`${d.fullDate}|${t.value}`)));
      if (validDays.length > 0) {
        const newDay = validDays[validDays.length - 1].fullDate;
        const avail = timesOfDay.find(t => completedSlots.has(`${newDay}|${t.value}`));
        setSelectedDay(newDay);
        if (avail) setSelectedTime(avail.value);
      }
    } else if (!completedSlots.has(`${selectedDay}|${selectedTime}`)) {
      // Day is fine but selected time slot is unavailable — pick first available slot for this day
      const avail = timesOfDay.find(t => completedSlots.has(`${selectedDay}|${t.value}`));
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

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize === 'large' ? '18px' : '16px';
    localStorage.setItem('rundown_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (selectedCategory === 'My Rundown') return;
    if (!newsSummary) { setStories([]); setHasPunchyBullets(false); return; }

    const { stories: built, hasPunchyBullets: punchy } = buildStories(
      newsSummary.content,
      newsSummary.stories_content
    );
    setStories(built);
    setHasPunchyBullets(punchy);

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
            supabase.from('news_summaries').select('*')
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
          const storyImage = ((data.source_articles || []).find(a => a.imageUrl) || {}).imageUrl || '';
          const { stories: catStories, hasPunchyBullets: catPunchy } = buildStories(data.content, data.stories_content);
          if (catPunchy) anyPunchy = true;
          catStories.forEach(s => merged.push({ ...s, feedCategory: cat, feedCatColor: color, storyImage }));
        });
        if (merged.length === 0) { setNewsNotAvailable(true); setNewsSummary(null); return; }
        setStories(merged);
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
    setNewsLoading(true);
    setNewsNotAvailable(false);
    try {
      let q;
      if (isCustom) {
        const sharedKey = (customCategoryDescriptions[selectedCategory] || selectedCategory).toLowerCase().trim();
        q = supabase.from('news_summaries').select('*')
          .eq('shared_key', sharedKey).is('user_id', null).eq('day', selectedDay).eq('time_slot', 'Daily');
      } else {
        q = supabase.from('news_summaries').select('*')
          .eq('category', selectedCategory).eq('day', selectedDay).eq('time_slot', selectedTime)
          .eq('language', newsLanguage)
          .is('user_id', null).is('shared_key', null);
      }
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) { setNewsNotAvailable(true); setNewsSummary(null); return; }
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
        const { data } = await supabase.from('news_summaries').select('*')
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

  const handleAuth = async () => {
    if (!email || !password) return;
    setAuthMessage(null);
    if (authMode === 'signup') {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/send-verification`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
          const e = await res.json();
          const msg = e.error || '';
          if (msg.toLowerCase().includes('already verified')) {
            setAuthMessage({ type: 'info', text: `You already have a verified account with this email. Switch to Sign In below to log in.` });
          } else {
            setAuthMessage({ type: 'error', text: msg || 'Something went wrong. Please try again.' });
          }
          return;
        }
        const data = await res.json();
        if (data.resent) {
          setAuthMessage({ type: 'info', text: `Looks like you've already started signing up! We've resent a verification link to ${email} — check your inbox and click the link to complete your account setup.` });
        } else {
          setAuthMessage({ type: 'success', text: `Almost there! We've sent a verification link to ${email}. Check your inbox and click the link to activate your account.` });
        }
        setPassword('');
      } catch (error) {
        setAuthMessage({ type: 'error', text: 'Unable to connect. Please check your internet and try again.' });
      }
    } else {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) { setAuthMessage({ type: 'error', text: authError.message }); return; }
        if (!authData.user) { setAuthMessage({ type: 'error', text: 'Sign-in failed. Please try again.' }); return; }
        const { data: userProfile, error: profileError } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
        if (profileError) { setAuthMessage({ type: 'error', text: 'Failed to load user profile.' }); return; }
        if (userProfile.verification_status !== 'verified') { setAuthMessage({ type: 'info', text: 'Please verify your email first. Check your inbox for the verification link.' }); return; }
        const { data: categoriesData } = await supabase.from('custom_categories').select('category_name, category_description').eq('user_id', authData.user.id).is('deleted_at', null);
        const categories = categoriesData?.map(c => c.category_name) || [];
        const descriptions = Object.fromEntries((categoriesData || []).map(c => [c.category_name, c.category_description || c.category_name]));
        const feed = userProfile.feed_categories || [];
        const userData = {
          id: authData.user.id,
          email: authData.user.email,
          categories,
          emailPreferences: normalizeEmailPrefs(userProfile.email_preferences || {}),
          feedCategories: feed,
        };
        localStorage.setItem('newsdigest_user', JSON.stringify(userData));
        setUser(userData); setCustomCategories(categories); setCustomCategoryDescriptions(descriptions); setEmailPreferences(userData.emailPreferences);
        setFeedCategories(feed);
        if (feed.length > 0) setSelectedCategory('My Rundown');
        setShowAuth(false); setShowMobileMenu(false); setEmail(''); setPassword(''); setAuthMessage(null);
      } catch (error) { setAuthMessage({ type: 'error', text: 'Unable to connect. Please check your internet and try again.' }); }
    }
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

  const handleReorderFeeds = (feeds) => saveUserFeeds(feeds);

  // Save the full list of named feeds; keep feedCategories (union) in sync for narration
  const saveUserFeeds = (feeds) => {
    setUserFeeds(feeds);
    const allCats = [...new Set(feeds.flatMap(f => f.categories))];
    setFeedCategories(allCats);
    const userData = { ...user, userFeeds: feeds, feedCategories: allCats };
    localStorage.setItem('newsdigest_user', JSON.stringify(userData));
    setUser(userData);
    // Persist union of categories to backend for narration compat
    fetch(`${BACKEND_URL}/api/user/feed-categories`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, categories: allCats })
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
    // Don't consume pendingLoad until content is actually ready (avoids premature clear on null)
    if (viewMode === 'stories' && stories.length === 0) return;
    if (viewMode !== 'stories' && !newsSummary?.content && !newsSummary?.stories_content) return;
    narrationStateRef.current.pendingLoad = false;
    if (viewMode === 'stories') {
      const startIdx = narrationStateRef.current.pendingStartIndex || 0;
      narrationStateRef.current.pendingStartIndex = 0;
      setStoryIndex(startIdx);
      setTimeout(() => narrateFnRef.current.narrateStory?.(startIdx), 200);
    } else {
      const content = narrateFnRef.current.getNarrationContent?.() || newsSummary?.content;
      setTimeout(() => narrateFnRef.current.narrateDigest?.(content), 200);
    }
  }, [stories, newsSummary]);

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
  useEffect(() => {
    const fetchCompleted = async () => {
      try {
        let q = supabase
          .from('news_summaries')
          .select('day, time_slot')
          .eq('category', '__completed__')
          .is('user_id', null)
          .is('shared_key', null);
        // Filter by language if the column exists (graceful: missing column returns all rows)
        if (newsLanguage) q = q.eq('language', newsLanguage);
        const { data } = await q;
        if (data) {
          // Use functional update so we only replace the Set when content actually changes.
          // A new Set reference (even with same entries) triggers the handleFetchNews effect
          // which would cancel narration — so we must return the same `prev` when unchanged.
          setCompletedSlots(prev => {
            const incoming = data.map(r => `${r.day}|${r.time_slot}`);
            if (prev.size === incoming.length && incoming.every(k => prev.has(k))) return prev;
            return new Set(incoming);
          });
          setSlotsLoaded(true);
        }
      } catch (_) { setSlotsLoaded(true); } // mark loaded even on error so UI doesn't hang
    };
    fetchCompleted();
    // Poll every 30 s so the UI unlocks automatically when generation finishes
    const interval = setInterval(fetchCompleted, 30000);
    return () => clearInterval(interval);
  }, [newsLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Briefing feed: fetch metadata for all categories ────────────────────────
  useEffect(() => {
    if (!selectedDay || !selectedTime || !slotsLoaded) return;
    setBriefingLoading(true);
    const cats = defaultCategories;
    Promise.allSettled(cats.map(async (cat) => {
      try {
        const { data } = await supabase
          .from('news_summaries')
          .select('content, stories_content')
          .eq('category', cat).eq('day', selectedDay).eq('time_slot', selectedTime)
          .eq('language', newsLanguage).is('user_id', null).is('shared_key', null)
          .maybeSingle();
        if (!data) return [cat, null];
        const { stories: s } = buildStories(data.content, data.stories_content);
        const totalWords = s.reduce((acc, story) => {
          const fields = [
            ...(story.allBullets || story.tightBullets || []),
            story.perspectives,
            story.why,
            story.headline,
          ].filter(Boolean);
          return acc + fields.join(' ').split(/\s+/).filter(Boolean).length;
        }, 0);
        const estimatedMin = Math.max(1, Math.round(totalWords / 200));
        return [cat, { storyCount: s.length, estimatedMin, previewStories: s.slice(0, 3), allStories: s }];
      } catch { return [cat, null]; }
    })).then(results => {
      const out = {};
      results.forEach((r, i) => { if (r.status === 'fulfilled' && r.value[1]) out[cats[i]] = r.value[1]; });
      setBriefingData(out);
      setBriefingLoading(false);
    });
  }, [selectedDay, selectedTime, newsLanguage, slotsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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
    } else if (prevCatNav) {
      if (isNarrating) { narrateFnRef.current.cancelAudioKeepActive?.(); narrationStateRef.current.pendingLoad = !isPaused; }
      else { goToLastStoryRef.current = true; }
      handleSelectCategory(prevCatNav);
    }
  };

  storyGoRef.current = { goNext, goPrev };

  const onPlayFrom = (idx) => {
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
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
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(0);
    navigate(`/category/${encodeURIComponent(firstCat)}`);
    if (selectedCategory === firstCat && stories.length > 0) {
      narrateFnRef.current.narrateStory(0);
    } else {
      st.pendingLoad = true;
      handleSelectCategory(firstCat);
    }
  };

  const handlePlayCategory = (cat) => {
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(0);
    navigate(`/category/${encodeURIComponent(cat)}`);
    if (selectedCategory === cat && stories.length > 0) {
      narrateFnRef.current.narrateStory(0);
    } else {
      st.pendingLoad = true;
      handleSelectCategory(cat);
    }
  };

  const handlePlayStory = (cat, idx) => {
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(idx);
    navigate(`/category/${encodeURIComponent(cat)}`);
    if (selectedCategory === cat && stories.length > 0) {
      narrateFnRef.current.narrateStory(idx);
    } else {
      st.pendingLoad = true;
      st.pendingStartIndex = idx;
      handleSelectCategory(cat);
    }
  };

  const handlePlayFeed = (cats) => {
    const playable = cats.filter(c => briefingData[c]?.storyCount > 0);
    if (playable.length === 0) return;
    const firstCat = playable[0];
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    playlistCatsRef.current = playable;
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(0);
    navigate(`/category/${encodeURIComponent(firstCat)}`);
    if (selectedCategory === firstCat && stories.length > 0) {
      narrateFnRef.current.narrateStory(0);
    } else {
      st.pendingLoad = true;
      handleSelectCategory(firstCat);
    }
  };

  const handlePlayMyFeed = () => {
    if (feedCategories.length === 0) return;
    const playable = feedCategories.filter(c => briefingData[c]?.storyCount > 0);
    if (playable.length === 0) return;
    const firstCat = playable[0];
    if (isNarrating) narrateFnRef.current.stop();
    playerSourcePath.current = location.pathname;
    playlistCatsRef.current = playable; // restrict narration to feed categories only
    const st = narrationStateRef.current;
    st.active = true; st.paused = false;
    setIsNarrating(true); setIsPaused(false); setIsAudioLoading(true);
    setPlayerVisible(true); setPlayerMinimized(false);
    setStoryIndex(0);
    navigate(`/category/${encodeURIComponent(firstCat)}`);
    if (selectedCategory === firstCat && stories.length > 0) {
      narrateFnRef.current.narrateStory(0);
    } else {
      st.pendingLoad = true;
      handleSelectCategory(firstCat);
    }
  };

  // ── URL-based routing ────────────────────────────────────────────────────────
  const isSettingsPath  = location.pathname === '/settings';
  const isMyFeedPath    = location.pathname === '/my-feed';
  const isPopularPath   = location.pathname === '/popular';
  const isCustomizePath = location.pathname === '/customize';
  const feedRouteMatch  = location.pathname.match(/^\/feed\/([^/]+)$/);
  const feedIdFromUrl   = feedRouteMatch ? feedRouteMatch[1] : null;
  const isFeedPage      = !!feedRouteMatch;
  const currentFeedPage = feedIdFromUrl ? (userFeeds || []).find(f => f.id === feedIdFromUrl) : null;
  const catOnlyMatch    = location.pathname.match(/^\/category\/([^/]+)$/);
  const storyRouteMatch = location.pathname.match(/^\/category\/([^/]+)\/story\/(\d+)$/);
  const catFromUrl      = storyRouteMatch ? decodeURIComponent(storyRouteMatch[1]) : (catOnlyMatch ? decodeURIComponent(catOnlyMatch[1]) : null);
  const storyIdxFromUrl = storyRouteMatch ? parseInt(storyRouteMatch[2]) : null;
  const isLatestHome    = !catFromUrl && !isSettingsPath && !isMyFeedPath && !isPopularPath && !isCustomizePath && !isFeedPage;
  const isHome          = isLatestHome; // kept for backward compat
  const isCategoryView  = !!catOnlyMatch;
  const isStoryView     = !!storyRouteMatch;
  const currentStory    = stories[storyIdxFromUrl ?? storyIndex] || null;
  const miniPlayerVisible = playerVisible && playerMinimized;
  // Show bottom nav everywhere except settings and when full player is open
  const showBottomNav   = !isSettingsPath && !(playerVisible && !playerMinimized && !fullPlayerExiting);

  const handleMinimizePlayer = () => {
    setFullPlayerExiting(true);
    // Navigate back to source screen as the player slides down
    const src = playerSourcePath.current;
    if (src && src !== location.pathname) navigate(src);
    setTimeout(() => {
      setPlayerMinimized(true);
      setFullPlayerExiting(false);
    }, 420);
  };

  // Keep narration refs in sync on every render
  // playlistCatsRef overrides navCategories so "Play My Feed" only iterates feed categories
  storyNavRef.current = { idx: storyIndex, stories, cats: playlistCatsRef.current || navCategories, cat: selectedCategory };

  return (
    <div style={{ background: '#09090f', minHeight: '100dvh' }}>
      <style>{`
        :root { --body-max: 600px; }
        * { box-sizing: border-box; }
        html, body { background: #09090f; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .side-nav-wrap { display: none; }
        .bottom-nav-wrap { display: block; }
        .main-content-offset { margin-left: 0; }
        /* ── Animated gradient Play button (shared) ── */
        @keyframes border-flow {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        .ai-btn-wrap {
          position: relative; border-radius: 14px; padding: 3px; display: inline-block;
          background: linear-gradient(90deg,#6366f1,#0891b2,#16a34a,#d97706,#e11d48,#9333ea,#db2777,#2563eb,#6366f1);
          background-size: 300% 100%;
          animation: border-flow 10s ease-in-out infinite;
        }
        .ai-btn-inner {
          width: auto; padding: 0.6rem 1.4rem; border-radius: 11px;
          background: linear-gradient(135deg,#18182a 0%,#1e1b35 100%);
          border: none; color: white; font-size: 0.88rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; letter-spacing: -0.01em; transition: opacity 0.15s; font-family: inherit;
        }
        .ai-btn-inner:hover { opacity: 0.9; }
        @media (min-width: 1024px) {
          :root { --body-max: 780px; }
          .side-nav-wrap { display: block; }
          .bottom-nav-wrap { display: none; }
          .main-content-offset { margin-left: 220px; }
          .mini-player-bar { left: 220px !important; }
          .header-brand { display: none; }
        }
      `}</style>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#18181f', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center', color: 'white' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            {authMessage && (
              <div style={{ marginBottom: '1.1rem', padding: '0.85rem 1rem', borderRadius: '12px', fontSize: '0.88rem', lineHeight: '1.5',
                background: authMessage.type === 'error' ? 'rgba(239,68,68,0.1)' : authMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                color: authMessage.type === 'error' ? '#f87171' : authMessage.type === 'success' ? '#4ade80' : '#a5b4fc',
                border: `1px solid ${authMessage.type === 'error' ? 'rgba(239,68,68,0.3)' : authMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`
              }}>
                {authMessage.text}
              </div>
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); setAuthMessage(null); }}
              style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '0.7rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '0.93rem', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setAuthMessage(null); }}
              style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '0.93rem', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleAuth}
              style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(null); }}
              style={{ width: '100%', padding: '0.78rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
              {authMode === 'signin' ? 'Create Account Instead' : 'Sign In Instead'}
            </button>
            <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); setAuthMessage(null); }}
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
      {isLatestHome && (
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
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          onShowSettings={() => navigate('/settings')}
          playerVisible={playerVisible}
          newsLanguage={newsLanguage}
        />
      )}

      {isMyFeedPath && (
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
          userFeeds={userFeeds}
          onPlayFeed={handlePlayFeed}
          onPlayMyFeed={handlePlayMyFeed}
          onPlayCategory={handlePlayCategory}
          onSelectCategory={handleSelectCategory}
          onPlayStory={handlePlayStory}
          isNarrating={isNarrating}
          selectedCategory={selectedCategory}
          currentStoryIndex={storyIndex}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          playerVisible={playerVisible}
        />
      )}

      {isFeedPage && (
        <FeedPage
          feed={currentFeedPage}
          briefingData={briefingData}
          briefingLoading={briefingLoading}
          selectedDay={selectedDay}
          selectedTime={selectedTime}
          availableDays={availableDays}
          availableTimes={availableTimes}
          onSelectDay={selectDay}
          onSelectTime={setSelectedTime}
          onPlayFeed={handlePlayFeed}
          onPlayCategory={handlePlayCategory}
          onSelectCategory={handleSelectCategory}
          onPlayStory={handlePlayStory}
          isNarrating={isNarrating}
          selectedCategory={selectedCategory}
          currentStoryIndex={storyIndex}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          playerVisible={playerVisible}
        />
      )}

      {isPopularPath && (
        <PopularTab
          briefingData={briefingData}
          briefingLoading={briefingLoading}
          listenCounts={listenCounts}
          defaultCategories={defaultCategories}
          onSelectCategory={handleSelectCategory}
          onPlayCategory={handlePlayCategory}
          isNarrating={isNarrating}
          playerVisible={playerVisible}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
        />
      )}

      {isCustomizePath && (
        <CustomizeTab
          userFeeds={userFeeds}
          onSaveUserFeeds={saveUserFeeds}
          feedCategories={feedCategories}
          onSaveFeedCategories={saveFeedCategories}
          defaultCategories={defaultCategories}
          user={user}
          onShowAuth={() => { setShowAuth(true); setAuthMode('signin'); }}
          playerVisible={playerVisible}
        />
      )}

      {isCategoryView && (
        <CategoryView
          category={catFromUrl}
          stories={stories}
          isLoading={newsLoading}
          isNarrating={isNarrating}
          isPaused={isPaused}
          currentStoryIndex={storyIndex}
          onPlayFrom={onPlayFrom}
          miniPlayerVisible={miniPlayerVisible}
        />
      )}

      {isStoryView && (
        <StoryReader
          category={catFromUrl}
          story={stories[storyIdxFromUrl] || null}
          storyIndex={storyIdxFromUrl}
          stories={stories}
          onPlayFrom={onPlayFrom}
          isNarrating={isNarrating && storyIndex === storyIdxFromUrl}
          isPaused={isPaused}
          miniPlayerVisible={miniPlayerVisible}
        />
      )}

      {/* ── Settings ── */}
      {isSettingsPath && (
        <main style={{ background: '#09090f', minHeight: '100dvh', maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
          <button onClick={() => navigate('/')} style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#18181f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                <User size={18} color="rgba(255,255,255,0.6)" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'white' }}>Account</h3>
              </div>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>{user.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>Signed in</div>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); navigate('/'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', color: '#f87171', cursor: 'pointer', fontWeight: '700', fontSize: '0.83rem' }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>Sign In</button>
                  <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Create Account</button>
                </div>
              )}
            </div>
            <div style={{ background: '#18181f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🌐</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'white' }}>News Language</h3>
                </div>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', padding: '3px', gap: '2px' }}>
                  {[['en', 'English'], ['ar', 'عربي']].map(([val, label]) => (
                    <button key={val} onClick={() => saveNewsLanguage(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: newsLanguage === val ? 'white' : 'transparent', color: newsLanguage === val ? '#111827' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {user && (
              <div style={{ background: '#18181f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '1rem', color: MY_FEED_COLOR }}>★</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'white' }}>My Rundown</h3>
                </div>
                <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Tap to add or remove. Numbers show story order.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {defaultCategories.map(cat => {
                    const pos = feedCategories.indexOf(cat); const isSel = pos !== -1; const color = CATEGORY_COLORS[cat] || '#6366f1';
                    const newCats = isSel ? feedCategories.filter(c => c !== cat) : [...feedCategories, cat];
                    return (
                      <button key={cat} onClick={() => saveFeedCategories(newCats)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: isSel ? '0.38rem 0.75rem 0.38rem 0.45rem' : '0.38rem 0.85rem', borderRadius: '999px', background: isSel ? color : 'transparent', color: isSel ? 'white' : 'rgba(255,255,255,0.7)', border: `1.5px solid ${isSel ? color : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                        {isSel && <span style={{ background: 'rgba(255,255,255,0.28)', borderRadius: '999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.63rem', fontWeight: '900', flexShrink: 0 }}>{pos + 1}</span>}
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {user && (
              <div style={{ background: '#18181f', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                  <Mail size={18} color="rgba(255,255,255,0.6)" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'white' }}>Email Digest</h3>
                </div>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Newsletter selection</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  {[['My Rundown', MY_FEED_COLOR], ...defaultCategories.map(c => [c, CATEGORY_COLORS[c] || '#6366f1'])].map(([cat, color]) => {
                    const active = (emailPreferences.categories || []).includes(cat);
                    return (
                      <button key={cat} onClick={() => handleCategoryEmailToggle(cat)} style={{ padding: '0.32rem 0.8rem', fontSize: '0.8rem', fontWeight: active ? '700' : '500', background: active ? color : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.6)', border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.15)'}`, borderRadius: '999px', cursor: 'pointer' }}>
                        {cat === 'My Rundown' ? '\u2605 My Rundown' : cat}
                      </button>
                    );
                  })}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0 0 1rem' }} />
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Delivery times</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.55rem' }}>
                  {timesOfDay.map(time => {
                    const slotKey = time.value.toLowerCase(); const isEnabled = !!emailPreferences[slotKey];
                    return (
                      <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: isEnabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1.5px solid ${isEnabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={isEnabled} onChange={() => handleEmailSlotToggle(slotKey)} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'white' }}>{time.label}</div>
                          <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)' }}>{time.time}</div>
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
      {playerVisible && (!playerMinimized || fullPlayerExiting) && (
        <FullPlayer
          visible={!fullPlayerExiting}
          isExiting={fullPlayerExiting}
          onMinimize={handleMinimizePlayer}
          onClose={() => { setPlayerVisible(false); narrateFnRef.current.stop(); }}
          category={selectedCategory}
          story={currentStory}
          storyIndex={storyIndex}
          storyCount={stories.length}
          stories={stories}
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
          bottomOffset={showBottomNav && typeof window !== 'undefined' && window.innerWidth < 1024 ? 56 : 0}
        />
      )}

      {/* ── Side Navigation (desktop) ── */}
      {showBottomNav && (
        <div className="side-nav-wrap">
          <SideNav userFeeds={userFeeds} onReorderFeeds={handleReorderFeeds} />
        </div>
      )}

      {/* ── Bottom Navigation (mobile) ── */}
      {showBottomNav && (
        <div className="bottom-nav-wrap">
          <BottomNav userFeeds={userFeeds} />
        </div>
      )}

      {/* ── Category transition overlay ── */}
      <CategoryTransition
        visible={categoryTransition !== null}
        category={categoryTransition?.category || ''}
        storyCount={categoryTransition?.storyCount || 0}
        estimatedMin={categoryTransition?.estimatedMin || 0}
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
        <Route path="/verify-email" element={<VerificationPage />} />
      </Routes>
    </Router>
  );
}

export default App;
