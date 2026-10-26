import { useEffect, useRef } from 'react';
export default function useProgrammeMediaSession({ active, paused, title, edition, duration, progress, speed, onPlay, onPause, onNext, onPrev, onStop, onSeek }) {
  const latest = useRef(null);
  latest.current = { onPlay, onPause, onNext, onPrev, onStop, onSeek, duration, progress };
  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media?.setActionHandler) return;
    const handlers = { play: () => latest.current.onPlay(), pause: () => latest.current.onPause(), nexttrack: () => latest.current.onNext(), previoustrack: () => latest.current.onPrev(), stop: () => latest.current.onStop(),
      seekto: e => { if (latest.current.duration > 0) latest.current.onSeek(e.seekTime / latest.current.duration * 100); },
      seekforward: e => { const v=latest.current; if(v.duration>0)v.onSeek(v.progress + (e.seekOffset || 10)/v.duration*100); },
      seekbackward: e => { const v=latest.current; if(v.duration>0)v.onSeek(v.progress - (e.seekOffset || 10)/v.duration*100); } };
    Object.entries(handlers).forEach(([action, fn]) => { try { media.setActionHandler(action, fn); } catch {} });
    return () => Object.keys(handlers).forEach(action => { try { media.setActionHandler(action, null); } catch {} });
  }, []);
  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media) return;
    try {
      if (typeof window.MediaMetadata === 'function') media.metadata = new window.MediaMetadata({ title, artist: 'RadioNews', album: edition });
      media.playbackState = active ? paused ? 'paused' : 'playing' : 'none';
      if (active && Number.isFinite(duration) && duration > 0) media.setPositionState?.({ duration, position: Math.max(0, Math.min(duration, duration * progress / 100)), playbackRate: speed });
      else media.setPositionState?.();
    } catch { /* Browser support varies by action and platform. */ }
  }, [active, paused, title, edition, duration, progress, speed]);
}
