import { act, renderHook, waitFor } from "@testing-library/react";
import useAudio from "./useAudio";
const items = [
  {
    id: "a",
    headline: "A",
    category: "Technology",
    tightBullets: ["Summary A"],
  },
  { id: "b", headline: "B", category: "Health", tightBullets: ["Summary B"] },
];
let audios = [];
beforeEach(() => {
  audios = [];
  global.URL.createObjectURL = jest.fn(() => `blob:test-${audios.length}`);
  global.URL.revokeObjectURL = jest.fn();
  global.Audio = jest.fn().mockImplementation(() => {
    const a = {
      paused: true,
      duration: 60,
      currentTime: 0,
      play: jest.fn(function () {
        this.paused = false;
        this.onplay?.();
        return Promise.resolve();
      }),
      pause: jest.fn(function () {
        this.paused = true;
        this.onpause?.();
      }),
      load: jest.fn(),
    };
    audios.push(a);
    return a;
  });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(["sound"])),
  });
});
test("autoadvances through categories, credits completion once, and ends without looping", async () => {
  const complete = jest.fn();
  const { result } = renderHook(() => useAudio(1, complete));
  await act(() => result.current.start(items, 0));
  expect(result.current.item.id).toBe("a");
  await act(() => audios[0].onended());
  await waitFor(() => expect(result.current.item.id).toBe("b"));
  expect(complete).toHaveBeenCalledWith(items[0]);
  act(() => audios[1].onended());
  expect(result.current.status).toBe("ended");
  expect(complete).toHaveBeenCalledTimes(2);
});
test("late audio response cannot override a newer queue", async () => {
  let resolve;
  fetch.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const { result } = renderHook(() => useAudio(1, () => {}));
  let first;
  act(() => {
    first = result.current.start(items, 0);
  });
  await act(() => result.current.start(items, 1));
  await act(async () => {
    resolve({ ok: true, blob: () => Promise.resolve(new Blob(["old"])) });
    await first;
  });
  expect(result.current.item.id).toBe("b");
  expect(audios).toHaveLength(1);
});
test("pause, seek and speed work without restarting queue; unmount releases audio", async () => {
  const { result, rerender, unmount } = renderHook(
    ({ speed }) => useAudio(speed, () => {}),
    { initialProps: { speed: 1 } },
  );
  await act(() => result.current.start(items, 0));
  act(() => result.current.toggle());
  expect(result.current.status).toBe("paused");
  act(() => result.current.seek(99));
  expect(audios[0].currentTime).toBe(60);
  rerender({ speed: 1.5 });
  expect(audios[0].playbackRate).toBe(1.5);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
test("failed audio exposes retry and does not mark the story read", async () => {
  fetch.mockRejectedValueOnce(new Error("offline"));
  const complete = jest.fn();
  const { result } = renderHook(() => useAudio(1, complete));
  await act(() => result.current.start(items, 0));
  expect(result.current.status).toBe("error");
  expect(complete).not.toHaveBeenCalled();
  await act(() => result.current.toggle());
  expect(result.current.status).toBe("playing");
});

test("Arabic never uses the English TTS endpoint when no device voice exists", async () => {
  const { result } = renderHook(() => useAudio(1, () => {}));
  await act(() => result.current.start([{ ...items[0], language: "ar" }], 0));
  expect(fetch).not.toHaveBeenCalled();
  expect(result.current.status).toBe("error");
  expect(result.current.error).toContain("Arabic device voice");
});
