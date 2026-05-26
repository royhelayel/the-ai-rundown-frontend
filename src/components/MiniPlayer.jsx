import React from 'react';
import { Play, Pause, X, ChevronUp, Loader } from 'lucide-react';
import { colors, CATEGORY_COLORS } from '../theme';

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
}) {
  const color = CATEGORY_COLORS[category] || colors.accent;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, padding: '0 0.75rem', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div
        onClick={onExpand}
        style={{ background: colors.bgCardHigh, borderRadius: '16px', border: `1px solid ${colors.borderLight}`, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 -4px 32px rgba(0,0,0,0.5)', marginBottom: '0.5rem' }}>
        {/* Progress bar flush to top */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', width: `${narrationProgress || 0}%`, background: color, transition: 'width 0.1s linear' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0.75rem', gap: '0.75rem' }}>
          {/* Category dot */}
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>{category}</p>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '600', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {storyHeadline || 'Loading…'}
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={isLoading ? undefined : (isPaused ? onResume : (isNarrating ? onPause : onPlay))}
              style={{ width: '38px', height: '38px', borderRadius: '50%', background: color, border: 'none', color: 'white', cursor: isLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isLoading
                ? <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : (isNarrating && !isPaused ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" style={{ marginLeft: '1px' }} />)
              }
            </button>
            <button onClick={onClose}
              style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: colors.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
