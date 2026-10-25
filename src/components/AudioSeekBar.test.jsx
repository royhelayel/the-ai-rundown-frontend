import { fireEvent, render, screen } from '@testing-library/react';
import AudioSeekBar from './AudioSeekBar';

test('dragging previews the position and seeks once on release', () => {
  const seek = jest.fn();
  render(<AudioSeekBar progress={10} duration={100} onSeek={seek} />);
  const bar = screen.getByRole('slider', { name: 'Audio progress' });
  fireEvent.pointerDown(bar);
  fireEvent.change(bar, { target: { value: '60' } });
  expect(seek).not.toHaveBeenCalled();
  expect(bar).toHaveAttribute('aria-valuetext', '1:00 of 1:40');
  fireEvent.pointerUp(bar);
  expect(seek).toHaveBeenCalledTimes(1);
  expect(seek).toHaveBeenCalledWith(60);
});
test('keyboard changes seek immediately, while canceling a drag never commits it', () => {
  const seek = jest.fn();
  render(<AudioSeekBar progress={10} duration={100} onSeek={seek} />);
  const bar = screen.getByRole('slider');
  fireEvent.change(bar, { target: { value: '20' } });
  expect(seek).toHaveBeenCalledWith(20);
  seek.mockClear();
  fireEvent.pointerDown(bar);
  fireEvent.change(bar, { target: { value: '80' } });
  fireEvent.pointerCancel(bar);
  expect(seek).not.toHaveBeenCalled();
});
