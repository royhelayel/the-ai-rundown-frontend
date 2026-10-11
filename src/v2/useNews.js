import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BACKEND_URL } from "../lib/backend";
import { CATEGORIES, normalizeRows } from "./model";

export async function jsonRequest(url, options = {}) {
  const controller = options.signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 20000) : null;
  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export function useNews(day, language, revision) {
  const [state, setState] = useState({
    key: "",
    data: {},
    loading: true,
    error: "",
    failed: [],
  });
  const key = `${day}|${language}|${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 25000);
    setState({ key, data: {}, loading: true, error: "", failed: [] });
    (async () => {
      try {
        const { data: markers, error } = await supabase
          .from("news_summaries")
          .select("time_slot")
          .eq("category", "__completed__")
          .eq("day", day)
          .eq("language", language)
          .is("user_id", null)
          .is("shared_key", null)
          .abortSignal(controller.signal);
        if (error) throw error;
        const slots = [
          ...new Set(
            (markers || [])
              .map((r) => r.time_slot)
              .filter((s) => ["Morning", "Daily", "Evening"].includes(s)),
          ),
        ];
        if (!slots.length) {
          if (active)
            setState({ key, data: {}, loading: false, error: "", failed: [] });
          return;
        }
        const results = await Promise.allSettled(
          CATEGORIES.map(async (category) => {
            const params = new URLSearchParams({
              mode: "list",
              category,
              day,
              language,
              slots: slots.join(","),
            });
            const rows = await jsonRequest(`/api/news?${params}`, {
              signal: controller.signal,
            });
            if (!Array.isArray(rows)) throw new Error("Invalid news response");
            return normalizeRows(rows, category, day, language);
          }),
        );
        if (!active) return;
        const data = {},
          failed = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") data[CATEGORIES[i]] = r.value;
          else failed.push(CATEGORIES[i]);
        });
        setState({
          key,
          data,
          failed,
          loading: false,
          error:
            failed.length === CATEGORIES.length
              ? "News could not be loaded. Please try again."
              : "",
        });
      } catch (e) {
        if (active)
          setState({
            key,
            data: {},
            failed: [],
            loading: false,
            error: controller.signal.aborted
              ? "The request timed out. Please retry."
              : "News could not be loaded. Check your connection and retry.",
          });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [day, language, revision, key]);
  return state.key === key
    ? state
    : { key, data: {}, loading: true, error: "", failed: [] };
}
export function useInterests(revision) {
  const [state, setState] = useState({ items: [], loading: true, error: "" });
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    const timer = setTimeout(() => c.abort(), 15000);
    setState((s) => ({ ...s, loading: true, error: "" }));
    jsonRequest(`${BACKEND_URL}/api/saves/interesting`, { signal: c.signal })
      .then((items) => {
        if (!Array.isArray(items))
          throw new Error("Invalid discovery response");
        if (active) setState({ items, loading: false, error: "" });
      })
      .catch(() => {
        if (active)
          setState({
            items: [],
            loading: false,
            error: "Interesting stories could not be loaded.",
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      c.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  return state;
}
