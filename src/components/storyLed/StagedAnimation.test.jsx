import {render,act} from '@testing-library/react';
import AnimatedRecap from '../AnimatedRecap';
import records from './stagedStories.json';
import {stagedFor} from '../../lib/stagedAnimations';
import {setAnimationPreference} from '../../hooks/useAnimationPreference';

beforeEach(()=>{localStorage.clear();global.fetch=jest.fn(()=>new Promise(()=>{}));});
test('reviewed scripts render directly in Listen, rewind deterministically and retain transcript alternatives',()=>{
 for(const row of records){
  const props={text:row.text,sourcesMap:[{text:row.text,stories:[{headline:row.headline,sources:[]}]}],category:'World News',progress:0,playing:false};
  const {container,rerender,unmount}=render(<AnimatedRecap {...props}/>);
  const start=container.querySelector('.rn-staged-motion').innerHTML;
  expect(container.querySelector('.rn-animated-recap-stage')).toHaveAttribute('data-scene','staged');
  rerender(<AnimatedRecap {...props} progress={75}/>);
  expect(container.querySelector('.rn-staged-motion').innerHTML).not.toBe(start);
  rerender(<AnimatedRecap {...props} progress={0}/>);
  expect(container.querySelector('.rn-staged-motion').innerHTML).toBe(start);
  rerender(<AnimatedRecap {...props} reading/>);
  expect(container.querySelector('.rn-staged-motion')).not.toBeInTheDocument();
  expect(container.querySelector('.rn-brief-reader')).toHaveTextContent(row.headline);
  rerender(<AnimatedRecap {...props}/>);
  act(()=>setAnimationPreference(false));
  expect(container.querySelector('.rn-brief-transcript')).toHaveTextContent(row.text);
  act(()=>setAnimationPreference(true));
  unmount();
 }
 expect(fetch).not.toHaveBeenCalled();
});
test('corrections and unrelated scripts never inherit reviewed artwork',()=>{
 for(const row of records){expect(stagedFor(row.text)).not.toBeNull();expect(stagedFor(row.text+' Correction.')).toBeNull();}
 expect(stagedFor('Unrelated report.')).toBeNull();
});
