import { render, screen } from '@testing-library/react';
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
  expect(await screen.findByRole('button', { name: 'Swipe' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Listen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Scroll' })).toBeInTheDocument();
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
  expect(screen.getByRole('button', { name: 'Mon, Sep 14' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Sat, Sep 19' }));

  expect(await screen.findByRole('button', { name: 'Sat, Sep 19' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mon, Sep 14' })).not.toBeInTheDocument();
});
