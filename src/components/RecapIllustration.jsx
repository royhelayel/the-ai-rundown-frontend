import React from 'react';
import { FileText, Server, Smartphone, Tablet, ShieldCheck } from 'lucide-react';

const between = (n, a, b) => Math.max(0, Math.min(1, (n - a) / Math.max(.02, b - a)));

function ReportedFigure({ literal }) {
  const qualified = literal.match(/^((?:about|roughly|nearly|over|under|at least|up to|more than|less than|approximately))\s+(.+)$/i);
  return <strong className="rn-recap-figure">{qualified ? <><small>{qualified[1]}</small><span>{qualified[2]}</span></> : literal}</strong>;
}

export default function RecapIllustration({ illustration: art, phase, animate }) {
  const p = animate ? phase : 1;

  if (art.type === 'workforce') {
    const cue=Math.min(.7,art.cue), reveal = between(p, cue, Math.min(1, cue + .25));
    const count = art.percent * reveal;
    const employees = art.figures.find(f => !/percent|%/i.test(f.literal) && /employees|workers/i.test(f.context || ''));
    return <div className="rn-recap-people" aria-hidden="true">
      <div className="rn-recap-workforce-view">
        <div className="rn-recap-workforce">{Array.from({ length: 100 }, (_, i) => {
          const arrival=between(p,.015*Math.floor(i/10),.16+.015*Math.floor(i/10));
          const highlight=Math.max(0,Math.min(1,count-i));
          const pop=1+Math.sin(highlight*Math.PI)*.2;
          return <span key={i} className={highlight>0?'is-highlighted':''} style={{opacity:.25+.75*arrival,
            transform:`translateY(${(1-arrival)*9}px) scale(${(.78+.22*arrival)*pop})`,
            color:`color-mix(in srgb,var(--tp-chip) ${highlight*100}%,var(--card-sub))`}} />;
        })}</div>
        <span className="rn-recap-grid-note">100 symbols = whole workforce</span>
      </div>
      <div className="rn-recap-workforce-values">
        {employees && <div className="rn-recap-employee-count"><ReportedFigure literal={employees.literal} /><span>{art.employeeUnit}</span></div>}
        <span className="rn-recap-percent" style={{ opacity:.2+.8*reveal,transform:`translateY(${(1-reveal)*12}px)` }}><strong>{art.percentLiteral.replace(/percent/i, '%')}</strong><small>of its workforce</small></span>
      </div>
    </div>;
  }
  if (art.type === 'video') {
    const wide = between(p, Math.max(0, art.cue - .08), Math.min(1, art.cue + .16));
    const number = p > art.durationCue;
    return <div className="rn-recap-tv-stage" aria-hidden="true">
      <div className="rn-recap-tv" style={{ width: `${30 + 65 * wide}%`, height: `${95 - 20 * wide}%` }}>
        {number && art.duration ? <strong>{art.duration}</strong> : <span className="rn-recap-video-triangle" />}
        <div className="rn-recap-video-line" style={{ opacity: wide }}><span style={{ width: `${between(p, art.cue, 1) * 100}%` }} /></div>
        <span className="rn-recap-tv-foot" style={{ opacity: between(wide, .8, 1) }} />
      </div>
    </div>;
  }
  if (art.type === 'sandbox') {
    const travel = between(p, .25, Math.max(.3, art.cue));
    const blocked = p >= art.cue;
    return <div className="rn-recap-sandbox" aria-hidden="true">
      <div className="rn-recap-sandbox-boundary" />
      <span className="rn-recap-sandbox-label">Security sandbox</span>
      <div className="rn-recap-model">{art.model || <ShieldCheck size={30} />}</div>
      <div className="rn-recap-transfer-line" />
      <div className="rn-recap-packet" style={{ left: `${28 + 29 * travel - (blocked ? 4 : 0)}%` }}><FileText size={22} /></div>
      <div className="rn-recap-server"><Server size={42} /><span>External server</span></div>
      <span className="rn-recap-gate" style={{ opacity: blocked ? 1 : 0 }} />
      <span className="rn-recap-blocked" style={{ opacity: blocked ? 1 : 0 }}>Blocked</span>
    </div>;
  }
  if (art.type === 'fungi') {
    const reveal = between(p, Math.max(0, art.cue - .1), Math.min(1, art.cue + .25));
    return <div className="rn-recap-fungi" aria-hidden="true">
      <div className="rn-recap-fungi-drawing">{[0, 1, 2].map(i => <span key={i} className="rn-recap-mushroom"
        style={{ transform: `translateY(${animate ? (1 - reveal) * (10 + i * 3) : 0}px) scale(${i === 1 ? 1 : .72})`, opacity: .45 + reveal * .55 }}><i /><b /></span>)}</div>
      <strong className="rn-recap-fungi-label">{art.literal}</strong>
      <p className="rn-recap-fact-context" dir="auto">{art.context}</p>
    </div>;
  }
  if (art.type === 'device') {
    const Icon = art.tablet ? Tablet : Smartphone;
    const replacement=art.replacement?between(p,.5,.88):0;
    return <div className="rn-recap-device" aria-hidden="true">
      <div className="rn-recap-device-drawing" style={{opacity:1-replacement,transform: `translateX(${-70*replacement}px) rotate(${animate ? -4 + 4 * between(p, 0, .45) : 0}deg)` }}>
        <Icon size={150} strokeWidth={1.2} />
        {art.crack && <span className="rn-recap-crack" style={{ transform: `scaleY(${between(p, .2, .55)})`, transformOrigin: 'top' }} />}
      </div>
      {art.replacement && <div className="rn-recap-device-replacement" style={{opacity:replacement,transform:`translateX(${70*(1-replacement)}px)`}}><Icon size={150} strokeWidth={1.2}/><span>{art.replacementLabel}</span></div>}
    </div>;
  }
  if (art.type === 'figures') {
    const at = animate ? art.figures.reduce((last, value, index) => value.cue <= p ? index : last, 0) : 0;
    const figure = art.figures[at];
    return <div className="rn-recap-figure-stage" aria-hidden="true" key={at}>
      <ReportedFigure literal={figure.literal} />
      <p className="rn-recap-fact-context" dir="auto">{figure.context}</p>
    </div>;
  }
  // Unstructured stories get the actual reported sentence, with a quiet transition
  // as narration advances. A decorative newspaper or an unlabelled number adds no meaning.
  const at = animate ? (art.facts || []).reduce((last, fact, index) => fact.cue <= p ? index : last, 0) : 0;
  const fact = art.facts?.[at];
  return <div className="rn-recap-editorial rn-recap-text-fact" aria-hidden="true" key={at}>
    <p dir="auto">{fact?.literal}</p>
  </div>;
}
