import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * BackToTop — a docked "return to the top" button for the scrolling feeds.
 *
 * It appears on an upward scroll rather than simply "once you're far down". Scrolling up is
 * the gesture that means you're looking for something you passed, or heading back — offering
 * the shortcut exactly then keeps it out of the way while you're reading forward, which is
 * most of the time. It hides again as soon as you resume scrolling down.
 *
 * Deliberately quiet: translucent and blurred, so it reads as an affordance floating over the
 * feed rather than a fourth thing competing with the dock beneath it.
 */
export default function BackToTop({ bottom = 76 }) {
  const [show, setShow] = useState(false);
  const lastY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);

  useEffect(() => {
    // Below this there's nothing worth a shortcut — the top is already a flick away, and a
    // button appearing on every small upward nudge near the top is pure noise.
    const MIN_Y = 600;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      lastY.current = y;
      // Ignore sub-pixel jitter and rubber-banding past the top.
      if (Math.abs(dy) < 4 || y < 0) return;
      setShow(dy < 0 && y > MIN_Y);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
      aria-hidden={!show}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)`,
        zIndex: 40,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px 7px 11px', borderRadius: 999,
        border: '1px solid rgba(0,0,0,0.08)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 6px 20px rgba(10,10,30,0.14)',
        color: '#0a0a0f', fontSize: '0.72rem', fontWeight: 700,
        cursor: 'pointer',
        // Kept mounted and faded, so it can animate both ways instead of popping in.
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
        transform: `translateX(-50%) translateY(${show ? '0' : '8px'})`,
        transition: 'opacity 0.18s ease, transform 0.18s ease',
      }}
    >
      <ArrowUp size={14} />
      Top
    </button>
  );
}
