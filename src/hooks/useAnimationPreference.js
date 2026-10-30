import { useEffect, useState } from 'react';

export const ANIMATION_KEY = 'radionews_recap_animation';
const CHANGE = 'radionews-animation-change';
export function readAnimationPreference() {
  try {
    const value = localStorage.getItem(ANIMATION_KEY);
    if (value === 'on' || value === 'off') return value === 'on';
  } catch {}
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
}
export function setAnimationPreference(enabled) {
  try { localStorage.setItem(ANIMATION_KEY, enabled ? 'on' : 'off'); } catch {}
  window.dispatchEvent(new Event(CHANGE));
}
export default function useAnimationPreference() {
  const [enabled, setEnabled] = useState(readAnimationPreference);
  useEffect(() => {
    const update = () => setEnabled(readAnimationPreference());
    window.addEventListener(CHANGE, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(CHANGE, update); window.removeEventListener('storage', update); };
  }, []);
  return [enabled, setAnimationPreference];
}
