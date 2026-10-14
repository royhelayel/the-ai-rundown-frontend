import {
  categoryStyle,
  collectionStories,
  daysFrom,
  normalizePrefs,
  normalizeRows,
  narration,
  periodDates,
  pillWindow,
  sources,
} from "./model";
import { CATEGORY_COLORS } from "../theme";
const row = (slot, title) => ({
  time_slot: slot,
  content: `## ${title}\n- A summary.\n**Coverage:** [Outlet](https://example.org/article)`,
  briefing: `${slot} recap`,
});
test("eight archive dates cross months and leap years safely", () => {
  expect(daysFrom("2024-03-01")).toHaveLength(8);
  expect(daysFrom("2024-03-01")[1]).toBe("2024-02-29");
  expect(daysFrom("2026-01-01")[7]).toBe("2025-12-25");
});
test("evening replaces carried-forward morning stories", () => {
  const d = normalizeRows(
    [row("Morning", "Old headline"), row("Evening", "Updated headline")],
    "Technology",
    "2026-10-11",
    "en",
  );
  expect(d.stories.map((s) => s.headline)).toEqual(["Updated headline"]);
  expect(d.briefing).toBe("Evening recap");
  expect(d.stories[0]).toMatchObject({
    day: "2026-10-11",
    language: "en",
    index: 0,
  });
});
test("missing and corrupted preferences never empty the topic queue or create invalid settings", () => {
  expect(normalizePrefs(null).topics.length).toBeGreaterThan(0);
  expect(
    normalizePrefs({ topics: ["unknown"], speed: 100, size: "tiny" }).speed,
  ).toBe(1);
  expect(normalizePrefs({ topics: ["AI", "AI"] }).topics).toEqual(["AI"]);
});
test("recaps appear only on publication dates including leap month ends", () => {
  expect(periodDates("2026-10-10")).toEqual({ Weekly: null, Monthly: null });
  expect(periodDates("2026-10-11").Weekly).toBe("2026-10-11");
  expect(periodDates("2024-02-29").Monthly).toBe("2024-02-29");
  expect(periodDates("2026-05-31")).toEqual({
    Weekly: "2026-05-31",
    Monthly: "2026-05-31",
  });
});
test("discovery changes its category set without leaking another date or snapshot language", () => {
  const data = {
    Technology: {
      stories: [{ headline: "A", category: "Technology", day: "2026-10-11" }],
    },
    Health: {
      stories: [{ headline: "B", category: "Health", day: "2026-10-11" }],
    },
  };
  const interests = [
    { headline: "A", category: "Technology", day: "2026-10-10", count: 10 },
    { headline: "B", category: "Health", day: "2026-10-11", count: 2 },
  ];
  expect(
    collectionStories(data, "interesting", interests, {}, [
      "Technology",
      "Health",
    ]).map((s) => s.category),
  ).toEqual(["Health"]);
  expect(
    collectionStories(data, "popular", [], { a: 2 }, [
      "Technology",
      "Health",
    ]).map((s) => s.headline),
  ).toEqual(["A"]);
});
test("progress stays bounded and includes current story at both ends", () => {
  expect(pillWindow(100, 99)).toEqual([93, 94, 95, 96, 97, 98, 99]);
  expect(pillWindow(2, 0)).toEqual([0, 1]);
  expect(pillWindow(0, 0)).toEqual([]);
});
test("outlet links reject unsafe protocols and remove duplicates", () => {
  expect(
    sources({
      storySources: [
        { url: ["java", "script:alert(1)"].join("") },
        { url: "https://example.org/a" },
        { url: "https://example.org/a" },
      ],
    }),
  ).toHaveLength(1);
});
test("story narration matches the v1 audio cache script", () => {
  expect(narration({
    headline: "A new study",
    tightBullets: ["Finding one", "Finding two"],
    perspectives: "Researchers disagree",
    why: "It may change care",
    language: "en",
  })).toBe("A new study. Finding one. Finding two. On the other hand, Researchers disagree. Here is why this matters. It may change care.");
});
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
test.each(Object.keys(CATEGORY_COLORS))(
  "%s category text meets AA contrast in both themes",
  (cat) => {
    for (const dark of [false, true]) {
      const style = categoryStyle(cat, dark);
      expect(
        contrast(style["--topic"], dark ? "#101113" : "#f5f5ef"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(style["--topic-panel"], style["--topic-ink"]),
      ).toBeGreaterThanOrEqual(4.5);
    }
  },
);
