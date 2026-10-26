import { renderHook } from '@testing-library/react';
import useProgrammeMediaSession from './useProgrammeMediaSession';
afterEach(()=>{delete navigator.mediaSession;delete window.MediaMetadata;});
test('phone controls use current callbacks and seek within the current recording',()=>{
 const handlers={};const media={setActionHandler:jest.fn((a,h)=>{handlers[a]=h;}),setPositionState:jest.fn()};
 Object.defineProperty(navigator,'mediaSession',{configurable:true,value:media});
 window.MediaMetadata=function(data){Object.assign(this,data);};
 const next=jest.fn(),seek=jest.fn(),play=jest.fn();
 const initial={active:true,paused:false,title:'World recap',edition:'October 26',duration:100,progress:40,speed:1.5,onPlay:play,onPause:jest.fn(),onStop:jest.fn(),onPrev:jest.fn(),onNext:jest.fn(),onSeek:seek};
 const {rerender,unmount}=renderHook(props=>useProgrammeMediaSession(props),{initialProps:initial});
 rerender({...initial,onNext:next});handlers.nexttrack();handlers.seekto({seekTime:60});handlers.seekbackward({seekOffset:10});
 expect(next).toHaveBeenCalledTimes(1);expect(seek.mock.calls).toEqual([[60],[30]]);
 expect(media.metadata.artist).toBe('RadioNews');expect(media.playbackState).toBe('playing');
 expect(media.setPositionState).toHaveBeenCalledWith({duration:100,position:40,playbackRate:1.5});
 unmount();expect(handlers.play).toBeNull();
});
test('browsers without Media Session keep working',()=>{expect(()=>renderHook(()=>useProgrammeMediaSession({})).unmount()).not.toThrow();});
