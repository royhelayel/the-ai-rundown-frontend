import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ONBOARDING_KEY } from './components/OnboardingTour';

// Smoke tests for the whole app: render <App /> the way a guest would see it, with
// Supabase and every network call stubbed out, and check the home feed comes up.

// react-router v7 publishes only an "exports" map, which the Jest 27 bundled with
// react-scripts 5 can't read. Point the two specifiers App uses at their CommonJS builds.
// It also expects TextEncoder, which Jest 27's jsdom doesn't provide.
jest.mock('react-router-dom', () => {
  const { TextEncoder, TextDecoder } = jest.requireActual('util');
  Object.assign(global, { TextEncoder, TextDecoder });
  return jest.requireActual('../node_modules/react-router-dom/dist/index.js');
}, { virtual: true });
jest.mock('react-router/dom', () => jest.requireActual('../node_modules/react-router/dist/development/dom-export.js'), { virtual: true });

// Rows the `__completed__` query returns: one per edition that has finished generating.
let mockCompletedRows = [];

// Every Supabase query builder method returns the builder, and awaiting it resolves to
// no rows, except the completed-editions query, which gets mockCompletedRows.
jest.mock('@supabase/supabase-js', () => {
  const makeQuery = () => {
    let completed = false;
    const query = new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'then') {
          const result = { data: completed ? mockCompletedRows : [], error: null };
          return (res, rej) => Promise.resolve(result).then(res, rej);
        }
        if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
        if (prop === 'eq') return (col, val) => { if (col === 'category' && val === '__completed__') completed = true; return query; };
        return () => query;
      },
    });
    return query;
  };
  return {
    createClient: () => ({
      from: () => makeQuery(),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
    }),
  };
});

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  mockCompletedRows = [];

  // Browser APIs jsdom doesn't implement.
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();

  // The backend and /api/news: every request succeeds with an empty body.
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
});

// A returning guest: skip the first-run tour so the feed is what's on screen.
const renderForReturningGuest = () => {
  localStorage.setItem(ONBOARDING_KEY, '1');
  return render(<App />);
};

test('a first-time visitor sees the onboarding tour', async () => {
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Skip' })).toBeInTheDocument();
});

