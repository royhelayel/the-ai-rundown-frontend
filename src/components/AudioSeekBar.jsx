import { HOME_TYPE } from './homeTypography';
import { useState } from 'react';
import './audioSeekBar.css';

export default function AudioSeekBar({ progress = 0, duration = 0, disabled, onSeek }) {
  const [draft, setDraft] = useState(null);
  const value = draft ?? progress;
  const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  return <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex' }}><input type="range" className="rn-audio-seek" aria-label="Audio progress"
    min="0" max="100" step="0.1" value={value} disabled={disabled}
    aria-valuetext={`${time(duration * value / 100)} of ${time(duration)}`}
    style={{ '--seek-progress': `${value}%` }}
    onPointerDown={e => { if (disabled) return; e.stopPropagation(); e.currentTarget.setPointerCapture?.(e.pointerId); setDraft(Number(e.currentTarget.value)); }}
    onChange={e => { if (disabled) return; const next = Number(e.currentTarget.value); if (draft !== null) setDraft(next); else onSeek?.(next); }}
    onPointerUp={e => { if (draft === null) return; e.stopPropagation(); onSeek?.(Number(e.currentTarget.value)); setDraft(null); }}
    onPointerCancel={() => setDraft(null)}
    onLostPointerCapture={() => setDraft(null)} />
    {draft !== null && <span aria-hidden="true" style={{ position: 'absolute', bottom: 36, left: `clamp(20px, ${value}%, calc(100% - 20px))`, transform: 'translateX(-50%)', pointerEvents: 'none', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 6, padding: '4px 6px', fontSize: HOME_TYPE.meta, fontVariantNumeric: 'tabular-nums' }}>{time(duration * value / 100)}</span>}
  </div>;
}
