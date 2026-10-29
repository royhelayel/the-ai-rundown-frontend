import { act, renderHook } from '@testing-library/react';
import useAudioProgramme from './useAudioProgramme';
import { completedMixDays } from '../audio/programmeProgress';
jest.mock('../lib/supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({data:{session:null}}) } } }));
beforeEach(() => localStorage.clear());
const snap = { radio:true, day:'2026-10-26', period:'Daily',language:'en', map:{ World:{allStories:[{_isBriefing:true,summary:'World recap.'}]}, Tech:{allStories:[{_isBriefing:true,summary:'Tech recap.'}]} } };
const media = (position, heard) => ({duration:100,currentTime:position,playbackRate:2,played:{length:1,start:()=>0,end:()=>heard}});
test('mix completion requires actual coverage for every topic, independent of seek position', () => {
  const { result, unmount }=renderHook(()=>useAudioProgramme());
  act(()=>{result.current.ref.current.begin(snap,'World','World recap.');result.current.ref.current.media(media(99,5));result.current.ref.current.flush();});
  expect(Object.values(result.current.records)[0].completed).toBe(false);
  act(()=>{result.current.ref.current.media(media(70,70));result.current.ref.current.begin(snap,'Tech','Tech recap.');result.current.ref.current.media(media(69,69));result.current.ref.current.finish(snap);});
  expect(result.current.notice.complete).toBe(false);
  act(()=>{result.current.ref.current.media(media(70,70));result.current.ref.current.finish(snap);});
  expect(result.current.notice.complete).toBe(true);
  expect(completedMixDays(result.current.records)).toEqual(['2026-10-26']);
  unmount();
});
test('partial progress is available after reopening and stays isolated by account', () => {
  const first=renderHook(()=>useAudioProgramme());
  act(()=>{first.result.current.ref.current.begin(snap,'World','World recap.');first.result.current.ref.current.media(media(40,40));first.result.current.ref.current.flush();});
  first.unmount();
  const second=renderHook(()=>useAudioProgramme());
  expect(second.result.current.resume.position).toBe(.4);
  second.unmount();
  const signed=renderHook(()=>useAudioProgramme('someone-else'));
  expect(signed.result.current.resume).toBeNull();
  signed.unmount();
});

test('the next topic remains resumable even if playback stops before its first word',()=>{
 const first=renderHook(()=>useAudioProgramme());
 act(()=>{first.result.current.ref.current.begin(snap,'Tech','Tech recap.');});first.unmount();
 const second=renderHook(()=>useAudioProgramme());
 expect(second.result.current.resume.category).toBe('Tech');expect(second.result.current.resume.position).toBe(0);second.unmount();
});

test('split Quick clips share parent coverage: skipping ahead never earns credit and completion remains 70%',()=>{
 const {result,unmount}=renderHook(()=>useAudioProgramme());
 const parent='World recap.', parts=[{text:parent,start:0,end:.5},{text:parent,start:.5,end:1}];
 const segmented={...snap,map:{World:{allStories:[{_isBriefing:true,summary:'Part one.',_quickRecap:parts[0]}]}}};
 act(()=>{result.current.ref.current.begin(segmented,'World',parent,parts[0]);result.current.ref.current.media(media(100,100));result.current.ref.current.end();});
 let record=Object.values(result.current.records)[0];expect(record.completed).toBe(false);expect(record.finished).toBe(false);expect(record.position).toBe(.5);
 act(()=>{result.current.ref.current.begin(segmented,'World',parent,parts[1]);result.current.ref.current.media(media(99,0));result.current.ref.current.flush();});
 expect(Object.values(result.current.records)).toHaveLength(1);expect(Object.values(result.current.records)[0].completed).toBe(false);
 act(()=>{result.current.ref.current.media(media(40,40));result.current.ref.current.flush();});
 record=Object.values(result.current.records)[0];expect(record.completed).toBe(true);expect(record.position).toBeCloseTo(.7);
 unmount();
});
