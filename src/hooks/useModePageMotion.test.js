import { renderHook } from '@testing-library/react';
import useModePageMotion from './useModePageMotion';
test('mode changes move in opposite directions without animating the initial load', () => {
  const surface = document.createElement('div');
  surface.dataset.modeSurface = 'swipe';
  surface.animate = jest.fn(() => ({ cancel: jest.fn() }));
  document.body.append(surface);
  const { rerender, unmount } = renderHook(({ mode }) => useModePageMotion(mode), { initialProps: { mode: 'audio' } });
  expect(surface.animate).not.toHaveBeenCalled();
  rerender({ mode: 'swipe' });
  expect(surface.animate.mock.calls[0][0][0].translate).toBe('48px 0');
  surface.dataset.modeSurface = 'audio';
  rerender({ mode: 'audio' });
  expect(surface.animate.mock.calls[1][0][0].translate).toBe('-48px 0');
  unmount(); surface.remove();
});
