import { useRef } from 'react';

// Keep an existing illustration stable throughout playback and pause. A verified
// daily scene may fill an empty presentation when its lookup finishes after Play.
export default function useIllustrationSelection(key, candidate, active, reading) {
  const current = useRef(null);
  let state = current.current;
  if (!state || state.key !== key) {
    state = { key, selected: candidate, frozen: false, hasPlayed: false, active: false, reading };
    current.current = state;
  }
  const returning = state.reading && !reading;
  const restarting = active && !state.active && state.hasPlayed;
  const firstDailyScene = !reading && !state.selected?.native && !state.selected?.plan && ['remotion','illustration'].includes(candidate?.native?.type);
  const firstIllustration = !reading && candidate?.native?.type === 'illustration' && state.selected?.native?.type !== 'illustration';
  const firstStyledScene = !reading && candidate?.native?.policy === 'world-three-families-v2' && state.selected?.native?.policy !== 'world-three-families-v2';
  if (returning || restarting || firstStyledScene || firstIllustration || firstDailyScene || (!state.frozen && !reading)) state.selected = candidate;
  if (active && !reading) { state.frozen = true; state.hasPlayed = true; }
  state.active = active;
  state.reading = reading;
  return state.selected;
}
