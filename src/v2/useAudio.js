import { useCallback, useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../lib/backend";
import { narration } from "./model";

// The queue is a snapshot. Browsing another date, topic or collection never mutates it.
export default function useAudio(speed, onComplete) {
  const player = useRef({
    generation: 0,
    queue: [],
    index: 0,
    audio: null,
    url: null,
    controller: null,
    speed,
    onComplete,
  });
  player.current.speed = speed;
  player.current.onComplete = onComplete;
  const [state, setState] = useState({
    status: "idle",
    item: null,
    queue: [],
    index: 0,
    time: 0,
    duration: 0,
    error: "",
  });
  const release = useCallback(() => {
    const p = player.current;
    p.generation++;
    p.controller?.abort();
    if (p.utterance) {
      window.speechSynthesis?.cancel();
      p.utterance = null;
    }
    if (p.audio) {
      p.audio.pause();
      p.audio.src = "";
      p.audio.load?.();
      p.audio = null;
    }
    if (p.url) {
      URL.revokeObjectURL(p.url);
      p.url = null;
    }
  }, []);
  const load = useCallback(
    async (queue, index, autoplay = true, deviceVoice = false, offset = 0) => {
      release();
      const p = player.current;
      p.queue = queue;
      p.index = index;
      const gen = p.generation;
      const item = queue[index];
      if (!item) {
        setState((s) => ({ ...s, status: "ended", time: s.duration }));
        return;
      }
      setState({
        status: "loading",
        item,
        queue,
        index,
        time: 0,
        duration: 0,
        error: "",
      });
      if (item.language === "ar" || deviceVoice) {
        const synth = window.speechSynthesis;
        const voice = synth
          ?.getVoices()
          .find((v) =>
            v.lang
              .toLowerCase()
              .startsWith(item.language === "ar" ? "ar" : "en"),
          );
        if (!synth || (item.language === "ar" && !voice) || !window.SpeechSynthesisUtterance) {
          setState((s) => ({
            ...s,
            status: "error",
            error:
              item.language === "ar"
                ? "No Arabic device voice is available. Enable an Arabic voice in your device settings, then retry. You can still read this story."
                : "No English device voice is available. Retry online audio.",
          }));
          return;
        }
        const utterance = new window.SpeechSynthesisUtterance(
          narration(item).slice(offset),
        );
        p.utterance = utterance;
        p.browserPaused = !autoplay;
        p.browserStarted = false;
        p.charIndex = offset;
        p.deviceVoice = true;
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || "en-US";
        utterance.rate = p.speed;
        utterance.onboundary = (e) => {
          if (p.generation === gen) p.charIndex = offset + e.charIndex;
        };
        utterance.onstart = () => {
          if (p.generation === gen)
            setState((s) => ({
              ...s,
              status: "playing",
              deviceVoice: true,
              error: "",
            }));
        };
        utterance.onerror = () => {
          if (p.generation === gen) {
            p.utterance = null;
            setState((s) => ({
              ...s,
              status: "error",
              error: "Device narration was interrupted. Tap Play to retry.",
            }));
          }
        };
        utterance.onend = () => {
          if (p.generation !== gen) return;
          p.onComplete?.(item);
          if (index + 1 < queue.length) load(queue, index + 1, true, true);
          else setState((s) => ({ ...s, status: "ended" }));
        };
        if (autoplay) {
          p.browserStarted = true;
          synth.speak(utterance);
        } else setState((s) => ({ ...s, status: "paused", deviceVoice: true }));
        return;
      }
      p.deviceVoice = false;
      const controller = new AbortController();
      p.controller = controller;
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(`${BACKEND_URL}/api/tts-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: narration(item) }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          const error = new Error("Audio unavailable");
          error.providerUnavailable = response.status === 402 || /insufficient tokens|insufficient credits/i.test(detail.detail || "");
          throw error;
        }
        const blob = await response.blob();
        if (p.generation !== gen) return;
        if (!blob.size) throw new Error("Empty audio");
        const url = URL.createObjectURL(blob);
        p.url = url;
        const audio = new Audio(url);
        p.audio = audio;
        audio.playbackRate = p.speed;
        const valid = () => p.generation === gen;
        audio.onloadedmetadata = () => {
          if (valid())
            setState((s) => ({
              ...s,
              duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            }));
        };
        audio.ontimeupdate = () => {
          if (valid())
            setState((s) => ({
              ...s,
              time: audio.currentTime,
              duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            }));
        };
        audio.onplay = () => {
          if (valid())
            setState((s) => ({ ...s, status: "playing", error: "" }));
        };
        audio.onpause = () => {
          if (valid() && !audio.ended)
            setState((s) => ({ ...s, status: "paused" }));
        };
        audio.onerror = () => {
          if (valid())
            setState((s) => ({
              ...s,
              status: "error",
              error: "Audio could not play. Retry or skip this story.",
            }));
        };
        audio.onended = () => {
          if (!valid()) return;
          p.onComplete?.(item);
          if (index + 1 < queue.length) load(queue, index + 1);
          else {
            setState((s) => ({ ...s, status: "ended", time: s.duration }));
          }
        };
        if (autoplay) {
          try {
            await audio.play();
          } catch {
            if (valid())
              setState((s) => ({
                ...s,
                status: "paused",
                error: "Tap Play to start audio.",
              }));
          }
        } else setState((s) => ({ ...s, status: "paused" }));
      } catch (e) {
        if (p.generation === gen && e.providerUnavailable && window.speechSynthesis && window.SpeechSynthesisUtterance) {
          load(queue, index, true, true);
        } else if (p.generation === gen)
          setState((s) => ({
            ...s,
            status: "error",
            error: e.providerUnavailable
              ? "Online narration is temporarily unavailable. Use your device voice to keep listening."
              : "Audio is unavailable. Retry or use your device voice.",
          }));
      } finally {
        clearTimeout(timer);
      }
    },
    [release],
  );
  const toggle = useCallback(() => {
    const p = player.current;
    if (p.utterance) {
      if (p.browserPaused) {
        p.browserPaused = false;
        if (p.browserStarted) window.speechSynthesis.resume();
        else {
          p.browserStarted = true;
          window.speechSynthesis.speak(p.utterance);
        }
        setState((s) => ({ ...s, status: "playing" }));
      } else {
        p.browserPaused = true;
        window.speechSynthesis.pause();
        setState((s) => ({ ...s, status: "paused" }));
      }
      return;
    }
    if (!p.audio) return load(p.queue, p.index, true, p.deviceVoice);
    if (p.audio.paused) {
      p.audio.play().catch(() =>
        setState((s) => ({
          ...s,
          status: "error",
          error: "Tap Play to retry audio.",
        })),
      );
    } else p.audio.pause();
  }, [load]);
  const stop = useCallback(() => {
    release();
    player.current.queue = [];
    setState({
      status: "idle",
      item: null,
      queue: [],
      index: 0,
      time: 0,
      duration: 0,
      error: "",
    });
  }, [release]);
  const step = useCallback(
    (dir) => {
      const p = player.current;
      const i = p.index + dir;
      if (i >= 0 && i < p.queue.length)
        load(
          p.queue,
          i,
          p.utterance ? !p.browserPaused : !p.audio?.paused,
          p.deviceVoice,
        );
    },
    [load],
  );
  const seek = useCallback((time) => {
    const a = player.current.audio;
    if (a && Number.isFinite(a.duration))
      a.currentTime = Math.max(0, Math.min(a.duration, time));
  }, []);
  useEffect(() => {
    if (player.current.audio) player.current.audio.playbackRate = speed;
    else if (player.current.utterance) {
      const p = player.current;
      load(p.queue, p.index, !p.browserPaused, true, p.charIndex || 0);
    }
  }, [speed, load]);
  useEffect(() => () => release(), [release]);
  useEffect(() => {
    if (!navigator.mediaSession) return;
    const m = navigator.mediaSession;
    try {
      m.setActionHandler("play", () =>
        player.current.audio?.play().catch(() => {}),
      );
      m.setActionHandler("pause", () => player.current.audio?.pause());
      m.setActionHandler("nexttrack", () => step(1));
      m.setActionHandler("previoustrack", () => step(-1));
    } catch {}
    return () => {
      ["play", "pause", "nexttrack", "previoustrack"].forEach((x) => {
        try {
          m.setActionHandler(x, null);
        } catch {}
      });
    };
  }, [step]);
  useEffect(() => {
    if (navigator.mediaSession && window.MediaMetadata && state.item)
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: state.item.headline,
        artist: state.item.category,
        album: "RadioNews",
      });
  }, [state.item]);
  return {
    ...state,
    start: load,
    retry: () =>
      load(player.current.queue, player.current.index, true, player.current.deviceVoice),
    toggle,
    stop,
    step,
    seek,
    useDeviceVoice: () =>
      load(player.current.queue, player.current.index, true, true),
  };
}
