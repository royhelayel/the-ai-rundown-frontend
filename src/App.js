import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Calendar, Clock, Mail, Plus, Trash2, LogOut, User, Search, Sparkles, Settings, Loader, Menu, ChevronLeft, ChevronRight, ChevronDown, X, Volume2, VolumeX, Pause, Play, RotateCcw, Repeat, SkipBack, SkipForward } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { VerificationPage } from './components/VerificationPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('rundown_view_mode') || 'digest');
  const [depthLevel, setDepthLevel] = useState(() => localStorage.getItem('rundown_depth_level') || 'summary');
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
  const storyNavRef = useRef({});
  const storyGoRef = useRef({}); // exposes goNext/goPrev from the stories render block
  const swipeTouchRef = useRef(null); // tracks touch start position for swipe detection
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const repeatModeRef = useRef(false);
  const playbackSpeedRef = useRef(1);
  const narrationStateRef = useRef({ active: false, pendingLoad: false, paused: false, canceling: false });
  const narrateFnRef = useRef({});
  const handleSelectCategoryRef = useRef(null);

  const [feedCategories, setFeedCategories] = useState([]);
  const [completedSlots, setCompletedSlots] = useState(new Set()); // Set of "YYYY-MM-DD|Morning" etc.
  const [slotsLoaded, setSlotsLoaded] = useState(false); // true after first completedSlots fetch
  const [newsLanguage, setNewsLanguage] = useState(() => localStorage.getItem('rundown_news_language') || 'en');
  const [showFeedPicker, setShowFeedPicker] = useState(false);
  const [feedPickerDraft, setFeedPickerDraft] = useState([]);

  const [showCategoryLeftArrow, setShowCategoryLeftArrow] = useState(false);
  const [showCategoryRightArrow, setShowCategoryRightArrow] = useState(true);
  const [showDayLeftArrow, setShowDayLeftArrow] = useState(false);
  const [showDayRightArrow, setShowDayRightArrow] = useState(true);

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
    const st = narrationStateRef.current;
    if (st.audio) { st.audio.pause(); st.audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    st.active = false;
    st.pendingLoad = false;
    st.paused = false;
    setIsNarrating(false);
    setIsPaused(false);
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
    if (st.audio) st.audio.play().catch(() => narrateFnRef.current.stop());
    if (!st.audio && 'speechSynthesis' in window) window.speechSynthesis.resume();
    st.paused = false;
    setIsPaused(false);
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
    const st = narrationStateRef.current;
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
      utter.onend = () => { if (narrationStateRef.current.active && !narrationStateRef.current.canceling) onDone(); };
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

  const speakText = (text, onDone) => {
    if (!narrationStateRef.current.active || !text.trim()) { onDone(); return; }
    // Fish Audio uses an English voice — route Arabic directly to browser TTS
    if (newsLanguage === 'ar') { speakWithBrowser(cleanForTTS(text), onDone); return; }
    fetch(`${BACKEND_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    })
      .then(r => { if (!r.ok) throw new Error('tts failed'); return r.blob(); })
      .then(blob => {
        if (!narrationStateRef.current.active) return;
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        narrationStateRef.current.audio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          narrationStateRef.current.audio = null;
          if (narrationStateRef.current.active) onDone();
        };
        audio.onerror = () => {
          if (narrationStateRef.current.canceling) return;
          URL.revokeObjectURL(url);
          narrationStateRef.current.audio = null;
          narrateFnRef.current.stop();
        };
        audio.playbackRate = playbackSpeedRef.current;
        audio.play().catch(() => { if (!narrationStateRef.current.canceling) narrateFnRef.current.stop(); });
      })
      .catch(() => {
        // Fish Audio unavailable — fall back to browser speech synthesis
        if (narrationStateRef.current.active) speakWithBrowser(text, onDone);
      });
  };
  narrateFnRef.current.speakText = speakText;

  const goNextCategoryNarration = () => {
    const { cats, cat } = storyNavRef.current;
    const catIdx = cats.indexOf(cat);
    const nextCat = catIdx >= 0 && catIdx < cats.length - 1 ? cats[catIdx + 1] : null;
    if (nextCat && narrationStateRef.current.active) {
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
    const isAr = newsLanguage === 'ar';
    const cl = cleanForTTS;
    const parts = [cl(story.headline) + '.'];
    (story.tightBullets || story.allBullets || []).forEach(b => parts.push(cl(b) + '.'));
    if (story.perspectives) parts.push((isAr ? 'وجهات النظر تتباين. ' : 'On the other hand, ') + cl(story.perspectives) + '.');
    if (story.why) parts.push((isAr ? 'لماذا هذا مهم. ' : 'Here is why this matters. ') + cl(story.why) + '.');
    const script = parts.filter(Boolean).join(' ');
    narrateFnRef.current.speakText(script, () => {
      if (!narrationStateRef.current.active) return;
      setTimeout(() => narrateFnRef.current.narrateStory(idx + 1), 600);
    });
  };
  narrateFnRef.current.narrateStory = narrateStoryFrom;

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
    if (viewMode === 'stories') {
      narrateFnRef.current.narrateStory(storyIndex);
    } else {
      narrateFnRef.current.narrateDigest(getNarrationContent());
    }
  };

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
  // Always show all days; always show all time buttons.
  // Slot buttons are individually disabled when no news exists for that day+time.
  const todayHasSlot = timesOfDay.some(t => completedSlots.has(`${today}|${t.value}`));
  const availableDays = isCustomCategory
    ? daysOfWeek.filter(d => d.fullDate === today)
    : daysOfWeek;

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
      }
    } catch (error) { console.error('Init error:', error); }
  }, []);

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

    // If narrating, cancel current audio and queue auto-restart when new content loads
    if (narrationStateRef.current.active) {
      narrateFnRef.current.cancelAudioKeepActive?.();
      narrationStateRef.current.pendingLoad = true;
      narrationStateRef.current.paused = false;
      setIsPaused(false);
    }

    // ── My Rundown: parallel fetch for all selected categories ──
    if (selectedCategory === 'My Rundown') {
      if (!user || feedCategories.length === 0) return;
      // Generation guard: don't show partial My Rundown while slot is still generating
      if (slotsLoaded && isSlotUnavailable(selectedDay, selectedTime)) {
        setNewsSummary(null); setNewsNotAvailable(false); return;
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
    if (newsSummary && newsSummary.category === selectedCategory && newsSummary.day === selectedDay && newsSummary.time_slot === fetchTimeSlot && (newsSummary.language || 'en') === newsLanguage) {
      narrationStateRef.current.pendingLoad = false; // content unchanged, no auto-restart needed
      return;
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
      setStoryIndex(0);
      setTimeout(() => narrateFnRef.current.narrateStory?.(0), 200);
    } else {
      const content = narrateFnRef.current.getNarrationContent?.() || newsSummary?.content;
      setTimeout(() => narrateFnRef.current.narrateDigest?.(content), 200);
    }
  }, [stories, newsSummary]);

  // Stop narration on unmount
  useEffect(() => { return () => { window.speechSynthesis?.cancel(); }; }, []);

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
          setCompletedSlots(new Set(data.map(r => `${r.day}|${r.time_slot}`)));
          setSlotsLoaded(true);
        }
      } catch (_) { setSlotsLoaded(true); } // mark loaded even on error so UI doesn't hang
    };
    fetchCompleted();
    // Poll every 30 s so the UI unlocks automatically when generation finishes
    const interval = setInterval(fetchCompleted, 30000);
    return () => clearInterval(interval);
  }, [newsLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Slide-out panel shared wrapper ── */
  const slidePanel = (children) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '270px', background: 'white', boxShadow: '4px 0 24px rgba(0,0,0,0.12)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.22s ease' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={viewMode === 'stories' && currentView === 'home' ? { background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : { background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)', minHeight: '100vh', overflowY: 'scroll', overflowX: 'hidden' }}>
      <style>{`
        html { overflow-y: scroll; }
        body { overflow-y: scroll; }
        ${viewMode === 'stories' && isMobile && currentView === 'home' ? 'html, body { overflow: hidden !important; position: fixed; width: 100%; }' : ''}
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: 'white', boxShadow: '0 1px 0 rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Brand row */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: viewMode === 'stories' && currentView === 'home' ? `0.6rem ${isMobile ? '1rem' : '2rem'}` : `1.25rem ${isMobile ? '1rem' : '2rem'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '1rem', transition: 'padding 0.2s' }}>
          <div onClick={() => setCurrentView('home')} style={{ display: 'flex', alignItems: 'center', gap: windowWidth < 480 ? '0.4rem' : '0.65rem', flexShrink: 0, cursor: 'pointer' }}>
            <Sparkles size={windowWidth < 480 ? 16 : windowWidth < 640 ? 20 : 26} color="#111827" />
            <h1 style={{ fontSize: windowWidth < 480 ? '0.95rem' : windowWidth < 640 ? '1.2rem' : '1.6rem', fontWeight: '900', margin: 0, color: '#111827', whiteSpace: 'nowrap' }}>
              The Rundown
            </h1>
          </div>

          {/* View toggle — always visible, icon-only on small screens */}
          {currentView === 'home' && (
            <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', borderRadius: '999px', padding: windowWidth < 480 ? '2px' : '3px', flexShrink: 0, marginLeft: 'auto' }}>
              {[['digest', '≡', '≡ Read'], ['stories', '▶', '▶ Stories']].map(([mode, icon, label]) => (
                <button key={mode} onClick={() => mode === 'stories' ? enterStories() : exitStories()}
                  style={{ padding: windowWidth < 480 ? '0.2rem 0.6rem' : '0.3rem 0.85rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: windowWidth < 480 ? '0.68rem' : '0.75rem', fontWeight: '700', background: viewMode === mode ? 'white' : 'transparent', color: viewMode === mode ? '#111827' : '#9ca3af', boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
              {user && CUSTOM_CATEGORIES_ENABLED && (
                <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.55rem 1.1rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700' }}>
                  <Plus size={15} /> Add Category
                </button>
              )}
              {user ? (
                <button onClick={() => setCurrentView('settings')} style={{ padding: '0.5rem 0.95rem', background: '#f3f4f6', border: 'none', borderRadius: '999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '600', color: '#374151' }}>
                  <User size={15} /> {user.email}
                </button>
              ) : (
                <button onClick={() => setCurrentView('settings')} style={{ padding: '0.55rem 0.95rem', background: '#f3f4f6', border: 'none', borderRadius: '999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '600', color: '#374151' }}>
                  <Settings size={15} /> Settings
                </button>
              )}
            </div>
          )}

          {isMobile && (
            <button onClick={() => { setCurrentView(currentView === 'settings' ? 'home' : 'settings'); setShowMobileMenu(false); }} style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#374151' }}>
              {currentView === 'settings' ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Category nav — hidden in stories mode and settings */}
        {windowWidth > 1100 && !(viewMode === 'stories' && currentView === 'home') && currentView !== 'settings' && (
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0.5rem', display: 'flex', alignItems: 'stretch' }}>
              {showCategoryLeftArrow && (
                <button onClick={() => { categoryScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' }); }} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.4rem', fontSize: '1.1rem' }}>‹</button>
              )}
              <div ref={categoryScrollRef} style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', flex: 1 }}>
                {/* ── My Rundown pinned tab ── */}
                <button onClick={() => { if (!user) { setShowAuth(true); setAuthMode('signin'); } else if (feedCategories.length === 0) { setFeedPickerDraft([]); setShowFeedPicker(true); } else handleSelectCategory('My Rundown'); }} style={{ padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: selectedCategory === 'My Rundown' ? `2.5px solid ${MY_FEED_COLOR}` : '2.5px solid transparent', color: selectedCategory === 'My Rundown' ? MY_FEED_COLOR : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === 'My Rundown' ? '700' : '500', fontSize: '0.88rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  ★ My Rundown
                </button>
                <span style={{ width: '1px', background: '#e5e7eb', margin: '0.5rem 0.4rem', flexShrink: 0 }} />
                {defaultCategories.map((category, idx) => (
                  <React.Fragment key={category}>
                    {REGIONAL_CATEGORIES.includes(category) && !REGIONAL_CATEGORIES.includes(defaultCategories[idx - 1]) && (
                      <span style={{ width: '1px', background: '#e5e7eb', margin: '0.5rem 0.4rem', flexShrink: 0 }} />
                    )}
                    <button onClick={() => handleSelectCategory(category)} style={{ padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: selectedCategory === category ? `2.5px solid ${CATEGORY_COLORS[category] || '#6366f1'}` : '2.5px solid transparent', color: selectedCategory === category ? (CATEGORY_COLORS[category] || '#6366f1') : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.88rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', letterSpacing: '-0.01em' }}>
                      {category}
                    </button>
                  </React.Fragment>
                ))}
                {CUSTOM_CATEGORIES_ENABLED && customCategories.length > 0 && (
                  <>
                    <span style={{ width: '1px', background: '#e5e7eb', margin: '0.5rem 0.4rem', flexShrink: 0 }} />
                    {customCategories.map(category => (
                      <button key={category} onClick={() => handleSelectCategory(category)} style={{ padding: '0.65rem 1.1rem', background: 'none', border: 'none', borderBottom: selectedCategory === category ? '2.5px solid #ec4899' : '2.5px solid transparent', color: selectedCategory === category ? '#ec4899' : '#6b7280', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.88rem', whiteSpace: 'nowrap', transition: 'all 0.15s ease', letterSpacing: '-0.01em' }}>
                        {category}
                      </button>
                    ))}
                  </>
                )}
              </div>
              {showCategoryRightArrow && (
                <button onClick={() => { categoryScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' }); }} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0 0.4rem', fontSize: '1.1rem' }}>›</button>
              )}
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {isMobile && showMobileMenu && (
          <div style={{ background: 'white', borderTop: '1px solid #f3f4f6', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {user && (
              <>
                {CUSTOM_CATEGORIES_ENABLED && (
                  <button onClick={() => setShowCategoryModal(true)} style={{ padding: '0.6rem 1rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: '700' }}>
                    <Plus size={14} /> Add Custom Category
                  </button>
                )}
                <button onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '999px', cursor: 'pointer', fontSize: '0.88rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Settings size={14} /> Settings
                </button>
                <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setShowMobileMenu(false); setCurrentView('home'); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid #fee2e2', borderRadius: '999px', cursor: 'pointer', fontSize: '0.88rem', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            )}
            {!user && (
              <button onClick={() => { setCurrentView('settings'); setShowMobileMenu(false); }} style={{ padding: '0.6rem 1rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: '999px', cursor: 'pointer', fontSize: '0.88rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={14} /> Settings
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── My Rundown Picker Modal ── */}
      {showFeedPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowFeedPicker(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: '540px', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}>
            {/* Handle bar */}
            <div style={{ width: '36px', height: '4px', background: '#e5e7eb', borderRadius: '99px', margin: '0 auto 1.25rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#111827' }}>Customize My Rundown</h3>
              <button onClick={() => setShowFeedPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem' }}><X size={18} /></button>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: '#9ca3af' }}>Tap to select. Numbers show the order stories appear.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {defaultCategories.map((cat) => {
                const pos = feedPickerDraft.indexOf(cat);
                const isSelected = pos !== -1;
                const color = CATEGORY_COLORS[cat] || '#6366f1';
                return (
                  <button key={cat} onClick={() => toggleFeedPickerCat(cat)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: isSelected ? '0.38rem 0.75rem 0.38rem 0.45rem' : '0.38rem 0.85rem', borderRadius: '999px', background: isSelected ? color : 'transparent', color: isSelected ? 'white' : '#374151', border: `1.5px solid ${isSelected ? color : '#e5e7eb'}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.15s' }}>
                    {isSelected && (
                      <span style={{ background: 'rgba(255,255,255,0.28)', borderRadius: '999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.63rem', fontWeight: '900', flexShrink: 0 }}>{pos + 1}</span>
                    )}
                    {cat}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{feedPickerDraft.length} {feedPickerDraft.length === 1 ? 'category' : 'categories'} selected</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {feedPickerDraft.length > 0 && (
                  <button onClick={() => setFeedPickerDraft([])} style={{ padding: '0.55rem 1rem', background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '999px', cursor: 'pointer', color: '#6b7280', fontSize: '0.82rem', fontWeight: '600' }}>Clear</button>
                )}
                <button disabled={feedPickerDraft.length === 0} onClick={() => { saveFeedCategories(feedPickerDraft); setShowFeedPicker(false); handleSelectCategory('My Rundown'); }} style={{ padding: '0.55rem 1.4rem', background: feedPickerDraft.length === 0 ? '#f3f4f6' : 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: feedPickerDraft.length === 0 ? '#9ca3af' : 'white', border: 'none', borderRadius: '999px', cursor: feedPickerDraft.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.88rem', transition: 'all 0.15s' }}>Save Feed</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center', color: '#111827' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            {authMessage && (
              <div style={{
                marginBottom: '1.1rem', padding: '0.85rem 1rem', borderRadius: '12px', fontSize: '0.88rem', lineHeight: '1.5',
                background: authMessage.type === 'error' ? '#fef2f2' : authMessage.type === 'success' ? '#f0fdf4' : '#eff6ff',
                color: authMessage.type === 'error' ? '#991b1b' : authMessage.type === 'success' ? '#166534' : '#1e40af',
                border: `1.5px solid ${authMessage.type === 'error' ? '#fecaca' : authMessage.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`
              }}>
                {authMessage.text}
              </div>
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => { setEmail(e.target.value); setAuthMessage(null); }} style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '0.7rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', outline: 'none' }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthMessage(null); }} style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', outline: 'none' }} />
            <button onClick={handleAuth} style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem' }}>
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
            <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthMessage(null); }} style={{ width: '100%', padding: '0.78rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
              {authMode === 'signin' ? 'Create Account Instead' : 'Sign In Instead'}
            </button>
            <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); setAuthMessage(null); }} style={{ width: '100%', padding: '0.7rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.88rem' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Add Category Modal ── */}
      {CUSTOM_CATEGORIES_ENABLED && showCategoryModal && user && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.4rem', color: '#111827' }}>Add Custom Category</h2>

            {customCategories.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '10px', fontSize: '0.83rem', color: '#92400e' }}>
                ⚠️ You already track "{customCategories[0]}". Saving will replace it.
              </div>
            )}

            <div style={{ marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151' }}>Category Title</label>
                <span style={{ fontSize: '0.75rem', color: newCategory.length >= 25 ? '#ef4444' : '#9ca3af' }}>{newCategory.length}/25</span>
              </div>
              <input
                type="text"
                placeholder="e.g., Lakers"
                value={newCategory}
                maxLength={25}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ width: '100%', padding: '0.78rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: '0.3rem', marginBottom: 0 }}>Shown on the category pill — keep it short</p>
            </div>

            <div style={{ marginBottom: '1.4rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151' }}>Description</label>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>used for news generation</span>
              </div>
              <textarea
                placeholder="e.g., Los Angeles Lakers NBA playoffs, trades, and team news"
                value={newCategoryDescription}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCategoryDescription(val);
                  setSelectedSharedKey(null);
                  if (val.trim().length > 2) {
                    clearTimeout(window._suggTimeout);
                    window._suggTimeout = setTimeout(async () => {
                      try {
                        const res = await fetch(`${BACKEND_URL}/api/categories/suggestions?q=${encodeURIComponent(val)}`);
                        const suggestions = await res.json();
                        setCategorySuggestions(Array.isArray(suggestions) ? suggestions : []);
                      } catch { setCategorySuggestions([]); }
                    }, 700);
                  } else {
                    setCategorySuggestions([]);
                  }
                }}
                rows={3}
                style={{ width: '100%', padding: '0.78rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '0.93rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              {categorySuggestions.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>
                  {categorySuggestions.map((s, i) => (
                    <button key={i} onClick={() => { setNewCategoryDescription(s.description); setSelectedSharedKey(s.shared_key); setCategorySuggestions([]); }} style={{ display: 'block', width: '100%', padding: '0.6rem 1rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', borderBottom: i < categorySuggestions.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <div style={{ fontWeight: '500' }}>{s.description}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem' }}>Join existing category · no generation needed</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {categoryLockedToday ? (
              <div style={{ marginBottom: '0.6rem', padding: '0.75rem 1rem', background: '#f3f4f6', borderRadius: '10px', fontSize: '0.83rem', color: '#6b7280', textAlign: 'center' }}>
                You've used your category change for today. You can create a new one tomorrow.
              </div>
            ) : (
              <button onClick={handleAddCategory} disabled={!newCategory.trim()} style={{ width: '100%', padding: '0.82rem', background: newCategory.trim() ? 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' : '#e5e7eb', color: newCategory.trim() ? 'white' : '#9ca3af', border: 'none', borderRadius: '999px', cursor: newCategory.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem', transition: 'all 0.15s' }}>
                {customCategories.length > 0 ? 'Replace & Save' : 'Add Category'}
              </button>
            )}
            <button onClick={() => { setShowCategoryModal(false); setNewCategory(''); setNewCategoryDescription(''); setSelectedSharedKey(null); setCategorySuggestions([]); }} style={{ width: '100%', padding: '0.78rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      {currentView === 'home' && (
        <main style={viewMode === 'stories' ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', background: 'rgba(15,15,20,0.92)', padding: isMobile ? '0' : '0' } : { maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '0.75rem 0.75rem 2.5rem' : '1rem 2rem 3rem 2rem' }}>

          {/* Mobile trigger buttons — hidden in stories mode */}
          <div style={{ marginBottom: '0.6rem', display: viewMode === 'stories' ? 'none' : 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {windowWidth <= 1100 && (
              <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} style={{ padding: '0.42rem 0.9rem', background: 'rgba(99,102,241,0.08)', border: '1.5px solid #6366f1', borderRadius: '999px', color: '#6366f1', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                ☰ {selectedCategory}
              </button>
            )}
            {windowWidth <= 900 && (
              <button onClick={() => setShowDayMenu(!showDayMenu)} style={{ padding: '0.42rem 0.9rem', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '999px', color: '#374151', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                📅 {availableDays.find(d => d.fullDate === selectedDay)?.label || 'Days'}
              </button>
            )}
            {windowWidth <= 750 && !isCustomCategory && (
              <button onClick={() => setShowTimeMenu(!showTimeMenu)} style={{ padding: '0.42rem 0.9rem', background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '999px', color: '#374151', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                🕐 {availableTimes.find(t => t.value === selectedTime)?.label || 'Times'}
              </button>
            )}
          </div>

          {/* Day + Time navigation — standard categories, hidden in stories mode */}
          {viewMode !== 'stories' && windowWidth > 900 && !isCustomCategory && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'white', padding: '0.55rem 0.75rem', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <button onClick={() => { const n = weekOffset - 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }} disabled={weekOffset <= -3} style={navArrow(weekOffset <= -3)}>‹</button>
              <div ref={dayScrollRef} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none', flex: 1 }}>
                {availableDays.map(day => (
                  <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={dayPill(selectedDay === day.fullDate, false)}>
                    {day.fullDate === today ? 'Today' : `${day.label} ${day.date}`}
                  </button>
                ))}
                <button onClick={() => { const n = weekOffset + 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }} disabled={weekOffset >= 0} style={navArrow(weekOffset >= 0)}>›</button>
              </div>
              <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 0.2rem' }} />
              {availableTimes.map(time => {
                const unavail = isSlotUnavailable(selectedDay, time.value);
                return (
                  <button key={time.value} onClick={() => !unavail && setSelectedTime(time.value)} disabled={unavail} style={timePill(selectedTime === time.value, unavail)}>
                    <span>{time.label}</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: '400', opacity: 0.75 }}>{time.time}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Day row — custom categories (no time pills for custom), hidden in stories mode */}
          {viewMode !== 'stories' && windowWidth > 750 && isCustomCategory && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', background: 'white', padding: '0.55rem 0.75rem', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {availableDays.map(day => (
                <button key={day.fullDate} onClick={() => setSelectedDay(day.fullDate)} style={dayPill(selectedDay === day.fullDate, false)}>
                  {day.fullDate === today ? 'Today' : `${day.label} ${day.date}`}
                </button>
              ))}
            </div>
          )}

          {/* ── Depth toggle — Read mode, below day/time nav, catColor active ── */}
          {viewMode !== 'stories' && (
            <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '3px', background: '#f3f4f6', borderRadius: '999px', padding: '3px' }}>
                {[['headlines', 'Headlines'], ['summary', 'Takeaways'], ['deep', 'Summary']].map(([level, label]) => (
                  <button key={level} onClick={() => handleSetDepth(level)} style={{ padding: '5px 18px', borderRadius: '999px', border: 'none', fontSize: '0.73rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: depthLevel === level ? catColor : 'transparent', color: depthLevel === level ? 'white' : '#9ca3af', boxShadow: depthLevel === level ? '0 1px 4px rgba(0,0,0,0.15)' : 'none' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slide-out: categories */}
          {showCategoryMenu && windowWidth <= 1100 && slidePanel(
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#111827' }}>Categories</h3>
                <button onClick={() => setShowCategoryMenu(false)} style={{ padding: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* My Rundown in mobile panel */}
                <button onClick={() => { if (!user) { setShowAuth(true); setAuthMode('signin'); setShowCategoryMenu(false); } else if (feedCategories.length === 0) { setFeedPickerDraft([]); setShowFeedPicker(true); setShowCategoryMenu(false); } else { handleSelectCategory('My Rundown'); setShowCategoryMenu(false); } }} style={{ padding: '0.62rem 0.9rem', background: selectedCategory === 'My Rundown' ? `${MY_FEED_COLOR}14` : 'transparent', color: selectedCategory === 'My Rundown' ? MY_FEED_COLOR : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedCategory === 'My Rundown' ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  ★ My Rundown
                </button>
                <div style={{ height: '1px', background: '#f3f4f6', margin: '0.15rem 0' }} />
                {defaultCategories.map((category, idx) => (
                  <React.Fragment key={category}>
                    {REGIONAL_CATEGORIES.includes(category) && !REGIONAL_CATEGORIES.includes(defaultCategories[idx - 1]) && (
                      <div style={{ margin: '0.4rem 0 0.15rem 0.9rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Regional</span>
                      </div>
                    )}
                    <button onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedCategory === category ? `${CATEGORY_COLORS[category] || '#6366f1'}14` : 'transparent', color: selectedCategory === category ? (CATEGORY_COLORS[category] || '#6366f1') : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                      {category}
                    </button>
                  </React.Fragment>
                ))}
                {CUSTOM_CATEGORIES_ENABLED && customCategories.length > 0 && (
                  <>
                    <div style={{ margin: '0.5rem 0 0.25rem', padding: '0 0.9rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom</span>
                    </div>
                    {customCategories.map(category => (
                      <button key={category} onClick={() => { handleSelectCategory(category); setShowCategoryMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedCategory === category ? 'rgba(236,72,153,0.08)' : 'transparent', color: selectedCategory === category ? '#ec4899' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedCategory === category ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                        {category}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Slide-out: days */}
          {showDayMenu && windowWidth <= 900 && slidePanel(
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#111827' }}>Days</h3>
                <button onClick={() => setShowDayMenu(false)} style={{ padding: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem' }}>✕</button>
              </div>
              {/* Week navigation inside mobile panel */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', background: '#f9fafb', borderRadius: '10px', padding: '0.3rem 0.5rem' }}>
                <button onClick={() => { const n = weekOffset - 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }} disabled={weekOffset <= -3} style={navArrow(weekOffset <= -3)}>‹</button>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#6b7280' }}>
                  {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
                </span>
                <button onClick={() => { const n = weekOffset + 1; setWeekOffset(n); setSelectedDay(getDaysOfWeek(n)[6].fullDate); }} disabled={weekOffset >= 0} style={navArrow(weekOffset >= 0)}>›</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {availableDays.map(day => (
                  <button key={day.fullDate} onClick={() => { setSelectedDay(day.fullDate); setShowDayMenu(false); }} style={{ padding: '0.62rem 0.9rem', background: selectedDay === day.fullDate ? '#111827' : 'transparent', color: selectedDay === day.fullDate ? 'white' : '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: selectedDay === day.fullDate ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease' }}>
                    {day.fullDate === today ? 'Today' : `${day.label} ${day.date}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slide-out: times */}
          {showTimeMenu && windowWidth <= 750 && !isCustomCategory && slidePanel(
            <div style={{ padding: '1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#111827' }}>Times</h3>
                <button onClick={() => setShowTimeMenu(false)} style={{ padding: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1.2rem' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {availableTimes.map(time => {
                  const unavail = isSlotUnavailable(selectedDay, time.value);
                  return (
                    <button key={time.value} onClick={() => { if (!unavail) { setSelectedTime(time.value); setShowTimeMenu(false); } }} disabled={unavail} style={{ padding: '0.62rem 0.9rem', background: selectedTime === time.value ? 'linear-gradient(135deg,#6366f1,#ec4899)' : 'transparent', color: selectedTime === time.value ? 'white' : unavail ? '#d1d5db' : '#374151', border: 'none', borderRadius: '8px', cursor: unavail ? 'not-allowed' : 'pointer', fontWeight: selectedTime === time.value ? '700' : '500', fontSize: '0.9rem', textAlign: 'left', transition: 'all 0.12s ease', opacity: unavail ? 0.45 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{time.label}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: '400', opacity: 0.6 }}>{time.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Depth toggle — Stories mode, floats above card in dark area ── */}
          {viewMode === 'stories' && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px 6px', flexShrink: 0, width: '100%' }}>
              <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.10)', borderRadius: '999px', padding: '3px' }}>
                {[['headlines', 'Headlines'], ['summary', 'Takeaways'], ['deep', 'Summary']].map(([level, label]) => (
                  <button key={level} onClick={() => handleSetDepth(level)} style={{ padding: '5px 18px', borderRadius: '999px', border: 'none', fontSize: '0.73rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s', background: depthLevel === level ? storyCardColor : 'transparent', color: depthLevel === level ? 'white' : 'rgba(255,255,255,0.45)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── News Card ── */}
          <div
            style={viewMode === 'stories' ? { position: 'relative', background: `linear-gradient(160deg, ${storyCardColor}cc, ${storyCardColor}77)`, borderRadius: '20px', boxShadow: '0 32px 80px rgba(0,0,0,0.55)', width: '100%', maxWidth: '430px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'calc(100dvh - 128px)', margin: isMobile ? '0 1rem calc(env(safe-area-inset-bottom, 0px) + 1rem)' : '0 1rem 1rem' } : { background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minHeight: '500px' }}
            onTouchStart={viewMode === 'stories' ? (e) => {
              swipeTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, swiped: false };
            } : undefined}
            onTouchEnd={viewMode === 'stories' ? (e) => {
              if (!swipeTouchRef.current) return;
              const dx = e.changedTouches[0].clientX - swipeTouchRef.current.x;
              const dy = e.changedTouches[0].clientY - swipeTouchRef.current.y;
              // Only fire when horizontal movement is dominant and exceeds 50px threshold
              if (Math.abs(dx) >= 50 && Math.abs(dx) >= Math.abs(dy) * 1.5) {
                swipeTouchRef.current.swiped = true;
                const _navCats = (user && feedCategories.length > 0) ? ['My Rundown', ...allCategories] : allCategories;
                const catIdx = _navCats.indexOf(selectedCategory);
                const isFirst = storyIndex === 0;
                const isLast  = storyIndex === stories.length - 1;
                const prevCat = catIdx > 0 ? _navCats[catIdx - 1] : null;
                const nextCat = catIdx < _navCats.length - 1 ? _navCats[catIdx + 1] : null;
                if (dx < 0) {
                  // Swipe left → next
                  if (!isLast) setStoryIndex(i => i + 1);
                  else if (nextCat) { handleSelectCategory(nextCat); setStoryIndex(0); }
                } else {
                  // Swipe right → previous
                  if (!isFirst) setStoryIndex(i => i - 1);
                  else if (prevCat) { goToLastStoryRef.current = true; handleSelectCategory(prevCat); }
                }
              }
              swipeTouchRef.current = null;
            } : undefined}
            onClick={viewMode === 'stories' ? (e) => {
              // Skip if the tap was part of a swipe gesture
              if (swipeTouchRef.current?.swiped) return;
              // Skip if click originated on an interactive element
              if (e.target.closest('button, a, input, select, textarea, [role="button"]')) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              if (relX < rect.width * 0.4) {
                storyGoRef.current.goPrev?.();
              } else if (relX > rect.width * 0.6) {
                storyGoRef.current.goNext?.();
              }
            } : undefined}
          >

            {/* Progress bar — flush to very top of card, outside padding */}
            {viewMode === 'stories' && stories.length > 0 && (
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '3px', padding: '10px 12px 0', flexShrink: 0 }}>
                {stories.map((s, i) => (
                  <button key={i} onClick={() => setStoryIndex(i)} style={{ flex: 1, height: '3px', border: 'none', borderRadius: '99px', cursor: 'pointer', padding: 0, background: i <= storyIndex ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)', opacity: i === storyIndex ? 1 : i < storyIndex ? 0.7 : 1, transition: 'all 0.2s' }} />
                ))}
              </div>
            )}

            <div style={viewMode === 'stories' ? { position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: '0.6rem 1.25rem 1rem' } : { padding: isMobile ? '1.25rem 1rem' : '1.75rem 2rem' }}>
              {selectedCategory === 'My Rundown' && !user ? (
                /* Guest: sign-in prompt */
                <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '400px', margin: '0 auto' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>★</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', margin: '0 0 0.5rem', color: '#111827' }}>My Rundown</h3>
                  <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Sign in to build your personal feed — choose your categories and it follows you across all your devices.</p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ padding: '0.65rem 1.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>Sign in</button>
                    <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ padding: '0.65rem 1.5rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>Create account</button>
                  </div>
                </div>
              ) : selectedCategory === 'My Rundown' && user && feedCategories.length === 0 ? (
                /* Logged in but no feed configured yet */
                <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '400px', margin: '0 auto' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>★</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', margin: '0 0 0.5rem', color: '#111827' }}>Build Your Feed</h3>
                  <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Choose the categories you want — tap them in the order you'd like stories to appear.</p>
                  <button onClick={() => { setFeedPickerDraft([]); setShowFeedPicker(true); }} style={{ padding: '0.7rem 1.8rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>Choose Categories</button>
                </div>
              ) : newsLoading ? (
                viewMode === 'stories' ? (() => {
                  const isMyFeed = selectedCategory === 'My Rundown';
                  const headerColor = catColor;
                  const dayLabel = (() => { const d = daysOfWeek.find(d => d.fullDate === selectedDay); return d ? (d.fullDate === today ? 'Today' : `${d.label} ${d.date}`) : selectedDay; })();
                  const pickerItemStyle = (active, color = catColor) => ({ width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? '700' : '500', background: active ? `${color}18` : 'transparent', color: active ? color : '#374151', transition: 'background 0.12s' });
                  const _navCats = (user && feedCategories.length > 0) ? ['My Rundown', ...allCategories] : allCategories;
                  const catIdx = _navCats.indexOf(selectedCategory);
                  const prevCat = catIdx > 0 ? _navCats[catIdx - 1] : null;
                  const nextCat = catIdx < _navCats.length - 1 ? _navCats[catIdx + 1] : null;
                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      {/* Picker popover */}
                      {storiesPicker && (
                        <div onClick={() => setStoriesPicker(null)} style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
                          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '130px', left: '50%', transform: 'translateX(-50%)', width: 'min(380px, calc(100vw - 3rem))', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '0.4rem', zIndex: 301, maxHeight: '55vh', overflowY: 'auto' }}>
                            {storiesPicker === 'category' && (
                              <>
                                <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Category</div>
                                {user && feedCategories.length > 0 && (
                                  <>
                                    <button style={pickerItemStyle(selectedCategory === 'My Rundown', MY_FEED_COLOR)} onClick={() => { handleSelectCategory('My Rundown'); setStoriesPicker(null); }}>★ My Rundown</button>
                                    <div style={{ height: '1px', background: '#f3f4f6', margin: '0.2rem 0.5rem' }} />
                                  </>
                                )}
                                {allCategories.map(cat => (
                                  <button key={cat} style={pickerItemStyle(cat === selectedCategory, CATEGORY_COLORS[cat] || '#ec4899')} onClick={() => { handleSelectCategory(cat); setStoriesPicker(null); }}>{cat}</button>
                                ))}
                              </>
                            )}
                            {storiesPicker === 'day' && (
                              <>
                                <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Day</div>
                                {availableDays.map(day => (
                                  <button key={day.fullDate} style={{ ...pickerItemStyle(day.fullDate === selectedDay), cursor: 'pointer' }} onClick={() => { setSelectedDay(day.fullDate); setStoriesPicker(null); }}>
                                    {day.fullDate === today ? 'Today' : `${day.label}, ${day.date}`}
                                  </button>
                                ))}
                              </>
                            )}
                            {storiesPicker === 'time' && (
                              <>
                                <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Time Slot</div>
                                {availableTimes.map(time => {
                                  const unavail = isSlotUnavailable(selectedDay, time.value);
                                  return (
                                    <button key={time.value} disabled={unavail} style={{ ...pickerItemStyle(time.value === selectedTime), opacity: unavail ? 0.4 : 1, cursor: unavail ? 'not-allowed' : 'pointer' }} onClick={() => { if (!unavail) { setSelectedTime(time.value); setStoriesPicker(null); } }}>
                                      {time.label} <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400' }}>{time.time}</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Compact header */}
                      <div style={{ flexShrink: 0, marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <button onClick={() => setStoriesPicker(p => p === 'category' ? null : 'category')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: headerColor, background: storiesPicker === 'category' ? `${headerColor}28` : `${headerColor}14`, padding: '0.35rem 0.85rem', borderRadius: '999px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                            {isMyFeed ? '★ My Rundown' : selectedCategory}
                            <ChevronDown size={13} style={{ opacity: 0.6, transform: storiesPicker === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <button onClick={() => setStoriesPicker(p => p === 'day' ? null : 'day')} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: storiesPicker === 'day' ? '#6366f1' : '#9ca3af', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '4px', transition: 'color 0.15s' }}>
                            {dayLabel}
                            <ChevronDown size={9} style={{ opacity: 0.5, transform: storiesPicker === 'day' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                          <span style={{ fontSize: '0.68rem', color: '#d1d5db' }}>·</span>
                          <button onClick={() => setStoriesPicker(p => p === 'time' ? null : 'time')} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: storiesPicker === 'time' ? '#6366f1' : '#9ca3af', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '4px', transition: 'color 0.15s' }}>
                            {selectedTime}
                            <ChevronDown size={9} style={{ opacity: 0.5, transform: storiesPicker === 'time' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                        </div>
                      </div>
                      {/* Loading body */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
                        {customCategories.includes(selectedCategory) ? (
                          <div style={{ maxWidth: '280px' }}>
                            <div style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>🔍</div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.35rem', color: '#374151' }}>Generating Custom News</h3>
                            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0 0 1rem' }}>
                              {generationProgress < 30 ? 'Searching the web…' : generationProgress < 65 ? 'Reading sources…' : generationProgress < 90 ? 'Compiling summary…' : 'Almost done…'}
                            </p>
                            <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(135deg, ${headerColor} 0%, #ec4899 100%)`, width: `${generationProgress}%`, transition: 'width 0.4s ease' }} />
                            </div>
                            <p style={{ color: '#d1d5db', fontSize: '0.72rem', margin: '0.5rem 0 0' }}>{Math.round(generationProgress)}%</p>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'inline-block', animation: 'spin 2s linear infinite', marginBottom: '0.75rem' }}>
                              <Loader size={32} color={headerColor} strokeWidth={1.5} />
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#9ca3af', margin: 0 }}>Loading news…</p>
                          </>
                        )}
                      </div>
                      {/* Navigation — category chevrons active, story prev/next disabled */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', paddingBottom: 'env(safe-area-inset-bottom, 0px)', marginTop: '0.5rem', flexShrink: 0, gap: '0.3rem' }}>
                        <button disabled style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', background: 'none', border: '1.5px solid #e5e7eb', borderRadius: '999px', cursor: 'not-allowed', color: '#d1d5db', fontSize: '0.78rem', fontWeight: '600' }}>
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <button onClick={() => { if (prevCat) { handleSelectCategory(prevCat); goToLastStoryRef.current = true; } }} disabled={!prevCat} title={prevCat || ''} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.55rem', background: 'none', border: `1.5px solid ${prevCat ? '#e5e7eb' : '#f0f0f0'}`, borderRadius: '999px', cursor: prevCat ? 'pointer' : 'not-allowed', color: prevCat ? headerColor : '#d1d5db', flexShrink: 0 }}>
                          <ChevronLeft size={13} strokeWidth={2.5} /><ChevronLeft size={13} strokeWidth={2.5} style={{ marginLeft: '-6px' }} />
                        </button>
                        <button onClick={() => { if (nextCat) { handleSelectCategory(nextCat); setStoryIndex(0); } }} disabled={!nextCat} title={nextCat || ''} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.55rem', background: 'none', border: `1.5px solid ${nextCat ? headerColor : '#f0f0f0'}`, borderRadius: '999px', cursor: nextCat ? 'pointer' : 'not-allowed', color: nextCat ? headerColor : '#d1d5db', flexShrink: 0 }}>
                          <ChevronRight size={13} strokeWidth={2.5} /><ChevronRight size={13} strokeWidth={2.5} style={{ marginLeft: '-6px' }} />
                        </button>
                        <button disabled style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '999px', cursor: 'not-allowed', color: '#9ca3af', fontSize: '0.78rem', fontWeight: '600' }}>
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  {customCategories.includes(selectedCategory) ? (
                    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.35rem', color: '#111827' }}>
                        Generating Custom News
                      </h3>
                      <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                        {generationProgress < 30 ? 'Searching the web…' : generationProgress < 65 ? 'Reading sources…' : generationProgress < 90 ? 'Compiling summary…' : 'Almost done…'}
                      </p>
                      <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', width: `${generationProgress}%`, transition: 'width 0.4s ease' }} />
                      </div>
                      <p style={{ color: '#d1d5db', fontSize: '0.75rem', margin: '0.6rem 0 0' }}>{Math.round(generationProgress)}%</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'inline-block', animation: 'spin 2s linear infinite' }}>
                        <Loader size={48} color="#6366f1" strokeWidth={1.5} />
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '1.5rem 0 0.4rem', color: '#111827' }}>Loading Your News</h3>
                      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Retrieving news…</p>
                    </>
                  )}
                </div>
                )
              ) : (newsNotAvailable || (slotsLoaded && isSlotUnavailable(selectedDay, selectedTime))) && !newsSummary ? (
                viewMode === 'stories' ? (() => {
                  const isMyFeed = selectedCategory === 'My Rundown';
                  const headerColor = catColor;
                  const dayLabel = (() => { const d = daysOfWeek.find(d => d.fullDate === selectedDay); return d ? (d.fullDate === today ? 'Today' : `${d.label} ${d.date}`) : selectedDay; })();
                  const pickerItemStyle = (active, color = catColor) => ({ width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? '700' : '500', background: active ? `${color}18` : 'transparent', color: active ? color : '#374151', transition: 'background 0.12s' });
                  const _navCats = (user && feedCategories.length > 0) ? ['My Rundown', ...allCategories] : allCategories;
                  const _catIdx = _navCats.indexOf(selectedCategory);
                  const prevCat = _catIdx > 0 ? _navCats[_catIdx - 1] : null;
                  const nextCat = _catIdx < _navCats.length - 1 ? _navCats[_catIdx + 1] : null;
                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      {/* Picker popover */}
                      {storiesPicker && (
                        <div onClick={() => setStoriesPicker(null)} style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
                          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '130px', left: '50%', transform: 'translateX(-50%)', width: 'min(380px, calc(100vw - 3rem))', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '0.4rem', zIndex: 301, maxHeight: '55vh', overflowY: 'auto' }}>
                            {storiesPicker === 'category' && (
                              <>
                                <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Category</div>
                                {user && feedCategories.length > 0 && (
                                  <>
                                    <button style={pickerItemStyle(selectedCategory === 'My Rundown', MY_FEED_COLOR)} onClick={() => { handleSelectCategory('My Rundown'); setStoriesPicker(null); }}>★ My Rundown</button>
                                    <div style={{ height: '1px', background: '#f3f4f6', margin: '0.2rem 0.5rem' }} />
                                  </>
                                )}
                                {allCategories.map(cat => (
                                  <button key={cat} style={pickerItemStyle(cat === selectedCategory, CATEGORY_COLORS[cat] || '#ec4899')} onClick={() => { handleSelectCategory(cat); setStoriesPicker(null); }}>{cat}</button>
                                ))}
                              </>
                            )}
                            {storiesPicker === 'day' && (
                              <>
                                <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Day</div>
                                {availableDays.map(day => (
                                  <button key={day.fullDate} style={{ ...pickerItemStyle(day.fullDate === selectedDay), cursor: 'pointer' }} onClick={() => { setSelectedDay(day.fullDate); setStoriesPicker(null); }}>
                                    {day.fullDate === today ? 'Today' : `${day.label}, ${day.date}`}
                                  </button>
                                ))}
                              </>
                            )}
                            {storiesPicker === 'time' && (
                              <>
                                <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Time Slot</div>
                                {availableTimes.map(time => {
                                  const unavail = isSlotUnavailable(selectedDay, time.value);
                                  return (
                                    <button key={time.value} disabled={unavail} style={{ ...pickerItemStyle(time.value === selectedTime), opacity: unavail ? 0.4 : 1, cursor: unavail ? 'not-allowed' : 'pointer' }} onClick={() => { if (!unavail) { setSelectedTime(time.value); setStoriesPicker(null); } }}>
                                      {time.label} <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400' }}>{time.time}</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Compact header */}
                      <div style={{ flexShrink: 0, marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <button onClick={() => setStoriesPicker(p => p === 'category' ? null : 'category')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)', background: storiesPicker === 'category' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)', padding: '0.35rem 0.85rem', borderRadius: '999px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                            {isMyFeed ? '★ My Rundown' : selectedCategory}
                            <ChevronDown size={13} style={{ opacity: 0.6, transform: storiesPicker === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <button onClick={() => setStoriesPicker(p => p === 'day' ? null : 'day')} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: storiesPicker === 'day' ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '4px', transition: 'color 0.15s' }}>
                            {dayLabel}
                            <ChevronDown size={9} style={{ opacity: 0.5, transform: storiesPicker === 'day' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>·</span>
                          <button onClick={() => setStoriesPicker(p => p === 'time' ? null : 'time')} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: storiesPicker === 'time' ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '4px', transition: 'color 0.15s' }}>
                            {selectedTime}
                            <ChevronDown size={9} style={{ opacity: 0.5, transform: storiesPicker === 'time' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                        </div>
                      </div>
                      {/* Not available message */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem' }}>
                        <Clock size={36} color="rgba(255,255,255,0.35)" style={{ marginBottom: '0.75rem' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 0.3rem', color: 'white' }}>News Not Available</h3>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', margin: 0 }}>This summary hasn't been generated.</p>
                      </div>
                      {/* Navigation — same layout as stories content, prev/next story disabled */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem', paddingBottom: 'env(safe-area-inset-bottom, 0px)', marginTop: '0.5rem', flexShrink: 0, gap: '0.3rem' }}>
                        <button disabled style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', background: 'none', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '999px', cursor: 'not-allowed', color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', fontWeight: '600', flexShrink: 0 }}>
                          <ChevronLeft size={14} />Previous
                        </button>
                        <button onClick={() => { if (prevCat) { handleSelectCategory(prevCat); goToLastStoryRef.current = true; } }} disabled={!prevCat} title={prevCat || ''} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.55rem', background: 'none', border: `1.5px solid ${prevCat ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '999px', cursor: prevCat ? 'pointer' : 'not-allowed', color: prevCat ? 'white' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                          <ChevronLeft size={13} strokeWidth={2.5} /><ChevronLeft size={13} strokeWidth={2.5} style={{ marginLeft: '-6px' }} />
                        </button>
                        <button onClick={() => { if (nextCat) { handleSelectCategory(nextCat); setStoryIndex(0); } }} disabled={!nextCat} title={nextCat || ''} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0.55rem', background: 'none', border: `1.5px solid ${nextCat ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '999px', cursor: nextCat ? 'pointer' : 'not-allowed', color: nextCat ? 'white' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                          <ChevronRight size={13} strokeWidth={2.5} /><ChevronRight size={13} strokeWidth={2.5} style={{ marginLeft: '-6px' }} />
                        </button>
                        <button disabled style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '999px', cursor: 'not-allowed', color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', fontWeight: '700', flexShrink: 0 }}>
                          Next<ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Clock size={40} color="#e5e7eb" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem', color: '#374151' }}>
                      {selectedDay === today ? 'Generating…' : 'News Not Available'}
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#9ca3af', margin: 0 }}>
                      {selectedDay === today
                        ? 'News is being generated. This page will refresh automatically when ready.'
                        : "This summary hasn't been generated."}
                    </p>
                  </div>
                )
              ) : newsSummary && stories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <Clock size={40} color="#e5e7eb" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem', color: '#374151' }}>Content Temporarily Unavailable</h3>
                  <p style={{ fontSize: '0.88rem', color: '#9ca3af', margin: 0 }}>Today's news couldn't be processed. Check back later — it will update automatically.</p>
                </div>
              ) : newsSummary ? (
                <div style={viewMode === 'stories' ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' } : {}}>
                  {/* keep ref fresh for keyboard handler */}
                  {(() => { storyNavRef.current = { idx: storyIndex, stories: stories, cats: allCategories, cat: selectedCategory }; return null; })()}
                  {viewMode !== 'stories' && (<div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '0.9rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, color: catColor, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                          {selectedCategory === 'My Rundown' ? '★ My Rundown' : newsSummary.category}
                        </h2>
                        {selectedCategory === 'My Rundown' && (
                          <button onClick={() => { setFeedPickerDraft([...feedCategories]); setShowFeedPicker(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{feedCategories.join(' · ')}</span>
                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>✎</span>
                          </button>
                        )}
                      </div>
                      {isNarrating ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <button onClick={isPaused ? resumeNarration : pauseNarration} title={isPaused ? 'Resume' : 'Pause'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', transition: 'all 0.2s', flexShrink: 0 }}>
                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                          </button>
                          <button onClick={restartNarration} title="Restart from beginning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', transition: 'all 0.2s', flexShrink: 0 }}>
                            <RotateCcw size={16} />
                          </button>
                          <button onClick={stopNarration} title="Stop narration" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', transition: 'all 0.2s', flexShrink: 0 }}>
                            <VolumeX size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={startNarration} title="Listen to news" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', transition: 'all 0.2s', flexShrink: 0 }}>
                          <Volume2 size={17} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#9ca3af' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={11} />
                        <span>{newsSummary.time_slot}</span>
                      </div>
                      {selectedCategory !== 'My Rundown' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Sparkles size={11} />
                          <span>{new Date(newsSummary.generated_at).toLocaleString('en-US', { timeZone: 'Asia/Dubai' })}</span>
                        </div>
                      )}
                      {selectedCategory === 'My Rundown' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Sparkles size={11} />
                          <span>{stories.length} stories</span>
                        </div>
                      )}
                    </div>
                  </div>)}
                  {viewMode !== 'stories' && selectedCategory === 'My Rundown' ? (() => {
                    const getDomain = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
                    const labelPerspectives = newsLanguage === 'ar' ? 'تباين الآراء' : 'Perspectives differ';
                    const labelWhy = newsLanguage === 'ar' ? 'لماذا هذا مهم' : 'Why this matters';
                    return (
                      <div dir={newsLanguage === 'ar' ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {stories.map((story, i) => (
                          <div key={i} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '12px', padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
                            <div style={{ marginBottom: '0.45rem' }}>
                              <span style={{ fontSize: '0.64rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: story.feedCatColor, background: `${story.feedCatColor}14`, padding: '0.18rem 0.55rem', borderRadius: '999px' }}>{story.feedCategory}</span>
                            </div>
                            <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#111827', lineHeight: 1.3, marginBottom: depthLevel === 'headlines' ? 0 : '0.5rem' }}>{story.headline}</div>
                            {depthLevel !== 'headlines' && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.4rem' }}>
                              {(depthLevel === 'deep' ? story.allBullets : story.tightBullets).map((b, bi) => (
                                <div key={bi} style={{ display: 'flex', gap: '0.55rem', fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>
                                  <div style={{ width: '2.5px', minWidth: '2.5px', borderRadius: '99px', background: story.feedCatColor, opacity: 0.35, marginTop: '0.35rem', alignSelf: 'stretch' }} />
                                  <span>{b}</span>
                                </div>
                              ))}
                            </div>}
                            {depthLevel !== 'headlines' && story.perspectives && <div style={{ margin: '0.3rem 0 0.4rem', fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.55 }}><span style={{ fontWeight: '700', color: '#6b7280', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labelPerspectives}</span>&nbsp;&nbsp;{story.perspectives}</div>}
                            {depthLevel !== 'headlines' && story.why && <div style={{ margin: '0.3rem 0 0.4rem', fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.55 }}><span style={{ fontWeight: '700', color: '#6b7280', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{labelWhy}</span>&nbsp;&nbsp;{story.why}</div>}
                            {story.storySources?.length > 0 && (
                              <div style={{ marginTop: depthLevel === 'headlines' ? '0.5rem' : '0.85rem' }}>
                                {windowWidth >= 600 ? (
                                  /* Wide: source cards with title */
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                                    {story.storySources.map((s, j) => {
                                      const domain = getDomain(s.url);
                                      return (
                                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                                          style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.7rem 0.8rem', background: 'white', border: '1px solid #e8e8ee', borderRadius: '10px', textDecoration: 'none', transition: 'box-shadow 0.15s, border-color 0.15s', flex: '1 1 150px', maxWidth: '175px' }}
                                          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                                          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8e8ee'; }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" width={14} height={14} style={{ borderRadius: '3px', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                                            <span style={{ fontSize: '0.58rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.outlet || domain}</span>
                                            <span style={{ fontSize: '0.55rem', color: '#c4c9d4', flexShrink: 0, lineHeight: 1 }}>↗</span>
                                          </div>
                                          <span style={{ fontSize: '0.7rem', fontWeight: s.title ? '600' : '400', color: s.title ? '#1e293b' : '#9ca3af', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: s.title ? 'normal' : 'italic' }}>{s.title || s.outlet || domain}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* Narrow: pills */
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                    {story.storySources.map((s, j) => {
                                      const domain = getDomain(s.url);
                                      return (
                                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', padding: '0.22rem 0.6rem 0.22rem 0.36rem', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '999px', textDecoration: 'none' }}>
                                          <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={11} height={11} style={{ borderRadius: '2px', opacity: 0.85 }} onError={e => e.target.style.display='none'} />
                                          <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#374151' }}>{s.outlet || domain}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })() : viewMode === 'stories' ? (() => {
                    const story = stories[storyIndex];
                    const displayBullets = story ? (depthLevel === 'deep' ? story.allBullets : story.tightBullets) : [];
                    const displayPerspectives = story?.perspectives || null;
                    const displayWhy = story?.why || null;
                    const isMyFeed = selectedCategory === 'My Rundown';
                    // Unified nav list: My Rundown (if configured) + all categories — no special casing
                    const navCategories = (user && feedCategories.length > 0) ? ['My Rundown', ...allCategories] : allCategories;
                    const catIdx = navCategories.indexOf(selectedCategory);
                    const prevCat = catIdx > 0 ? navCategories[catIdx - 1] : null;
                    const nextCat = catIdx < navCategories.length - 1 ? navCategories[catIdx + 1] : null;
                    const isFirst = storyIndex === 0;
                    const isLast = storyIndex === stories.length - 1;

                    // Per-story color/label: My Rundown uses per-story metadata; regular uses catColor
                    const storyColor = isMyFeed && story?.feedCatColor ? story.feedCatColor : catColor;
                    const storyLabel = isMyFeed && story?.feedCategory ? story.feedCategory : newsSummary.category;

                    // Sources: pre-computed on every story object in the useEffect (both My Rundown
                    // and regular categories). No per-render recompute, no index-mismatch risk.
                    const storySources = story?.storySources || [];
                    const getDomain = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

                    // Cancel in-flight audio without ending the narration session
                    const cancelAudioKeepActive = () => narrateFnRef.current.cancelAudioKeepActive?.();

                    const goNext = () => {
                      if (!isLast) {
                        const newIdx = storyIndex + 1;
                        setStoryIndex(newIdx);
                        if (isNarrating) {
                          cancelAudioKeepActive();
                          setTimeout(() => narrateFnRef.current.narrateStory?.(newIdx), 150);
                        }
                      } else if (repeatMode) {
                        // Repeat: loop back to first story in this category
                        setStoryIndex(0);
                        if (isNarrating) {
                          cancelAudioKeepActive();
                          setTimeout(() => narrateFnRef.current.narrateStory?.(0), 150);
                        }
                      } else if (nextCat) {
                        handleSelectCategory(nextCat);
                        setStoryIndex(0);
                        if (isNarrating) {
                          cancelAudioKeepActive();
                          narrationStateRef.current.pendingLoad = true;
                        }
                      }
                    };
                    const goPrev = () => {
                      if (!isFirst) {
                        const newIdx = storyIndex - 1;
                        setStoryIndex(newIdx);
                        if (isNarrating) {
                          cancelAudioKeepActive();
                          setTimeout(() => narrateFnRef.current.narrateStory?.(newIdx), 150);
                        }
                      } else if (prevCat) {
                        if (isNarrating) {
                          // When narrating, start prev category from story 0 (not last)
                          cancelAudioKeepActive();
                          narrationStateRef.current.pendingLoad = true;
                        } else {
                          goToLastStoryRef.current = true;
                        }
                        handleSelectCategory(prevCat);
                      }
                    };
                    storyGoRef.current = { goNext, goPrev };

                    const dayLabel = (() => { const d = daysOfWeek.find(d => d.fullDate === newsSummary.day); return d ? (d.fullDate === today ? 'Today' : `${d.label} ${d.date}`) : newsSummary.day; })();

                    const pickerItemStyle = (active, color = catColor) => ({
                      width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? '700' : '500',
                      background: active ? `${color}18` : 'transparent',
                      color: active ? color : '#374151', transition: 'background 0.12s',
                    });

                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                        {/* Stories picker popover — fixed so it escapes card overflow */}
                        {storiesPicker && (
                          <div onClick={() => setStoriesPicker(null)} style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
                            <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '130px', left: '50%', transform: 'translateX(-50%)', width: 'min(380px, calc(100vw - 3rem))', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '0.4rem', zIndex: 301, maxHeight: '55vh', overflowY: 'auto' }}>
                              {storiesPicker === 'category' && (
                                <>
                                  <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Category</div>
                                  {user && feedCategories.length > 0 && (
                                    <>
                                      <button style={pickerItemStyle(selectedCategory === 'My Rundown', MY_FEED_COLOR)} onClick={() => { handleSelectCategory('My Rundown'); setStoriesPicker(null); }}>★ My Rundown</button>
                                      <div style={{ height: '1px', background: '#f3f4f6', margin: '0.2rem 0.5rem' }} />
                                    </>
                                  )}
                                  {allCategories.map(cat => (
                                    <button key={cat} style={pickerItemStyle(cat === selectedCategory, CATEGORY_COLORS[cat] || '#ec4899')} onClick={() => { handleSelectCategory(cat); setStoriesPicker(null); }}>{cat}</button>
                                  ))}
                                </>
                              )}
                              {storiesPicker === 'day' && (
                                <>
                                  <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Day</div>
                                  {availableDays.map(day => (
                                    <button key={day.fullDate} style={{ ...pickerItemStyle(day.fullDate === selectedDay), cursor: 'pointer' }} onClick={() => { setSelectedDay(day.fullDate); setStoriesPicker(null); }}>
                                      {day.fullDate === today ? 'Today' : `${day.label}, ${day.date}`}
                                    </button>
                                  ))}
                                </>
                              )}
                              {storiesPicker === 'time' && (
                                <>
                                  <div style={{ padding: '0.35rem 0.9rem 0.5rem', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>Time Slot</div>
                                  {availableTimes.map(time => {
                                    const unavail = isSlotUnavailable(selectedDay, time.value);
                                    return (
                                      <button key={time.value} disabled={unavail} style={{ ...pickerItemStyle(time.value === selectedTime), opacity: unavail ? 0.4 : 1, cursor: unavail ? 'not-allowed' : 'pointer' }} onClick={() => { if (!unavail) { setSelectedTime(time.value); setStoriesPicker(null); } }}>
                                        {time.label} <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '400' }}>{time.time}</span>
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Compact header */}
                        <div style={{ flexShrink: 0, marginBottom: '0.75rem' }}>
                          {/* Row 1: pill (clickable) + controls */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <button onClick={() => setStoriesPicker(p => p === 'category' ? null : 'category')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.9)', background: storiesPicker === 'category' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)', padding: '0.35rem 0.85rem', borderRadius: '999px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
                              {isMyFeed ? '★ My Rundown' : storyLabel}
                              <ChevronDown size={13} style={{ opacity: 0.6, transform: storiesPicker === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>{storyIndex + 1} / {stories.length}</span>
                          </div>
                          {/* Row 2: day (clickable) · time (clickable) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                            <button onClick={() => setStoriesPicker(p => p === 'day' ? null : 'day')} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: storiesPicker === 'day' ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '4px', transition: 'color 0.15s' }}>
                              {dayLabel}
                              <ChevronDown size={9} style={{ opacity: 0.5, transform: storiesPicker === 'day' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>·</span>
                            <button onClick={() => setStoriesPicker(p => p === 'time' ? null : 'time')} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: storiesPicker === 'time' ? 'white' : 'rgba(255,255,255,0.6)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.25rem', borderRadius: '4px', transition: 'color 0.15s' }}>
                              {newsSummary.time_slot}
                              <ChevronDown size={9} style={{ opacity: 0.5, transform: storiesPicker === 'time' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                          </div>
                          {/* Row 3: per-story category pill for My Rundown */}
                          {isMyFeed && story?.feedCategory && (
                            <div style={{ marginTop: '0.2rem' }}>
                              <span style={{ display: 'inline-block', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', padding: '0.15rem 0.55rem', borderRadius: '999px' }}>
                                {story.feedCategory}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Scrollable body */}
                        <div dir={newsLanguage === 'ar' ? 'rtl' : 'ltr'} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                          {!story ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                            </div>
                          ) : (
                          <>

                          {/* Headlines-only mode: big centred title + source pills */}
                          {depthLevel === 'headlines' ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0', gap: '0.85rem' }}>
                              <h3 style={{ fontSize: '1.65rem', fontWeight: '900', color: 'white', lineHeight: 1.2, textAlign: 'center', margin: 0 }}>
                                {story.headline}
                              </h3>
                              {storySources.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center' }}>
                                  {storySources.map((s, j) => {
                                    const domain = getDomain(s.url);
                                    return (
                                      <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', padding: '0.2rem 0.55rem 0.2rem 0.35rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', textDecoration: 'none' }}>
                                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={11} height={11} style={{ borderRadius: '2px', opacity: 0.85 }} onError={e => e.target.style.display='none'} />
                                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'white' }}>{s.outlet || domain}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                          <>

                          {/* Headline */}
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'white', lineHeight: 1.25, margin: '0 0 0.6rem' }}>
                            {story.headline}
                          </h3>

                          {/* Bullets */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', margin: '0.5rem 0 0.75rem' }}>
                            {displayBullets.map((b, i) => (
                              <div key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                                <div style={{ width: '3px', minWidth: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', alignSelf: 'stretch' }} />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>

                          {/* Perspectives differ */}
                          {displayPerspectives && (
                            <div style={{ margin: '0.3rem 0 0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
                              <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{newsLanguage === 'ar' ? 'تباين الآراء' : 'Perspectives differ'}</span>
                              &nbsp;&nbsp;{displayPerspectives}
                            </div>
                          )}

                          {/* Why this matters */}
                          {displayWhy && (
                            <div style={{ margin: '0.3rem 0 0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
                              <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{newsLanguage === 'ar' ? 'لماذا هذا مهم' : 'Why this matters'}</span>
                              &nbsp;&nbsp;{displayWhy}
                            </div>
                          )}

                          {/* Source pills — pulled from digest content, matched by story index */}
                          {storySources.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.75rem' }}>
                              {storySources.map((s, j) => {
                                const domain = getDomain(s.url);
                                return (
                                  <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', padding: '0.2rem 0.55rem 0.2rem 0.35rem', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', textDecoration: 'none' }}>
                                    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={11} height={11} style={{ borderRadius: '2px', opacity: 0.85 }} onError={e => e.target.style.display='none'} />
                                    <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'white' }}>{s.outlet || domain}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          </>
                          )}
                          </>
                          )}
                        </div>

                        {/* ── Music player pinned to bottom ── */}
                        {(() => {
                          const scrubPct = stories.length <= 1 ? 100 : (storyIndex / (stories.length - 1)) * 100;
                          const hexToRgb = (hex) => { const r = parseInt(hex.slice(1,3),16); const g = parseInt(hex.slice(3,5),16); const b = parseInt(hex.slice(5,7),16); return `${r},${g},${b}`; };
                          const colorRgb = hexToRgb(storyColor.startsWith('#') ? storyColor : '#6366f1');
                          return (
                            <div style={{ flexShrink: 0, margin: '0.5rem -1.25rem -1rem', background: 'rgba(10,10,14,0.85)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 0 20px 20px', padding: `11px 18px calc(env(safe-area-inset-bottom, 0px) + 14px)` }}>

                              {/* Row 1: scrubber row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                                {/* Current story number */}
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontWeight: '600', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0, minWidth: '14px', textAlign: 'right' }}>{storyIndex + 1}</span>

                                {/* Scrubber track */}
                                <div
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                    const newIdx = Math.round(pct * (stories.length - 1));
                                    setStoryIndex(newIdx);
                                    if (isNarrating) { cancelAudioKeepActive(); setTimeout(() => narrateFnRef.current.narrateStory?.(newIdx), 150); }
                                  }}
                                  style={{ flex: 1, height: '20px', display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                                >
                                  <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.09)', borderRadius: '99px', position: 'relative' }}>
                                    <div style={{ width: `${scrubPct}%`, height: '100%', background: storyColor, borderRadius: '99px', position: 'relative', transition: 'width 0.25s ease' }}>
                                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'white', position: 'absolute', right: '-5px', top: '-3.5px', boxShadow: `0 0 6px rgba(${colorRgb},0.8)` }} />
                                    </div>
                                  </div>
                                </div>

                                {/* Total stories */}
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontWeight: '600', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0, minWidth: '14px' }}>{stories.length}</span>

                                {/* Repeat toggle */}
                                <button
                                  onClick={() => setRepeatMode(r => !r)}
                                  title={repeatMode ? 'Repeat on' : 'Repeat off'}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0, color: repeatMode ? storyColor : 'rgba(255,255,255,0.28)', transition: 'color 0.15s' }}
                                >
                                  <Repeat size={13} />
                                </button>

                                {/* Speed pill */}
                                <button
                                  onClick={() => setPlaybackSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 1)}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '999px', color: playbackSpeed !== 1 ? storyColor : 'rgba(255,255,255,0.30)', fontSize: '9px', fontWeight: '700', padding: '3px 6px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.15s' }}
                                >
                                  {playbackSpeed === 1 ? '1×' : playbackSpeed === 1.5 ? '1.5×' : '2×'}
                                </button>
                              </div>

                              {/* Row 2: controls */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                                {/* ⏮ Previous category (dim, small) */}
                                <button
                                  onClick={() => { if (prevCat) { handleSelectCategory(prevCat); goToLastStoryRef.current = true; if (isNarrating) { cancelAudioKeepActive(); narrationStateRef.current.pendingLoad = true; } } }}
                                  disabled={!prevCat}
                                  title={prevCat ? `← ${prevCat}` : ''}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: prevCat ? 'pointer' : 'not-allowed', padding: '5px', color: prevCat ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.10)', transition: 'color 0.15s' }}
                                >
                                  <SkipBack size={18} />
                                </button>

                                {/* ⏮ Previous story (mid) */}
                                <button
                                  onClick={goPrev}
                                  disabled={isFirst && !prevCat}
                                  title="Previous story"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: isFirst && !prevCat ? 'not-allowed' : 'pointer', padding: '5px', color: isFirst && !prevCat ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', transition: 'color 0.15s' }}
                                >
                                  <SkipBack size={24} />
                                </button>

                                {/* ▶ / ⏸ Play / Pause (large circle, storyColor) */}
                                <button
                                  onClick={isNarrating ? (isPaused ? resumeNarration : pauseNarration) : startNarration}
                                  title={isNarrating ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: storyColor, boxShadow: `0 4px 18px rgba(${colorRgb},0.45)`, color: 'white', flexShrink: 0, transition: 'box-shadow 0.2s, transform 0.1s', transform: 'scale(1)' }}
                                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
                                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  {isNarrating && !isPaused ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
                                </button>

                                {/* ⏭ Next story (mid) */}
                                <button
                                  onClick={goNext}
                                  disabled={isLast && !nextCat && !repeatMode}
                                  title="Next story"
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: isLast && !nextCat && !repeatMode ? 'not-allowed' : 'pointer', padding: '5px', color: isLast && !nextCat && !repeatMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', transition: 'color 0.15s' }}
                                >
                                  <SkipForward size={24} />
                                </button>

                                {/* ⏭ Next category (dim, small) */}
                                <button
                                  onClick={() => { if (nextCat) { handleSelectCategory(nextCat); setStoryIndex(0); if (isNarrating) { cancelAudioKeepActive(); narrationStateRef.current.pendingLoad = true; } } }}
                                  disabled={!nextCat}
                                  title={nextCat ? `${nextCat} →` : ''}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: nextCat ? 'pointer' : 'not-allowed', padding: '5px', color: nextCat ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.10)', transition: 'color 0.15s' }}
                                >
                                  <SkipForward size={18} />
                                </button>

                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })() : (() => {
                    window._trackCategory = (headline) => {
                      if (customCategories.length > 0) {
                        if (!window.confirm(`This will replace your current tracked category "${customCategories[0]}". Continue?`)) return;
                      }
                      setNewCategory('');
                      setNewCategoryDescription(headline);
                      setShowCategoryModal(true);
                    };
                    // Headlines: compact list of story titles + source pills
                    if (depthLevel === 'headlines') {
                      const getDomain = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
                      return (
                        <div dir={newsLanguage === 'ar' ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {stories.filter(s => s.headline.length > 3).map((s, i) => (
                            <div key={i} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '12px', padding: isMobile ? '0.85rem 1rem' : '1rem 1.5rem' }}>
                              <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#111827', lineHeight: 1.3 }}>{s.headline}</div>
                              {s.storySources.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                                  {s.storySources.map((src, j) => {
                                    const domain = getDomain(src.url);
                                    return (
                                      <a key={j} href={src.url} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', padding: '0.2rem 0.55rem 0.2rem 0.35rem', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '999px', textDecoration: 'none' }}>
                                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={11} height={11} style={{ borderRadius: '2px', opacity: 0.85 }} onError={e => e.target.style.display='none'} />
                                        <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#374151' }}>{src.outlet || domain}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Takeaways: tightBullets (short from storiesContent or first 3 from content)
                    // Summary: allBullets (all from content) + perspectives + why
                    const getDomain = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

                    const renderStoryBody = (lines) => lines.join('\n')
                      .replace(/^-{2,}\s*$/gm, '')
                      .replace(/^[-*.]\s*$/gm, '')
                      .replace(/^https?:\/\/\S+$/gm, '')
                      .replace(/^\*\*(?:Coverage|التغطية|المصادر):\*\*\s*(.+)$/gm, '')
                      .replace(/^\*\*(?:Perspectives differ|وجهات النظر تتباين|تباين وجهات النظر|آراء مختلفة):\*\*\s*(.+)$/gm, (_, text) =>
                        `<div style="margin:0.3rem 0 0.85rem;font-size:0.81rem;color:#9ca3af;line-height:1.55;"><span style="font-weight:700;color:#6b7280;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;">${newsLanguage === 'ar' ? 'تباين الآراء' : 'Perspectives differ'}</span>&nbsp;&nbsp;${text}</div>`
                      )
                      .replace(/^\*\*(?:Why this matters|لماذا هذا مهم|لماذا يهم هذا|أهمية الخبر):\*\*\s*(.+)$/gm, (_, text) =>
                        `<div style="margin:0.3rem 0 0.85rem;font-size:0.81rem;color:#9ca3af;line-height:1.55;"><span style="font-weight:700;color:#6b7280;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;">${newsLanguage === 'ar' ? 'لماذا هذا مهم' : 'Why this matters'}</span>&nbsp;&nbsp;${text}</div>`
                      )
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#111827;">$1</strong>')
                      .replace(/^[-*] (.+)$/gm, '<div style="margin:0.18rem 0 0.18rem 0;margin-inline-start:0.8rem;padding-inline-start:0.55rem;border-inline-start:2px solid #e5e7eb;color:#374151;font-size:0.88rem;line-height:1.5;">$1</div>')
                      .replace(/\n\n+/g, '<div style="height:0.15rem;"></div>')
                      .replace(/\n/g, '');

                    return (
                      <div dir={newsLanguage === 'ar' ? 'rtl' : 'ltr'}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {stories.map((story, i) => {
                            const bullets = depthLevel === 'deep' ? story.allBullets : story.tightBullets;
                            const bodyHtml = renderStoryBody(
                              depthLevel === 'deep'
                                ? story.bodyLines
                                : bullets.map(b => `- ${b}`)
                            );
                            return (
                              <div key={i} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '12px', padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
                                <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#111827', lineHeight: 1.3, marginBottom: '0.5rem' }}>
                                  {story.headline}
                                </div>
                                <div style={{ fontSize: '0.88rem', lineHeight: '1.5', color: '#1e293b' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                                {story.storySources.length > 0 && (
                                  <div style={{ marginTop: '0.85rem' }}>
                                    {windowWidth >= 600 ? (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                                        {story.storySources.map((s, j) => {
                                          const domain = getDomain(s.url);
                                          return (
                                            <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                                              style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.7rem 0.8rem', background: 'white', border: '1px solid #e8e8ee', borderRadius: '10px', textDecoration: 'none', transition: 'box-shadow 0.15s, border-color 0.15s', flex: '1 1 150px', maxWidth: '175px' }}
                                              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                                              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8e8ee'; }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" width={14} height={14} style={{ borderRadius: '3px', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                                                <span style={{ fontSize: '0.58rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.outlet || domain}</span>
                                                <span style={{ fontSize: '0.55rem', color: '#c4c9d4', flexShrink: 0, lineHeight: 1 }}>↗</span>
                                              </div>
                                              <span style={{ fontSize: '0.7rem', fontWeight: s.title ? '600' : '400', color: s.title ? '#1e293b' : '#9ca3af', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontStyle: s.title ? 'normal' : 'italic' }}>{s.title || s.outlet || domain}</span>
                                            </a>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {story.storySources.map((s, j) => {
                                          const domain = getDomain(s.url);
                                          return (
                                            <a key={j} href={s.url} target="_blank" rel="noopener noreferrer"
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', padding: '0.22rem 0.6rem 0.22rem 0.36rem', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '999px', textDecoration: 'none' }}>
                                              <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={11} height={11} style={{ borderRadius: '2px', opacity: 0.85 }} onError={e => e.target.style.display='none'} />
                                              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#374151' }}>{s.outlet || domain}</span>
                                            </a>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <Sparkles size={40} color="#e5e7eb" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.4rem', color: '#374151' }}>Select your preferences above</h3>
                  <p style={{ fontSize: '0.88rem', color: '#9ca3af', margin: 0 }}>Your personalized news digest will appear here</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── Settings View ── */}
      {currentView === 'settings' && (
        <main style={{ maxWidth: '680px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem 3rem' : '2rem 2rem 3rem' }}>

          <button onClick={() => setCurrentView('home')} style={{ marginBottom: '1.25rem', padding: '0.55rem 1.2rem', background: '#f3f4f6', border: '1.5px solid #d1d5db', borderRadius: '999px', color: '#374151', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
            ← Back to News
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── Account card ── */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                <User size={18} color="#374151" strokeWidth={2.5} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Account</h3>
              </div>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#374151' }}>{user.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>Signed in</div>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); setUser(null); localStorage.removeItem('newsdigest_user'); setCurrentView('home'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(231,76,60,0.06)', border: '1.5px solid rgba(231,76,60,0.2)', borderRadius: '999px', color: '#e74c3c', cursor: 'pointer', fontWeight: '700', fontSize: '0.83rem' }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>Sign In</button>
                  <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'none', border: '1.5px solid #e5e7eb', color: '#374151', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Create Account</button>
                </div>
              )}
            </div>

            {/* ── Font Size card ── */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#6366f1', lineHeight: 1 }}>Aa</span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Text Size</h3>
                </div>
                <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '999px', padding: '3px', gap: '2px' }}>
                  {[['normal', 'Normal'], ['large', 'Large']].map(([val, label]) => (
                    <button key={val} onClick={() => setFontSize(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: fontSize === val ? 'white' : 'transparent', color: fontSize === val ? '#111827' : '#9ca3af', boxShadow: fontSize === val ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── News Language card ── */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🌐</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>News Language</h3>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Arabic is available for Morning only</p>
                  </div>
                </div>
                <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '999px', padding: '3px', gap: '2px' }}>
                  {[['en', 'English'], ['ar', 'عربي']].map(([val, label]) => (
                    <button key={val} onClick={() => saveNewsLanguage(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: newsLanguage === val ? 'white' : 'transparent', color: newsLanguage === val ? '#111827' : '#9ca3af', boxShadow: newsLanguage === val ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── My Rundown card ── */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1rem', color: MY_FEED_COLOR }}>★</span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>My Rundown</h3>
              </div>
              {!user ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.83rem', color: '#9ca3af', lineHeight: 1.5 }}>Sign in to build your personal feed and have it follow you across devices.</p>
              ) : (
                <>
                  <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.78rem', color: '#9ca3af' }}>Tap to add or remove. Numbers show story order.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {defaultCategories.map((cat) => {
                      const pos = feedCategories.indexOf(cat);
                      const isSelected = pos !== -1;
                      const color = CATEGORY_COLORS[cat] || '#6366f1';
                      const newCats = isSelected
                        ? feedCategories.filter(c => c !== cat)
                        : [...feedCategories, cat];
                      return (
                        <button key={cat} onClick={() => saveFeedCategories(newCats)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: isSelected ? '0.38rem 0.75rem 0.38rem 0.45rem' : '0.38rem 0.85rem', borderRadius: '999px', background: isSelected ? color : 'transparent', color: isSelected ? 'white' : '#374151', border: `1.5px solid ${isSelected ? color : '#e5e7eb'}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.15s' }}>
                          {isSelected && (
                            <span style={{ background: 'rgba(255,255,255,0.28)', borderRadius: '999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.63rem', fontWeight: '900', flexShrink: 0 }}>{pos + 1}</span>
                          )}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  {feedCategories.length === 0 && (
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#f59e0b' }}>Select at least one category to activate My Rundown.</p>
                  )}
                </>
              )}
            </div>

            {/* ── Email Digest card (logged-in only) ── */}
            {user && (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
                  <Mail size={18} color="#374151" strokeWidth={2.5} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#111827' }}>Email Digest</h3>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Newsletter selection</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {(() => {
                      const myRundownActive = (emailPreferences.categories || []).includes('My Rundown');
                      return (
                        <button onClick={() => handleCategoryEmailToggle('My Rundown')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.32rem 0.8rem', borderRadius: '999px', background: myRundownActive ? MY_FEED_COLOR : 'transparent', color: myRundownActive ? 'white' : '#374151', border: `1.5px solid ${myRundownActive ? MY_FEED_COLOR : '#e5e7eb'}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: 'all 0.15s' }}>
                          ★ My Rundown
                        </button>
                      );
                    })()}
                    {defaultCategories.map(cat => {
                      const active = (emailPreferences.categories || []).includes(cat);
                      return (
                        <button key={cat} onClick={() => handleCategoryEmailToggle(cat)} style={{ padding: '0.32rem 0.8rem', fontSize: '0.8rem', fontWeight: active ? '700' : '500', background: active ? (CATEGORY_COLORS[cat] || '#6366f1') : 'transparent', color: active ? 'white' : '#374151', border: `1.5px solid ${active ? (CATEGORY_COLORS[cat] || '#6366f1') : '#e5e7eb'}`, borderRadius: '999px', cursor: 'pointer', transition: 'all 0.12s ease' }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 1rem' }} />
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.55rem' }}>Delivery times</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.55rem' }}>
                  {timesOfDay.map(time => {
                    const slotKey = time.value.toLowerCase();
                    const isEnabled = !!emailPreferences[slotKey];
                    return (
                      <label key={time.value} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: isEnabled ? 'rgba(17,24,39,0.04)' : 'rgba(0,0,0,0.02)', border: isEnabled ? '1.5px solid #111827' : '1.5px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s ease' }}>
                        <input type="checkbox" checked={isEnabled} onChange={() => handleEmailSlotToggle(slotKey)} style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#111827', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#111827' }}>{time.label}</div>
                          <div style={{ fontSize: '0.73rem', color: '#9ca3af' }}>{time.time}</div>
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
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TheAIRundown />} />
        <Route path="/verify-email" element={<VerificationPage />} />
      </Routes>
    </Router>
  );
}

export default App;
