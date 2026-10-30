import React from 'react';
import { Loader } from 'lucide-react';
import './GeneratedStoryAnimation.css';

const palette = { ink:'var(--card-ink)',accent:'var(--tp-chip)',muted:'var(--card-sub)',surface:'var(--tp-card)',none:'none' };
const number = (value,min,max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const normal = text => String(text || '').replace(/\s+/g,' ').trim().toLowerCase();
export function safeGeneratedAnimation(plan,text) {
  if (plan?.version !== 1 || !Array.isArray(plan.elements) || plan.elements.length < 4 || plan.elements.length > 24) return false;
  const sourceNumbers=String(text || '').match(/\d+(?:[,.]\d+)*(?:%|ft)?/g) || [];
  return plan.elements.every(el => {
    if (!['path','rect','circle','ellipse','line','polygon','label'].includes(el?.type)) return false;
    if (typeof el.evidence !== 'string' || el.evidence.trim().length < 2 || !normal(text).includes(normal(el.evidence))) return false;
    if (el.type === 'label' && (typeof el.text !== 'string' || el.text.length > 42 || !normal(text).includes(normal(el.text)))) return false;
    if (el.type === 'label' && ((el.text.match(/\d+(?:[,.]\d+)*(?:%|ft)?/g) || []).some(n=>!sourceNumbers.includes(n)) || /^[\p{N}\p{P}\p{S}\s]+$/u.test(el.text))) return false;
    if (el.type === 'path' && (typeof el.d !== 'string' || el.d.length > 1600 || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/.test(el.d))) return false;
    if (el.type === 'polygon' && (!Array.isArray(el.points) || el.points.length < 6 || el.points.length > 60 || el.points.some(n=>!number(n,-400,760)))) return false;
    const attrs={rect:['x','y','width','height'],circle:['cx','cy','r'],ellipse:['cx','cy','rx','ry'],line:['x1','y1','x2','y2'],label:['x','y']}[el.type] || [];
    if (attrs.some(key=>!number(el[key],-400,760))) return false;
    if (el.type !== 'label' && (!['ink','accent','muted','surface','none'].includes(el.fill) || !['ink','accent','muted','surface','none'].includes(el.stroke) || !number(el.strokeWidth,0,8))) return false;
    if (!Array.isArray(el.frames) || el.frames.length < 2 || el.frames.length > 4) return false;
    let previous=-1;
    return el.frames.every(f=>{
      const valid=number(f.t,0,1) && f.t>previous && number(f.x,-400,400) && number(f.y,-300,300) && number(f.scale,.1,3) && number(f.rotate,-180,180) && number(f.opacity,0,1);
      previous=f.t;return valid;
    }) && el.frames[0].t===0 && el.frames[el.frames.length-1].t===1;
  });
}
export function animationPose(frames,phase) {
  const p=Math.max(0,Math.min(1,Number(phase)||0));
  const to=frames.findIndex(f=>f.t>=p);
  const a=frames[Math.max(0,to<0?frames.length-1:to-1)], b=frames[to<0?frames.length-1:to];
  const fraction=a===b?0:(p-a.t)/(b.t-a.t), ease=fraction*fraction*(3-2*fraction);
  return Object.fromEntries(['x','y','scale','rotate','opacity'].map(key=>[key,a[key]+(b[key]-a[key])*ease]));
}
const reveal = (p,a,b) => {const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);};
export function storyMotionPoses(plan,text,phase,motion=true) {
  const p=motion?Math.max(0,Math.min(1,Number(phase)||0)):1;
  const groups=[...new Set(plan.elements.map(e=>e.evidence))];
  if(groups.length<2) return plan.elements.map(el=>animationPose(el.frames,p));
  const source=String(text || '');
  const cue=group=>Math.max(.22,Math.min(.62,source.toLowerCase().indexOf(group.toLowerCase())/Math.max(1,source.length)));
  const context=reveal(p,cue(groups[1])-.08,cue(groups[1])+.18);
  const hero=plan.elements.find(e=>e.type==='label'&&e.evidence===groups[0]);
  const centering=Math.max(-90,Math.min(90,180-(hero?.x || 100)));
  return plan.elements.map(el=>{
    // Use the reviewed final geometry. The story's main object enters first,
    // then makes room as the next source-supported object is introduced.
    // No invented connecting arrows, numeric trends or causal links are drawn.
    const base=animationPose(el.frames,1),index=groups.indexOf(el.evidence);
    if(index===0){const arrival=reveal(p,0,.16);return {...base,x:base.x+centering*(1-context)-24*(1-arrival),y:base.y+12*(1-arrival),scale:base.scale*(1+.12*(1-context)),opacity:base.opacity*(.35+.65*arrival)};}
    const at=Math.min(.8,cue(el.evidence)+(index-1)*.06),arrival=reveal(p,at-.08,Math.min(.98,at+.18));
    return {...base,x:base.x+70*(1-arrival),y:base.y+8*(1-arrival),opacity:base.opacity*arrival};
  });
}
export default function GeneratedStoryAnimation({plan,text,phase=0,status='pending',motion=true}) {
  if (!safeGeneratedAnimation(plan,text)) return <div className="rn-generated-status" role="status">
    {status==='pending' && <Loader size={22} aria-hidden="true" />}
    <span>{status==='pending'?'Animation is being prepared.':'Animation is temporarily unavailable.'}</span>
  </div>;
  const poses=storyMotionPoses(plan,text,phase,motion);
  const visuals=plan.elements.map((el,i)=>({el,i,pose:poses[i]}));
  return <div className="rn-generated-stage" data-generated-animation="true" aria-hidden="true"><div className="rn-generated-canvas">
    <svg viewBox="0 0 360 240" width="100%" height="100%" focusable="false">
      {visuals.filter(item=>item.el.type!=='label').map(({el,i,pose:p})=>{
        const attrs={fill:palette[el.fill],stroke:palette[el.stroke],strokeWidth:el.strokeWidth,strokeLinecap:'round',strokeLinejoin:'round',opacity:p.opacity,
          transform:`translate(${p.x} ${p.y}) translate(180 120) rotate(${p.rotate}) scale(${p.scale}) translate(-180 -120)`};
        switch(el.type){
          case 'path':return <path key={i} {...attrs} d={el.d}/>;
          case 'rect':return <rect key={i} {...attrs} x={el.x} y={el.y} width={el.width} height={el.height} rx={number(el.rx,0,100)?el.rx:0}/>;
          case 'circle':return <circle key={i} {...attrs} cx={el.cx} cy={el.cy} r={el.r}/>;
          case 'ellipse':return <ellipse key={i} {...attrs} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry}/>;
          case 'line':return <line key={i} {...attrs} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}/>;
          case 'polygon':return <polygon key={i} {...attrs} points={el.points.join(' ')}/>;
          default:return null;
        }
      })}
    </svg>
    {visuals.filter(item=>item.el.type==='label').map(({el,i,pose:p})=><span key={i} className="rn-generated-label" data-role={el.role} dir="auto"
      style={{left:`${(el.x+p.x)/360*100}%`,top:`${(el.y+p.y)/240*100}%`,opacity:p.opacity,transform:`translate(-50%,-50%) rotate(${p.rotate}deg) scale(${p.scale})`}}>{el.text}</span>)}
  </div></div>;
}
