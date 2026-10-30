import React, { useMemo } from 'react';
import { storySvg } from '../../lib/stagedMotionRenderer';
import './storyLed.css';
export default function StagedAnimation({illustration, phase, reduced=false}) {
  const p=reduced?1:Math.max(0,Math.min(1,Number(phase)||0));
  const svg=useMemo(()=>storySvg(illustration.plan,illustration.text,p)
    .replace(/#24301f/g,'var(--card-ink,#24301f)')
    .replace(/#7654b6/g,'var(--tp-chip,#7654b6)')
    .replace(/#b3a8c9/g,'var(--card-sub,#b3a8c9)')
    .replace(/#f0edf8/g,'var(--tp-card,#f0edf8)'),[illustration,p]);
  // Only bundled, validated artwork enters here; never remote SVG or user HTML.
  // Audio owns progress; this component has no player, timer or generation requests.
  return <div className="rn-staged-motion" data-phase={p} aria-hidden="true" dangerouslySetInnerHTML={{__html:svg}}/>;
}
