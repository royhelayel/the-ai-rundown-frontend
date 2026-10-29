import { act, render, screen, waitFor } from '@testing-library/react';
import useStoryAnimations, { clearStoryAnimationCache } from './useStoryAnimations';
function Harness({text='A reported update.',enabled=true}) {const get=useStoryAnimations([text],enabled);return <span>{get(text).status}</span>;}
beforeEach(()=>{clearStoryAnimationCache();global.fetch=jest.fn(async()=>({ok:true,json:async()=>({version:1,entries:[{text:'A reported update.',status:'ready',plan:{version:1,elements:[]}}]})}));});
test('animation off makes no lookup, and enabling uses a read-only cached lookup',async()=>{
 const {rerender}=render(<Harness enabled={false}/>);expect(fetch).not.toHaveBeenCalled();
 rerender(<Harness/>);expect(await screen.findByText('ready')).toBeInTheDocument();expect(fetch).toHaveBeenCalledTimes(1);
 rerender(<Harness enabled={false}/>);rerender(<Harness/>);await waitFor(()=>expect(screen.getByText('ready')).toBeInTheDocument());expect(fetch).toHaveBeenCalledTimes(1);
});
test('late replies cannot apply an old update’s plan to the next update',async()=>{
 let finish;global.fetch=jest.fn(()=>new Promise(r=>{finish=r;}));
 const {rerender}=render(<Harness/>);rerender(<Harness text='Different facts.' enabled={false}/>);
 await act(async()=>{finish({ok:true,json:async()=>({version:1,entries:[{text:'A reported update.',status:'ready',plan:{}}]})});});
 expect(screen.queryByText('ready')).not.toBeInTheDocument();
});
