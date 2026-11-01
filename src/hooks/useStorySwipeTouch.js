import { useEffect, useRef } from 'react';

const controls = 'button,a,input,textarea,select,[role="slider"],.rn-hscroll,[data-hscroll]';

// Find a nested text scroller that can consume this part of a vertical drag.
export function canScrollVertically(target, boundary, fingerDelta) {
  for (let node = target?.nodeType === 1 ? target : target?.parentElement; node && boundary.contains(node); node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (/(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight + 1) {
      if (fingerDelta > 0 && node.scrollTop > 0) return true;
      if (fingerDelta < 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true;
    }
    if (node === boundary) break;
  }
  return false;
}

/** Native, non-passive touchmove must claim a horizontal drag before Safari starts scrolling. */
export default function useStorySwipeTouch(card, enabled, identity, callbacks) {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  useEffect(() => {
    const el = card.current;
    if (!enabled || !el) return undefined;
    const scrollBoundary = el.closest('.rn-editorial-body') || el;
    let gesture = null;
    const cancel = () => { gesture = null; latest.current.cancel(); };
    const start = e => {
      if (e.touches.length !== 1) { cancel(); return; }
      if (e.target.closest?.(controls)) { gesture = null; return; }
      const point = e.touches[0];
      gesture = { x:point.clientX, y:point.clientY, lastY:point.clientY, axis:null };
      latest.current.start(e);
    };
    const move = e => {
      if (!gesture) return;
      if (e.touches.length !== 1) { cancel(); return; }
      const point = e.touches[0], dx = point.clientX - gesture.x, dy = point.clientY - gesture.y;
      const stepY = point.clientY - gesture.lastY;
      gesture.lastY = point.clientY;
      if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
        if (Math.abs(dx) > Math.abs(dy) * 1.1) gesture.axis = 'horizontal';
        else if (Math.abs(dy) > Math.abs(dx) * 1.1) gesture.axis = 'vertical';
      }
      if (gesture.axis === 'horizontal') {
        if (e.cancelable) e.preventDefault();
        latest.current.move(e);
      } else if (stepY && !canScrollVertically(e.target, scrollBoundary, stepY)) {
        // A text scroller at its edge must not hand its drag to browser refresh.
        if (e.cancelable) e.preventDefault();
      }
    };
    const end = e => { if (!gesture) return; gesture = null; latest.current.end(e); };
    el.addEventListener('touchstart', start, { passive:true });
    el.addEventListener('touchmove', move, { passive:false });
    el.addEventListener('touchend', end, { passive:true });
    el.addEventListener('touchcancel', cancel, { passive:true });
    return () => {
      el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', cancel);
      gesture = null;
    };
  }, [card, enabled, identity]);
}
