import { act, renderHook } from '@testing-library/react';
import usePlaybackWakeLock from './usePlaybackWakeLock';

const sentinel = () => ({ released: false, release: jest.fn().mockResolvedValue(), addEventListener: jest.fn() });
beforeEach(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }));
afterEach(() => { delete navigator.wakeLock; jest.restoreAllMocks(); });
test('holds one screen wake lock through playback and releases on pause', async () => {
  const lock = sentinel();
  navigator.wakeLock = { request: jest.fn().mockResolvedValue(lock) };
  const { rerender, unmount } = renderHook(({ playing }) => usePlaybackWakeLock(playing), { initialProps: { playing: false } });
  expect(navigator.wakeLock.request).not.toHaveBeenCalled();
  await act(async () => rerender({ playing: true }));
  expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
  rerender({ playing: false });
  expect(lock.release).toHaveBeenCalledTimes(1);
  unmount();
});
test('reacquires when the playing app returns to the foreground', async () => {
  const first = sentinel(), second = sentinel();
  navigator.wakeLock = { request: jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) };
  const { unmount } = renderHook(() => usePlaybackWakeLock(true));
  await act(async () => {});
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(first.release).toHaveBeenCalledTimes(1);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
  unmount();
  expect(second.release).toHaveBeenCalledTimes(1);
});
test('a pending grant is immediately released if playback stopped', async () => {
  let resolve;
  navigator.wakeLock = { request: jest.fn(() => new Promise(r => { resolve = r; })) };
  const { unmount } = renderHook(() => usePlaybackWakeLock(true));
  unmount();
  const lock = sentinel();
  await act(async () => resolve(lock));
  expect(lock.release).toHaveBeenCalledTimes(1);
});
test('unsupported and denied wake locks do not interfere with playback', async () => {
  const first = renderHook(() => usePlaybackWakeLock(true));
  first.unmount();
  navigator.wakeLock = { request: jest.fn().mockRejectedValue(new Error('Low power mode')) };
  const second = renderHook(() => usePlaybackWakeLock(true));
  await act(async () => {});
  expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
  second.unmount();
});
