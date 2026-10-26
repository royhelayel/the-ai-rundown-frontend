import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BACKEND_URL } from '../lib/backend';
import { coverage, fraction, mergeProgress, programmeKey, queueKeys } from '../audio/programmeProgress';

const bounded = records => Object.fromEntries(Object.entries(records).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)).slice(0, 120));
const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
export default function useAudioProgramme(userId) {
  const storageKey = `radionews_audio_progress:${userId || 'guest'}`;
  const [records, setRecords] = useState(() => read(storageKey));
  const [notice, setNotice] = useState(null);
  const ref = useRef({});
  const state = useRef({ records, activeKey: null, speechStart: 0, dirty: new Set(), lastUI: 0, scope: storageKey });
  const persist = () => {
    if (state.current.scope !== storageKey) return;
    state.current.records = bounded(state.current.records);
    try { localStorage.setItem(storageKey, JSON.stringify(state.current.records)); } catch {}
    setRecords({ ...state.current.records });
  };
  const save = patch => {
    const st = state.current, key = st.activeKey;
    if (!key || st.scope !== storageKey) return;
    const previous = st.records[key];
    const next = mergeProgress(previous, { ...previous, ...patch, updatedAt: Date.now() });
    st.records[key] = next; st.dirty.add(key);
    if (next.queueKeys?.length && next.queueKeys.every(k => coverage(st.records[k]?.ranges || []) + 1e-8 >= .70)) next.mixCompleted = true;
    const completedNow = next.completed && !previous.completed;
    if (completedNow || Date.now() - st.lastUI > 1500 || patch.finished) { st.lastUI = Date.now(); persist(); }
  };
  ref.current = {
    notify(message) { setNotice({ message }); },
    begin(snap, category, text) {
      if (!snap?.radio || snap.headlineProgramme || !snap.day) { state.current.activeKey = null; return; }
      const key = programmeKey({ ...snap, category, text });
      const st = state.current;
      if (st.scope !== storageKey) return;
      st.activeKey = key;
      st.records[key] = { day: snap.day, period: snap.period, language: snap.language, category, signature: key.split('|').pop(), position: 0, ranges: [], ...st.records[key], finished: false, started: true, updatedAt: Date.now(), queueKeys: queueKeys(snap), missingCount: snap.missingCount || 0 };
      st.dirty.add(key); persist(); setNotice(null);
    },
    media(audio) {
      if (!audio.duration || !Number.isFinite(audio.duration)) return;
      const ranges = [];
      // HTMLMediaElement.played contains only source intervals that actually played.
      for (let i = 0; i < (audio.played?.length || 0); i++) ranges.push([audio.played.start(i) / audio.duration, audio.played.end(i) / audio.duration]);
      save({ ranges, position: fraction(audio.currentTime / audio.duration), duration: audio.duration, speed: audio.playbackRate || 1 });
    },
    speechStart(position) { state.current.speechStart = fraction(position); },
    speech(position) {
      const to = fraction(position), from = state.current.speechStart;
      save({ position: to, ranges: to > from ? [[from, to]] : [] });
    },
    end() { save({ position: 1, finished: true }); },
    flush() { persist(); },
    fail() { setNotice({ complete: false, error: true, message: 'Playback stopped. Your listening progress is saved.' }); persist(); },
    finish(snap) {
      const keys = queueKeys(snap);
      const complete = keys.length > 0 && keys.every(k => coverage(state.current.records[k]?.ranges || []) + 1e-8 >= .70);
      if (complete) save({ mixCompleted: true, finished: true, position: 1 });
      setNotice({ complete, message: complete ? (snap.missingCount ? 'You’re caught up with the available topics in your mix.' : 'You’re caught up with your mix.') : 'Mix finished. Some topics were skipped.' });
      persist();
      return complete;
    },
  };
  useEffect(() => {
    state.current = { records: read(storageKey), activeKey: null, speechStart: 0, dirty: new Set(), lastUI: 0, scope: storageKey };
    setRecords({ ...state.current.records }); setNotice(null);
    let canceled = false, syncing = false;
    const sync = async () => {
      if (!userId || syncing) return;
      syncing = true;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token || canceled || data.session.user?.id !== userId || state.current.scope !== storageKey) return;
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const local = state.current;
        const dirty = [...local.dirty].filter(k => local.records[k]);
        const sentAt = Date.now();
        // Small batches stay below the API payload limit even with a full week saved.
        for (let i = 0; i < dirty.length && !canceled; i += 20) {
          const batch = dirty.slice(i, i + 20);
          const response = await fetch(`${BACKEND_URL}/api/audio-progress`, { method: 'POST', headers, body: JSON.stringify({ records: batch.map(key => ({ key, ...local.records[key] })) }) });
          if (response.ok) batch.forEach(key => { if ((local.records[key]?.updatedAt || 0) <= sentAt) local.dirty.delete(key); });
        }
        const response = await fetch(`${BACKEND_URL}/api/audio-progress`, { headers });
        if (!response.ok || canceled) return;
        const remote = await response.json();
        if (canceled) return;
        remote.forEach(({ key, ...row }) => { local.records[key] = mergeProgress(local.records[key], row); });
        // Keep storage bounded; newest 120 recordings cover recent editions and changed scripts.
        local.records = bounded(local.records);
        persist();
      } catch { /* Local progress remains available while offline. */ }
      finally { syncing = false; }
    };
    // Include locally saved progress not yet uploaded (for example after an offline visit).
    Object.keys(state.current.records).forEach(k => state.current.dirty.add(k));
    sync();
    const timer = setInterval(sync, 15000);
    const flush = () => { persist(); sync(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => { persist(); canceled = true; clearInterval(timer); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
  }, [storageKey, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  const cutoff = new Date(Date.now() + 4 * 3600000 - 7 * 86400000).toISOString().slice(0, 10);
  const latest = Object.entries(records).filter(([, r]) => r.day >= cutoff && (r.started || r.position > .01) && !r.finished).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))[0];
  return { ref, records, resume: latest ? { key: latest[0], ...latest[1] } : null, notice };
}
