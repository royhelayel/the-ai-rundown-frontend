import { render, screen } from '@testing-library/react';
import RadioTranscript, { transcriptWords, wordAtProgress } from './RadioTranscript';
import { radioSnapshot } from '../data/useRadioRecaps';

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
