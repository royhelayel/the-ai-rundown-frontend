import React from 'react';
import {render,fireEvent} from '@testing-library/react';
import IllustratedNews from './IllustratedNews';
import {validIllustration} from '../hooks/useDailyMotion';
const artifact={type:'illustration',id:'a'.repeat(64),regions:[{top:0,bottom:.5,at:0},{top:.5,bottom:1,at:.6}]};
test('reveals follow playback including backward seek, and reduced motion shows all',()=>{
 const {container,rerender}=render(<IllustratedNews artifact={artifact} phase={.2}/>);
 fireEvent.load(container.querySelector('img'));
 const regions=()=>container.querySelectorAll('.rn-illustrated-region');
 expect(regions()[0]).toHaveStyle({opacity:'1'});expect(regions()[1]).toHaveStyle({opacity:'0'});
 rerender(<IllustratedNews artifact={artifact} phase={.8}/>);expect(regions()[1]).toHaveStyle({opacity:'1'});
 rerender(<IllustratedNews artifact={artifact} phase={.1}/>);expect(regions()[1]).toHaveStyle({opacity:'0'});
 rerender(<IllustratedNews artifact={artifact} phase={0} reduced/>);expect(regions()[1]).toHaveStyle({opacity:'1'});
});
test('failed image reports the current asset; new story never reuses loaded previous image',()=>{
 const fail=jest.fn();const {container,rerender}=render(<IllustratedNews artifact={artifact} onUnavailable={fail}/>);
 fireEvent.load(container.querySelector('img'));expect(container.querySelectorAll('.rn-illustrated-region')).toHaveLength(2);
 const next={...artifact,id:'b'.repeat(64)};rerender(<IllustratedNews artifact={next} onUnavailable={fail}/>);
 expect(container.querySelectorAll('.rn-illustrated-region')).toHaveLength(0);fireEvent.error(container.querySelector('img'));expect(fail).toHaveBeenCalledWith(next.id);
});
test('rejects malformed region manifests',()=>{expect(validIllustration(artifact)).toBe(true);expect(validIllustration({...artifact,regions:[{top:0,bottom:.4,at:0},{top:.6,bottom:1,at:.3}]})).toBe(false);expect(validIllustration({...artifact,regions:[{top:0,bottom:1,at:NaN}]})).toBe(false);});
test('single-scene artwork is shown intact instead of forcing sections',()=>{const whole={...artifact,policy:'world-three-families-v2',regions:[{top:0,bottom:1,at:0}]};expect(validIllustration(whole)).toBe(true);const {container}=render(<IllustratedNews artifact={whole} phase={0}/>);fireEvent.load(container.querySelector('img'));const sections=container.querySelectorAll('.rn-illustrated-region');expect(sections).toHaveLength(1);expect(sections[0]).toHaveStyle({opacity:'1',clipPath:'inset(0% 0 0% 0)'});});
