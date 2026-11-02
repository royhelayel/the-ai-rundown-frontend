import React, {useState} from 'react';
import {illustrationURL,illustrationReady} from '../lib/illustrationPreload';
import './IllustratedNews.css';
export default function IllustratedNews({artifact,phase=0,reduced=false,onUnavailable}){
 const [loaded,setLoaded]=useState(null);
 const progress=Math.max(0,Math.min(1,Number(phase)||0));
 const src=illustrationURL(artifact.id);
 return <div className="rn-illustrated-news" aria-hidden="true" data-artwork-id={artifact.id}>
  {/* A single shared image download. Region overlays reuse its decoded bitmap. */}
  <img src={src} alt="" onLoad={()=>setLoaded(artifact.id)} onError={()=>onUnavailable?.(artifact.id)} style={{opacity:0}}/>
  {(loaded===artifact.id||illustrationReady(artifact.id))&&(artifact.regions||[]).map((r,i)=><div key={i} className="rn-illustrated-region" style={{backgroundImage:`url("${src}")`,clipPath:`inset(${r.top*100}% 0 ${(1-r.bottom)*100}% 0)`,opacity:reduced||progress>=r.at?1:0,transition:reduced?'none':'opacity 450ms ease-out'}}/>)}
 </div>;
}
