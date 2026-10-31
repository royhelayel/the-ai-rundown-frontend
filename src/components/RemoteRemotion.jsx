import React,{useEffect,useRef,useState}from'react';
import{BACKEND_URL}from'../lib/backend';
import './RemoteRemotion.css';
export default function RemoteRemotion({artifact,phase=0,reduced=false,visible=true,onUnavailable}){
 const box=useRef(null),frame=useRef(null),[onScreen,setOnScreen]=useState(true),[ready,setReady]=useState(false);const id=artifact.id;
 const active=visible&&onScreen;
 const value=reduced?artifact.to:artifact.from+(artifact.to-artifact.from)*Math.max(0,Math.min(1,Number(phase)||0));
 useEffect(()=>{if(!box.current||typeof IntersectionObserver==='undefined')return undefined;const observer=new IntersectionObserver(entries=>setOnScreen(entries[0]?.isIntersecting!==false),{threshold:0});observer.observe(box.current);return()=>observer.disconnect();},[id]);
 useEffect(()=>{setReady(false);if(!active)return undefined;let done=false;const listener=e=>{if(e.source!==frame.current?.contentWindow||e.data?.id!==id)return;if(e.data.type==='rn-motion-ready'){done=true;setReady(true);}else if(e.data.type==='rn-motion-error'){done=true;onUnavailable?.(id);}};window.addEventListener('message',listener);const timer=setTimeout(()=>{if(!done)onUnavailable?.(id);},12000);return()=>{clearTimeout(timer);window.removeEventListener('message',listener);};},[id,active,onUnavailable]);
 useEffect(()=>{if(active&&ready)frame.current?.contentWindow?.postMessage({type:'rn-motion-frame',id,phase:value},'*');},[id,value,ready,active]);
 return <div ref={box} className="rn-remote-motion" data-remotion-id={id} aria-hidden="true">{active&&<iframe ref={frame} title="Animated news illustration" tabIndex={-1} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={()=>frame.current?.contentWindow?.postMessage({type:'rn-motion-init',id},'*')} src={`${BACKEND_URL}/api/daily-motion/frame/${id}?v=2`} />}</div>;
}
