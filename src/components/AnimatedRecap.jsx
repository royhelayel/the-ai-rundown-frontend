import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ChevronUp, Star } from 'lucide-react';
import { buildRecapScenes, scenePosition, hasExplainerMotion } from '../lib/recapScenes';
import { CATEGORY_SHORT } from '../theme';
import GeneratedStoryAnimation, { safeGeneratedAnimation } from './GeneratedStoryAnimation';
import RecapIllustration from './RecapIllustration';
import StoryLedAnimation from './storyLed/StoryLedAnimation';
import StagedAnimation from './storyLed/StagedAnimation';
import useStoryAnimations from '../hooks/useStoryAnimations';
import useDailyMotion from '../hooks/useDailyMotion';
import RemoteRemotion from './RemoteRemotion';
import useAnimationPreference from '../hooks/useAnimationPreference';
import useIllustrationSelection from '../hooks/useIllustrationSelection';
import { StatusBadge } from './StoryBits';
import './AnimatedRecap.css';

// A visual clock only: it never owns audio, changes playback, or awards listen credit.
// Extrapolate no more than one percentage point between the audio engine's updates;
// buffering cannot leave illustrations running ahead through the rest of the recap.
function useVisualProgress(progress, duration, playing, speed, enabled) {
  const [value, setValue] = useState(progress);
  const anchor = useRef({ progress, at: 0 });
  useEffect(() => {
    anchor.current = { progress, at: performance.now() };
    setValue(progress);
  }, [progress]);
  useEffect(() => {
    if (!enabled || !playing || !duration || document.hidden) return undefined;
    let id, last = 0;
    const tick = now => {
      if (document.hidden) return;
      if (now - last >= 40) {
        last = now;
        const a = anchor.current;
        setValue(Math.min(100, a.progress + 1, a.progress + (now - a.at) / 1000 * speed / duration * 100));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [duration, playing, speed, enabled]);
  return enabled && playing ? value : progress;
}

const AnimatedRecap = forwardRef(function AnimatedRecap({ text, sourcesMap, allSources = [], category, progress = 0, charOffset = -1,
  playing = false, playbackActive = playing, duration = 0, speed = 1, onOpenSources, getStoryAction, onPresentationChange,
  reading = false, onChangeReading, onNext, onPrev, canNext = false, canPrev = false, onReadUpdate,
  title, dateLabel, day, language='en', dailyMotion=true, onNavigationChange, externalCount = 0, externalIndex = 0, onExternalSelect, editorial = false, readerEntryDirection = 0 }, ref) {
  const [animations] = useAnimationPreference();
  const [reduced, setReduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [readerIndex, setReaderIndex] = useState(() => scenePosition(buildRecapScenes(text, sourcesMap), progress, charOffset)?.scene.index || 0);
  const [overflow, setOverflow] = useState(false);
  const [failedFrame,setFailedFrame]=useState(null);
  const frameUnavailable=useCallback(id=>setFailedFrame(id),[]);
  const readerMoved = useRef(false);
  const readerEntry = useRef(readerEntryDirection);
  const readerMotion = useRef({ timer:null, busy:false });
  useEffect(() => () => clearTimeout(readerMotion.current.timer), []);
  useEffect(() => {
    if (!reading) { clearTimeout(readerMotion.current.timer); readerMotion.current.busy = false; }
  }, [reading]);
  const previousReading = useRef(reading);
  const touch = useRef(null), wheelAt = useRef(0), textBox = useRef(null), transcript = useRef(null);
  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(!!motion?.matches);
    const visibility = () => setVisible(!document.hidden);
    motion?.addEventListener?.('change', changed); document.addEventListener('visibilitychange', visibility);
    return () => { motion?.removeEventListener?.('change', changed); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const moving = animations && !reading && !reduced && visible;
  const visualProgress = useVisualProgress(progress, duration, playing, speed, moving);
  const scenes = useMemo(() => buildRecapScenes(text, sourcesMap), [text, sourcesMap]);
  const position = scenePosition(scenes, visualProgress, charOffset);
  const audioIndex = position?.scene.index || 0;
  const dailyFor=useDailyMotion(scenes.slice(audioIndex,audioIndex+2).map(s=>s.text),{category,day,language,enabled:dailyMotion&&animations&&!reading&&visible});
  const animationFor = useStoryAnimations(scenes.slice(audioIndex,audioIndex+2).filter(s=>!hasExplainerMotion(s.illustration)).map(s=>s.text),animations && !reading && visible);
  // Enter reading exactly at the narrated update. Further reading is independent of
  // the paused audio cursor; returning without a swipe resumes the exact audio position.
  useEffect(() => {
    if (reading && !previousReading.current) { setReaderIndex(audioIndex); readerMoved.current = false; }
    previousReading.current = reading;
  }, [reading, audioIndex]);
  const currentIndex = reading ? Math.min(readerIndex, scenes.length - 1) : audioIndex;
  const scene = scenes[currentIndex];
  const drawing = scene ? animationFor(scene.text) : null;
  const daily=scene?dailyFor(scene.text):null;
  const native = daily?.artifact ? {type:'remotion',...daily.artifact} : hasExplainerMotion(scene?.illustration) ? scene.illustration : null;
  const plan = !native && drawing?.plan && safeGeneratedAnimation(drawing.plan,scene.text) ? drawing.plan : null;
  const visual = useIllustrationSelection(scene?.text, { native, plan }, playbackActive, reading);
  const hasIllustration = !!(visual.native || visual.plan) && !(visual.native?.type==='remotion'&&failedFrame===visual.native.id);
  const compact = animations && !reading && !hasIllustration;
  useLayoutEffect(() => {
    onPresentationChange?.({ text, compact, storyLed: !reading && animations && ['story-led','staged','remotion'].includes(visual.native?.type) });
  }, [text, compact, reading, animations, visual.native?.type, onPresentationChange]);
  const nextAvailable = currentIndex < scenes.length - 1 || canNext;
  const prevAvailable = currentIndex > 0 || canPrev;
  const resetReaderDrag = () => {
    if (!textBox.current) return;
    textBox.current.style.transition = reduced ? 'none' : 'transform .18s ease-out, opacity .18s ease-out';
    textBox.current.style.transform = 'none'; textBox.current.style.opacity = '1';
  };
  const moveReader = (direction, go) => {
    if (readerMotion.current.busy) return;
    readerMoved.current = true;
    readerEntry.current = direction;
    const box = textBox.current;
    if (reduced || !box) { go(); return; }
    readerMotion.current.busy = true;
    box.style.animation = 'none';
    box.style.transition = 'transform .16s ease-in, opacity .16s ease-in';
    box.style.transform = `translateY(${-direction * 100}%)`;
    box.style.opacity = '.25';
    readerMotion.current.timer = setTimeout(() => { readerMotion.current.busy = false; go(); }, 160);
  };
  const step = direction => {
    if (!reading || readerMotion.current.busy) return;
    if (direction > 0 ? !nextAvailable : !prevAvailable) { resetReaderDrag(); return; }
    const next = currentIndex + direction;
    moveReader(direction, () => {
      if (next >= 0 && next < scenes.length) setReaderIndex(next);
      else (direction > 0 ? onNext : onPrev)?.();
    });
  };
  useImperativeHandle(ref, () => ({ next: () => step(1), previous: () => step(-1), changeReading: () => changeReading() }));
  useEffect(() => { onNavigationChange?.({ next: nextAvailable, previous: prevAvailable }); }, [nextAvailable, prevAvailable, onNavigationChange]);
  useEffect(() => {
    if (reading && scene) onReadUpdate?.(scene.stories);
  // Callback changes during playback must not count repeated reads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading, currentIndex, text]);
  useLayoutEffect(() => {
    const el = textBox.current;
    if (!el || !reading) return undefined;
    const measure = () => setOverflow(el.scrollHeight > el.clientHeight + 2);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [reading, scene]);
  useEffect(() => {
    const box = transcript.current, current = box?.querySelector('[data-current="true"]');
    if (!box || !current) return;
    const top = current.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + current.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTo?.({ top: Math.max(0, top - 16), behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [audioIndex, animations, reduced]);
  if (!position || !scene) return null;
  const sources = scene.stories.length ? scene.stories : allSources;
  const outlets = [...new Set(scene.stories.flatMap(story => (story.sources || []).map(source => source.outlet || source.name)).filter(Boolean))];
  const sourceLabel = outlets.length ? outlets.slice(0, 2).join(' · ') + (outlets.length > 2 ? ` +${outlets.length - 2}` : '') : 'Stories & sources';
  const actions = scene.stories.map(story => getStoryAction?.(story.headline)).filter(Boolean);
  const action = actions[0];
  const read = actions.length === scene.stories.length && actions.length > 0 && actions.every(a => typeof a.read === 'boolean') ? actions.every(a => a.read) : undefined;
  const openSources = () => onOpenSources?.({ title: 'Original reporting', label: CATEGORY_SHORT[category] || category,
    items: sources.map((story, index) => ({ ...story, summary: index === 0 && scene.stories.length ? scene.text : undefined })) });
  const openText = () => onOpenSources?.({ title: 'Complete update', label: CATEGORY_SHORT[category] || category,
    items: [{ headline: scene.stories[0]?.headline || `${CATEGORY_SHORT[category] || category} brief`, summary: scene.text, sources: scene.stories.flatMap(story => story.sources || []) }] });
  const changeReading = () => {
    clearTimeout(readerMotion.current.timer); readerMotion.current.busy = false;
    if (reading) onChangeReading?.(false, readerMoved.current ? Math.min(99.99, scene.start * 100 + 0.01) : undefined);
    else { setReaderIndex(audioIndex); readerMoved.current = false; onChangeReading?.(true); }
  };
  const begin = e => {
    if (!reading || readerMotion.current.busy || e.button > 0 || e.isPrimary === false || e.target.closest('button,a')) return;
    touch.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const followReader = e => {
    if (!touch.current || readerMotion.current.busy || reduced || !textBox.current) return;
    const dx = e.clientX - touch.current.x, dy = e.clientY - touch.current.y;
    if (Math.abs(dy) < 8 || Math.abs(dy) <= Math.abs(dx) * 1.2) return;
    const blocked = dy < 0 ? !nextAvailable : !prevAvailable;
    const box = textBox.current;
    box.style.animation = 'none'; box.style.transition = 'none';
    box.style.transform = `translateY(${dy * (blocked ? .15 : .65)}px)`;
    box.style.opacity = String(Math.max(.5, 1 - Math.abs(dy) / 700));
  };
  const finish = e => {
    if (!touch.current) return;
    const { x, y } = touch.current; touch.current = null;
    const dy = e.clientY - y;
    if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(e.clientX - x) * 1.2) step(dy < 0 ? 1 : -1);
    else resetReaderDrag();
  };
  const progressRail = ((externalCount || scenes.length) > 1 && <div className="rn-brief-dots" aria-label="Updates in this brief">
        {Array.from({ length: externalCount || scenes.length }, (_, i) => <button key={i} className="rn-btn" aria-label={`Update ${i + 1} of ${externalCount || scenes.length}`} aria-current={i === (externalCount ? externalIndex : currentIndex) ? 'true' : undefined}
          onClick={() => { const from = externalCount ? externalIndex : currentIndex; if (i !== from) moveReader(i > from ? 1 : -1, () => { if (externalCount) onExternalSelect?.(i); else setReaderIndex(i); }); }}><span /></button>)}
      </div>);
  const animatedBody = <>
      <h1 className="rn-animated-recap-title" dir="auto">{scene.illustration.title || scene.displayHeadline}</h1>
      {hasIllustration && <div className="rn-animated-recap-stage" data-scene={visual.plan ? 'generated' : visual.native.type}>
        {visual.plan ? <GeneratedStoryAnimation plan={visual.plan} text={scene.text} phase={position.phase} motion={!reduced} />
          : visual.native.type === 'remotion' ? <RemoteRemotion artifact={visual.native} phase={position.phase} reduced={reduced} visible={visible} onUnavailable={frameUnavailable} />
          : visual.native.type === 'staged' ? <StagedAnimation illustration={visual.native} phase={position.phase} reduced={reduced} />
          : visual.native.type === 'story-led' ? <StoryLedAnimation illustration={visual.native} phase={position.phase} reduced={reduced} />
          : <RecapIllustration illustration={visual.native} phase={position.phase} animate={!reduced} />}
      </div>}
      <div key={position.caption} className="rn-animated-recap-caption" dir="auto"><p>{position.caption}</p></div>
    </>;
  return <div className="rn-animated-recap" data-animation={moving ? 'on' : 'off'} data-reading={reading} data-presentation={compact ? 'text' : 'standard'} data-story-led={animations && !reading && ['story-led','staged','remotion'].includes(visual.native?.type)}>
    {!editorial && <div className="rn-animated-recap-top"><div className="rn-animated-recap-topic"><span className="rn-animated-recap-category">{CATEGORY_SHORT[category] || category}</span><StatusBadge read={read} isNew={actions.some(a => a.isNew)} compact={editorial} /></div>
      <div className="rn-brief-actions">
        {onChangeReading && <button className="rn-btn rn-brief-mode" type="button" onClick={changeReading}>
          {reading ? 'Listen' : 'Read'}
        </button>}
      </div>
    </div>}
    {reading ? <div className="rn-brief-reader" tabIndex={0} role="region" aria-label="Swipeable news text"
      onPointerDown={begin} onPointerMove={followReader} onPointerUp={finish} onPointerCancel={() => { touch.current = null; if (!readerMotion.current.busy) resetReaderDrag(); }}
      onWheel={e => { if (Math.abs(e.deltaY) < 25 || performance.now() - wheelAt.current < 650) return; wheelAt.current = performance.now(); step(e.deltaY > 0 ? 1 : -1); }}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (['ArrowDown','ArrowUp','PageDown','PageUp'].includes(e.key)) { e.preventDefault(); step(['ArrowDown','PageDown'].includes(e.key) ? 1 : -1); } }}>
      <div className="rn-brief-reader-copy" ref={textBox} key={currentIndex} style={{ animation: reduced || !readerEntry.current ? 'none' : `${readerEntry.current > 0 ? 'rn-reader-enter-next' : 'rn-reader-enter-prev'} .3s cubic-bezier(.22,1,.36,1) both` }}>
        <h1 dir="auto">{scene.displayHeadline}</h1><p dir="auto">{scene.text}</p>
      </div>
      {overflow && <button className="rn-btn rn-brief-more" onClick={openText} aria-label="Read this complete update">more</button>}
      {!editorial && progressRail}
    </div> : animations ? (editorial ? <div className="rn-editorial-story-scroll">{animatedBody}</div> : animatedBody) : <div className="rn-brief-transcript" ref={transcript} tabIndex={0} role="region" aria-label="Brief transcript">
      <h1>{title || `Today in ${CATEGORY_SHORT[category] || category}`}</h1>
      {dateLabel && <p className="rn-brief-date">{dateLabel}</p>}
      {scenes.map(s => <p key={s.index} data-current={s.index === audioIndex} dir="auto">{s.text}</p>)}
    </div>}
    {editorial && reading && progressRail}
    <footer className="rn-animated-recap-footer">
      {sources.length > 0 && <button type="button" className="rn-btn rn-animated-recap-source" onClick={openSources} aria-haspopup="dialog" aria-label={`Original reporting: ${outlets.join(', ') || 'all stories and sources'}`}><span>{sourceLabel}</span><ChevronUp size={14} /></button>}
      {editorial && <StatusBadge read={read} isNew={actions.some(a => a.isNew)} compact />}
      {action && <button type="button" className="rn-btn rn-animated-recap-interest" aria-label="Mark this update interesting" aria-pressed={action.interesting} onClick={action.toggle}><Star size={19} fill={action.interesting ? 'currentColor' : 'none'} /></button>}
    </footer>
  </div>;
});
export default AnimatedRecap;
