import { useRef } from 'react';

// Lock the presentation once playback starts, including loading and pause. A late
// lookup may be cached for the next visit/session, but cannot rearrange this one.
export default function useIllustrationSelection(key, candidate, active, reading) {
  const current = useRef(null);
  let state = current.current;
  if (!state || state.key !== key) {
    state = { key, selected: candidate, frozen: false, hasPlayed: false, active: false, reading };
    current.current = state;
  }
  const returning = state.reading && !reading;
  const restarting = active && !state.active && state.hasPlayed;
  if (returning || restarting || (!state.frozen && !reading)) state.selected = candidate;
  if (active && !reading) { state.frozen = true; state.hasPlayed = true; }
  state.active = active;
  state.reading = reading;
  return state.selected;
}
