// The TTS narration engine: speaking, pausing, advancing through stories and categories.
// Called once per render from TheAIRundown with that render's state, exactly as the code
// ran when it lived inline — everything it hands back is re-created each render.
import { headlineKey } from '../components/PopularTab';
import { cleanForTTS, endSentence, categoryTransition, narrationSeekOffset } from './narrationText';
import { storyParagraph } from '../lib/stories';
import { BACKEND_URL } from '../lib/backend';
import { narrationPlayer } from './narrationPlayer';

export function createNarrationEngine({
  setSelectedCategory, selectedTime, newsSummary, viewMode, depthLevel, depthLevelRef, storyIndex,
  setStoryIndex, setStories, storyNavRef, setIsNarrating, isNarrating, setIsPaused,
  setIsAudioLoading, repeatMode, playbackSpeed, setNarrationProgress, narrationDurationRef,
  repeatModeRef, playbackSpeedRef, narrationStateRef, narrationGenRef, narrateFnRef,
  ttsAudioCacheRef, ttsUrlPromisesRef, handleSelectCategoryRef, snapshotPlayRef, feedCategories,
  newsLanguage, setListenCounts, currentNarratingStoryRef, playlistCatsRef, setPlayerVisible,
  setPlayerMinimized, setPlayerContextCategories, addToHistory, location, defaultCategories,
  setPhoneVoice, narrationLimitRef, setNarrationCharOffset,
}) {
  // Where this topic's stories end for the narration: all of them, or in Listen only the ones
  // the batch shows — past those it moves to the next topic (Roy, 2026-10-18).
  const topicEnd = (n) => { const lim = narrationLimitRef?.current; return lim ? Math.min(n, lim) : n; };
  // Sync mutable player state into refs so narration callbacks can read latest values
  repeatModeRef.current = repeatMode;
  playbackSpeedRef.current = playbackSpeed;

  // ── Narration helpers (ElevenLabs TTS via backend, all reads through refs) ──

  const stopNarration = () => {
    narrationGenRef.current++;
    const st = narrationStateRef.current;
    clearInterval(st.browserProgressTimer);
    if (st.pendingNarrateTimer) { clearTimeout(st.pendingNarrateTimer); st.pendingNarrateTimer = null; }
    if (st.audio) { st.audio.onended = null; st.audio.pause(); st.audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setNarrationCharOffset?.(-1);
    st.active = false;
    st.pendingLoad = false;
    st.pendingCategoryName = null;
    st.pendingSessionOpening = null;
    st.browserSeek = null;
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
    if (st.browserSeek) {
      const { text, offset, onDone } = st.browserSeek;
      st.browserSeek = null;
      window.speechSynthesis?.resume();
      speakWithBrowser(text.slice(offset), onDone, offset, text);
    } else if (st.audio) {
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
    if (depthLevel === 'summary' || depthLevel === 'takeaways') return newsSummary?.stories_content || newsSummary?.content;
    return newsSummary?.content; // deep
  };
  narrateFnRef.current.getNarrationContent = getNarrationContent;

  // Cancels in-flight audio without ending the narration session (keeps isNarrating=true)
  const cancelAudioKeepActive = () => {
    narrationGenRef.current++; // invalidate any stale canplay/fetch callbacks
    const st = narrationStateRef.current;
    clearInterval(st.browserProgressTimer);
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

  // Browser Web Speech API fallback — used when Fish Audio is unavailable
  // getVoices() is async in Chrome (returns [] until voiceschanged fires); we wait for it.
  // `offset` / `fullText` exist so a speed change can restart mid-chunk without the progress
  // bar jumping back to zero: the new utterance is a slice, but progress is still reported
  // against the whole thing.
  const speakWithBrowser = (text, onDone, offset = 0, fullText = null) => {
    if (!('speechSynthesis' in window)) { narrateFnRef.current.stop(); return; }
    // The phone's own voice obeys the silent switch; the narration voice doesn't. Say so.
    setPhoneVoice?.(true);
    window.speechSynthesis.cancel();
    const isAr = newsLanguage === 'ar';
    const whole = fullText ?? text;
    // Kept so the rate can be changed while this is speaking — see applySpeedToBrowserVoice.
    narrationStateRef.current.browserText = whole;
    narrationStateRef.current.browserOnDone = onDone;
    narrationStateRef.current.browserCharIndex = offset;

    const doSpeak = (voices) => {
      if (!narrationStateRef.current.active) return;
      const utter = new SpeechSynthesisUtterance(text.trim());
      const utterGen = narrationGenRef.current;
      let hasBoundary = false;
      let spokenSeconds = 0;
      let lastTick = 0;
      utter.onstart = () => {
        clearInterval(narrationStateRef.current.browserProgressTimer);
        lastTick = Date.now();
        narrationStateRef.current.browserProgressTimer = setInterval(() => {
          const st = narrationStateRef.current;
          const now = Date.now(), dt = (now - lastTick) / 1000;
          lastTick = now;
          if (!st.active || utterGen !== narrationGenRef.current) { clearInterval(st.browserProgressTimer); return; }
          if (st.paused || hasBoundary || st.isTransition) return;
          spokenSeconds += dt;
          const seconds = Math.max(1, text.trim().split(/\s+/).length / (2.5 * utter.rate));
          const fraction = Math.min(.99, spokenSeconds / seconds);
          setNarrationProgress(Math.min(99, (offset + fraction * text.length) / Math.max(1, whole.length) * 100));
        }, 200);
      };
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
        if (utterGen === narrationGenRef.current && e.name === 'word' && whole.length > 0 && !narrationStateRef.current.isTransition) {
          hasBoundary = true;
          narrationStateRef.current.browserCharIndex = offset + e.charIndex;
          setNarrationCharOffset?.(offset + e.charIndex);
          setNarrationProgress(Math.min(99, ((offset + e.charIndex) / whole.length) * 100));
        }
      };
      utter.onend = () => {
        if (utterGen !== narrationGenRef.current) return;
        clearInterval(narrationStateRef.current.browserProgressTimer);
        setNarrationProgress(0);
        narrationDurationRef.current = 0;
        if (narrationStateRef.current.active && !narrationStateRef.current.canceling) onDone();
      };
      utter.onerror = () => { if (utterGen === narrationGenRef.current && !narrationStateRef.current.canceling) narrateFnRef.current.stop(); };
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
  // Recorded audio can seek directly. Device speech restarts at a word boundary.
  narrateFnRef.current.seek = (percent) => {
    const st = narrationStateRef.current;
    if (!st.active || st.isTransition || !Number.isFinite(percent)) return false;
    const fraction = Math.max(0, Math.min(100, percent)) / 100;
    if (st.audio) {
      const duration = st.audio.duration;
      if (!Number.isFinite(duration) || duration <= 0) return false;
      clearTimeout(st.pendingNarrateTimer);
      const target = Math.min(Math.max(0, duration - .05), duration * fraction);
      const wasEnded = st.audio.ended;
      st.audio.currentTime = target;
      setNarrationCharOffset?.(-1);
      setNarrationProgress(target / duration * 100);
      if (wasEnded && !st.paused) st.audio.play().catch(() => narrateFnRef.current.stop());
      return true;
    }
    const text = st.browserText, onDone = st.browserOnDone;
    if (!text || !onDone) return false;
    const paused = st.paused;
    const offset = narrationSeekOffset(text, percent);
    cancelAudioKeepActive();
    st.canceling = false;
    st.browserCharIndex = offset;
    setNarrationCharOffset?.(offset);
    setNarrationProgress(offset / text.length * 100);
    if (paused) st.browserSeek = { text, offset, onDone };
    else { st.browserSeek = null; window.speechSynthesis?.resume(); speakWithBrowser(text.slice(offset), onDone, offset, text); }
    return true;
  };

  // Pass isTransition:true to suppress all progress-bar updates (seamless between stories)
  const setupAndPlayAudio = (audioIn, onDone, { isTransition = false } = {}) => {
    if (!narrationStateRef.current.active) return;
    if (!isTransition) setPhoneVoice?.(false);
    // Capture generation so stale onended callbacks from prior sessions can't fire.
    // stop() / cancelAudioKeepActive() both increment narrationGenRef, so any audio
    // element left over from a previous session will bail when its onended fires.
    const capturedGen = narrationGenRef.current;
    // Always the one shared element, unlocked by the first tap (see narrationPlayer.js): a new
    // element per clip is what iPhones refused to play outside a tap. Prefetched clips hand over
    // their URL; the element they were made with is not played.
    const shared = narrationPlayer();
    const audio = shared || ((audioIn.ended && audioIn.src) ? new Audio(audioIn.src) : audioIn);
    if (shared && audioIn.src && shared.src !== audioIn.src) { shared.pause(); shared.src = audioIn.src; }
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
        if (pct !== lastPct) { lastPct = pct; setNarrationProgress(pct); }
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
    // A saved recording plays straight from storage, starting as the first bytes arrive
    // (2026-10-18); only text with nothing saved yet is made and fetched whole.
    const made = () => fetch(`${BACKEND_URL}/api/tts-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => { if (!r.ok) throw new Error('tts-stream failed'); return r.arrayBuffer(); })
      .then(buf => URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })));
    const promise = fetch(`${BACKEND_URL}/api/tts-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => (r.ok ? r.json() : { url: null }))
      .catch(() => ({ url: null }))
      .then(({ url }) => url || made())
      .catch(() => null);
    ttsUrlPromisesRef.current.set(text, promise);
    if (ttsUrlPromisesRef.current.size > 12) {
      const oldest = ttsUrlPromisesRef.current.keys().next().value;
      ttsUrlPromisesRef.current.delete(oldest);
    }
    return promise;
  };

  const speakText = (text, onDone, opts = {}) => {
    narrationStateRef.current.isTransition = !!opts.isTransition;
    setNarrationCharOffset?.(opts.isTransition ? -2 : -1);
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
        // The shared player takes the address; a second element would only download it twice.
        const audio = fromCache || { src: url, ended: false };
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
        snapshotPlayRef.current = { ...snap, category: nextCat, stories: nextStories };
        const transition = categoryTransition(nextCat, newsLanguage);
        narrationStateRef.current.pendingCategoryName = transition;
        narrateFnRef.current.prefetchTTS?.(transition);
        setSelectedCategory(nextCat);
        setStories(nextStories);
        setStoryIndex(0);
        storyNavRef.current = { idx: 0, stories: nextStories, cats, cat: nextCat };
        setTimeout(() => narrateFnRef.current.narrateStory(0), 0);
      } else if (snap.headlineProgramme && narrationStateRef.current.active) {
        const closing = newsLanguage === 'ar' ? 'هذه آخر الأخبار. شكراً لاستماعك إلى راديو نيوز.' : "That's your news for now. Thanks for listening to RadioNews.";
        narrateFnRef.current.speakText(closing, () => narrateFnRef.current.stop(), { isTransition: true });
      } else {
        narrateFnRef.current.stop();
      }
      return;
    }

    const { cats, cat } = storyNavRef.current;
    const catIdx = cats.indexOf(cat);
    const nextCat = catIdx >= 0 && catIdx < cats.length - 1 ? cats[catIdx + 1] : null;
    if (nextCat && narrationStateRef.current.active) {
      const transition = categoryTransition(nextCat, newsLanguage);
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
    if (idx >= topicEnd(stories.length)) {
      if (repeatModeRef.current) { setStoryIndex(0); narrateFnRef.current.narrateStory(0); return; }
      narrateFnRef.current.goNext(); return;
    }
    const story = stories[idx];
    setStoryIndex(idx);
    currentNarratingStoryRef.current = { headline: story.headline }; // for listen tracking
    // A recap is not a story: playing one must not tick off whichever story sits at index 0.
    if (!story._isBriefing) addToHistory(story, storyNavRef.current.cat, idx, selectedTime || null);
    const isHeadlines = depthLevel === 'headlines' && !story._isBriefing;
    // The story's paragraph, as the card shows it — no headline: the paragraph's first sentence
    // already carries it, and reading both said the news twice (Roy, 2026-10-18). The same
    // script the backend pre-records, so the saved audio is found.
    const cl = cleanForTTS;
    const script = isHeadlines ? endSentence(cl(story.headline)) : cl(storyParagraph(story));

    const playStory = () => {
      narrateFnRef.current.speakText(script, () => {
        if (!narrationStateRef.current.active) return;
        // Repeat this story: the same one again, after the usual pause.
        if (repeatModeRef.current === 'one') {
          const st = narrationStateRef.current;
          clearTimeout(st.pendingNarrateTimer);
          st.pendingNarrateTimer = setTimeout(() => { st.pendingNarrateTimer = null; narrateFnRef.current.narrateStory(idx); }, 600);
          return;
        }
        const nextIdx = idx + 1;
        if (nextIdx < topicEnd(storyNavRef.current.stories.length)) {
          const st = narrationStateRef.current;
          clearTimeout(st.pendingNarrateTimer);
          st.pendingNarrateTimer = setTimeout(() => { st.pendingNarrateTimer = null; narrateFnRef.current.narrateStory(nextIdx); }, 450);
        } else {
          const st = narrationStateRef.current;
          clearTimeout(st.pendingNarrateTimer);
          st.pendingNarrateTimer = setTimeout(() => { st.pendingNarrateTimer = null; narrateFnRef.current.narrateStory(nextIdx); }, 600);
        }
      });
    };

    const opening = narrationStateRef.current.pendingSessionOpening;
    if (opening) {
      narrationStateRef.current.pendingSessionOpening = null;
      narrateFnRef.current.speakText(opening, () => {
        if (narrationStateRef.current.active) playStory();
      }, { isTransition: true });
      return;
    }

    // Play category transition first if we just auto-advanced from another category
    const catTransition = narrationStateRef.current.pendingCategoryName;
    if (idx === 0 && catTransition) {
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
    // Exactly as narrateStoryFrom reads it — the cache key has to match.
    return cleanForTTS(storyParagraph(story));
  };

  // Pre-fetches TTS audio for `text` in the background so play is instant when triggered.
  // Uses the shared getTTSUrl promise — no duplicate network requests even if speakText fires concurrently.
  const prefetchTTSAudio = async (text) => {
    if (!text?.trim() || newsLanguage === 'ar') return;
    if (ttsAudioCacheRef.current.has(text)) return;
    try {
      const url = await getTTSAudio(text.trim()); // shared promise — no duplicate fetch with speakText
      if (!url || ttsAudioCacheRef.current.has(text)) return;
      const audio = new Audio(url); // loads the clip now, so the shared player finds it ready
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
    const text = content
      .replace(/#{1,3}\s+\[?([^\]\n]+)\]?[^\n]*/g, '$1.')
      // Older digests still carry these lines; they are not part of a story any more, so they
      // are skipped rather than read out (Roy, 2026-10-15).
      .replace(/^\*\*(?:Perspectives differ|وجهات النظر تتباين|تباين وجهات النظر|آراء مختلفة|Why this matters|لماذا هذا مهم|لماذا يهم هذا|أهمية الخبر):\*\*[^\n]*/gm, '')
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

  return {
    speakWithBrowser,
  };
}
