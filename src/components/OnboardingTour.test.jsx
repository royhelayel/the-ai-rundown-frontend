import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingTour from './OnboardingTour';

test('five-step tour finishes only on the final action and restores body scrolling', () => {
  const onClose = jest.fn();
  document.body.style.overflow = 'auto';
  const { unmount } = render(<OnboardingTour onClose={onClose} />);
  expect(screen.getByRole('heading', { name: /Your daily podcast/ })).toBeInTheDocument();
  expect(document.body.style.overflow).toBe('hidden');
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Follow what matters to you.' })).toHaveFocus();
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Start exploring' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();
  expect(document.body.style.overflow).toBe('auto');
});

test('direct navigation, preview choices and back work without changing preferences', () => {
  const onClose = jest.fn();
  render(<OnboardingTour onClose={onClose} />);
  const previousStorage = { ...localStorage };
  fireEvent.click(screen.getByRole('button', { name: 'Read', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Text + audio', exact: true }));
  expect(screen.getByText('Your audio, with the text.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Last month' }));
  expect(screen.getByText('The month in perspective.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('button', { name: 'Text + audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect({ ...localStorage }).toEqual(previousStorage);
  fireEvent.click(screen.getByRole('button', { name: 'Skip', exact: true }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('Escape uses the existing dismiss callback', () => {
  const onClose = jest.fn();
  render(<OnboardingTour onClose={onClose} />);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
