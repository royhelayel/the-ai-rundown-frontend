// Player transport: next / previous, speed, repeat, and the play buttons on each feed.
// Called once per render from TheAIRundown, like createNarrationEngine.
export function createPlaybackControls({
  setSelectedCategory, selectedCategory, setStoryIndex, storyIndex, setStories, stories,
  goToLastStoryRef, storyNavRef, storyGoRef, isNarrating, setIsNarrating, isPaused, setIsPaused,
  setIsAudioLoading, repeatMode, setRepeatMode, playbackSpeed, setPlaybackSpeed,
  setNarrationProgress, narrationDurationRef, repeatModeRef, playbackSpeedRef, narrationStateRef,
  narrateFnRef, snapshotPlayRef, feedCategories, playlistCatsRef, setPlayerVisible,
  setPlayerMinimized, setPlayerContextCategories, playerSourcePath, briefingData, navigate,
  location, defaultCategories, speakWithBrowser, handleSelectCategory, prevCatNav, nextCatNav,
  speechUnlockedRef,
}) {
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

  // A speech-synthesis utterance fixes its rate when it starts and cannot be re-rated in
  // flight, so changing speed used to do nothing audible until the next story — which is
  // every story right now, because with TTS unavailable the browser voice is what plays.
  // Restarting the current chunk from the word last spoken is the only way to apply it now;
  // `canceling` swallows the onend that cancel() fires, which would otherwise be mistaken
  // for the story finishing and skip to the next one.
  const applySpeedToBrowserVoice = () => {
    const st = narrationStateRef.current;
    if (!('speechSynthesis' in window) || !window.speechSynthesis.speaking) return;
    const { browserText: whole, browserOnDone: onDone } = st;
    if (!whole || !onDone) return;
    const from = Math.min(st.browserCharIndex || 0, Math.max(0, whole.length - 1));
    st.canceling = true;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      st.canceling = false;
      if (st.active && !st.paused) speakWithBrowser(whole.slice(from), onDone, from, whole);
    }, 40);
  };

  const handleSpeedCycle = () => {
    const SPEEDS_LIST = [0.75, 1, 1.25, 1.5, 2];
    const si = SPEEDS_LIST.indexOf(playbackSpeed);
    const next = SPEEDS_LIST[(si + 1) % SPEEDS_LIST.length];
    playbackSpeedRef.current = next;
    setPlaybackSpeed(next);
    // The audio element re-rates in place; the browser voice has to be restarted.
    if (narrationStateRef.current.audio) narrationStateRef.current.audio.playbackRate = next;
    else applySpeedToBrowserVoice();
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

  return {
    scheduleNarrate, goToSnapshotCategory, goNext, goPrev, unlockSpeech, onPlayFrom,
    handleSpeedCycle, handleRepeatToggle, handlePlayBriefing, handlePlayCategory,
  };
}
