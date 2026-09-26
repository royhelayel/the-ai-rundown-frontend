// The TTS narration engine: speaking, pausing, advancing through stories and categories.
// Called once per render from TheAIRundown with that render's state, exactly as the code
// ran when it lived inline — everything it hands back is re-created each render.
import { headlineKey } from '../components/PopularTab';
import { cleanForTTS, STORY_TRANSITIONS, CAT_TRANSITION_TEMPLATES, pickRandom } from './narrationText';
import { BACKEND_URL } from '../lib/backend';

export function createNarrationEngine({
  setSelectedCategory, selectedTime, newsSummary, viewMode, depthLevel, depthLevelRef, storyIndex,
  setStoryIndex, setStories, storyNavRef, setIsNarrating, isNarrating, setIsPaused,
  setIsAudioLoading, repeatMode, playbackSpeed, setNarrationProgress, narrationDurationRef,
  repeatModeRef, playbackSpeedRef, narrationStateRef, narrationGenRef, narrateFnRef,
  ttsAudioCacheRef, ttsUrlPromisesRef, handleSelectCategoryRef, snapshotPlayRef, feedCategories,
  newsLanguage, setListenCounts, currentNarratingStoryRef, playlistCatsRef, setPlayerVisible,
  setPlayerMinimized, setPlayerContextCategories, addToHistory, location, defaultCategories,
}) {
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

  // Browser Web Speech API fallback — used when Fish Audio is unavailable
  // getVoices() is async in Chrome (returns [] until voiceschanged fires); we wait for it.
  // `offset` / `fullText` exist so a speed change can restart mid-chunk without the progress
  // bar jumping back to zero: the new utterance is a slice, but progress is still reported
  // against the whole thing.
  const speakWithBrowser = (text, onDone, offset = 0, fullText = null) => {
    if (!('speechSynthesis' in window)) { narrateFnRef.current.stop(); return; }
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
        if (e.name === 'word' && whole.length > 0) {
          narrationStateRef.current.browserCharIndex = offset + e.charIndex;
          setNarrationProgress(Math.min(99, ((offset + e.charIndex) / whole.length) * 100));
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

  return {
    speakWithBrowser,
  };
}
