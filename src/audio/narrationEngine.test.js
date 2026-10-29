import { narrationPlayer } from './narrationPlayer';
jest.mock('./narrationPlayer', () => ({ narrationPlayer: jest.fn(() => null) }));
jest.mock('./programmeSounds', () => ({ programmeCueUrl: kind => `blob:quiet-${kind}` }));
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
  const speed = ref(1), cache = ref(new Map());
  const programme = { begin: jest.fn(), media: jest.fn(), flush: jest.fn(), end: jest.fn(), fail: jest.fn() };
  const paused = jest.fn();
  const loading = jest.fn();
  createNarrationEngine({ narrateFnRef: fn, narrationStateRef: state, snapshotPlayRef: snapshot,
    storyNavRef: nav, repeatModeRef: ref(false), playbackSpeedRef: speed, repeatMode: false, playbackSpeed: 1,
    narrationGenRef: ref(0), narrationDurationRef: ref(0), narrationLimitRef: ref(null),
    currentNarratingStoryRef: ref({}), playlistCatsRef: ref(null), newsLanguage: 'en', depthLevel: 'takeaways', depthLevelRef: ref('takeaways'),
    setSelectedCategory: select, setStories: jest.fn(), setStoryIndex: jest.fn(), addToHistory: history,
    setIsNarrating: jest.fn(), setIsPaused: paused, programmeRef: ref(programme), setIsAudioLoading: loading, setNarrationProgress: jest.fn(),
    setNarrationCharOffset: jest.fn(), ttsAudioCacheRef: cache, ttsUrlPromisesRef: ref(new Map()),
  });
  const realSpeak = fn.current.speakText;
  const speak = jest.fn();
  fn.current.speakText = speak;
  fn.current.prefetchTTS = jest.fn();
  return { fn: fn.current, state: state.current, snapshot, speak, history, select, realSpeak, speed, cache, programme, paused, loading };
}
afterEach(() => jest.useRealTimers());
test('a late response from a skipped clip cannot clear the new clip loading state',async()=>{
 const original=global.fetch;let finish;
 global.fetch=jest.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockImplementation(()=>new Promise(()=>{}));
 const h=harness(),done=jest.fn();
 h.realSpeak('Skipped short update.',done);h.fn.cancelAudioKeepActive();h.realSpeak('Current short update.',jest.fn());
 finish({ok:true,json:async()=>({url:'https://example.com/skipped.mp3'})});
 for(let i=0;i<10;i++)await Promise.resolve();
 expect(h.loading.mock.calls).toEqual([[true],[true]]);expect(done).not.toHaveBeenCalled();
 global.fetch=original;
});
test('Quick clips advance independently, preserve parent recap identity and do not gain headline-read credit',()=>{
 jest.useFakeTimers();const h=harness(),parts=[{text:'A complete checked recap.',start:0,end:.5},{text:'A complete checked recap.',start:.5,end:1}];
 const list=h.snapshot.current.stories;
 list.splice(0,2,...parts.map((part,i)=>({headline:`Short ${i}`,summary:`Short update ${i}.`,_isBriefing:true,_quickRecap:part})));
 h.snapshot.current.radio=true;h.snapshot.current.headlineProgramme=false;
 h.fn.narrateStory(0);
 expect(h.programme.begin).toHaveBeenCalledWith(h.snapshot.current,'World News','A complete checked recap.',parts[0]);
 h.speak.mock.calls[0][1]();jest.runOnlyPendingTimers();
 expect(h.speak.mock.calls[1][0]).toBe('Short update 1.');
 expect(h.programme.begin).toHaveBeenLastCalledWith(h.snapshot.current,'World News','A complete checked recap.',parts[1]);
 expect(h.history).not.toHaveBeenCalled();expect(h.select).not.toHaveBeenCalled();
});
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

test('recorded clips retain the latest speed through media loading and the next headline', async () => {
  const audio = { src: '', play: jest.fn(() => Promise.resolve()), pause: jest.fn(), playbackRate: 1, defaultPlaybackRate: 1 };
  narrationPlayer.mockReturnValue(audio);
  const h = harness();
  h.cache.current.set('First.', { src: 'https://example.com/one.mp3' });
  h.cache.current.set('Next.', { src: 'https://example.com/two.mp3' });
  h.speed.current = 1.5;
  h.realSpeak('First.', jest.fn());
  expect(audio.defaultPlaybackRate).toBe(1.5);
  // Safari can reset the rate after assigning the next src, during load/play.
  audio.playbackRate = 1;
  audio.onloadedmetadata();
  expect(audio.playbackRate).toBe(1.5);
  h.speed.current = 2;
  h.realSpeak('Next.', jest.fn());
  expect(audio.defaultPlaybackRate).toBe(2);
  audio.playbackRate = 1;
  audio.onplaying();
  expect(audio.playbackRate).toBe(2);
  narrationPlayer.mockReturnValue(null);
});

