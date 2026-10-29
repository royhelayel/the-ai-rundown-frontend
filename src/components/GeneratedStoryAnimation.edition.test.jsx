import { render } from '@testing-library/react';
import GeneratedStoryAnimation, { safeGeneratedAnimation, animationPose } from './GeneratedStoryAnimation';
import edition from './__fixtures__/editorial-drawings.json';

test('actual edition drawings pass the browser renderer and reversible motion checks',()=>{
 for(const {plan,text} of edition.entries) {
  expect(safeGeneratedAnimation(plan,text)).toBe(true);
  for(const el of plan.elements) for(const phase of [0,.25,.5,.75,1,0]) {
   expect(Object.values(animationPose(el.frames,phase)).every(Number.isFinite)).toBe(true);
  }
 }
});
test('actual waxcap, phone and financial drawings render vectors and meaningful source labels',()=>{
 for(const query of ['18 waxcap species','inner display cracking','national trust bank']) {
  const entry=edition.entries.find(e=>e.text.includes(query));expect(entry).toBeTruthy();
  const {container,unmount}=render(<GeneratedStoryAnimation plan={entry.plan} text={entry.text} phase={.5}/>);
  expect(container.querySelector('[data-generated-animation="true"]')).toBeInTheDocument();
  expect(container.querySelectorAll('svg path,svg rect,svg circle,svg ellipse,svg polygon').length).toBeGreaterThanOrEqual(4);
  expect(container.querySelector('video,image,iframe,script,foreignObject')).toBeNull();unmount();
 }
});
