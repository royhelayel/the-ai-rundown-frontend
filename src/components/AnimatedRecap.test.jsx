import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnimatedRecap from './AnimatedRecap';
import { setAnimationPreference } from '../hooks/useAnimationPreference';
import { clearStoryAnimationCache } from '../hooks/useStoryAnimations';
import edition from './__fixtures__/editorial-drawings.json';

const text = 'Company A has made an announcement. Company B says the plan is not final.';
const sources = [{ text: 'Company A has made an announcement.', stories: [{ headline: 'A announces a plan', sources: [{ outlet: 'Outlet A', url: 'https://a.example' }] }] },
  { text: 'Company B says the plan is not final.', stories: [{ headline: 'B says plan is not final', sources: [{ outlet: 'Outlet B', url: 'https://b.example' }] }] }];
const props = { text, sourcesMap: sources, category: 'Technology', progress: 0, playing: false, duration: 30, speed: 1 };
beforeEach(() => { localStorage.clear(); clearStoryAnimationCache(); global.fetch = jest.fn(() => new Promise(()=>{})); });

test('a reviewed edition drawing replaces the existing visual without changing its text or source action',async()=>{
  const entry=edition.entries[2], open=jest.fn();
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>({version:1,entries:[{text:entry.text,plan:entry.plan,status:'ready'}]})}));
  const {container}=render(<AnimatedRecap {...props} text={entry.text} sourcesMap={[{text:entry.text,stories:[{headline:'Trust bank approved',sources:[{outlet:'Original outlet',url:'https://source.example'}]}]}]} onOpenSources={open}/>);
  await waitFor(()=>expect(container.querySelector('[data-generated-animation="true"]')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:/Original reporting/}));
  expect(open.mock.calls[0][0].items[0].summary).toBe(entry.text);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('Microsoft uses its richer workforce explainer even when a generic drawing could exist',()=>{
 const text='Microsoft is offering buyouts to about 60,000 employees—roughly 27 percent of its workforce.';
 const {container,rerender}=render(<AnimatedRecap {...props} text={text} sourcesMap={[{text,stories:[]}]}/>);
 expect(container.querySelector('.rn-animated-recap-stage')).toHaveAttribute('data-scene','workforce');
 expect(container.querySelectorAll('.rn-recap-workforce>span')).toHaveLength(100);
 expect(fetch).not.toHaveBeenCalled();
 rerender(<AnimatedRecap {...props} text={text} sourcesMap={[{text,stories:[]}]} progress={90}/>);
 expect(container.querySelectorAll('.rn-recap-workforce>.is-highlighted')).toHaveLength(27);
});

test('an unavailable edition retains the existing visual instead of creating a blank or error card',async()=>{
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>({version:1,entries:[]})}));
  const {container}=render(<AnimatedRecap {...props}/>);
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
  expect(container.querySelector('.rn-animated-recap-stage')).not.toHaveAttribute('data-scene','generated');
  expect(screen.queryByText(/Animation is temporarily unavailable/)).not.toBeInTheDocument();
  expect(screen.getByRole('heading')).toHaveTextContent('A announces a plan');
});

test('animation toggle stays local and preserves the actual current update and sources', () => {
  const open = jest.fn();
  const { rerender, container } = render(<AnimatedRecap {...props} onOpenSources={open} />);
  act(() => setAnimationPreference(false));
  expect(localStorage.getItem('radionews_recap_animation')).toBe('off');
  expect(container.querySelector('video')).toBeNull();
  expect(container.querySelector('audio')).toBeNull();
  rerender(<AnimatedRecap {...props} progress={90} onOpenSources={open} />);
  expect(screen.getByRole('region', { name: 'Brief transcript' })).toHaveTextContent('Company A has made an announcement.');
  expect(screen.getByText('Company B says the plan is not final.')).toHaveAttribute('data-current', 'true');
  fireEvent.click(screen.getByRole('button', { name: /Original reporting: Outlet B/ }));
  expect(open.mock.calls[0][0].items[0].sources[0].outlet).toBe('Outlet B');
  expect(open.mock.calls[0][0].items[0].summary).toContain('not final');
});

