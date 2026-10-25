import { render, screen } from '@testing-library/react';
import RadioTranscript, { transcriptWords, wordAtProgress } from './RadioTranscript';
import { radioSnapshot, headlineRadioSnapshot } from '../data/useRadioRecaps';

test('radio queue contains only available recap texts in category order', () => {
  const map = radioSnapshot(['World', 'Tech', 'Health'], { World: { text: 'World briefing.' }, Tech: { text: ' ' }, Health: { text: 'Health briefing.' } }, 'Daily');
  expect(Object.keys(map)).toEqual(['World', 'Health']);
  expect(map.World.allStories[0]).toMatchObject({ summary: 'World briefing.', _isBriefing: true, _recapPeriod: 'Daily' });
});
test('word boundaries take priority over estimated audio progress', () => {
  const words = transcriptWords('Hello world. Another story.');
  expect(wordAtProgress(words, 90, 6)).toBe(1);
  expect(wordAtProgress(words, 0)).toBe(0);
  expect(wordAtProgress(words, 100)).toBe(3);
  expect(wordAtProgress([], 20)).toBe(-1);
});
test('transcript remains complete and highlighting follows the current word', () => {
  const { rerender } = render(<RadioTranscript text="Hello world." progress={0} charOffset={0} active phoneVoice />);
  expect(screen.getByText('Hello')).toHaveAttribute('data-narrated-word', 'true');
  rerender(<RadioTranscript text="Hello world." progress={80} charOffset={6} active phoneVoice />);
  expect(screen.getByText('world.')).toHaveAttribute('data-narrated-word', 'true');
  expect(screen.getByText('Hello')).not.toHaveAttribute('data-narrated-word');
});

test('scrolls only the transcript when the narrated word leaves its visible area', () => {
  const { rerender } = render(<RadioTranscript text="Hello world." progress={0} charOffset={0} active />);
  const box = screen.getByLabelText('Recap transcript');
  Object.defineProperty(box, 'clientHeight', { value: 200 });
  box.scrollTo = jest.fn();
  Object.defineProperty(box, 'scrollHeight', { value: 1000 });
  box.getBoundingClientRect = () => ({ top: 100, bottom: 300 });
  screen.getByText('world.').parentElement.getBoundingClientRect = () => ({ top: 330, bottom: 350 });
  rerender(<RadioTranscript text="Hello world." progress={80} charOffset={6} active />);
  expect(box.scrollTo).toHaveBeenCalledWith({ top: 182, behavior: 'smooth' });
});

test('daily listening uses the same complete summaries and skips empty categories', () => {
  const story = { headline: 'A headline', summary: 'The verified summary.', storySources: [{ outlet: 'AP', url: 'https://example.com' }] };
  const map = headlineRadioSnapshot(['Health', 'World'], { Health: { allStories: [] }, World: { allStories: [story, { headline: 'Empty' }] } });
  expect(Object.keys(map)).toEqual(['World']);
  expect(map.World.allStories).toEqual([story]);
  expect(map.World.allStories[0]._isBriefing).toBeUndefined();
});

test('headline audio keeps the full text without word emphasis', () => {
  const { container } = render(<RadioTranscript text="Hello world." progress={50} active highlight={false} />);
  expect(screen.getByText('world.')).toBeInTheDocument();
  expect(container.querySelector('[data-narrated-word]')).toBeNull();
  expect(container.querySelector('.rn-radio-word')).toBeNull();
});
