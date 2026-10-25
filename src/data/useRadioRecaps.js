import { useEffect, useMemo, useState } from 'react';
import { storyParagraph } from '../lib/stories';
import { cleanForTTS } from '../audio/narrationText';

// Read existing recap records only; generation remains owned by the backend.
export default function useRadioRecaps({ active, categories, period, day, today, language, briefingData }) {
  const [remote, setRemote] = useState({ key: '', rows: {}, loading: false, error: false });
  const catsKey = categories.join('|');
  const [daily, setDaily] = useState({ key: '', rows: {} });
  const end = useMemo(() => {
    const d = new Date(`${day || today}T00:00:00Z`);
    if (period === 'Weekly') d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    else if (period === 'Monthly') {
      const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
      if (m.toISOString().slice(0, 10) > today) m.setUTCDate(0);
      return m.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  }, [day, today, period]);
  const key = `${catsKey}|${period}|${end}|${language}`;
  useEffect(() => {
    if (!active || period !== 'Daily') return;
    let canceled = false, timer;
    const controller = new AbortController();
    // Headline caches may predate a recap backfill. Refresh missing recap fields directly
    // rather than treating the day's originally empty briefing as immutable.
    let rows = Object.fromEntries(categories.map(c => [c, daily.key === key && daily.rows[c]?.text ? daily.rows[c] : { text: cleanForTTS(briefingData[c]?.briefing || ''), sources: briefingData[c]?.briefingSources, day }]));
    const load = async () => {
      const missing = categories.filter(c => !rows[c]?.text);
      const updates = await Promise.all(missing.map(async category => {
        try {
          const params = new URLSearchParams({ mode: 'list', category, day: day || today, slots: 'Morning,Evening,Daily', language });
          const response = await fetch(`/api/news?${params}`, { signal: controller.signal });
          if (!response.ok) return [category, null];
          const data = await response.json();
          const order = ['Evening', 'Morning', 'Daily'];
          const row = Array.isArray(data) ? [...data].sort((a, b) => order.indexOf(a.time_slot) - order.indexOf(b.time_slot)).find(r => r.briefing?.trim()) : null;
          return [category, row ? { text: cleanForTTS(row.briefing), sources: row.briefing_sources, day } : null];
        } catch { return [category, null]; }
      }));
      if (canceled) return;
      updates.forEach(([category, row]) => { if (row?.text) rows[category] = row; });
      setDaily({ key, rows: { ...rows } });
      if (categories.some(c => !rows[c]?.text)) timer = setTimeout(load, 60000);
    };
    load();
    return () => { canceled = true; controller.abort(); clearTimeout(timer); };
  }, [active, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || (period === 'Daily' || period === 'Headlines')) return;
    let canceled = false;
    const controller = new AbortController();
    setRemote({ key, rows: {}, loading: true, error: false });
    Promise.all(categories.map(async category => {
      const params = new URLSearchParams({ mode: 'one', category, day: end, timeSlot: period, language });
      const response = await fetch(`/api/news?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Recap request failed');
      const row = await response.json();
      const text = cleanForTTS(row?.briefing || row?.content || '');
      return [category, text ? { text, sources: row.briefing_sources, day: end } : null];
    })).then(rows => { if (!canceled) setRemote({ key, rows: Object.fromEntries(rows), loading: false, error: false }); })
      .catch(() => { if (!canceled) setRemote({ key, rows: {}, loading: false, error: true }); });
    return () => { canceled = true; controller.abort(); };
  }, [active, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = period === 'Headlines' ? {} : period === 'Daily'
    ? Object.fromEntries(categories.map(c => [c, daily.key === key && daily.rows[c]?.text ? daily.rows[c] : { text: cleanForTTS(briefingData[c]?.briefing || ''), sources: briefingData[c]?.briefingSources, day }]))
    : remote.key === key ? remote.rows : {};
  return { rows, loading: active && period !== 'Daily' && period !== 'Headlines' && (remote.key !== key || remote.loading), error: period !== 'Daily' && period !== 'Headlines' && remote.key === key && remote.error, end };
}

export function radioSnapshot(categories, rows, period) {
  return Object.fromEntries(categories.filter(c => rows[c]?.text?.trim()).map(c => [c, { allStories: [{
    headline: `${c} recap`, summary: rows[c].text.trim(), tightBullets: [rows[c].text.trim()], allBullets: [rows[c].text.trim()],
    storySources: [], _isBriefing: true, _recapPeriod: period,
  }] }]));
}

// Headline summaries are the daily programme: the same verified text as Read mode.
export function headlineRadioSnapshot(categories, data) {
  return Object.fromEntries(categories.flatMap(category => {
    const allStories = (data[category]?.allStories || []).filter(story => storyParagraph(story).trim());
    return allStories.length ? [[category, { allStories }]] : [];
  }));
}
