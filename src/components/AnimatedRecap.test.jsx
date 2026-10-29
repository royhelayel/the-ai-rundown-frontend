import { fireEvent, render, screen } from '@testing-library/react';
import AnimatedRecap from './AnimatedRecap';

const text = 'Company A has made an announcement. Company B says the plan is not final.';
const sources = [{ text: 'Company A has made an announcement.', stories: [{ headline: 'A announces a plan', sources: [{ outlet: 'Outlet A', url: 'https://a.example' }] }] },
  { text: 'Company B says the plan is not final.', stories: [{ headline: 'B says plan is not final', sources: [{ outlet: 'Outlet B', url: 'https://b.example' }] }] }];
const props = { text, sourcesMap: sources, category: 'Technology', progress: 0, playing: false, duration: 30, speed: 1 };
beforeEach(() => { localStorage.clear(); });

test('animation toggle stays local and preserves the actual current update and sources', () => {
  const open = jest.fn();
  const { rerender, container } = render(<AnimatedRecap {...props} onOpenSources={open} />);
  fireEvent.click(screen.getByRole('button', { name: 'Turn animation off' }));
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

test('saved data-saving preference survives a new recap and no-source recaps still have a full text action', () => {
  localStorage.setItem('radionews_recap_animation', 'off');
  const open = jest.fn();
  render(<AnimatedRecap {...props} sourcesMap={null} onOpenSources={open} />);
  expect(screen.getByRole('button', { name: 'Turn animation on' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('region', { name: 'Brief transcript' })).toHaveTextContent('Company A has made an announcement.');
  expect(screen.getByRole('region', { name: 'Brief transcript' })).toHaveTextContent('Company B says the plan is not final.');
  fireEvent.click(screen.getByRole('button', { name: 'Turn animation on' }));
  fireEvent.click(screen.getByRole('button', { name: 'Read this complete update' }));
  expect(open.mock.calls[0][0].items[0].summary).toBe('Company A has made an announcement.');
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
