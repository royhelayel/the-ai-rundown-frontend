import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BACKEND_URL } from '../lib/backend';
import { coverage, fraction, mergeProgress, programmeKey, queueKeys, recapSpan, recapPosition } from '../audio/programmeProgress';

const bounded = records => Object.fromEntries(Object.entries(records).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)).slice(0, 120));
const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
export default function useAudioProgramme(userId) {
  const storageKey = `radionews_audio_progress:${userId || 'guest'}`;
  const cursorKey = `${storageKey}:cursor`;
  const [cursor,setCursor] = useState(()=>read(cursorKey));
  const [recordsScope,setRecordsScope] = useState(storageKey);
  const [records, setRecords] = useState(() => read(storageKey));
  const [notice, setNotice] = useState(null);
  const ref = useRef({});
  const state = useRef({ records, activeKey: null, speechStart: 0, dirty: new Set(), lastUI: 0, scope: storageKey, cursor: read(cursorKey) });
  const persist = () => {
    if (state.current.scope !== storageKey) return;
    state.current.records = bounded(state.current.records);
    try { localStorage.setItem(storageKey, JSON.stringify(state.current.records)); } catch {}
    setRecords({ ...state.current.records });
    try { localStorage.setItem(cursorKey,JSON.stringify(state.current.cursor || {})); } catch {}
    setCursor(state.current.cursor || {});
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
  const saveCursor = patch => {
    const st=state.current; if(st.scope!==storageKey || !st.cursor?.key)return;
    st.cursor={...st.cursor,...patch,updatedAt:Date.now()};
    if(Date.now()-st.lastUI>1500 || patch.finished) {st.lastUI=Date.now();persist();}
  };
  ref.current = {
    notify(message) { setNotice({ message }); },
    begin(snap, category, text, segment, clip) {
      setNotice(null);
      if(snap?.radio && snap.day && state.current.scope===storageKey && clip) {
        state.current.cursor={...clip,clip:true,key:programmeKey({...snap,category,text:clip.text}),day:snap.day,period:snap.period,language:snap.language,lens:snap.lens || 'latest',category,position:fraction(clip.position),finished:false,updatedAt:Date.now()};
        persist();
      }
      if (!snap?.radio || snap.headlineProgramme || !snap.day) { state.current.activeKey = null; return; }
      const key = programmeKey({ ...snap, category, text });
      const st = state.current;
      if (st.scope !== storageKey) return;
      st.activeKey = key;
      st.span = recapSpan(segment);
      st.records[key] = { day: snap.day, period: snap.period, language: snap.language, category, signature: key.split('|').pop(), position: 0, ranges: [], ...st.records[key], finished: false, started: true, updatedAt: Date.now(), queueKeys: queueKeys(snap), missingCount: snap.missingCount || 0 };
      if(segment) st.records[key].position=st.span[0];
      st.dirty.add(key); persist(); setNotice(null);
    },
    media(audio) {
      if (!audio.duration || !Number.isFinite(audio.duration)) return;
      saveCursor({position:fraction(audio.currentTime/audio.duration),duration:audio.duration,speed:audio.playbackRate || 1});
      const ranges = [];
      // HTMLMediaElement.played contains only source intervals that actually played.
      // Split Quick clips occupy fixed spoken-content spans in their parent recap;
      // map only played intervals, never a skip/seek cursor, onto that shared record.
      const span=state.current.span || [0,1];
      for (let i = 0; i < (audio.played?.length || 0); i++) ranges.push([recapPosition(audio.played.start(i)/audio.duration,span),recapPosition(audio.played.end(i)/audio.duration,span)]);
      save({ ranges, position: recapPosition(audio.currentTime/audio.duration,span), duration: audio.duration/(span[1]-span[0]), speed: audio.playbackRate || 1 });
    },
    speechStart(position,speed) { state.current.speechStart = fraction(position); if(speed) saveCursor({speed}); },
    speech(position) {
      saveCursor({position:fraction(position)});
      const span=state.current.span || [0,1], to=recapPosition(position,span), from=recapPosition(state.current.speechStart,span);
      save({ position: to, ranges: to > from ? [[from, to]] : [] });
    },
    end() { saveCursor({position:1,finished:true}); const end=state.current.span?.[1] ?? 1; save({ position:end,finished:end===1 }); },
    seek(position) { saveCursor({position:fraction(position)}); persist(); },
    flush() { persist(); },
    fail() { setNotice(null); persist(); },
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
    state.current = { records: read(storageKey), activeKey: null, speechStart: 0, dirty: new Set(), lastUI: 0, scope: storageKey, cursor:read(cursorKey) };
    setRecordsScope(storageKey);setRecords({ ...state.current.records }); setCursor(state.current.cursor); setNotice(null);
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
  const savedCursor=cursor?.key && cursor.day>=cutoff && !cursor.finished ? cursor : null;
  return { ref, records, ready:recordsScope===storageKey, resume: recordsScope!==storageKey ? null : savedCursor || (!cursor?.key && latest ? { key: latest[0], ...latest[1] } : null), notice };
}
