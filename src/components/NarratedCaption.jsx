import React, { useLayoutEffect, useRef, useState } from 'react';
import { narrationWeight } from '../lib/narrationTiming';

export function captionLines(text, width, measure) {
 const words = text.match(/\S+/g) || [], lines = [];
 let line = '';
 for (const word of words) {
  const next = line ? `${line} ${word}` : word;
  if (line && measure(next) > width) { lines.push(line); line = word; }
  else line = next;
 }
 if (line) lines.push(line);
 return lines;
}
export function currentCaptionLine(lines, progress) {
 const total = lines.reduce((n,line)=>n+narrationWeight(line),0) || 1;
 let used = 0;
 return lines.find(line => { used += narrationWeight(line); return used / total > progress; }) || lines[lines.length-1] || '';
}
export default function NarratedCaption({text, progress=0}) {
 const box = useRef(null), measure = useRef(null), [lines,setLines] = useState([text]);
 useLayoutEffect(()=>{
  let disposed=false;
  const fit=()=>{
   if(disposed || !box.current || !measure.current)return;
   const width=box.current.clientWidth;
   if(!width)return;
   setLines(captionLines(text,width,value=>{measure.current.textContent=value;return measure.current.getBoundingClientRect().width;}));
  };
  fit();const observer=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;
  observer?.observe(box.current);document.fonts?.ready?.then(fit);
  return()=>{disposed=true;observer?.disconnect();};
 },[text]);
 return <p ref={box} className="rn-listen-caption-line" dir="auto"><span className="rn-caption-measure" ref={measure} aria-hidden="true"/><span>{currentCaptionLine(lines,progress)}</span></p>;
}
