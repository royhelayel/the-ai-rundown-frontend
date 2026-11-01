import React, { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import useStorySwipeTouch from './useStorySwipeTouch';
function Surface({ callbacks, identity='first', enabled=true }) {
  const card=useRef(null);
  useStorySwipeTouch(card,enabled,identity,callbacks);
  return <article ref={card} key={identity}><div data-testid="scroller" style={{overflowY:'auto'}}><span data-testid="text">A long update</span></div><button>Source</button></article>;
}
const point=(x,y)=>({clientX:x,clientY:y,identifier:1});
const callbacks=()=>({start:jest.fn(),move:jest.fn(),end:jest.fn(),cancel:jest.fn()});
function move(target,touches) { const event=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:touches});fireEvent(target,event);return event; }

test('horizontal intent inside text cancels browser panning and continues to the story handler',()=>{
 const calls=callbacks();render(<Surface callbacks={calls}/>);const text=screen.getByTestId('text');
 fireEvent.touchStart(text,{touches:[point(220,80)]});
 const event=move(text,[point(100,100)]);
 expect(event.defaultPrevented).toBe(true);expect(calls.move).toHaveBeenCalledTimes(1);
 fireEvent.touchEnd(text,{changedTouches:[point(60,110)]});expect(calls.end).toHaveBeenCalledTimes(1);
});
test('vertical text scrolling remains native, while either edge cannot hand off to refresh',()=>{
 const calls=callbacks();render(<Surface callbacks={calls}/>);const scroller=screen.getByTestId('scroller'),text=screen.getByTestId('text');
 Object.defineProperties(scroller,{clientHeight:{value:100},scrollHeight:{value:400}});scroller.scrollTop=50;
 fireEvent.touchStart(text,{touches:[point(100,200)]});
 expect(move(text,[point(102,150)]).defaultPrevented).toBe(false);
 expect(calls.move).not.toHaveBeenCalled();
 scroller.scrollTop=300;expect(move(text,[point(103,100)]).defaultPrevented).toBe(true);
 fireEvent.touchEnd(text,{changedTouches:[point(103,100)]});
 scroller.scrollTop=0;fireEvent.touchStart(text,{touches:[point(100,100)]});
 expect(move(text,[point(102,180)]).defaultPrevented).toBe(true);
});
test('pinching cancels the custom drag without cancelling zoom, and buttons never initiate a swipe',()=>{
 const calls=callbacks();render(<Surface callbacks={calls}/>);const text=screen.getByTestId('text');
 fireEvent.touchStart(screen.getByRole('button'),{touches:[point(200,100)]});
 expect(move(screen.getByRole('button'),[point(20,100)]).defaultPrevented).toBe(false);expect(calls.start).not.toHaveBeenCalled();
 fireEvent.touchStart(text,{touches:[point(200,100)]});
 expect(move(text,[point(180,100),point(250,140)]).defaultPrevented).toBe(false);
 expect(calls.cancel).toHaveBeenCalledTimes(1);fireEvent.touchEnd(text,{changedTouches:[point(180,100)]});expect(calls.end).not.toHaveBeenCalled();
});
test('changing stories removes stale listeners and disabling the handler leaves the next surface native',()=>{
 const calls=callbacks();const{rerender}=render(<Surface callbacks={calls}/>);const old=screen.getByTestId('text');
 rerender(<Surface callbacks={calls} identity="second"/>);fireEvent.touchStart(old,{touches:[point(200,100)]});expect(calls.start).not.toHaveBeenCalled();
 const current=screen.getByTestId('text');fireEvent.touchStart(current,{touches:[point(200,100)]});expect(calls.start).toHaveBeenCalledTimes(1);
 rerender(<Surface callbacks={calls} identity="second" enabled={false}/>);
 expect(move(current,[point(20,100)]).defaultPrevented).toBe(false);expect(calls.move).not.toHaveBeenCalled();
});

test('short screens can still scroll the containing briefing after inner text reaches its edge',()=>{
 const calls=callbacks();render(<div className="rn-editorial-body" data-testid="body" style={{overflowY:'auto'}}><Surface callbacks={calls}/></div>);
 const body=screen.getByTestId('body'),text=screen.getByTestId('text');
 Object.defineProperties(body,{clientHeight:{value:200},scrollHeight:{value:500}});body.scrollTop=100;
 fireEvent.touchStart(text,{touches:[point(100,200)]});
 expect(move(text,[point(100,130)]).defaultPrevented).toBe(false);
 body.scrollTop=300;expect(move(text,[point(100,100)]).defaultPrevented).toBe(true);
});
