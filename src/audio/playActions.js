// Starting playback from a feed: a story, a whole feed, a category recap or a period recap.
// Called once per render from TheAIRundown, like createNarrationEngine.
import { CATEGORY_SHORT } from '../theme';

export function createPlayActions({
  setSelectedCategory, setStoryIndex, setStories, storyNavRef, isNarrating, setIsNarrating,
  setIsPaused, setIsAudioLoading, narrationStateRef, narrateFnRef, snapshotPlayRef,
  playlistCatsRef, setPlayerVisible, setPlayerMinimized, setPlayerContextCategories, unlockSpeech,
  periodRecaps, periodCategory, playerSourcePath, briefingData, location, selectedCategory,
  stories, feedCategories, navigate, defaultCategories, savesBriefingData, interestingBriefingData,
  handleSelectCategory,
}) {
  // Listen: narrated through the same pseudo-story path the category recap uses.
  const playPeriodRecap = (period) => {
    const r = periodRecaps[period];
    if (!r) return;
    if (isNarrating) narrateFnRef.current.stop();
    const label = `${CATEGORY_SHORT[periodCategory] || periodCategory} · ${period === 'Weekly' ? 'last week' : 'last month'}`;
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

  return {
    playPeriodRecap, handleNarrateBriefing, handlePlayStory, handlePlayFeed, handlePlayMyFeed,
  };
}
