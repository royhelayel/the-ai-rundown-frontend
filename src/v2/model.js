import { buildStories } from "../lib/stories";
import { CATEGORY_COLORS } from "../theme";
import { cleanForTTS } from "../audio/narrationText";

export const CATEGORIES = Object.keys(CATEGORY_COLORS);
export const DEFAULT_TOPICS = CATEGORIES.filter(
  (c) => !["AI", "Crypto", "Football", "Basketball"].includes(c),
);
export const MODES = ["listen", "swipe", "scroll"];
export const DEFAULT_PREFS = {
  theme: "system",
  size: "standard",
  language: "en",
  speed: 1,
  start: "last",
  lastMode: "listen",
  motion: "system",
  topics: DEFAULT_TOPICS,
  goal: 10,
};
export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function normalizePrefs(value = {}) {
  const p = { ...DEFAULT_PREFS };
  const enums = {
    theme: ["system", "light", "dark"],
    size: ["standard", "large", "extra"],
    language: ["en", "ar"],
    speed: [0.75, 1, 1.25, 1.5, 2],
    start: ["last", ...MODES],
    lastMode: MODES,
    motion: ["system", "reduce"],
    goal: [5, 10, 15, 20],
  };
  Object.entries(enums).forEach(([key, values]) => {
    if (values.includes(value?.[key])) p[key] = value[key];
  });
  if (Array.isArray(value?.topics)) {
    const cats = [
      ...new Set(value.topics.filter((c) => CATEGORIES.includes(c))),
    ];
    if (cats.length) p.topics = cats;
  }
  return p;
}
export function daysFrom(today) {
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    return d.toISOString().slice(0, 10);
  });
}
export function dateLabel(day) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
export function headlineKey(h = "") {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .slice(0, 50);
}
export function storyId(s) {
  return [s.day, s.language, s.category, s.headline].join("|");
}
export function sources(story) {
  return (story?.storySources || []).filter(
    (s, i, a) =>
      typeof s.url === "string" &&
      /^https?:\/\//i.test(s.url) &&
      a.findIndex((x) => x.url === s.url) === i,
  );
}
export function paragraphs(story) {
  return story?.summary
    ? [cleanForTTS(story.summary)]
    : (story?.tightBullets?.length
        ? story.tightBullets
        : story?.allBullets || []
      ).map(cleanForTTS);
}
export function narration(story) {
  if (story.recap) return cleanForTTS([story.headline, ...paragraphs(story)].join(". "));
  // Match v1's deep story script exactly: the server cache is keyed by this text.
  const parts = [cleanForTTS(story.headline) + "."];
  (story.tightBullets || story.allBullets || []).forEach((bullet) =>
    parts.push(cleanForTTS(bullet) + "."),
  );
  if (story.perspectives)
    parts.push(
      (story.language === "ar" ? "وجهات النظر تتباين. " : "On the other hand, ") +
        cleanForTTS(story.perspectives) + ".",
    );
  if (story.why)
    parts.push(
      (story.language === "ar" ? "لماذا هذا مهم. " : "Here is why this matters. ") +
        cleanForTTS(story.why) + ".",
    );
  return parts.filter(Boolean).join(" ");
}
export function normalizeRows(rows, category, day, language) {
  const order = ["Evening", "Daily", "Morning"];
  let sorted = rows
    .filter((r) => r && order.includes(r.time_slot))
    .sort((a, b) => order.indexOf(a.time_slot) - order.indexOf(b.time_slot));
  if (sorted.some((r) => r.time_slot === "Evening"))
    sorted = sorted.filter((r) => r.time_slot !== "Morning");
  const seen = new Set();
  const stories = sorted
    .flatMap((row) =>
      buildStories(row.content, row.stories_content).stories.map((s) => ({
        ...s,
        category,
        day,
        language,
        generatedSlot: row.time_slot,
      })),
    )
    .filter((s) => {
      const id = storyId(s);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((s, index) => ({ ...s, index, id: storyId(s) }));
  return {
    stories,
    briefing: sorted.find((r) => r.briefing?.trim())?.briefing || "",
  };
}
export function collectionStories(data, lens, interests, reads, topics) {
  const live = topics.flatMap((c) => data[c]?.stories || []);
  if (lens === "latest") return live;
  if (lens === "popular")
    return live
      .filter((s) => (reads[headlineKey(s.headline)] || 0) > 0)
      .sort(
        (a, b) =>
          (reads[headlineKey(b.headline)] || 0) -
          (reads[headlineKey(a.headline)] || 0),
      );
  // Match discovery snapshots to this date AND language's live stories. The legacy
  // discovery endpoint doesn't tag language, so never display its text directly.
  const counts = new Map(
    interests.map((s) => [
      [s.day, s.category, s.headline || s.content_snapshot?.headline].join("|"),
      s.count || 0,
    ]),
  );
  return live
    .map((s) => ({
      ...s,
      interestCount: counts.get([s.day, s.category, s.headline].join("|")) || 0,
    }))
    .filter((s) => s.interestCount > 0)
    .sort((a, b) => b.interestCount - a.interestCount);
}
export function periodDates(day) {
  const d = new Date(`${day}T12:00:00Z`);
  return {
    Weekly: d.getUTCDay() === 0 ? day : null,
    Monthly:
      d.getUTCDate() ===
      new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
      ).getUTCDate()
        ? day
        : null,
  };
}
export function pillWindow(total, index, max = 7) {
  const start = Math.max(0, Math.min(index - Math.floor(max / 2), total - max));
  return Array.from({ length: Math.min(total, max) }, (_, i) => start + i);
}
function mix(hex, target, amount) {
  const n = parseInt(hex.slice(1), 16);
  return (
    "#" +
    [n >> 16, (n >> 8) & 255, n & 255]
      .map((x) =>
        Math.round(x + (target - x) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function categoryStyle(category, dark) {
  const base = CATEGORY_COLORS[category] || "#4517cf";
  return {
    "--topic": mix(base, dark ? 255 : 0, dark ? 0.55 : 0.46),
    "--topic-panel": mix(base, 255, 0.79),
    "--topic-ink": "#142016",
  };
}
