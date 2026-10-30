import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Star, Video, VideoOff, Headphones, Newspaper } from 'lucide-react';
import { buildRecapScenes, scenePosition, hasExplainerMotion } from '../lib/recapScenes';
import { CATEGORY_SHORT } from '../theme';
import GeneratedStoryAnimation, { safeGeneratedAnimation } from './GeneratedStoryAnimation';
import RecapIllustration from './RecapIllustration';
import useStoryAnimations from '../hooks/useStoryAnimations';
import './AnimatedRecap.css';

const PREFERENCE = 'radionews_recap_animation';
function preferredAnimation() {
  try { const saved = localStorage.getItem(PREFERENCE); if (saved === 'on' || saved === 'off') return saved === 'on'; } catch {}
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
}

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
  playing = false, duration = 0, speed = 1, onOpenSources, getStoryAction,
  reading = false, onChangeReading, onNext, onPrev, canNext = false, canPrev = false, onReadUpdate,
  title, dateLabel, onNavigationChange, externalCount = 0, externalIndex = 0, onExternalSelect }, ref) {
  const [animations, setAnimations] = useState(preferredAnimation);
  const [reduced, setReduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [notice, setNotice] = useState('');
  const [readerIndex, setReaderIndex] = useState(() => scenePosition(buildRecapScenes(text, sourcesMap), progress, charOffset)?.scene.index || 0);
  const [overflow, setOverflow] = useState(false);
  const readerMoved = useRef(false);
  const previousReading = useRef(reading);
  const touch = useRef(null), wheelAt = useRef(0), textBox = useRef(null), transcript = useRef(null);
  const noticeTimer = useRef(null);
  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(!!motion?.matches);
    const visibility = () => setVisible(!document.hidden);
    motion?.addEventListener?.('change', changed); document.addEventListener('visibilitychange', visibility);
    return () => { motion?.removeEventListener?.('change', changed); document.removeEventListener('visibilitychange', visibility); clearTimeout(noticeTimer.current); };
  }, []);
  const moving = animations && !reading && !reduced && visible;
  const visualProgress = useVisualProgress(progress, duration, playing, speed, moving);
  const scenes = useMemo(() => buildRecapScenes(text, sourcesMap), [text, sourcesMap]);
  const position = scenePosition(scenes, visualProgress, charOffset);
  const audioIndex = position?.scene.index || 0;
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
  const hasDrawing = !hasExplainerMotion(scene?.illustration) && !!drawing?.plan && safeGeneratedAnimation(drawing.plan,scene.text);
  const nextAvailable = currentIndex < scenes.length - 1 || canNext;
  const prevAvailable = currentIndex > 0 || canPrev;
  const step = direction => {
    if (!reading || (direction > 0 ? !nextAvailable : !prevAvailable)) return;
    readerMoved.current = true;
    const next = currentIndex + direction;
    if (next >= 0 && next < scenes.length) setReaderIndex(next);
    else (direction > 0 ? onNext : onPrev)?.();
  };
  useImperativeHandle(ref, () => ({ next: () => step(1), previous: () => step(-1) }));
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
  const action = scene.stories.map(story => getStoryAction?.(story.headline)).find(Boolean);
  const openSources = () => onOpenSources?.({ title: 'Original reporting', label: CATEGORY_SHORT[category] || category,
    items: sources.map((story, index) => ({ ...story, summary: index === 0 && scene.stories.length ? scene.text : undefined })) });
  const openText = () => onOpenSources?.({ title: 'Complete update', label: CATEGORY_SHORT[category] || category,
    items: [{ headline: scene.stories[0]?.headline || `${CATEGORY_SHORT[category] || category} brief`, summary: scene.text, sources: scene.stories.flatMap(story => story.sources || []) }] });
  const toggleAnimation = () => {
    const next = !animations;
    setAnimations(next); try { localStorage.setItem(PREFERENCE, next ? 'on' : 'off'); } catch {}
    setNotice(next ? 'Animation on' : 'Animation off. Audio continues.');
    clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 2400);
  };
  const changeReading = () => {
    if (reading) onChangeReading?.(false, readerMoved.current ? Math.min(99.99, scene.start * 100 + 0.01) : undefined);
    else { setReaderIndex(audioIndex); readerMoved.current = false; onChangeReading?.(true); }
  };
  const begin = e => {
    if (!reading || e.target.closest('button,a')) return;
    touch.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const finish = e => {
    if (!touch.current) return;
    const { x, y } = touch.current; touch.current = null;
    const dy = e.clientY - y;
    if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(e.clientX - x) * 1.2) step(dy < 0 ? 1 : -1);
  };
  return <div className="rn-animated-recap" data-animation={moving ? 'on' : 'off'} data-reading={reading}>
    <div className="rn-animated-recap-top"><span>{CATEGORY_SHORT[category] || category}</span>
      <div className="rn-brief-actions">
        {!reading && <button className="rn-btn" type="button" onClick={toggleAnimation} aria-pressed={animations}
          aria-label={animations ? 'Turn animation off' : 'Turn animation on'}>
          {animations ? <Video size={14} /> : <VideoOff size={14} />}<span>Animation {animations ? 'on' : 'off'}</span>
        </button>}
        {onChangeReading && <button className="rn-btn rn-brief-mode" type="button" onClick={changeReading}>
          {reading ? <Headphones size={15} /> : <Newspaper size={15} />}{reading ? 'Listen' : 'Read'}
        </button>}
      </div>
    </div>
    {reading ? <div className="rn-brief-reader" tabIndex={0} role="region" aria-label="Swipeable news text"
      onPointerDown={begin} onPointerUp={finish} onPointerCancel={() => { touch.current = null; }}
      onWheel={e => { if (Math.abs(e.deltaY) < 25 || performance.now() - wheelAt.current < 650) return; wheelAt.current = performance.now(); step(e.deltaY > 0 ? 1 : -1); }}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (['ArrowDown','ArrowUp','PageDown','PageUp'].includes(e.key)) { e.preventDefault(); step(['ArrowDown','PageDown'].includes(e.key) ? 1 : -1); } }}>
      <div className="rn-brief-reader-copy" ref={textBox} key={currentIndex}>
        <h1 dir="auto">{scene.displayHeadline}</h1><p dir="auto">{scene.text}</p>
      </div>
      {overflow && <button className="rn-btn rn-brief-more" onClick={openText} aria-label="Read this complete update">more</button>}
      {(externalCount || scenes.length) > 1 && <div className="rn-brief-dots" aria-label="Updates in this brief">
        {Array.from({ length: externalCount || scenes.length }, (_, i) => <button key={i} className="rn-btn" aria-label={`Update ${i + 1} of ${externalCount || scenes.length}`} aria-current={i === (externalCount ? externalIndex : currentIndex) ? 'true' : undefined}
          onClick={() => { readerMoved.current = true; if (externalCount) onExternalSelect?.(i); else setReaderIndex(i); }}><span /></button>)}
      </div>}
    </div> : animations ? <>
      <h1 className="rn-animated-recap-title" dir="auto">{scene.displayHeadline}</h1>
      <div className="rn-animated-recap-stage" data-scene={hasDrawing ? 'generated' : scene.illustration.type}>
        {hasDrawing ? <GeneratedStoryAnimation plan={drawing.plan} text={scene.text} phase={position.phase} motion={!reduced} />
          : <RecapIllustration illustration={scene.illustration} phase={position.phase} animate={!reduced} />}
      </div>
      <div className="rn-animated-recap-caption" dir="auto"><p>{position.caption}</p><button type="button" className="rn-btn" onClick={openText} aria-label="Read this complete update">more</button></div>
    </> : <div className="rn-brief-transcript" ref={transcript} tabIndex={0} role="region" aria-label="Brief transcript">
      <h1>{title || `Today in ${CATEGORY_SHORT[category] || category}`}</h1>
      {dateLabel && <p className="rn-brief-date">{dateLabel}</p>}
      {scenes.map(s => <p key={s.index} data-current={s.index === audioIndex} dir="auto">{s.text}</p>)}
    </div>}
    <footer className="rn-animated-recap-footer">
      {sources.length > 0 && <button type="button" className="rn-btn rn-animated-recap-source" onClick={openSources} aria-haspopup="dialog" aria-label={`Original reporting: ${outlets.join(', ') || 'all stories and sources'}`}><span>{sourceLabel}</span><ChevronUp size={14} /></button>}
      {action && <button type="button" className="rn-btn rn-animated-recap-interest" aria-label="Mark this update interesting" aria-pressed={action.interesting} onClick={action.toggle}><Star size={19} fill={action.interesting ? 'currentColor' : 'none'} /></button>}
    </footer>
    <span className="rn-animated-recap-notice" role="status">{notice}</span>
  </div>;
});
export default AnimatedRecap;
