import { useEffect } from 'react';

// Keep the visible player awake only during active playback. The browser may deny or
// revoke this request (for example in low power mode); narration must still work.
export default function usePlaybackWakeLock(playing) {
  useEffect(() => {
    if (!playing || !navigator.wakeLock?.request) return;
    let disposed = false;
    let lock = null;
    let pending = false;
    const release = () => {
      const held = lock;
      lock = null;
      if (held && !held.released) Promise.resolve(held.release()).catch(() => {});
    };
    const acquire = async () => {
      if (disposed || pending || document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      pending = true;
      try {
        const granted = await navigator.wakeLock.request('screen');
        if (disposed || document.visibilityState !== 'visible') {
          await granted.release();
          return;
        }
        lock = granted;
        granted.addEventListener('release', () => { if (lock === granted) lock = null; }, { once: true });
      } catch { /* Unsupported or system-denied: leave playback unaffected. */ }
      finally { pending = false; }
    };
    const visibility = () => { if (document.visibilityState === 'visible') acquire(); else release(); };
    acquire();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', acquire);
      release();
    };
  }, [playing]);
}