test('a returning guest defaults to the unified audio page even with no generated news', async () => {
  renderForReturningGuest();
  await waitFor(() => expect(window.location.pathname).toBe('/listen'));
  expect(await screen.findByRole('button', { name: 'Quick brief', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('group', { name: 'How you take in the news' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  expect(await screen.findByText(/No quick brief is available/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
});

test('the edition picker opens on the latest edition and switches to an earlier day', async () => {
  // 2026-09-20 is a Sunday.
  mockCompletedRows = [
    { day: '2026-09-19', time_slot: 'Morning' },
    { day: '2026-09-19', time_slot: 'Evening' },
    { day: '2026-09-20', time_slot: 'Morning' },
  ];
  renderForReturningGuest();

  // With no edition today, the feed jumps to the newest day that has one.
  await waitFor(() => expect(window.location.pathname).toBe('/listen'));
  const picker = await screen.findByRole('button', { name: 'Sun, Sep 20' });
  userEvent.click(picker);

  // The picker lists the week ending on that day.
  expect(screen.getByRole('menuitemradio', { name: 'Mon, Sep 14' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('menuitemradio', { name: 'Sat, Sep 19' }));

  expect(await screen.findByRole('button', { name: 'Sat, Sep 19' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitemradio', { name: 'Mon, Sep 14' })).not.toBeInTheDocument();
});

const installSummaryFixtures = () => {
  mockCompletedRows = [{ day: '2026-09-20', time_slot: 'Morning' }];
  global.fetch = jest.fn((url) => {
    const params = new URL(String(url), 'http://localhost').searchParams;
    if (String(url).startsWith('/api/news') && params.get('mode') === 'list') {
      const category = params.get('category');
      const rows = ['World News', 'Technology'].includes(category) ? [{
        time_slot: 'Morning', content: `## ${category} story\n**Coverage:** [Example](https://example.com/news)\n- A reported fact.${category === 'World News' ? '\n\n## Another World story\n- A second verified fact.' : ''}`,
        briefing: `${category} daily briefing. This final sentence must remain visible.`,
      }] : [];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(rows) });
    }
    if (String(url).startsWith('/api/news') && params.get('mode') === 'one') {
      const text = params.get('timeSlot') === 'Weekly' ? 'Verified weekly recap.' : 'Verified monthly recap.';
      return Promise.resolve({ ok: true, json: () => Promise.resolve(params.get('category') === 'Technology' ? null : { briefing: text, briefing_sources: [] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
  });
};
const chooseSummary = async (currentLabel, nextLabel) => {
  const strip = await screen.findByRole('group', { name: 'Summary type' });
  expect(within(strip).getByRole('button', { name: currentLabel, exact: true })).toHaveAttribute('aria-pressed', 'true');
  userEvent.click(within(strip).getByRole('button', { name: nextLabel, exact: true }));
  await waitFor(() => expect(within(screen.getByRole('group', { name: 'Summary type' })).getByRole('button', { name: nextLabel, exact: true })).toHaveAttribute('aria-pressed', 'true'));
};

test('one page supports animated audio, text/audio and text only across all four briefs', async () => {
  localStorage.setItem(ONBOARDING_KEY, '1');
  window.history.pushState({}, '', '/listen'); installSummaryFixtures(); render(<App />);
  await screen.findByRole('button', { name: 'Turn animation off' });
  userEvent.click(screen.getByRole('button', { name: 'Turn animation off' }));
  expect(screen.getByRole('region', { name: 'Brief transcript' })).toHaveTextContent('daily briefing');
  expect(screen.getByRole('region', { name: 'Player' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Read', exact: true }));
  expect(window.location.pathname).toBe('/listen');
  expect(screen.getByRole('region', { name: 'Swipeable news text' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Player' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play', exact: true })).not.toBeInTheDocument();
  await chooseSummary('Quick brief', 'Last week');
  expect(await screen.findByRole('heading', { name: 'Verified weekly recap.' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Tech', exact: true }));
  expect(await screen.findByText(/No weekly brief is available for Tech/)).toBeInTheDocument();
  expect(screen.queryByText('Verified weekly recap.')).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Listen', exact: true }));
  expect(screen.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: 'World', exact: true }));
  expect(await screen.findByRole('region', { name: 'Brief transcript' })).toHaveTextContent('Verified weekly recap.');
  await chooseSummary('Last week', 'Last month');
  expect(await screen.findByText('Verified monthly recap.')).toBeInTheDocument();
  await chooseSummary('Last month', 'Full brief');
  expect(await screen.findByRole('region', { name: 'Brief transcript' })).toHaveTextContent('A reported fact.');
  userEvent.click(screen.getByRole('button', { name: 'Read', exact: true }));
  expect(screen.getByRole('heading', { name: 'World News story' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Next reading update' }));
  expect(await screen.findByRole('heading', { name: 'Another World story' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Next reading update' }));
  expect(await screen.findByRole('heading', { name: 'Technology story' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play', exact: true })).not.toBeInTheDocument();
});

test('summary preference survives reload, old reading preference no longer bypasses the unified page', async () => {
  localStorage.setItem(ONBOARDING_KEY, '1'); localStorage.setItem('rundown_read_mode', 'swipe');
  installSummaryFixtures(); const first = render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe('/listen'));
  await chooseSummary('Quick brief', 'Full brief'); first.unmount();
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Full brief', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByRole('button', { name: 'Turn animation off' })).toBeInTheDocument();
});

test('old recap links open text-only on the unified page without audio autoplay', async () => {
  localStorage.setItem(ONBOARDING_KEY, '1'); window.history.pushState({}, '', '/recaps');
  installSummaryFixtures(); render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe('/listen'));
  expect(await screen.findByRole('region', { name: 'Swipeable news text' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play', exact: true })).not.toBeInTheDocument();
});
