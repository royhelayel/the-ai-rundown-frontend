import { createNarrationEngine } from './narrationEngine';
jest.mock('../components/PopularTab', () => ({ headlineKey: text => text }));
const ref = current => ({ current });
const story = (n) => ({ headline: `Headline ${n}`, summary: `Verified summary ${n}.` });
function harness() {
  const stories = [story(1), story(2)];
  const fn = ref({});
  const state = ref({ active: true, paused: false });
  const snapshot = ref({ category: 'World News', stories, headlineProgramme: true, map: { 'World News': { allStories: stories }, UAE: { allStories: [story(3)] } } });
  const nav = ref({ cat: 'World News', stories, idx: 0, cats: ['World News', 'UAE'] });
  const history = jest.fn(), select = jest.fn();
  createNarrationEngine({ narrateFnRef: fn, narrationStateRef: state, snapshotPlayRef: snapshot,
    storyNavRef: nav, repeatModeRef: ref(false), playbackSpeedRef: ref(1), repeatMode: false, playbackSpeed: 1,
    narrationGenRef: ref(0), narrationDurationRef: ref(0), narrationLimitRef: ref(null),
    currentNarratingStoryRef: ref({}), playlistCatsRef: ref(null), newsLanguage: 'en', depthLevel: 'takeaways',
    setSelectedCategory: select, setStories: jest.fn(), setStoryIndex: jest.fn(), addToHistory: history,
    setIsNarrating: jest.fn(), setIsPaused: jest.fn(), setIsAudioLoading: jest.fn(), setNarrationProgress: jest.fn(),
    setNarrationCharOffset: jest.fn(), ttsAudioCacheRef: ref(new Map()), ttsUrlPromisesRef: ref(new Map()),
  });
  const speak = jest.fn();
  fn.current.speakText = speak;
  fn.current.prefetchTTS = jest.fn();
  return { fn: fn.current, state: state.current, snapshot, speak, history, select };
}
afterEach(() => jest.useRealTimers());
test('starting on story two reads its complete summary without a false category introduction', () => {
  const h = harness();
  h.fn.narrateStory(1);
  expect(h.speak.mock.calls[0][0]).toBe('Verified summary 2.');
  expect(h.history).toHaveBeenCalledWith(expect.objectContaining({ headline: 'Headline 2' }), 'World News', 1, null);
});
test('session opening is separate from the story and is consumed once', () => {
  const h = harness();
  h.state.pendingSessionOpening = 'Welcome to RadioNews.';
  h.fn.narrateStory(1);
  expect(h.speak.mock.calls[0][0]).toBe('Welcome to RadioNews.');
  expect(h.speak.mock.calls[0][2]).toEqual({ isTransition: true });
  h.speak.mock.calls[0][1]();
  expect(h.speak.mock.calls[1][0]).toBe('Verified summary 2.');
  expect(h.state.pendingSessionOpening).toBeNull();
});
test('automatic category crossing introduces the new category and retains programme metadata', () => {
  jest.useFakeTimers();
  const h = harness();
  h.fn.goNext();
  jest.runOnlyPendingTimers();
  expect(h.select).toHaveBeenCalledWith('UAE');
  expect(h.speak.mock.calls[0][0]).toBe('Now, the United Arab Emirates.');
  h.speak.mock.calls[0][1]();
  expect(h.speak.mock.calls[1][0]).toBe('Verified summary 3.');
  expect(h.snapshot.current.headlineProgramme).toBe(true);
});
test('the programme closes only after its last category', () => {
  const h = harness();
  h.snapshot.current.category = 'UAE';
  h.fn.goNext();
  expect(h.speak.mock.calls[0][0]).toBe("That's your news for now. Thanks for listening to RadioNews.");
  expect(h.speak.mock.calls[0][2]).toEqual({ isTransition: true });
});

test('recorded audio seeks within the current clip and rejects transitions', () => {
  const h = harness();
  const audio = { duration: 100, currentTime: 12, ended: false };
  h.state.audio = audio;
  expect(h.fn.seek(60)).toBe(true);
  expect(audio.currentTime).toBe(60);
  h.state.isTransition = true;
  expect(h.fn.seek(20)).toBe(false);
  expect(audio.currentTime).toBe(60);
});
test('paused device speech seeks to a word without playing or losing its completion callback', () => {
  const h = harness();
  h.state.paused = true;
  h.state.browserText = 'One two three four.';
  h.state.browserOnDone = jest.fn();
  expect(h.fn.seek(60)).toBe(true);
  expect(h.state.browserSeek.text).toBe('One two three four.');
  expect(h.state.browserSeek.offset).toBe(8);
  expect(h.state.browserSeek.onDone).toBe(h.state.browserOnDone);
  expect(h.state.paused).toBe(true);
});
