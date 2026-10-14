import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RadioNewsV2 from "./RadioNewsV2";
import { normalizeRows } from "./model";
import { toUAEDate } from "../lib/uaeTime";
import { MemoryRouter } from "react-router-dom";
jest.mock(
  "react-router-dom",
  () => {
    const { TextEncoder, TextDecoder } = jest.requireActual("util");
    Object.assign(global, { TextEncoder, TextDecoder });
    return jest.requireActual(
      "../../node_modules/react-router-dom/dist/index.js",
    );
  },
  { virtual: true },
);
jest.mock(
  "react-router/dom",
  () =>
    jest.requireActual(
      "../../node_modules/react-router/dist/development/dom-export.js",
    ),
  { virtual: true },
);
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
  },
}));
let mockNews;
jest.mock("./useNews", () => ({
  useNews: () => mockNews,
  useInterests: () => ({ items: [], loading: false, error: "" }),
  jsonRequest: jest.fn().mockResolvedValue(null),
}));
const today = toUAEDate();
async function mount(mode = "listen") {
  let view;
  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={[`/preview/v2?mode=${mode}`]}>
        <RadioNewsV2 />
      </MemoryRouter>,
    );
  });
  return view;
}
beforeEach(() => {
  localStorage.clear();
  mockNews = {
    loading: false,
    error: "",
    failed: [],
    data: {
      Technology: normalizeRows(
        [
          {
            time_slot: "Morning",
            content:
              "## First tech story\n- Short summary.\n**Coverage:** [Outlet](https://example.org/a)\n## Second tech story\n- Another summary.",
          },
        ],
        "Technology",
        today,
        "en",
      ),
      Health: normalizeRows(
        [
          {
            time_slot: "Morning",
            content: "## Health story\n- Health summary.",
          },
        ],
        "Health",
        today,
        "en",
      ),
    },
  };
  window.matchMedia = jest.fn(() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.HTMLElement.prototype.scrollTo = jest.fn();
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(new Blob(["sound"])),
  });
  URL.createObjectURL = jest.fn(() => "blob:test");
  URL.revokeObjectURL = jest.fn();
  global.Audio = jest.fn().mockImplementation(() => ({
    paused: true,
    play: jest.fn(function () {
      this.paused = false;
      this.onplay?.();
      return Promise.resolve();
    }),
    pause: jest.fn(),
    load: jest.fn(),
  }));
});
test("vertical swipe advances across topics and switching modes retains the selected story", async () => {
  await mount("swipe");
  await screen.findByRole("heading", { name: "First tech story" });
  userEvent.click(
    screen.getByRole("button", { name: "Technology", exact: true }),
  );
  const card = screen.getByRole("article", { name: "Current story" });
  fireEvent.touchStart(card, { touches: [{ clientY: 250, clientX: 100 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientY: 50, clientX: 103 }] });
  expect(
    screen.getByRole("heading", { name: "Second tech story" }),
  ).toBeInTheDocument();
  userEvent.click(
    screen.getByRole("button", { name: /Swipe up for next story/ }),
  );
  expect(
    screen.getByRole("heading", { name: "Health story" }),
  ).toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: "listen", exact: true }));
  expect(
    screen.getByRole("heading", { name: "Health story" }),
  ).toBeInTheDocument();
});
test("horizontal gestures do not advance stories", async () => {
  await mount("swipe");
  const card = await screen.findByRole("article", { name: "Current story" });
  fireEvent.touchStart(card, { touches: [{ clientY: 200, clientX: 250 }] });
  fireEvent.touchEnd(card, { changedTouches: [{ clientY: 195, clientX: 20 }] });
  expect(
    screen.getByRole("heading", { name: "First tech story" }),
  ).toBeInTheDocument();
});
test("playback remains alive when switching collections and loading another date", async () => {
  await mount();
  await act(async () =>
    userEvent.click(screen.getByRole("button", { name: "Play story" })),
  );
  expect(Audio).toHaveBeenCalledTimes(1);
  userEvent.click(screen.getByRole("button", { name: "popular", exact: true }));
  expect(
    screen.getByRole("heading", { name: "No stories in this collection" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Pause audio" }),
  ).toBeInTheDocument();
  expect(Audio).toHaveBeenCalledTimes(1);
});
test("settings theme and text size persist independently of v1", async () => {
  await mount();
  await screen.findByRole("button", { name: "Profile and settings" });
  userEvent.click(screen.getByRole("button", { name: "Profile and settings" }));
  userEvent.click(
    screen.getByRole("button", { name: "Settings", exact: true }),
  );
  userEvent.click(screen.getByRole("button", { name: "dark", exact: true }));
  userEvent.selectOptions(screen.getByLabelText("Text size"), "extra");
  expect(document.querySelector(".rn-v2")).toHaveClass("dark", "size-extra");
  expect(
    JSON.parse(localStorage.getItem("radionews_v2_preferences")),
  ).toMatchObject({ theme: "dark", size: "extra" });
  expect(localStorage.getItem("rundown_news_language")).toBeNull();
});
test("topic drafts cancel without applying and an empty draft cannot be saved", async () => {
  await mount();
  userEvent.click(screen.getByRole("button", { name: "My topics" }));
  const dialog = screen.getByRole("dialog");
  within(dialog)
    .getAllByRole("checkbox")
    .filter((c) => c.checked)
    .forEach((c) => userEvent.click(c));
  expect(screen.getByRole("button", { name: "Apply topics" })).toBeDisabled();
  userEvent.click(screen.getByRole("button", { name: "Close panel" }));
  expect(
    screen.getByRole("heading", { name: "First tech story" }),
  ).toBeInTheDocument();
});
test("guest interest action opens sign-in and errors remain explicit", async () => {
  await mount();
  userEvent.click(screen.getByRole("button", { name: "Mark interesting" }));
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Sign in");
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
});
test("failed requests show retry rather than no-news", async () => {
  mockNews = {
    loading: false,
    error: "Network unavailable",
    failed: [],
    data: {},
  };
  await mount();
  expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});
test("date input is limited to today and seven previous days", async () => {
  await mount();
  userEvent.click(screen.getByRole("button", { name: /Choose news date/ }));
  const input = screen.getByLabelText("News date", { selector: "input" });
  expect(input.max).toBe(today);
  fireEvent.change(input, { target: { value: "2020-01-01" } });
  expect(screen.getByRole("button", { name: "Show news" })).toBeDisabled();
});

test("topic recap opens the daily text immediately without a date selection", async () => {
  mockNews.data.Technology.briefing = "The daily technology recap is ready.";
  await mount();
  await act(async () => userEvent.click(screen.getByRole("button", { name: "Topic recap" })));
  const recap = screen.getByText("The daily technology recap is ready.");
  expect(recap).toBeVisible();
  expect(recap.closest("details")).toBeNull();
  expect(screen.getByRole("heading", { name: /Daily recap/ })).toBeVisible();
});
