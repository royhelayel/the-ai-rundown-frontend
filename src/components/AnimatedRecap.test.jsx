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
  expect(screen.getByRole('heading').textContent).toBe('B says plan is not final');
  fireEvent.click(screen.getByRole('button', { name: /Original reporting: Outlet B/ }));
  expect(open.mock.calls[0][0].items[0].sources[0].outlet).toBe('Outlet B');
  expect(open.mock.calls[0][0].items[0].summary).toContain('not final');
});

test('saved data-saving preference survives a new recap and no-source recaps still have a full text action', () => {
  localStorage.setItem('radionews_recap_animation', 'off');
  const open = jest.fn();
  render(<AnimatedRecap {...props} sourcesMap={null} onOpenSources={open} />);
  expect(screen.getByRole('button', { name: 'Turn animation on' }).getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Read this complete update' }));
  expect(open.mock.calls[0][0].items[0].summary).toBe('Company A has made an announcement.');
  expect(open.mock.calls[0][0].items[0].sources).toEqual([]);
});
