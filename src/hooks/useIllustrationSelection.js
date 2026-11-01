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
  const firstDailyScene = !reading && !state.selected?.native && !state.selected?.plan && candidate?.native?.type === 'remotion';
  if (returning || restarting || firstDailyScene || (!state.frozen && !reading)) state.selected = candidate;
  if (active && !reading) { state.frozen = true; state.hasPlayed = true; }
  state.active = active;
  state.reading = reading;
  return state.selected;
}
