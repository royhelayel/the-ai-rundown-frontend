import { useLayoutEffect, useRef } from 'react';

const ORDER = ['audio', 'swipe', 'scroll'];
export default function useModePageMotion(mode) {
  const previous = useRef(mode);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = mode;
    if (!from || !mode || from === mode || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const surface = document.querySelector(`[data-mode-surface="${mode}"]`);
    if (!surface?.animate) return;
    const direction = ORDER.indexOf(mode) > ORDER.indexOf(from) ? 1 : -1;
    // Individual translate preserves Swipe's existing centering transform.
    const animation = surface.animate([
      { translate: `${direction * 48}px 0`, opacity: 0.55 },
      { translate: '0 0', opacity: 1 },
    ], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    return () => animation.cancel();
  }, [mode]);
}
