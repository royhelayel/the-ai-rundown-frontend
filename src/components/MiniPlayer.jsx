import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, X, Loader } from 'lucide-react';
import { colors, CATEGORY_COLORS } from '../theme';

// 10px matches the platform's own touch slop. At 6px a normal thumb tap that drifted
// slightly was classified as a drag, and the tap-to-reopen was silently swallowed.
const DRAG_THRESHOLD = 10;

export default function MiniPlayer({
  category,
  storyHeadline,
  isNarrating,
  isPaused,
  isLoading,
  narrationProgress,
  onPlay,
  onPause,
  onResume,
  onExpand,
  onClose,
  bottomOffset = 0,
  topOffset = 0,
  dockPosition = 'bottom',   // 'bottom' | 'top'
  onDockChange,
}) {
  const color = CATEGORY_COLORS[category] || colors.accent;

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [dragging, setDragging]   = useState(false);
  const [dragTop,  setDragTop]    = useState(0);   // absolute top px while dragging
  const pointerStart = useRef(null); // { pointerId, startY, playerTop, moved }
  const isDragRef    = useRef(false); // survives past pointerUp so onClick can check
  const barRef       = useRef(null);

  // Clean up on unmount
  useEffect(() => () => { pointerStart.current = null; }, []);

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('[data-nodrag]')) return;
    // Do NOT preventDefault here — it suppresses the click event on touch devices,
    // breaking the tap-to-expand behaviour. touchAction:'none' + userSelect:'none'
    // on the wrapper already prevent scroll interference and text selection.
    isDragRef.current = false;
    const rect = barRef.current?.getBoundingClientRect() ?? { top: 0 };
    pointerStart.current = {
      pointerId: e.pointerId,
      startY:    e.clientY,
      playerTop: rect.top,
      moved:     false,
    };
    barRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    const ps = pointerStart.current;
    if (!ps || ps.pointerId !== e.pointerId) return;
    const dy = e.clientY - ps.startY;
    if (!ps.moved && Math.abs(dy) > DRAG_THRESHOLD) {
      ps.moved     = true;
      isDragRef.current = true;
      setDragging(true);
      setDragTop(ps.playerTop);
    }
    if (ps.moved) {
      setDragTop(ps.playerTop + dy);
    }
  }, []);

  const onPointerUp = useCallback((e) => {
    const ps = pointerStart.current;
    if (!ps || ps.pointerId !== e.pointerId) return;
    barRef.current?.releasePointerCapture(e.pointerId);

    if (ps.moved) {
      // Small directional flick is enough — no need to drag across the whole screen.
      // If dragged ≥ DOCK_THRESHOLD px toward the opposite edge, flip dock; else snap back.
      const DOCK_THRESHOLD = 72;
      const dy = e.clientY - ps.startY;
      let newDock = dockPosition;
      if (dockPosition === 'bottom' && dy < -DOCK_THRESHOLD) newDock = 'top';
      if (dockPosition === 'top'    && dy >  DOCK_THRESHOLD) newDock = 'bottom';
      onDockChange?.(newDock);
      setDragging(false);
    } else {
      // Not a drag → this was a tap. Expand from pointerup rather than waiting for a
      // synthetic click: the bar uses setPointerCapture, which can stop the click event
      // being delivered at all, so tap-to-reopen was unreliable.
      isDragRef.current = false;
      onExpand?.();
    }
    pointerStart.current = null;
  }, [dockPosition, onDockChange, onExpand]);

  // Reset isDragRef after a tick so the next tap starts clean
  // Pointerup already handles the tap; this only catches environments that deliver a
  // click without pointer events. isDragRef guards against expanding after a drag.
  const handleClick = useCallback(() => {
    if (isDragRef.current) { isDragRef.current = false; return; }
  }, []);

  // ── Position style ──────────────────────────────────────────────────────────
  const transition = 'top 0.32s cubic-bezier(0.34,1.2,0.64,1), bottom 0.32s cubic-bezier(0.34,1.2,0.64,1)';

  const posStyle = dragging
    ? { top: dragTop, bottom: 'auto', transition: 'none' }
    : dockPosition === 'top'
      ? { top: topOffset,       bottom: 'auto', transition }
      : { bottom: bottomOffset, top: 'auto',    transition };

  // When docked to top, flip padding so the card sits flush at top with breathing room below
  const padding = (dockPosition === 'top' && !dragging) ? '0.5rem 0.75rem 0' : '0 0.75rem 0.5rem';

  // Progress bar at bottom of card when top-docked (points inward toward content)
  const progressAtBottom = dockPosition === 'top' && !dragging;

  return (
    <div
      ref={barRef}
      className="mini-player-bar"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'fixed',
        left: 0, right: 0,
        zIndex: 200,
        padding,
        touchAction: 'none',
        userSelect: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        ...posStyle,
      }}
    >
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto' }}>
        <div
          onClick={handleClick}
          style={{
            background: colors.bgCardHigh,
            borderRadius: '16px',
            border: `1px solid ${colors.borderLight}`,
            overflow: 'hidden',
            boxShadow: dragging
              ? '0 12px 56px rgba(0,0,0,0.75)'
              : '0 -4px 32px rgba(0,0,0,0.5)',
            transform: dragging ? 'scale(1.025)' : 'scale(1)',
            transition: dragging ? 'none' : 'box-shadow 0.2s, transform 0.2s',
          }}
        >
          {/* Progress bar — at top when bottom-docked, at bottom when top-docked */}
          {!progressAtBottom && (
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, transition: 'width 0.1s linear' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0.75rem', gap: '0.75rem' }}>

            {/* Drag handle (3×2 dot grid) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0, opacity: 0.3, padding: '2px 1px', pointerEvents: 'none' }}>
              {[0, 1, 2].map(r => (
                <div key={r} style={{ display: 'flex', gap: '3px' }}>
                  {[0, 1].map(c => (
                    <div key={c} style={{ width: '3px', height: '3px', borderRadius: '50%', background: colors.text }} />
                  ))}
                </div>
              ))}
            </div>

            {/* Category colour dot */}
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>
                {category}
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '600', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {storyHeadline || 'Loading…'}
              </p>
            </div>

            {/* Controls — marked data-nodrag so pointer-down here never starts a drag */}
            <div
              data-nodrag
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                data-nodrag
                onClick={isLoading ? undefined : (isPaused ? onResume : (isNarrating ? onPause : onPlay))}
                style={{ width: '38px', height: '38px', borderRadius: '50%', background: color, border: 'none', color: 'white', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {isLoading
                  ? <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : (isNarrating && !isPaused
                      ? <Pause size={16} fill="white" />
                      : <Play  size={16} fill="white" style={{ marginLeft: '1px' }} />)
                }
              </button>
              <button
                data-nodrag
                onClick={onClose}
                style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Progress bar at bottom when top-docked */}
          {progressAtBottom && (
            <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, transition: 'width 0.1s linear' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
