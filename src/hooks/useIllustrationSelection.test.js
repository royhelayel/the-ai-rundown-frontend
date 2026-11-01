import { renderHook } from '@testing-library/react';
import useIllustrationSelection from './useIllustrationSelection';

const empty = { native: null, plan: null };
const scene = id => ({ native: { type: 'remotion', id }, plan: null });
test('a daily scene arriving after Play fills missing artwork and stays stable afterward', () => {
 const { result, rerender } = renderHook(({ candidate, active = true, reading = false }) => useIllustrationSelection('story', candidate, active, reading), { initialProps: { candidate: empty } });
 expect(result.current).toBe(empty);
 const first = scene('first');
 rerender({ candidate: first });
 expect(result.current).toBe(first);
 rerender({ candidate: scene('replacement') });
 expect(result.current).toBe(first);
 rerender({ candidate: empty, active: true });
 expect(result.current).toBe(first);
});
test('reading does not pick up late animation until returning to Listen', () => {
 const { result, rerender } = renderHook(({ candidate, reading }) => useIllustrationSelection('story', candidate, true, reading), { initialProps: { candidate: empty, reading: true } });
 const ready = scene('ready');
 rerender({ candidate: ready, reading: true });
 expect(result.current).toBe(empty);
 rerender({ candidate: ready, reading: false });
 expect(result.current).toBe(ready);
});
test('approved image can upgrade an old scene once during playback and then stays stable',()=>{
 const old=scene('old');const {result,rerender}=renderHook(({candidate})=>useIllustrationSelection('story',candidate,true,false),{initialProps:{candidate:old}});
 const image={native:{type:'illustration',id:'approved'},plan:null};rerender({candidate:image});expect(result.current).toBe(image);
 rerender({candidate:{native:{type:'illustration',id:'different'},plan:null}});expect(result.current).toBe(image);
});
