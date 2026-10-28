import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Star, Video, VideoOff } from 'lucide-react';
import { buildRecapScenes, scenePosition } from '../lib/recapScenes';
import { CATEGORY_SHORT } from '../theme';
import RecapIllustration from './RecapIllustration';
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

export default function AnimatedRecap({ text, sourcesMap, allSources = [], category, progress = 0, charOffset = -1,
  playing = false, duration = 0, speed = 1, onOpenSources, getStoryAction }) {
  const [animations, setAnimations] = useState(preferredAnimation);
  const [reduced, setReduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(null);
  useEffect(() => {
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(!!motion?.matches);
    const visibility = () => setVisible(!document.hidden);
    motion?.addEventListener?.('change', changed); document.addEventListener('visibilitychange', visibility);
    return () => { motion?.removeEventListener?.('change', changed); document.removeEventListener('visibilitychange', visibility); clearTimeout(noticeTimer.current); };
  }, []);
  const moving = animations && !reduced && visible;
  const visualProgress = useVisualProgress(progress, duration, playing, speed, moving);
  const scenes = useMemo(() => buildRecapScenes(text, sourcesMap), [text, sourcesMap]);
  const position = scenePosition(scenes, visualProgress, charOffset);
  if (!position) return null;
  const { scene, phase, caption } = position;
  const sources = scene.stories.length ? scene.stories : allSources;
  const outlets = [...new Set(scene.stories.flatMap(story => (story.sources || []).map(source => source.outlet || source.name)).filter(Boolean))];
  const sourceLabel = outlets.length ? outlets.slice(0, 2).join(' · ') + (outlets.length > 2 ? ` +${outlets.length - 2}` : '') : 'Stories & sources';
  const action = scene.stories.map(story => getStoryAction?.(story.headline)).find(Boolean);
  const openSources = () => onOpenSources?.({ title: 'Original reporting', label: CATEGORY_SHORT[category] || category,
    items: sources.map((story, index) => ({ ...story, summary: index === 0 && scene.stories.length ? scene.text : undefined })) });
  const openText = () => onOpenSources?.({ title: 'Recap text', label: CATEGORY_SHORT[category] || category,
    items: [{ headline: scene.stories[0]?.headline || `${CATEGORY_SHORT[category] || category} recap`, summary: scene.text, sources: scene.stories.flatMap(story => story.sources || []) }] });
  const toggleAnimation = () => {
    const next = !animations;
    setAnimations(next); try { localStorage.setItem(PREFERENCE, next ? 'on' : 'off'); } catch {}
    setNotice(next ? 'Animation on' : 'Animation off. Audio continues.');
    clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 2400);
  };
  return <div className="rn-animated-recap" data-animation={moving ? 'on' : 'off'}>
    <div className="rn-animated-recap-top"><span>{CATEGORY_SHORT[category] || category}</span>
      <button className="rn-btn" type="button" onClick={toggleAnimation} aria-pressed={animations}
        aria-label={animations ? 'Turn animation off' : 'Turn animation on'}>
        {animations ? <Video size={14} /> : <VideoOff size={14} />}<span>Animation {animations ? 'on' : 'off'}</span>
      </button>
    </div>
    <h1 className="rn-animated-recap-title" dir="auto">{scene.headline}</h1>
    <div className="rn-animated-recap-stage" data-scene={scene.illustration.type}>
      <RecapIllustration illustration={scene.illustration} phase={phase} animate={moving} />
    </div>
    <div className="rn-animated-recap-caption" dir="auto"><p>{caption}</p><button type="button" className="rn-btn" onClick={openText} aria-label="Read this complete update">more</button></div>
    <footer className="rn-animated-recap-footer">
      {sources.length > 0 && <button type="button" className="rn-btn rn-animated-recap-source" onClick={openSources} aria-haspopup="dialog" aria-label={`Original reporting: ${outlets.join(', ') || 'all stories and sources'}`}><span>{sourceLabel}</span><ChevronUp size={14} /></button>}
      {action && <button type="button" className="rn-btn rn-animated-recap-interest" aria-label="Mark this update interesting" aria-pressed={action.interesting} onClick={action.toggle}><Star size={19} fill={action.interesting ? 'currentColor' : 'none'} /></button>}
    </footer>
    <span className="rn-animated-recap-notice" role="status">{notice}</span>
  </div>;
}
