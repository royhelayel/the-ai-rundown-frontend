import { act, renderHook, waitFor } from '@testing-library/react';
import useRadioRecaps from './useRadioRecaps';

test('a missing daily recap refreshes independently of the cached headline rows', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => [{ time_slot: 'Morning', briefing: '' }] })
    .mockResolvedValueOnce({ ok: true, json: async () => [{ time_slot: 'Morning', briefing: 'Newly checked recap.', briefing_sources: [] }] });
  const { result, unmount } = renderHook(() => useRadioRecaps({ active: true, categories: ['World News'], period: 'Daily', day: '2026-10-25', today: '2026-10-25', language: 'en', briefingData: { 'World News': { briefing: null } } }));
  await act(async () => { await Promise.resolve(); });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(result.current.rows['World News'].text).toBe('');
  await act(async () => { jest.advanceTimersByTime(60000); });
  await waitFor(() => expect(result.current.rows['World News'].text).toBe('Newly checked recap.'));
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(120000); });
  expect(fetch).toHaveBeenCalledTimes(2);
  unmount();
  jest.useRealTimers();
});

test('a changed edition never seeds its recap from the previous day or language',async()=>{
 let complete;
 global.fetch=jest.fn(()=>new Promise(resolve=>{complete=resolve;}));
 const {result}=renderHook(()=>useRadioRecaps({active:true,categories:['World News'],period:'Daily',day:'2026-10-26',today:'2026-10-26',language:'en',briefingData:{'World News':{editionDay:'2026-10-25',language:'en',briefing:'Yesterday recap.'}}}));
 expect(result.current.loading).toBe(true);expect(result.current.rows['World News'].text).toBe('');
 await act(async()=>{complete({ok:true,json:async()=>[{time_slot:'Morning',briefing:'Correct edition recap.'}]});});
 expect(result.current.loading).toBe(false);expect(result.current.rows['World News'].text).toBe('Correct edition recap.');
});
