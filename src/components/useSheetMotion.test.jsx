import { act, fireEvent, render, screen } from '@testing-library/react';
import useSheetMotion from './useSheetMotion';

function Sheet({ onClose }) {
  const { closing, dismiss } = useSheetMotion(onClose);
  return <button onClick={dismiss}>{closing ? 'Closing' : 'Close'}</button>;
}
test('keeps the sheet mounted for its exit motion and dismisses only once', () => {
  jest.useFakeTimers();
  const close = jest.fn();
  render(<Sheet onClose={close} />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Closing')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(close).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(280));
  expect(close).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