test('saved recap position is applied after metadata and seeking does not create played intervals', async () => {
  const audio = { src:'', duration:100, currentTime:0, readyState:0, played:{length:0}, play:jest.fn(()=>Promise.resolve()), pause:jest.fn() };
  narrationPlayer.mockReturnValue(audio);
  const h=harness();h.cache.current.set('Recap.', {src:'https://example.com/recap.mp3'});
  h.state.pendingResumeFraction=.4;
  h.realSpeak('Recap.',jest.fn());audio.onloadedmetadata();
  expect(audio.currentTime).toBe(40);
  audio.ontimeupdate();
  expect(h.programme.media).toHaveBeenCalledWith(audio);
  expect(audio.played.length).toBe(0);
  narrationPlayer.mockReturnValue(null);
});
test('a native audio interruption pauses the interface and flushes saved progress', () => {
  const audio = {src:'',play:jest.fn(()=>Promise.resolve()),pause:jest.fn()};
  narrationPlayer.mockReturnValue(audio);
  const h=harness();h.cache.current.set('Recap.',{src:'https://example.com/recap.mp3'});
  h.realSpeak('Recap.',jest.fn());h.state.ignorePauseUntil=0;audio.onpause();
  expect(h.state.paused).toBe(true);
  expect(h.paused).toHaveBeenCalledWith(true);
  expect(h.programme.flush).toHaveBeenCalled();
  narrationPlayer.mockReturnValue(null);
});

test('pausing during an audio load prevents a late recording from starting itself',()=>{
 const audio={src:'',play:jest.fn(()=>Promise.resolve()),pause:jest.fn()};narrationPlayer.mockReturnValue(audio);
 const h=harness();h.cache.current.set('Recap.',{src:'https://example.com/recap.mp3'});h.state.paused=true;
 h.realSpeak('Recap.',jest.fn());expect(audio.play).not.toHaveBeenCalled();h.fn.resume();expect(audio.play).toHaveBeenCalledTimes(1);
 narrationPlayer.mockReturnValue(null);
});
test('pausing between clips holds the next story until the user resumes',()=>{
 const h=harness();h.state.paused=true;h.fn.narrateStory(1);expect(h.speak).not.toHaveBeenCalled();
 h.fn.resume();expect(h.speak.mock.calls[0][0]).toBe('Verified summary 2.');
});

test('the approved opening cue precedes a new radio mix and never credits listening coverage',()=>{
 const audio={src:'',play:jest.fn(()=>Promise.resolve()),pause:jest.fn(),duration:1,currentTime:.9};narrationPlayer.mockReturnValue(audio);
 const h=harness();h.snapshot.current.radio=true;h.state.pendingSessionOpening='Welcome.';h.speed.current=2;h.fn.narrateStory(0);
 expect(audio.src).toBe('blob:quiet-opening');expect(audio.playbackRate).toBe(1);expect(h.speak).not.toHaveBeenCalled();
 audio.ontimeupdate();expect(h.programme.media).not.toHaveBeenCalled();audio.onended();expect(h.speak.mock.calls[0][0]).toBe('Welcome.');
 narrationPlayer.mockReturnValue(null);
});
test('a failed optional cue continues into narration and stopping cancels a pending cue',()=>{
 const audio={src:'',play:jest.fn(()=>Promise.resolve()),pause:jest.fn()};narrationPlayer.mockReturnValue(audio);
 const h=harness();h.snapshot.current.radio=true;h.state.pendingSessionOpening='Welcome.';h.fn.narrateStory(0);audio.onerror();
 expect(h.speak.mock.calls[0][0]).toBe('Welcome.');expect(h.programme.fail).not.toHaveBeenCalled();
 h.state.pendingSessionOpening='Another mix.';h.fn.narrateStory(0);const ended=audio.onended;h.fn.stop();ended();
 expect(h.speak).toHaveBeenCalledTimes(1);narrationPlayer.mockReturnValue(null);
});
test('the closing cue follows the final spoken sign-off',()=>{
 const audio={src:'',play:jest.fn(()=>Promise.resolve()),pause:jest.fn()};narrationPlayer.mockReturnValue(audio);
 const h=harness();h.snapshot.current.radio=true;h.snapshot.current.category='UAE';h.fn.goNext();
 expect(audio.play).not.toHaveBeenCalled();h.speak.mock.calls[0][1]();expect(audio.src).toBe('blob:quiet-closing');audio.onended();expect(h.state.active).toBe(false);
 narrationPlayer.mockReturnValue(null);
});


test('text-only pause/resume retains recording position and speed, while choosing another update seeks without awarding coverage', () => {
  const h = harness();
  const audio = { duration: 100, currentTime: 37, playbackRate: 1.5, played: { length: 0 }, pause: jest.fn(), play: jest.fn(() => Promise.resolve()) };
  h.state.audio = audio;
  h.fn.pause();
  expect(h.state.paused).toBe(true); expect(audio.pause).toHaveBeenCalledTimes(1);
  expect(audio.currentTime).toBe(37);
  h.fn.resume();
  expect(audio.currentTime).toBe(37); expect(audio.playbackRate).toBe(1.5);
  h.fn.pause(); expect(h.fn.seek(65)).toBe(true); h.fn.resume();
  expect(audio.currentTime).toBe(65); expect(audio.played.length).toBe(0);
  expect(h.programme.end).not.toHaveBeenCalled();
});
