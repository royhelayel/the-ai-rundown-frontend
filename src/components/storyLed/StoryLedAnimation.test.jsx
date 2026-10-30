import React from 'react';
import { render } from '@testing-library/react';
import StoryLedAnimation from './StoryLedAnimation';
import { storyLedFor } from '../../lib/storyLedAnimations';
import stories from './approvedStories.json';

test.each(['devices','phobos','election','lockdown'])('%s has identical final artwork in Quick and Full and reversible seeking',story=>{
 const variants=stories.filter(s=>s.story===story).map(s=>storyLedFor(s.text));
 const {container,rerender}=render(<StoryLedAnimation illustration={variants[0]} phase={1}/>);
 const final=container.querySelector('svg').outerHTML;
 rerender(<StoryLedAnimation illustration={variants[1]} phase={1}/>);
 expect(container.querySelector('svg').outerHTML).toBe(final);
 rerender(<StoryLedAnimation illustration={variants[0]} phase={0}/>);
 const initial=container.querySelector('svg').outerHTML;
 expect(initial).not.toBe(final);
 rerender(<StoryLedAnimation illustration={variants[0]} phase={1}/>);
 rerender(<StoryLedAnimation illustration={variants[0]} phase={0}/>);
 expect(container.querySelector('svg').outerHTML).toBe(initial);
 rerender(<StoryLedAnimation illustration={variants[0]} phase={0} reduced/>);
 expect(container.querySelector('svg').outerHTML).toBe(final);
});
