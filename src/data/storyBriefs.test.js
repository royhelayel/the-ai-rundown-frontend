import {radioSnapshot,radioDestination,resumeRadioStory} from './useRadioRecaps';
import {programmeKey,programmeText,queueKeys} from '../audio/programmeProgress';
const sources=[{text:'First short update.',stories:[{headline:'First headline',sources:[{outlet:'AP',url:'https://a.example'}]}]},
 {text:'Second short update.',stories:[{headline:'Second headline',sources:[{outlet:'BBC',url:'https://b.example'}]}]}];
const text=sources.map(s=>s.text).join(' ');
test('Quick creates independent short stories with exact text, relevant outlets and a stable parent recap',()=>{
 const map=radioSnapshot(['World'],{World:{text,sources}},'Daily'),list=map.World.allStories;
 expect(list.map(s=>s.summary)).toEqual(sources.map(s=>s.text));
 expect(list[1].headline).toBe('Second headline');expect(list[1].storySources[0].outlet).toBe('BBC');
 expect(list.every(s=>programmeText(s)===text && s._isBriefing)).toBe(true);
 expect(list[0]._quickRecap.start).toBe(0);expect(list[1]._quickRecap.end).toBe(1);
 const snap={radio:true,period:'Daily',day:'2026-10-27',language:'en',map};
 expect(queueKeys(snap)).toEqual([programmeKey({...snap,category:'World',text})]);
 const restored=resumeRadioStory(list,.75);expect(restored.index).toBe(1);expect(restored.position).toBeGreaterThan(0);expect(restored.position).toBeLessThan(1);
});
test('stale attribution is rejected, weekly/monthly remain topic recordings',()=>{
 const row={text:'Corrected first update. Second short update.',sources};
 const list=radioSnapshot(['World'],{World:row},'Daily').World.allStories;
 expect(list[0]._quickRecap.sources).toEqual([]);expect(list[0].headline).toBe('Corrected first update.');
 expect(radioSnapshot(['World'],{World:row},'Weekly').World.allStories).toHaveLength(1);
});
test.each(['Daily','Headlines'])('%s navigation covers story and topic boundaries without wrapping',period=>{
 const map={World:{allStories:[{},{}]},Missing:{allStories:[]},Tech:{allStories:[{}]}};
 expect(radioDestination(map,'World',0,1,period)).toEqual({category:'World',index:1});
 expect(radioDestination(map,'World',1,1,period)).toEqual({category:'Tech',index:0});
 expect(radioDestination(map,'Tech',0,-1,period)).toEqual({category:'World',index:1});
 expect(radioDestination(map,'World',0,-1,period)).toBeNull();expect(radioDestination(map,'Tech',0,1,period)).toBeNull();
});
