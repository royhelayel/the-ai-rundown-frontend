import React from 'react';

export const range=(p,a,b)=>{const x=Math.max(0,Math.min(1,(p-a)/(b-a)));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const standard={ink:'var(--card-ink)',muted:'var(--card-sub)',paper:'var(--paper)',panel:'var(--tp-card)',accent:'var(--tp-chip)',line:'var(--card-line)',warning:'var(--tp-chip)'};
const title={fontFamily:'inherit',fontWeight:600};
function Text({x,y,children,size=23,fill,anchor='start',...rest}){return <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={fill} data-led-note={y>320?'true':undefined} style={{...title,'--led-label-size':`${size}px`}} {...rest}>{children}</text>;}
function Key({x=0,y=0,color}){return <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"><circle cx="0" cy="0" r="13"/><path d="M13 0h35m-11 0v10m10-10v10"/></g>;}
function Wallet({x,y,scale=1,color,broken=0}){return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"><g opacity={1-broken}><rect x="-23" y="-37" width="46" height="74" rx="8"/><rect x="-14" y="-24" width="28" height="28" rx="3"/><path d="M-10 17h20M-10 24h11"/></g>{[0,1,2].map(i=><path key={i} d={`M${-18+i*14} -30v60`} opacity={broken} transform={`translate(${(i-1)*broken*18} ${broken*(i%2?22:-20)})`}/>)}</g>;}
function Check({x,y,color,scale=1}){return <path d="M-8 0l6 6L10-9" transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>;}
function Cross({x,y,color,scale=1}){return <path d="M-6-6L6 6M6-6L-6 6" transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"/>;}
function Lock({x,y,color,scale=1}){return <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth="3"><path d="M-11-3v-9a11 11 0 0 1 22 0v9"/><rect x="-17" y="-3" width="34" height="28" rx="6"/><path d="M0 7v8"/></g>;}

export function CompromisedDevices({p,c}){
 const breach=range(p,.2,.43), remove=range(p,.52,.85), outcome=range(p,.76,.94);
 return <>
  <g transform={`translate(${mix(0,-22,breach)} ${mix(0,-30,breach)})`}>
   <rect x="43" y="97" width="155" height="134" rx="22" fill={c.paper} stroke={c.line} strokeWidth="2"/>
   <Text x="120" y="129" size={20} anchor="middle" fill={c.muted}>Authentication</Text>
   <g transform={`translate(${mix(101,147,breach)} ${mix(174,100,breach)}) rotate(${mix(0,-25,breach)})`}><Key color={breach>.5?c.warning:c.ink}/></g>
   <g opacity={1-breach}><Check x={120} y={208} color={c.accent}/></g>
  </g>
  <path d="M205 166H292" stroke={c.line} strokeWidth="2" strokeDasharray="5 7"/>
  <Cross x={250} y={166} color={c.warning} scale={breach*1.7}/>
  <g opacity={breach} transform={`translate(0 ${-12*(1-breach)})`}>
   <Text x="120" y="35" size={24} anchor="middle" fill={c.warning}>Key stolen</Text>
  </g>
  <g opacity={1-outcome*.86}>
   <Text x="425" y="82" size={21} anchor="middle" fill={c.muted}>Planned destruction</Text>
   {[0,1,2,3,4,5].map(i=>{
    const withdrawn=range(p,.51+i*.037,.71+i*.037);
    return <g key={i} opacity={1-withdrawn*.9} transform={`translate(${-withdrawn*(i%2?20:-20)} ${withdrawn*28})`}>
     <Wallet x={340+(i%3)*83} y={146+Math.floor(i/3)*94} scale={.8} color={breach>.6?c.warning:c.ink} broken={withdrawn}/>
     <g opacity={breach*(1-withdrawn)}><Cross x={361+(i%3)*83} y={116+Math.floor(i/3)*94} color={c.warning}/></g>
    </g>;
   })}
  </g>
  <g opacity={outcome} transform={`translate(0 ${16*(1-outcome)})`}>
   <Text x="413" y="170" size={62} anchor="middle" fill={c.ink}>18,835</Text>
   <Text x="413" y="205" size={24} anchor="middle" fill={c.ink}>affected units</Text>
  </g>
  <g opacity={range(p,.1,.2)*(1-remove)}><Text x="300" y="322" size={20} anchor="middle" fill={c.muted}>A stolen verification key compromises the inventory.</Text></g>
  <g opacity={remove}><Text x="300" y="322" size={20} anchor="middle" fill={c.muted}>Affected inventory is marked for destruction.</Text></g>
 </>;
}

function Earth({x,y,r,c}){return <g transform={`translate(${x} ${y})`}><circle r={r} fill={c.accent}/><path d={`M${-r*.74} ${-r*.18}l${r*.48} ${-r*.5} ${r*.44} ${r*.1} ${r*.3} ${r*.44}-${r*.38} ${r*.16}-${r*.11} ${r*.43}-${r*.32} ${r*.12}-${r*.25}-${r*.33}Z`} fill={c.paper} opacity=".8"/></g>;}
function Mars({x,y,r,c}){return <g transform={`translate(${x} ${y})`}><circle r={r} fill={c.muted} opacity=".24"/><path d={`M${-r*.67} ${r*.12}Q0 ${-r*.6} ${r*.72} ${-r*.15}M${-r*.38} ${r*.6}l${r*.6}-${r*.15}`} fill="none" stroke={c.muted} strokeWidth="3" opacity=".45"/></g>;}
function Rocket({x,y,angle=0,c}){return <g transform={`translate(${x} ${y}) rotate(${angle})`}><path d="M-20 7l-21 4 9-12" fill={c.accent} opacity=".4"/><path d="M-27-8h35l17 8L8 8h-35l6-8Z" fill={c.paper} stroke={c.ink} strokeWidth="2.5"/><circle cx="7" r="4" fill={c.accent}/></g>;}
function Capsule({x,y,c}){return <g transform={`translate(${x} ${y})`}><path d="M-14 12v-18l14-12L14-6v18Z" fill={c.paper} stroke={c.ink} strokeWidth="2.5"/><path d="M-14 12h28" stroke={c.accent} strokeWidth="6"/><circle cy="-1" r="4" fill={c.accent}/></g>;}

export function PhobosMission({p,c}){
 const launch=range(p,.02,.24), close=range(p,.25,.42), collect=range(p,.4,.56), returning=range(p,.71,.96);
 const t=launch;
 const x=80+365*t,y=226-240*t+135*t*t;
 const back=returning;
 return <>
  <g opacity={1-close}>
   <Text x="36" y="49" size={23} fill={c.ink}>Launch → Phobos</Text>
   <Earth x={72} y={244} r={38} c={c}/><Text x="72" y="306" size={21} anchor="middle" fill={c.muted}>Earth</Text>
   <Mars x={461} y={193} r={65} c={c}/><Text x="461" y="285" size={21} anchor="middle" fill={c.muted}>Mars</Text>
   <ellipse cx="461" cy="193" rx="99" ry="77" fill="none" stroke={c.line} strokeWidth="1.5" transform="rotate(-22 461 193)"/>
   <circle cx="464" cy="116" r="11" fill={c.ink}/><Text x="477" y="100" size={21} fill={c.ink}>Phobos</Text>
   <path d="M80 226Q262-14 445 121" fill="none" stroke={c.accent} strokeWidth="2.5" strokeDasharray="7 9" opacity=".7"/>
   <Rocket x={x} y={y} angle={-34+34*t} c={c}/>
  </g>
  <g opacity={close*(1-returning)}>
   <Text x="32" y="48" size={23} fill={c.ink}>Planned sample collection</Text>
   <path d="M40 282Q130 222 200 260T390 255T570 280V312H40Z" fill={c.muted} opacity=".2"/>
   <path d="M58 280l90-13m222 17 90-19" fill="none" stroke={c.muted} strokeWidth="3" opacity=".4"/>
   <Text x="488" y="316" size={21} fill={c.muted}>Phobos</Text>
   <g transform={`translate(300 ${mix(94,150,collect)})`}>
    <rect x="-37" y="-24" width="74" height="54" rx="10" fill={c.paper} stroke={c.ink} strokeWidth="3"/>
    <path d="M-37-4h-51v28h51m74-28h51v28H37" fill={c.accent} opacity=".75"/>
    <path d={`M0 30V${45+55*collect}`} fill="none" stroke={c.ink} strokeWidth="4"/>
    <path d={`M-14 ${55+55*collect}l14-10 14 10`} fill="none" stroke={c.ink} strokeWidth="3"/>
    <circle cy={105-69*range(p,.57,.67)} r="6" fill={c.accent} opacity={range(p,.56,.59)}/>
   </g>
  </g>
  <g opacity={returning}>
   <Text x="32" y="49" size={23} fill={c.ink}>Planned return to Earth</Text>
   <Earth x={93} y={232} r={45} c={c}/><Text x="93" y="306" size={21} anchor="middle" fill={c.muted}>Earth</Text>
   <circle cx="501" cy="155" r="19" fill={c.muted}/><Text x="501" y="115" size={21} anchor="middle" fill={c.muted}>Phobos</Text>
   <path d="M501 155Q300 41 122 209" fill="none" stroke={c.accent} strokeWidth="2.5" strokeDasharray="7 9"/>
   <Capsule x={501-379*back} y={155-228*back+282*back*back} c={c}/>
   <Text x="353" y="269" size={30} anchor="middle" fill={c.ink}>Expected by 2031</Text>
  </g>
  <Text x="300" y="351" size={18} anchor="middle" fill={c.muted}>Conceptual mission path · not to scale</Text>
 </>;
}

export function ElectionResult({p,c}){
 const drop=range(p,0,.22), results=range(p,.23,.42), bars=range(p,.4,.74), winner=range(p,.77,.94);
 return <>
  <g opacity={1-results} transform={`translate(${mix(0,-45,results)} 0)`}>
   <path d="M194 194h212v112H194Z" fill={c.paper} stroke={c.ink} strokeWidth="3"/>
   <path d="M194 194l23-29h166l23 29m-158-11h104" fill="none" stroke={c.ink} strokeWidth="3"/>
   <g transform={`translate(300 ${mix(67,210,drop)}) rotate(${mix(-12,0,drop)})`} opacity={1-range(p,.17,.24)}>
    <rect x="-38" y="-35" width="76" height="85" rx="4" fill={c.paper} stroke={c.ink} strokeWidth="3"/>
    <Check x={0} y={2} color={c.accent} scale={1.7}/>
   </g>
   <Text x="300" y="341" size={22} anchor="middle" fill={c.muted}>Brazil · second-round election</Text>
  </g>
  <g opacity={results} transform={`translate(${35*(1-results)} 0)`}>
   <Text x="32" y="46" size={23} fill={c.ink}>Final second-round result</Text>
   {[['Lula',51.79,106],['Flávio Bolsonaro',48.21,209]].map(([name,percent,y],i)=><g key={name}>
    <Text x="33" y={y-10} size={23} fill={i?c.muted:c.ink}>{name}</Text>
    <rect x="33" y={y+6} width="427" height="30" rx="4" fill={c.line} opacity=".45"/>
    <rect x="33" y={y+6} width={427*percent/100*bars} height="30" rx="4" fill={i?c.muted:c.accent}/>
    <Text x="563" y={y+31} size={34} anchor="end" fill={c.ink} opacity={bars}>{percent.toFixed(2)}%</Text>
   </g>)}
   <path d="M246.5 106v45m0 58v45" stroke={c.ink} strokeWidth="1.5" strokeDasharray="3 5" opacity={bars*.6}/>
   <Text x="246.5" y="273" size={18} anchor="middle" fill={c.muted} opacity={bars}>50%</Text>
   <g opacity={winner} transform={`translate(0 ${10*(1-winner)})`}>
    <Check x={45} y={292} color={c.accent}/>
    <Text x="67" y="299" size={22} fill={c.ink}>Lula elected to a fourth term</Text>
   </g>
  </g>
 </>;
}

export function LockdownMode({p,c}){
 const on=range(p,.13,.3), widen=range(p,.28,.45);
 const phoneX=mix(226,68,widen), phoneY=mix(39,43,widen);
 return <>
  <g transform={`translate(${phoneX} ${phoneY})`}>
   <rect width="148" height="275" rx="24" fill={c.ink}/>
   <rect x="7" y="8" width="134" height="259" rx="18" fill={c.paper}/>
   <rect x="52" y="14" width="44" height="9" rx="5" fill={c.ink}/>
   <Text x="74" y="61" size={18} anchor="middle" fill={c.ink}>Lockdown</Text>
   <rect x="47" y="77" width="54" height="29" rx="15" fill={on>.5?c.accent:c.line}/>
   <circle cx={62+24*on} cy="91.5" r="11" fill={c.paper}/>
   {[0,1,2].map(i=>{
    const blocked=range(p,.42+i*.13,.57+i*.13);
    return <g key={i}>
     <rect x="22" y={128+i*37} width="104" height="27" rx="5" fill={c.line} opacity={.5-blocked*.3}/>
     <g transform={`translate(33 ${132+i*37})`} opacity={1-blocked} fill="none" stroke={c.muted} strokeWidth="1.8" strokeLinejoin="round">
      {i===0?<><path d="M0 0h12l5 5v13H0Zm12 0v5h5M4 9h9M4 13h6"/><path d="M27 4h38m-38 6h29"/></>:i===1?<><rect width="19" height={17*(1-blocked)} rx="2" fill={c.accent} opacity=".4"/><path d="M26 4h39m-39 6h30m-30 6h20"/></>:<><rect y="2" width="19" height="13" rx="3"/><path d="M19 5l8-4v15l-8-4m17-5h26"/></>}
     </g>
     <Cross x={111} y={141+i*37} color={c.muted} scale={blocked*.7}/>
    </g>;
   })}
   <Lock x={74} y={242} color={c.accent} scale={on*.5}/>
  </g>
  <g opacity={widen}>
   <Text x="258" y="58" size={24} fill={c.ink}>Lockdown Mode on</Text>
   {[['Most attachments','Blocked'],['Link previews','Removed'],['FaceTime calls','Restricted']].map(([name,outcome],i)=>{
    const blocked=range(p,.42+i*.13,.57+i*.13);
    return <g key={name} transform={`translate(${(1-blocked)*25} 0)`} opacity={range(p,.33+i*.13,.48+i*.13)}>
     <path d={`M250 ${116+i*78}h306`} stroke={c.line} strokeWidth="1.5"/>
     <Text x="260" y={105+i*78} size={23} fill={c.ink}>{name}</Text>
     <Text x="260" y={135+i*78} size={20} fill={c.muted} opacity={blocked}>{outcome}</Text>
     <g opacity={blocked}><Lock x={533} y={110+i*78} color={c.accent} scale={.55}/></g>
    </g>;
   })}
  </g>
  <Text x="300" y="351" size={19} anchor="middle" fill={c.muted} opacity={range(p,.82,.95)}>Stronger protection comes with feature restrictions.</Text>
 </>;
}

export const SCENES=[CompromisedDevices,PhobosMission,ElectionResult,LockdownMode];
export const BEATS=[
 [{at:0,label:'Verify devices'},{at:.35,label:'Authentication key stolen'},{at:.89,label:'Affected inventory destroyed'}],
 [{at:.12,label:'Launch'},{at:.56,label:'Planned Phobos collection'},{at:.94,label:'Expected sample return'}],
 [{at:.1,label:'Second-round voting'},{at:.64,label:'Reveal exact vote shares'},{at:.94,label:'Show the outcome'}],
 [{at:.09,label:'Phone features available'},{at:.48,label:'Lockdown enabled'},{at:.94,label:'Show specific restrictions'}],
];
export default function StoryScene({index,phase=0,palette=standard}){
 const Scene=SCENES[index] || SCENES[0];
 return <svg className="rn-story-led-svg" viewBox="0 0 600 320" aria-hidden="true" focusable="false" width="100%" height="100%"><Scene p={Math.max(0,Math.min(1,phase))} c={palette}/></svg>;
}
