import { render, screen } from '@testing-library/react';
import GeneratedStoryAnimation, { animationPose, safeGeneratedAnimation, storyMotionPoses } from './GeneratedStoryAnimation';
const text='Researchers identified 18 waxcap species on the island.';
const frames=[{t:0,x:0,y:0,scale:1,rotate:0,opacity:1},{t:1,x:20,y:10,scale:1.1,rotate:5,opacity:.8}];
const plan={version:1,elements:[
 {type:'path',d:'M 20 40 Q 80 0 140 40 Z',fill:'accent',stroke:'none',strokeWidth:0,evidence:'waxcap species',frames},
 {type:'rect',x:70,y:40,width:20,height:60,rx:5,fill:'ink',stroke:'none',strokeWidth:0,evidence:'waxcap species',frames},
 {type:'circle',cx:220,cy:100,r:25,fill:'accent',stroke:'none',strokeWidth:0,evidence:'waxcap species',frames},
 {type:'label',x:180,y:190,text:'18 waxcap species',role:'body',evidence:'18 waxcap species',frames},
]};
test('custom drawing primitives render without a semantic template or external media',()=>{
 const {container}=render(<GeneratedStoryAnimation plan={plan} text={text} phase={.5}/>);
 expect(container.querySelector('path').getAttribute('d')).toBe(plan.elements[0].d);
 expect(container.querySelector('rect')).toBeInTheDocument();
 expect(screen.getByText('18 waxcap species')).toBeInTheDocument();
 expect(container.querySelector('video,image,iframe,script,foreignObject')).toBeNull();
});
test('a changed update cannot show a previously generated drawing',()=>{
 const {container}=render(<GeneratedStoryAnimation plan={plan} text='A completely different story.' status='unavailable'/>);
 expect(container.querySelector('[data-generated-animation]')).toBeNull();
 expect(screen.getByRole('status')).toHaveTextContent('temporarily unavailable');
});
test('unsafe or malformed model output is not rendered',()=>{
 for(const modify of [p=>p.elements[0].type='image',p=>p.elements[0].d='<script>alert(1)</script>',p=>p.elements[0].frames[0].x='url(x)',p=>p.elements[0].fill='__proto__',p=>p.elements[3].text='999 species']){
  const p=JSON.parse(JSON.stringify(plan));modify(p);expect(safeGeneratedAnimation(p,text)).toBe(false);
 }
});
test('drawing positions follow audio progress forwards and backwards without their own timer',()=>{
 expect(animationPose(frames,0)).toEqual(frames[0].t===0?{x:0,y:0,scale:1,rotate:0,opacity:1}:null);
 expect(animationPose(frames,.5)).toMatchObject({x:10,y:5,rotate:2.5});
 expect(animationPose(frames,1)).toMatchObject({x:20,y:10});
 expect(animationPose(frames,0)).toMatchObject({x:0,y:0});
});
test('a pending animation is disclosed instead of substituting a preset',()=>{
 const {container}=render(<GeneratedStoryAnimation text={text}/>);
 expect(screen.getByRole('status')).toHaveTextContent('being prepared');
 expect(container.querySelector('[data-generated-animation]')).toBeNull();
});

test('fallback drawings stage their source-supported objects instead of barely bobbing both icons',()=>{
 const text='A bank has approved a stablecoin.';
 const drawing={...plan,elements:plan.elements.map((el,i)=>({...el,evidence:i<2?'bank':'stablecoin'}))};
 const start=storyMotionPoses(drawing,text,0),end=storyMotionPoses(drawing,text,1);
 expect(start[0].x).not.toBe(end[0].x);expect(start[2].opacity).toBe(0);expect(end[2].opacity).toBeGreaterThan(0);
 expect(storyMotionPoses(drawing,text,0)).toEqual(start);
 expect(storyMotionPoses(drawing,text,.2,false)).toEqual(end);
});
