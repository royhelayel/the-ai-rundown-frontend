import React from 'react';
import { FileText, Server, Smartphone, Tablet, Newspaper, ShieldCheck } from 'lucide-react';

const between = (n, a, b) => Math.max(0, Math.min(1, (n - a) / Math.max(.02, b - a)));

function ReportedFigure({ literal }) {
  const qualified = literal.match(/^((?:about|roughly|nearly|over|under|at least|up to|more than|less than|approximately))\s+(.+)$/i);
  return <strong className="rn-recap-figure">{qualified ? <><small>{qualified[1]}</small><span>{qualified[2]}</span></> : literal}</strong>;
}

export default function RecapIllustration({ illustration: art, phase, animate }) {
  const p = animate ? phase : 1;
  const figure = art.figures[0];
  if (art.type === 'workforce') {
    const reveal = between(p, art.cue, Math.min(1, art.cue + .22));
    const count = Math.floor(art.percent * reveal);
    const employees = art.figures.find(f => !/percent|%/i.test(f.literal));
    return <div className="rn-recap-people" aria-hidden="true">
      <div className="rn-recap-workforce">{Array.from({ length: 100 }, (_, i) => <span key={i} className={i < count ? 'is-highlighted' : ''} />)}</div>
      <div className="rn-recap-workforce-values">
        {employees && <ReportedFigure literal={employees.literal} />}
        <span className="rn-recap-percent" style={{ opacity: reveal }}><strong>{art.percentLiteral.replace(/percent/i, '%')}</strong><small>of its workforce</small></span>
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
  if (art.type === 'device') {
    const Icon = art.tablet ? Tablet : Smartphone;
    return <div className="rn-recap-device" aria-hidden="true">
      <div className="rn-recap-device-drawing" style={{ transform: `rotate(${animate ? -4 + 4 * between(p, 0, .45) : 0}deg)` }}>
        <Icon size={150} strokeWidth={1.2} />
        {art.crack && <span className="rn-recap-crack" style={{ transform: `scaleY(${between(p, .2, .55)})`, transformOrigin: 'top' }} />}
      </div>
      {figure && <strong className="rn-recap-figure">{figure.literal}</strong>}
    </div>;
  }
  if (art.type === 'figures') {
    const at = animate ? art.figures.reduce((last, value, index) => value.cue <= p ? index : last, 0) : 0;
    return <div className="rn-recap-figure-stage" aria-hidden="true">
      <strong key={at} className="rn-recap-figure">{art.figures[at].literal}</strong>
      <div className="rn-recap-figure-marks">{art.figures.map((f, i) => <span key={i} className={i === at ? 'is-current' : ''} />)}</div>
    </div>;
  }
  // A neutral editorial illustration is the fallback when the text cannot support a
  // concrete diagram. No imagined footage, inferred charts, locations, or extra facts.
  return <div className="rn-recap-editorial" aria-hidden="true">
    <Newspaper size={130} strokeWidth={1.05} style={{ transform: `translateY(${animate ? 5 - 5 * between(p, 0, .5) : 0}px)` }} />
    <div className="rn-recap-editorial-lines">{[0, 1, 2, 3].map(i => <span key={i} style={{ width: `${35 + 60 * between(p, i * .14, i * .14 + .3)}%` }} />)}</div>
  </div>;
}
