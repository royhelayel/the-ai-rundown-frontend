import {useEffect,useState} from'react';
import{BACKEND_URL}from'../lib/backend';
import{cleanForTTS}from'../audio/narrationText';
export function validIllustration(a){
 if(a?.type!=='illustration'||!Array.isArray(a.regions)||a.regions.length<2||a.regions.length>5)return false;
 let edge=0;for(const r of [...a.regions].sort((x,y)=>x.top-y.top)){if(!Number.isFinite(r.top)||!Number.isFinite(r.bottom)||!Number.isFinite(r.at)||r.at<0||r.at>1||r.top<0||r.bottom>1||r.bottom<=r.top||Math.abs(r.top-edge)>.002)return false;edge=r.bottom;}return Math.abs(edge-1)<.002;
}
const allowed=new Set(['World News','Business']),cache=new Map(),requests=new Map();
const clean=t=>cleanForTTS(String(t||'')).replace(/\s+/g,' ').trim();
const key=(category,day,language,text)=>JSON.stringify([category,day,language,clean(text)]);
export function clearDailyMotionCache(){cache.clear();requests.clear();}
export default function useDailyMotion(texts,{category,day,language='en',enabled=true}={}){
 const signature=texts.map(clean).filter(Boolean).slice(0,2).join('\u001f'),[records,setRecords]=useState({});
 useEffect(()=>{if(!enabled||!allowed.has(category)||!/^\d{4}-\d{2}-\d{2}$/.test(day||'')||!signature)return undefined;let cancelled=false,timer,tries=0;const wanted=[...new Set(signature.split('\u001f'))];
 const load=async()=>{const missing=wanted.filter(t=>!cache.has(key(category,day,language,t))||cache.get(key(category,day,language,t)).expires<Date.now());if(missing.length){const requestKey=JSON.stringify([category,day,language,missing]);let request=requests.get(requestKey);if(!request){request=fetch(`${BACKEND_URL}/api/daily-motion/lookup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({category,day,language,texts:missing})}).then(async r=>{if(!r.ok)throw Error('Motion lookup failed');const body=await r.json();if(body.version!==1||!Array.isArray(body.entries))throw Error('Invalid motion manifest');for(const text of missing){const row=body.entries.find(e=>e.text===text);const a=row?.artifact;const valid=row?.status==='ready'&&(a?.type==='remotion'||validIllustration(a))&&/^[a-f0-9]{64}$/.test(a.id)&&Number.isFinite(a.from)&&Number.isFinite(a.to)&&a.from>=0&&a.to<=1&&a.from<a.to;const value=valid?{status:'ready',artifact:a}:{status:row?.status||'not_ready',artifact:null};if(cache.size>=400)cache.delete(cache.keys().next().value);cache.set(key(category,day,language,text),{...value,expires:Date.now()+(valid&&(category!=='World News'||a.type==='illustration')?3600e3:30000)});}}).catch(()=>{for(const text of missing)cache.set(key(category,day,language,text),{status:'not_ready',artifact:null,expires:Date.now()+30000});}).finally(()=>requests.delete(requestKey));requests.set(requestKey,request);}await request;}
 if(cancelled)return;const next=Object.fromEntries(wanted.map(t=>[key(category,day,language,t),cache.get(key(category,day,language,t))]));setRecords(next);if(++tries<20&&Object.values(next).some(r=>['pending','not_ready','running'].includes(r?.status)||(category==='World News'&&r?.artifact?.type==='remotion')))timer=setTimeout(load,31000);};void load();return()=>{cancelled=true;clearTimeout(timer);};},[signature,category,day,language,enabled]);
 return text=>enabled&&allowed.has(category)?records[key(category,day,language,text)]||cache.get(key(category,day,language,text))||{status:'not_ready',artifact:null}:{status:'disabled',artifact:null};
}