test('saved animation preference survives a new recap without exposing an on-card toggle or more action', () => {
  localStorage.setItem('radionews_recap_animation', 'off');
  const open = jest.fn();
  render(<AnimatedRecap {...props} sourcesMap={null} onOpenSources={open} />);
  expect(screen.queryByRole('button', { name: /Turn animation/ })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Brief transcript' })).toHaveTextContent('Company A has made an announcement.');
  expect(screen.getByRole('region', { name: 'Brief transcript' })).toHaveTextContent('Company B says the plan is not final.');
  act(() => setAnimationPreference(true));
  expect(screen.queryByRole('region', { name: 'Brief transcript' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Read this complete update' })).not.toBeInTheDocument();
});


test('reading swipes vertically, preserves the source of the chosen update, and returns a seek target', () => {
  const change = jest.fn(), open = jest.fn();
  render(<AnimatedRecap {...props} reading onChangeReading={change} onOpenSources={open} />);
  const reader = screen.getByRole('region', { name: 'Swipeable news text' });
  expect(screen.queryByRole('button', { name: /Turn animation/ })).not.toBeInTheDocument();
  fireEvent.keyDown(reader, { key: 'ArrowDown' });
  expect(screen.getByRole('heading')).toHaveTextContent('B says plan is not final');
  fireEvent.click(screen.getByRole('button', { name: /Original reporting: Outlet B/ }));
  expect(open.mock.calls[0][0].items[0].sources[0].outlet).toBe('Outlet B');
  fireEvent.click(screen.getByRole('button', { name: 'Listen', exact: true }));
  expect(change.mock.calls[0][0]).toBe(false);
  expect(change.mock.calls[0][1]).toBeGreaterThan(0);
});

test('returning to Listen without a reading swipe preserves the exact audio position', () => {
  const change = jest.fn();
  render(<AnimatedRecap {...props} reading progress={90} onChangeReading={change} />);
  fireEvent.click(screen.getByRole('button', { name: 'Listen', exact: true }));
  expect(change).toHaveBeenCalledWith(false, undefined);
});

test('reading update boundaries advance the topic only when one exists', () => {
  const next = jest.fn(), previous = jest.fn();
  const { rerender } = render(<AnimatedRecap {...props} reading onNext={next} onPrev={previous} canNext />);
  const reader = screen.getByRole('region', { name: 'Swipeable news text' });
  fireEvent.keyDown(reader, { key: 'ArrowUp' }); expect(previous).not.toHaveBeenCalled();
  fireEvent.keyDown(reader, { key: 'ArrowDown' });
  fireEvent.keyDown(reader, { key: 'ArrowDown' }); expect(next).toHaveBeenCalledTimes(1);
  rerender(<AnimatedRecap {...props} reading onNext={next} onPrev={previous} />);
  fireEvent.keyDown(reader, { key: 'ArrowDown' }); expect(next).toHaveBeenCalledTimes(1);
});


test('audio captions show the complete current sentence, changing on narration and reverse seeking', () => {
  const text = 'Officials say the proposed launch could happen in 2027, but the date has not been confirmed by the company. Tests continue next month.';
  const propsWithText = { ...props, text, sourcesMap: [{ text, stories: [] }] };
  const { container, rerender } = render(<AnimatedRecap {...propsWithText} />);
  const caption = () => container.querySelector('.rn-animated-recap-caption p');
  expect(caption()).toHaveTextContent(text.split('. ')[0] + '.');
  expect(caption()).not.toHaveTextContent('Tests continue');
  expect(screen.queryByText('more')).not.toBeInTheDocument();
  rerender(<AnimatedRecap {...propsWithText} progress={95} />);
  expect(caption()).toHaveTextContent('Tests continue next month.');
  rerender(<AnimatedRecap {...propsWithText} progress={0} />);
  expect(caption()).toHaveTextContent('Officials say');
});

test('read status follows each original story in animated and reading presentations', () => {
  const getStoryAction = headline => ({ read: headline.startsWith('A'), interesting: false, toggle: jest.fn() });
  const { rerender } = render(<AnimatedRecap {...props} getStoryAction={getStoryAction} />);
  expect(screen.getByText('Read')).toBeInTheDocument();
  rerender(<AnimatedRecap {...props} progress={95} getStoryAction={getStoryAction} />);
  expect(screen.getByText('Unread')).toBeInTheDocument();
  rerender(<AnimatedRecap {...props} progress={95} reading getStoryAction={getStoryAction} />);
  expect(screen.getByText('Unread')).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('region', {name:'Swipeable news text'}), {key:'ArrowUp'});
  expect(screen.getByText('Read')).toBeInTheDocument();
});
