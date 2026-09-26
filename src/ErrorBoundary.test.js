import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('bad story data');
}

test('shows the error instead of a blank page when a child throws', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<ErrorBoundary><Boom /></ErrorBoundary>);
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  expect(screen.getByText(/bad story data/)).toBeInTheDocument();
  spy.mockRestore();
});
