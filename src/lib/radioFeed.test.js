import { selectRadioFeed } from './radioFeed';
import { headlineKey } from './headlineKey';
const a = {headline:'Story A'}, b = {headline:'Story B'};
const map = {World:{allStories:[a,b]}, Tech:{allStories:[{headline:'Story C'}]}};
test('Relevant preserves the verified mix; Popular and Interesting use their own rankings',()=>{
 const reads = {[headlineKey(a.headline)]:1,[headlineKey(b.headline)]:4};
 expect(selectRadioFeed(map,'latest',reads)).toBe(map);
 expect(selectRadioFeed(map,'popular',reads)).toEqual({World:{allStories:[b,a]}});
 expect(selectRadioFeed(map,'interesting',reads,{}, {World:{allStories:[{...a,_interestCount:2}]}})).toEqual({World:{allStories:[a]}});
 expect(selectRadioFeed(map,'popular')).toEqual({});
});
test('Quick updates retain exact text, source attribution and original completion spans',()=>{
 const quick = {headline:'Combined update',summary:'Checked text.',_quickRecap:{sources:[a,b],start:.2,end:.4}};
 const unknown = {headline:'Unmapped update',_quickRecap:{sources:[],start:.4,end:.6}};
 const selected = selectRadioFeed({World:{allStories:[unknown,quick]}},'popular',{[headlineKey(b.headline)]:3});
 expect(selected.World.allStories).toEqual([quick]);
 expect(selected.World.allStories[0]).toBe(quick);
});
test('period recaps remain whole and topics without an engagement signal are excluded',()=>{
 const world={allStories:[{summary:'Complete week',_recapPeriod:'Weekly'}],rankingStories:[a]};
 const tech={allStories:[{summary:'Complete tech week',_recapPeriod:'Weekly'}],rankingStories:[b]};
 expect(selectRadioFeed({World:world,Tech:tech},'popular',{[headlineKey(a.headline)]:2})).toEqual({World:world});
});
