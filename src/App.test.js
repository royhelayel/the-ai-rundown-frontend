import { render, screen, within, waitFor } from '@testing-library/react';
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

test('a returning guest lands on the home feed with the reading modes', async () => {
  renderForReturningGuest();
  expect(await screen.findByRole('button', { name: 'Swipe', exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Listen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Scroll', exact: true })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Swipe or scroll' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  expect(await screen.findByText('No stories available for this day.')).toBeInTheDocument();
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

test('summary choice is independent of Listen/Read, retains topic, and includes daily and period recaps', async () => {
  localStorage.setItem('radionews_summary_type', 'Headlines');
  localStorage.setItem(ONBOARDING_KEY, '1');
  window.history.pushState({}, '', '/listen');
  installSummaryFixtures();
  render(<App />);
  expect(await screen.findByText('reported', { exact: true, ignore: '[aria-hidden="true"] *' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Story order' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Story 2 of 2' }));
  expect(await screen.findByRole('heading', { name: 'Another World story' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Next story' }));
  expect(await screen.findByRole('heading', { name: 'Technology story' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Previous story' }));
  expect(await screen.findByRole('heading', { name: 'Another World story' })).toBeInTheDocument();
  await chooseSummary('Headlines', 'Daily recap');
  expect(await screen.findByRole('button', { name: 'Turn animation off' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /daily briefing/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Story order' })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Read', exact: true }));
  await waitFor(() => expect(window.location.pathname).toBe('/recaps'));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Player' })).not.toBeInTheDocument());
  expect(screen.queryByRole('slider', { name: 'Audio progress' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Swipe', exact: true })).not.toBeInTheDocument();
  await chooseSummary('Daily recap', 'Last week');
  expect(await screen.findByText('weekly', { exact: true, ignore: '[aria-hidden="true"] *' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Tech', exact: true }));
  expect(await screen.findByText(/weekly Tech recap isn't ready yet/)).toBeInTheDocument();
  // An unavailable topic must not silently substitute World, nor retain its text.
  expect(screen.queryByText('weekly', { exact: true })).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Listen', exact: true }));
  await waitFor(() => expect(window.location.pathname).toBe('/listen'));
  expect(await screen.findByText(/weekly Tech recap isn't ready yet/)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Player' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  userEvent.click(screen.getByRole('button', { name: 'World', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Verified weekly recap.' })).toBeInTheDocument();
  await chooseSummary('Last week', 'Last month');
  expect(await screen.findByRole('heading', { name: 'Verified monthly recap.' })).toBeInTheDocument();
  await chooseSummary('Last month', 'Headlines');
  expect(await screen.findByRole('button', { name: 'Next story' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Turn animation/ })).not.toBeInTheDocument();
});

test('Read headlines exposes summary choices and restores its previous reading route', async () => {
  localStorage.setItem('rundown_read_mode', 'scroll');
  installSummaryFixtures();
  renderForReturningGuest();
  expect(await screen.findByRole('group', { name: 'Summary type' })).toBeInTheDocument();
  await chooseSummary('Headlines', 'Daily recap');
  expect(await screen.findByText('daily', { exact: true, ignore: '[aria-hidden="true"] *' })).toBeInTheDocument();
  await chooseSummary('Daily recap', 'Headlines');
  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(screen.getByRole('button', { name: 'Story order' })).toBeInTheDocument();
});

test('first-time listeners open daily recaps and returning listeners keep their summary choice', async () => {
 localStorage.setItem(ONBOARDING_KEY,'1');window.history.pushState({},'', '/listen');installSummaryFixtures();
 const first=render(<App />);
 expect(await screen.findByRole('button',{name:'Daily recap',exact:true})).toHaveAttribute('aria-pressed','true');
 await chooseSummary('Daily recap','Headlines');first.unmount();
 render(<App />);
 expect(await screen.findByRole('button',{name:'Headlines',exact:true})).toHaveAttribute('aria-pressed','true');
});
