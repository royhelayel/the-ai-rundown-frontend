import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Headphones,
  Layers,
  AlignLeft,
  UserRound,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ListMusic,
  Sparkles,
  ArrowUpRight,
  Check,
  Settings as SettingsIcon,
  Flame,
  RefreshCw,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { BACKEND_URL } from "../lib/backend";
import { toUAEDate } from "../lib/uaeTime";
import { cleanForTTS } from "../audio/narrationText";
import useListenHistory, {
  computeChallengeStats,
} from "../hooks/useListenHistory";
import {
  CATEGORIES,
  MODES,
  readStorage,
  writeStorage,
  normalizePrefs,
  daysFrom,
  dateLabel,
  headlineKey,
  collectionStories,
  categoryStyle,
  sources,
  paragraphs,
  pillWindow,
  periodDates,
} from "./model";
import { useNews, useInterests, jsonRequest } from "./useNews";
import useAudio from "./useAudio";
import Dialog from "./Dialog";
import Settings from "./Settings";
import "./v2.css";

const PREF_KEY = "radionews_v2_preferences";
const seconds = (n) =>
  `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, "0")}`;
function recapSources(text) {
  return Array.from(
    String(text || "").matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g),
    (m) => ({ outlet: m[1], url: m[2] }),
  );
}
function Sources({ story }) {
  const links = sources(story);
  return (
    <div className="v2-sources">
      {links.length ? (
        links.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
            {s.outlet || new URL(s.url).hostname.replace(/^www\./, "")}
            <ArrowUpRight size={13} />
          </a>
        ))
      ) : (
        <span className="v2-note">
          Source links unavailable for this story.
        </span>
      )}
    </div>
  );
}
function Progress({ list, story, vertical, read }) {
  const topic = list.filter((s) => s.category === story.category),
    at = topic.findIndex((s) => s.id === story.id);
  return (
    <div
      className={`v2-progress ${vertical ? "vertical" : ""}`}
      role="img"
      aria-label={`Story ${at + 1} of ${topic.length} in ${story.category}`}
    >
      {pillWindow(topic.length, at).map((i) => (
        <span
          key={topic[i].id}
          className={i === at ? "current" : read.has(topic[i].id) ? "read" : ""}
        />
      ))}
    </div>
  );
}
function ReadingCard({
  story,
  onInterest,
  interested,
  busy,
  onRead,
  onFocus,
  dark,
  onRecap,
}) {
  const ref = useRef(null);
  const callback = useRef({ onRead, onFocus });
  callback.current = { onRead, onFocus };
  useEffect(() => {
    let timer;
    const node = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          clearTimeout(timer);
          if (e.isIntersecting) {
            callback.current.onFocus(story.id);
            timer = setTimeout(() => {
              if (!document.hidden) callback.current.onRead(story);
            }, 3000);
          }
        }
      },
      { threshold: 0.45 },
    );
    obs.observe(node);
    return () => {
      clearTimeout(timer);
      obs.disconnect();
    };
  }, [story]);
  return (
    <article
      ref={ref}
      id={`story-${encodeURIComponent(story.id)}`}
      className="v2-feed-story"
      style={categoryStyle(story.category, dark)}
      lang={story.language}
      dir={story.language === "ar" ? "rtl" : "ltr"}
    >
      <div className="v2-story-top">
        <span>{story.category}</span>
        <button
          onClick={() => onRecap(story.category)}
          aria-label={`${story.category} recap`}
        >
          Topic recap <ChevronRight size={14} />
        </button>
      </div>
      <h2>{story.headline}</h2>
      {paragraphs(story).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <div className="v2-story-bottom">
        <Sources story={story} />
        <button
          aria-label={interested ? "Remove interest" : "Mark interesting"}
          aria-pressed={interested}
          disabled={busy}
          onClick={() => onInterest(story)}
        >
          <Sparkles />
        </button>
      </div>
    </article>
  );
}
export default function RadioNewsV2() {
  const [params, setParams] = useSearchParams();
  const [prefs, setPrefs] = useState(() =>
    normalizePrefs(readStorage(PREF_KEY, {})),
  );
  const [today, setToday] = useState(toUAEDate);
  const days = daysFrom(today);
  const mode = MODES.includes(params.get("mode"))
    ? params.get("mode")
    : prefs.start === "last"
      ? prefs.lastMode
      : prefs.start;
  const day = days.includes(params.get("day")) ? params.get("day") : today;
  const lens = ["latest", "popular", "interesting"].includes(params.get("lens"))
    ? params.get("lens")
    : "latest";
  const [revision, setRevision] = useState(0);
  const news = useNews(day, prefs.language, revision);
  const discovery = useInterests(revision);
  const [selectedId, setSelectedId] = useState("");
  const [category, setCategory] = useState("all");
  const panels = [
    "profile",
    "settings",
    "topics",
    "date",
    "summary",
    "recap",
    "queue",
    "challenge",
    "auth",
  ];
  const panel = panels.includes(params.get("panel"))
    ? params.get("panel")
    : null;
  const setPanel = (value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("panel", value);
        else next.delete("panel");
        return next;
      },
      { replace: !!panel },
    );
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const dark =
    prefs.theme === "dark" || (prefs.theme === "system" && systemDark);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [interested, setInterested] = useState([]);
  const [interestBusy, setInterestBusy] = useState("");
  const interestLock = useRef(false);
  const [reads, setReads] = useState(() =>
    readStorage("rundown_listen_counts", {}),
  );
  const [readIds, setReadIds] = useState(() => new Set());
  const { history, addToHistory } = useListenHistory(user?.id || null);
  const challenge = useMemo(
    () => computeChallengeStats(history, prefs.goal, day),
    [history, prefs.goal, day],
  );
  const all = useMemo(
    () =>
      collectionStories(news.data, lens, discovery.items, reads, prefs.topics),
    [news.data, lens, discovery.items, reads, prefs.topics],
  );
  const cats = useMemo(() => [...new Set(all.map((s) => s.category))], [all]);
  const visible =
    mode !== "scroll" || category === "all"
      ? all
      : all.filter((s) => s.category === category);
  const browsingCurrent =
    visible.find((s) => s.id === selectedId) || visible[0] || null;
  const [followAudio, setFollowAudio] = useState(false);
  const rootRef = useRef(null),
    feedRef = useRef(null),
    touchRef = useRef(null),
    wheelRef = useRef(0),
    seenRef = useRef(new Set());
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [otpSent, setOtpSent] = useState(false),
    [authBusy, setAuthBusy] = useState(false),
    [authError, setAuthError] = useState("");
  const [draftTopics, setDraftTopics] = useState(prefs.topics);
  const [dateDraft, setDateDraft] = useState(day);
  const [recap, setRecap] = useState({
    category: "",
    loading: false,
    error: "",
    items: [],
  });
  const recapRequest = useRef(0);
  const update = useCallback(
    (change) =>
      setPrefs((prev) => {
        const next = normalizePrefs({ ...prev, ...change });
        writeStorage(PREF_KEY, next);
        return next;
      }),
    [],
  );
  const changeParams = (change) => {
    if (change.day || change.lens) setFollowAudio(false);
    const p = new URLSearchParams(params);
    Object.entries(change).forEach(([k, v]) =>
      v === null ? p.delete(k) : p.set(k, v),
    );
    setParams(p);
  };
  const markRead = useCallback(
    (story) => {
      if (!story || story.recap || seenRef.current.has(story.id)) return;
      seenRef.current.add(story.id);
      setReadIds((prev) => new Set([...prev, story.id]));
      addToHistory(
        story,
        story.category,
        story.index,
        story.generatedSlot,
        story.day,
      );
      if (user) {
        const key = headlineKey(story.headline);
        if (key)
          setReads((prev) => {
            const next = { ...prev, [key]: Math.max(1, prev[key] || 0) };
            writeStorage("rundown_listen_counts", next);
            return next;
          });
        jsonRequest(`${BACKEND_URL}/api/reads/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            category: story.category,
            story_index: story.index,
            headline: story.headline,
          }),
        }).catch(() => {});
      }
    },
    [addToHistory, user],
  );
  const audio = useAudio(prefs.speed, markRead);
  const current =
    mode === "listen" && followAudio && audio.item
      ? audio.item
      : browsingCurrent;
  const displayList =
    mode === "listen" && followAudio && audio.item ? audio.queue : visible;
  const currentIndex = current
    ? displayList.findIndex((s) => s.id === current.id)
    : -1;
  const displayedDay =
    mode === "listen" && followAudio && audio.item ? audio.item.day : day;
  const playingOther = audio.item && audio.item.id !== current?.id;
  const isInterested = (s) =>
    interested.some(
      (i) =>
        i.headline === s.headline &&
        i.category === s.category &&
        (!i.day || i.day === s.day),
    );
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setUser(data.session?.user || null);
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (active) setAuthReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) {
        setUser(session?.user || null);
        setAuthReady(true);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setInterested([]);
    if (user)
      jsonRequest(
        `${BACKEND_URL}/api/saves?userId=${encodeURIComponent(user.id)}`,
      )
        .then((items) => {
          if (active && Array.isArray(items)) setInterested(items);
        })
        .catch(() => {
          if (active)
            setNotice(
              "Your interests could not be loaded. Please refresh before changing them.",
            );
        });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setSystemDark(media.matches);
    media.addEventListener("change", change);
    const foreground = () => {
      setToday(toUAEDate());
      setOnline(navigator.onLine !== false);
    };
    const storage = (e) => {
      if (e.key === PREF_KEY)
        setPrefs(normalizePrefs(readStorage(PREF_KEY, {})));
    };
    window.addEventListener("focus", foreground);
    window.addEventListener("online", foreground);
    window.addEventListener("offline", foreground);
    window.addEventListener("storage", storage);
    const timer = setInterval(foreground, 60000);
    return () => {
      media.removeEventListener("change", change);
      window.removeEventListener("focus", foreground);
      window.removeEventListener("online", foreground);
      window.removeEventListener("offline", foreground);
      window.removeEventListener("storage", storage);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    setSelectedId("");
    setFollowAudio(false);
    setCategory("all");
    feedRef.current?.scrollTo?.(0, 0);
  }, [day, prefs.language, lens]);
  useEffect(() => {
    if (!news.loading && category !== "all" && !cats.includes(category))
      setCategory("all");
  }, [cats, category, news.loading]);
  useEffect(() => {
    if (mode !== "swipe" || !current || panel) return;
    const timer = setTimeout(() => {
      if (!document.hidden) markRead(current);
    }, 3000);
    return () => clearTimeout(timer);
  }, [mode, current, markRead, panel]);
  useEffect(() => {
    if (mode === "scroll" && selectedId)
      document
        .getElementById(`story-${encodeURIComponent(selectedId)}`)
        ?.scrollIntoView({ block: "start" });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const switchMode = (m) => {
    setFollowAudio(false);
    if (current) setSelectedId(current.id);
    update({ lastMode: m });
    changeParams({ mode: m });
  };
  const advance = (dir) => {
    const next = visible[currentIndex + dir];
    if (next) {
      setSelectedId(next.id);
      if (next.category !== current.category) {
        if (category !== "all") setCategory(next.category);
        setNotice(`Now ${next.category}`);
      }
    } else if (dir > 0) setNotice("You’re caught up with this collection.");
  };
  const startCurrent = () => {
    if (!current) return;
    setFollowAudio(true);
    if (audio.item?.id === current.id && audio.status !== "ended")
      audio.toggle();
    else audio.start(displayList, currentIndex);
  };
  const returnPlaying = () => {
    if (!audio.item) return;
    const s = audio.item;
    if (!days.includes(s.day)) {
      setNotice(
        "This audio is from a date outside the seven-day archive. You can keep listening or stop it.",
      );
      return;
    }
    setCategory("all");
    setSelectedId(s.id);
    changeParams({ day: s.day, mode: "listen" });
    setFollowAudio(true);
    if (s.language !== prefs.language) update({ language: s.language });
  };
  const openTopics = () => {
    setDraftTopics(prefs.topics);
    setPanel("topics");
  };
  const openRecap = async (cat) => {
    const request = ++recapRequest.current;
    setPanel("recap");
    const items = [];
    if (news.data[cat]?.briefing)
      items.push({ kind: "Daily", day, text: news.data[cat].briefing });
    setRecap({ category: cat, items, loading: true, error: "" });
    try {
      const periods = Object.entries(periodDates(day)).filter(([, d]) => d);
      const found = await Promise.all(
        periods.map(async ([kind, d]) => {
          const p = new URLSearchParams({
            mode: "one",
            category: cat,
            day: d,
            timeSlot: kind,
            language: prefs.language,
          });
          const row = await jsonRequest(`/api/news?${p}`);
          return row?.briefing || row?.content
            ? { kind, day: d, text: row.briefing || row.content }
            : null;
        }),
      );
      if (request === recapRequest.current)
        setRecap({
          category: cat,
          items: [...items, ...found.filter(Boolean)],
          loading: false,
          error: "",
        });
    } catch {
      if (request === recapRequest.current)
        setRecap({
          category: cat,
          items,
          loading: false,
          error: "Some recaps could not load. Retry.",
        });
    }
  };
  const toggleInterest = async (story) => {
    if (!user) {
      setPanel("auth");
      return;
    }
    if (interestLock.current) return;
    interestLock.current = true;
    setInterestBusy(story.id);
    const exists = isInterested(story);
    try {
      await jsonRequest(
        `${BACKEND_URL}/api/saves/${exists ? "remove" : "sync"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            headline: story.headline,
            category: story.category,
            story_index: story.index,
            day: story.day,
            preview: paragraphs(story)[0] || "",
            content_snapshot: story,
          }),
        },
      );
      setInterested((prev) =>
        exists
          ? prev.filter((i) => i.headline !== story.headline)
          : [
              ...prev,
              {
                headline: story.headline,
                category: story.category,
                day: story.day,
              },
            ],
      );
    } catch {
      setNotice("Your interest was not saved. Please try again.");
    } finally {
      interestLock.current = false;
      setInterestBusy("");
    }
  };
  const authenticate = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error } = otpSent
        ? await supabase.auth.verifyOtp({
            email: email.trim(),
            token: code.trim(),
            type: "email",
          })
        : await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              emailRedirectTo: `${window.location.origin}/preview/v2`,
            },
          });
      if (error) throw error;
      if (otpSent) {
        setPanel("profile");
        setCode("");
        setOtpSent(false);
      } else setOtpSent(true);
    } catch (e) {
      setAuthError(e.message || "Sign-in failed. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  };
  const loading =
    !(mode === "listen" && followAudio && audio.item) &&
    (news.loading || (lens === "interesting" && discovery.loading));
  const error =
    !(mode === "listen" && followAudio && audio.item) &&
    (news.error || (lens === "interesting" ? discovery.error : ""));
  const content = (
    <>
      {current && (
        <>
          <div className="v2-story-top">
            <span>{current.category}</span>
            <button
              aria-label={
                isInterested(current) ? "Remove interest" : "Mark interesting"
              }
              aria-pressed={isInterested(current)}
              disabled={interestBusy === current.id}
              onClick={() => toggleInterest(current)}
            >
              <Sparkles />
            </button>
          </div>
          <div
            className="v2-editorial-copy"
            lang={current.language}
            dir={current.language === "ar" ? "rtl" : "ltr"}
          >
            <h1>{current.headline}</h1>
            {mode === "swipe" &&
              paragraphs(current).map((p, i) => <p key={i}>{p}</p>)}
            <Sources story={current} />
          </div>
          <div className="v2-editorial-foot">
            <Progress
              list={displayList}
              story={current}
              vertical={mode === "swipe"}
              read={readIds}
            />
            <button onClick={() => openRecap(current.category)}>
              <Sparkles size={14} />
              Topic recap
            </button>
          </div>
        </>
      )}
    </>
  );
  return (
    <div
      ref={rootRef}
      className={`rn-v2 ${dark ? "dark" : "light"} size-${prefs.size} ${prefs.motion === "reduce" ? "reduce-motion" : ""}`}
    >
      <div className={`v2-shell mode-${mode}`}>
        <header className="v2-header">
          <a
            className="v2-wordmark"
            href="/preview/v2"
            aria-label="RadioNews preview home"
          >
            RADIONEWS
          </a>
          <button
            aria-label="Profile and settings"
            onClick={() => setPanel("profile")}
          >
            <UserRound />
          </button>
        </header>
        <div className="v2-collections">
          <div role="group" aria-label="News collection">
            {["latest", "popular", "interesting"].map((l) => (
              <button
                key={l}
                aria-pressed={lens === l}
                onClick={() => changeParams({ lens: l })}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setDateDraft(day);
              setPanel("date");
            }}
            aria-label={`Choose news date, ${dateLabel(displayedDay)}`}
          >
            {displayedDay === today ? "Today" : dateLabel(displayedDay)}
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="v2-topics">
          <button className="v2-topic-edit" onClick={openTopics}>
            My topics
            <ChevronDown size={14} />
          </button>
          <div role="group" aria-label="Topics">
            <button
              aria-pressed={category === "all"}
              onClick={() => {
                setFollowAudio(false);
                setCategory("all");
                feedRef.current?.scrollTo?.(0, 0);
              }}
            >
              All topics
            </button>
            {cats.map((cat) => (
              <button
                key={cat}
                style={categoryStyle(cat, dark)}
                aria-pressed={category === cat}
                onClick={() => {
                  setFollowAudio(false);
                  setCategory(cat);
                  setSelectedId(all.find((s) => s.category === cat)?.id || "");
                  feedRef.current?.scrollTo?.(0, 0);
                }}
              >
                {cat === "World News" ? "World" : cat}
              </button>
            ))}
          </div>
        </div>
        {!online && (
          <div className="v2-banner" role="status">
            You’re offline. Loaded stories remain available.
          </div>
        )}
        {notice && (
          <div className="v2-banner" role="status">
            {notice}
            <button aria-label="Dismiss message" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <main
          className="v2-main"
          ref={feedRef}
          aria-label={`${mode} news`}
          onKeyDown={(e) => {
            if (
              mode === "swipe" &&
              !e.target.closest("button,a,input,select") &&
              ["ArrowDown", "ArrowUp"].includes(e.key)
            ) {
              e.preventDefault();
              advance(e.key === "ArrowDown" ? 1 : -1);
            }
          }}
        >
          {news.failed.length > 0 && !error && (
            <div className="v2-banner">
              Some topics could not load.
              <button onClick={() => setRevision((r) => r + 1)}>Retry</button>
            </div>
          )}
          {loading ? (
            <div className="v2-state" role="status">
              <RefreshCw className="v2-spin" />
              <p>Loading your news…</p>
            </div>
          ) : error ? (
            <div className="v2-state" role="alert">
              <h2>Couldn’t load this collection</h2>
              <p>{error}</p>
              <button
                className="v2-primary"
                onClick={() => setRevision((r) => r + 1)}
              >
                Try again
              </button>
            </div>
          ) : !current ? (
            <div className="v2-state">
              <h2>
                {lens === "latest"
                  ? "No stories yet"
                  : "No stories in this collection"}
              </h2>
              <p>
                {lens === "latest"
                  ? `No news is available for your topics on ${dateLabel(day)} in ${prefs.language === "ar" ? "Arabic" : "English"}.`
                  : lens === "popular"
                    ? "Popular uses the existing app’s read activity on this device. Try Latest for all stories."
                    : "There are no matching interest selections for this date and language yet."}
              </p>
              <button onClick={() => setRevision((r) => r + 1)}>
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={() => {
                  setDateDraft(day);
                  setPanel("date");
                }}
              >
                Choose another date
              </button>
              <button onClick={() => changeParams({ lens: "latest" })}>
                Latest stories
              </button>
            </div>
          ) : mode === "scroll" ? (
            <>
              <p className="v2-feed-date">
                {dateLabel(day)} ·{" "}
                {prefs.language === "ar" ? "العربية" : "English"}
              </p>
              {visible.map((story) => (
                <ReadingCard
                  key={story.id}
                  story={story}
                  dark={dark}
                  interested={isInterested(story)}
                  busy={interestBusy === story.id}
                  onInterest={toggleInterest}
                  onRead={markRead}
                  onFocus={setSelectedId}
                  onRecap={openRecap}
                />
              ))}
              <p className="v2-end">You’re caught up for {dateLabel(day)}.</p>
            </>
          ) : (
            <>
              <article
                key={current.id}
                className={`v2-editorial ${mode === "swipe" ? "v2-swipe" : ""}`}
                style={categoryStyle(current.category, dark)}
                tabIndex={mode === "swipe" ? 0 : undefined}
                aria-label="Current story"
                onTouchStart={(e) => {
                  if (!e.target.closest("a,button"))
                    touchRef.current = {
                      y: e.touches[0].clientY,
                      x: e.touches[0].clientX,
                      top: e.currentTarget.scrollTop,
                      bottom:
                        e.currentTarget.scrollHeight -
                          e.currentTarget.clientHeight -
                          e.currentTarget.scrollTop <
                        3,
                    };
                }}
                onTouchEnd={(e) => {
                  const start = touchRef.current;
                  touchRef.current = null;
                  if (mode !== "swipe" || !start) return;
                  const dy = start.y - e.changedTouches[0].clientY,
                    dx = start.x - e.changedTouches[0].clientX;
                  const el = e.currentTarget;
                  const bottom =
                    el.scrollHeight - el.clientHeight - el.scrollTop < 3;
                  if (
                    Math.abs(dy) > 65 &&
                    Math.abs(dy) > Math.abs(dx) * 1.4 &&
                    ((dy > 0 && bottom && start.bottom) ||
                      (dy < 0 && start.top < 3))
                  )
                    advance(dy > 0 ? 1 : -1);
                }}
                onWheel={(e) => {
                  const el = e.currentTarget;
                  if (
                    mode === "swipe" &&
                    Math.abs(e.deltaY) > 35 &&
                    Date.now() - wheelRef.current > 800 &&
                    el.scrollHeight <= el.clientHeight + 2
                  ) {
                    wheelRef.current = Date.now();
                    advance(e.deltaY > 0 ? 1 : -1);
                  }
                }}
              >
                {content}
              </article>
              {mode === "swipe" ? (
                <div className="v2-swipe-nav">
                  <button
                    aria-label="Previous story"
                    disabled={currentIndex === 0}
                    onClick={() => advance(-1)}
                  >
                    <ChevronDown />
                  </button>
                  <button
                    onClick={() => advance(1)}
                    disabled={currentIndex === visible.length - 1}
                  >
                    {currentIndex === visible.length - 1
                      ? "You’re caught up"
                      : "Swipe up for next story"}
                    <ChevronUp size={16} />
                  </button>
                </div>
              ) : (
                <div className="v2-player">
                  <label className="v2-sr" htmlFor="v2-seek">
                    Playback position
                  </label>
                  <input
                    id="v2-seek"
                    type="range"
                    min="0"
                    max={audio.duration || 1}
                    value={playingOther ? 0 : audio.time}
                    disabled={!audio.duration || playingOther}
                    onChange={(e) => audio.seek(Number(e.target.value))}
                  />
                  <div className="v2-times">
                    <span>
                      {audio.deviceVoice
                        ? "Device voice"
                        : playingOther
                          ? "0:00"
                          : seconds(audio.time)}
                    </span>
                    <span>
                      {playingOther
                        ? "—"
                        : audio.duration
                          ? seconds(audio.duration)
                          : "—"}
                    </span>
                  </div>
                  <div className="v2-transport">
                    <button
                      aria-label="Playback speed"
                      onClick={() =>
                        update({
                          speed: [0.75, 1, 1.25, 1.5, 2][
                            ([0.75, 1, 1.25, 1.5, 2].indexOf(prefs.speed) + 1) %
                              5
                          ],
                        })
                      }
                    >
                      {prefs.speed}×
                    </button>
                    <button
                      aria-label="Previous audio story"
                      disabled={
                        audio.item ? audio.index === 0 : currentIndex === 0
                      }
                      onClick={() =>
                        audio.item ? audio.step(-1) : advance(-1)
                      }
                    >
                      <SkipBack />
                    </button>
                    <button
                      className="v2-play"
                      aria-label={
                        audio.item?.id === current.id &&
                        audio.status === "playing"
                          ? "Pause"
                          : "Play story"
                      }
                      disabled={audio.status === "loading" && !playingOther}
                      onClick={startCurrent}
                    >
                      {audio.status === "loading" && !playingOther ? (
                        <RefreshCw className="v2-spin" />
                      ) : audio.item?.id === current.id &&
                        audio.status === "playing" ? (
                        <Pause />
                      ) : (
                        <Play />
                      )}
                    </button>
                    <button
                      aria-label="Next audio story"
                      disabled={
                        audio.item
                          ? audio.index >= audio.queue.length - 1
                          : currentIndex === visible.length - 1
                      }
                      onClick={() => (audio.item ? audio.step(1) : advance(1))}
                    >
                      <SkipForward />
                    </button>
                    <button
                      aria-label="Listening queue"
                      onClick={() => setPanel("queue")}
                    >
                      <ListMusic />
                    </button>
                  </div>
                  <div className="v2-player-links">
                    <button onClick={() => setPanel("summary")}>
                      Read summary
                    </button>
                    <span>
                      {displayList[currentIndex + 1]
                        ? `Next: ${displayList[currentIndex + 1].category}`
                        : "Last story"}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
        {audio.error && (
          <div className="v2-banner" role="alert">
            {audio.error}
            <button onClick={() => audio.start(audio.queue, audio.index)}>
              Retry
            </button>
            <button onClick={() => audio.useDeviceVoice()}>
              Use device voice
            </button>
          </div>
        )}
        {audio.item && (mode !== "listen" || playingOther) && (
          <div className="v2-mini">
            <button onClick={returnPlaying}>
              <Headphones size={16} />
              <span>
                {audio.item.category} · {dateLabel(audio.item.day)}
                <small>{audio.item.headline}</small>
              </span>
            </button>
            <button
              onClick={audio.toggle}
              disabled={audio.status === "loading"}
              aria-label={
                audio.status === "playing" ? "Pause audio" : "Resume audio"
              }
            >
              {audio.status === "playing" ? <Pause /> : <Play />}
            </button>
            <button onClick={audio.stop} aria-label="Stop audio">
              <X size={16} />
            </button>
          </div>
        )}
        {audio.status === "ended" && (
          <p className="v2-end" role="status">
            Listening complete.
          </p>
        )}
        <nav className="v2-mode-nav" aria-label="Reading mode">
          {[
            [Headphones, "listen"],
            [Layers, "swipe"],
            [AlignLeft, "scroll"],
          ].map(([Icon, m]) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
            >
              <Icon size={18} />
              {m}
            </button>
          ))}
        </nav>
      </div>
      {panel && (
        <Dialog
          title={
            {
              profile: "Your RadioNews",
              settings: "Settings",
              topics: "My topics",
              date: "News date",
              summary: current?.headline || "Summary",
              recap: `${recap.category} recaps`,
              queue: "Listening queue",
              challenge: "Reading challenge",
              auth: "Sign in",
            }[panel]
          }
          onClose={() => {
            setPanel(null);
            recapRequest.current++;
          }}
        >
          {panel === "settings" && (
            <Settings
              prefs={prefs}
              update={(change) => {
                if (change.language) setFollowAudio(false);
                update(change);
              }}
            />
          )}
          {panel === "profile" && (
            <div className="v2-menu">
              <p className="v2-note">
                {user?.email || "Read and listen as a guest."}
              </p>
              <button onClick={() => setPanel("settings")}>
                <SettingsIcon />
                Settings
                <ChevronRight />
              </button>
              <button onClick={openTopics}>
                My topics
                <ChevronRight />
              </button>
              <button onClick={() => setPanel("challenge")}>
                <Flame />
                Reading challenge
                <ChevronRight />
              </button>
              {user ? (
                <button
                  onClick={async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) setNotice("Could not sign out. Try again.");
                    else setPanel(null);
                  }}
                >
                  Sign out
                </button>
              ) : (
                <button disabled={!authReady} onClick={() => setPanel("auth")}>
                  Sign in
                </button>
              )}
              <a href="/">Compare with original UI ↗</a>
              <p className="v2-note">
                UI v2 preview. Your original interface remains available.
              </p>
            </div>
          )}
          {panel === "topics" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draftTopics.length) return;
                update({ topics: draftTopics });
                setCategory("all");
                setPanel(null);
              }}
            >
              <p className="v2-note">
                Choose the topics in your feed. Audio already playing keeps its
                queue.
              </p>
              <div className="v2-topic-picker">
                {CATEGORIES.map((cat) => (
                  <label key={cat} style={categoryStyle(cat, dark)}>
                    <input
                      type="checkbox"
                      checked={draftTopics.includes(cat)}
                      onChange={(e) =>
                        setDraftTopics((prev) =>
                          e.target.checked
                            ? [...prev, cat]
                            : prev.filter((c) => c !== cat),
                        )
                      }
                    />
                    {cat}
                  </label>
                ))}
              </div>
              {!draftTopics.length && (
                <p role="alert">Choose at least one topic.</p>
              )}
              <button className="v2-primary" disabled={!draftTopics.length}>
                Apply topics
              </button>
            </form>
          )}
          {panel === "date" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (days.includes(dateDraft)) {
                  changeParams({ day: dateDraft, panel: null });
                }
              }}
            >
              <p className="v2-note">
                Today and the previous seven days. Editions follow UAE time.
              </p>
              <label className="v2-field">
                News date
                <input
                  type="date"
                  min={days[7]}
                  max={today}
                  value={dateDraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  required
                />
              </label>
              <button
                className="v2-primary"
                disabled={!days.includes(dateDraft)}
              >
                Show news
              </button>
            </form>
          )}
          {panel === "summary" && current && (
            <div
              lang={current.language}
              dir={current.language === "ar" ? "rtl" : "ltr"}
            >
              {paragraphs(current).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {current.why && (
                <p>
                  <strong>Why it matters: </strong>
                  {cleanForTTS(current.why)}
                </p>
              )}
              <Sources story={current} />
            </div>
          )}
          {panel === "queue" && (
            <div className="v2-menu">
              {(audio.item ? audio.queue : visible).map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    audio.start(audio.item ? audio.queue : visible, i);
                    setPanel(null);
                  }}
                >
                  <span>
                    {s.headline}
                    <small>
                      {s.category} · {dateLabel(s.day)}
                    </small>
                  </span>
                  {audio.item?.id === s.id && <Headphones size={16} />}
                </button>
              ))}
              {!audio.item && !visible.length && (
                <p>No stories in the queue.</p>
              )}
            </div>
          )}
          {panel === "recap" && (
            <div>
              {recap.loading && (
                <p role="status">Checking available digests…</p>
              )}
              {recap.error && (
                <p role="alert">
                  {recap.error}
                  <button onClick={() => openRecap(recap.category)}>
                    Retry
                  </button>
                </p>
              )}
              {!recap.loading && !recap.items.length && !recap.error && (
                <p>
                  No recap is available yet. Weekly digests appear on Sundays
                  and monthly digests on the last day of the month, once
                  generated.
                </p>
              )}
              {recap.items.map((r) => {
                const Container = r.kind === "Daily" ? "section" : "details";
                const Heading = r.kind === "Daily" ? "h3" : "summary";
                return (
                  <Container key={r.kind}>
                    <Heading>
                      {r.kind === "Daily"
                        ? "Daily recap"
                        : r.kind === "Weekly"
                          ? "Weekly digest"
                          : "Monthly digest"}{" "}
                      · {dateLabel(r.day)}
                    </Heading>
                    <p dir={prefs.language === "ar" ? "rtl" : "ltr"}>
                      {cleanForTTS(r.text)}
                    </p>
                    <Sources story={{ storySources: recapSources(r.text) }} />
                    <button
                      className="v2-primary"
                      onClick={() => {
                        const item = {
                          id: `recap|${recap.category}|${day}|${r.kind}`,
                          category: recap.category,
                          day,
                          language: prefs.language,
                          headline: `${recap.category} ${r.kind.toLowerCase()} recap`,
                          summary: r.text,
                          storySources: recapSources(r.text),
                          recap: true,
                        };
                        const queue = all
                          .filter((s) => s.category === recap.category)
                          .concat(
                            all.filter((s) => s.category !== recap.category),
                          );
                        audio.start([item, ...queue], 0);
                        setPanel(null);
                      }}
                    >
                      Listen to recap, then stories
                    </button>
                  </Container>
                );
              })}
            </div>
          )}
          {panel === "challenge" && (
            <div>
              <p className="v2-note">
                {dateLabel(day)} ·{" "}
                {user ? "Your account" : "Progress on this device"}
              </p>
              <strong className="v2-challenge-count">
                {challenge.todayCount} / {prefs.goal}
              </strong>
              <p>Stories read or listened to</p>
              <div className="v2-week">
                {challenge.weekGrid.map((d) => (
                  <span
                    key={d.key}
                    className={d.met ? "met" : ""}
                    aria-label={`${d.key}: ${d.count} stories${d.met ? ", goal met" : ""}`}
                  >
                    {d.day}
                    {d.met ? <Check size={15} /> : <small>{d.count}</small>}
                  </span>
                ))}
              </div>
              <p>{challenge.weeklyDays} of 6 days completed this week.</p>
              <label className="v2-field">
                Daily goal
                <select
                  value={prefs.goal}
                  onChange={(e) => update({ goal: Number(e.target.value) })}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} stories
                    </option>
                  ))}
                </select>
              </label>
              <p className="v2-note">
                Reads count after a story stays in view; listening counts when a
                story finishes. Archive reading follows the existing challenge’s
                content-date rules.
              </p>
            </div>
          )}
          {panel === "auth" && (
            <form onSubmit={authenticate}>
              <label className="v2-field">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  disabled={otpSent}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {otpSent && (
                <>
                  <p className="v2-note">
                    Check your email for a sign-in link or code.
                  </p>
                  <label className="v2-field">
                    Email code
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setCode("");
                    }}
                  >
                    Use another email
                  </button>
                </>
              )}
              {authError && <p role="alert">{authError}</p>}
              <button className="v2-primary" disabled={authBusy}>
                {authBusy
                  ? "Please wait…"
                  : otpSent
                    ? "Verify code"
                    : "Email me a sign-in link"}
              </button>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
