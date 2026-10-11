import { act, renderHook, waitFor } from "@testing-library/react";
import { useNews } from "./useNews";
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        is: () => q,
        abortSignal: () =>
          Promise.resolve({ data: [{ time_slot: "Morning" }], error: null }),
      };
      return q;
    },
  },
}));
const rows = [
  { time_slot: "Morning", content: "## Real headline\n- Summary." },
];
beforeEach(() => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => rows });
});
test("loads news and reports partial failure without hiding successful topics", async () => {
  fetch.mockImplementation((url) =>
    url.includes("Technology")
      ? Promise.reject(Error("offline"))
      : Promise.resolve({ ok: true, json: async () => rows }),
  );
  const { result } = renderHook(() => useNews("2026-10-11", "en", 0));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.failed).toContain("Technology");
  expect(result.current.data.Health.stories).toHaveLength(1);
  expect(result.current.error).toBe("");
});
test("stale date requests never paint old stories under a new date", async () => {
  let resolvers = [];
  fetch.mockImplementation((url) =>
    url.includes("2026-10-10")
      ? new Promise((resolve) => resolvers.push(resolve))
      : Promise.resolve({ ok: true, json: async () => rows }),
  );
  const { result, rerender } = renderHook(({ day }) => useNews(day, "en", 0), {
    initialProps: { day: "2026-10-10" },
  });
  await waitFor(() => expect(resolvers.length).toBeGreaterThan(0));
  rerender({ day: "2026-10-11" });
  expect(result.current.data).toEqual({});
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    resolvers.forEach((resolve) =>
      resolve({
        ok: true,
        json: async () => [
          { ...rows[0], content: "## Stale headline\n- Old." },
        ],
      }),
    );
  });
  expect(result.current.data.Health.stories[0].headline).toBe("Real headline");
});
