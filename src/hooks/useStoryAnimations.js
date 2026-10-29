import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../lib/backend';
import { cleanForTTS } from '../audio/narrationText';

const cache = new Map(), requests = new Map();
const clean = text => cleanForTTS(String(text || '')).replace(/\s+/g, ' ').trim();
const remember = (text, entry) => {
  if (cache.size >= 500) cache.delete(cache.keys().next().value);
  cache.set(text, { ...entry, expires: entry.plan ? Infinity : Date.now() + 15000 });
};
export function clearStoryAnimationCache() { cache.clear(); requests.clear(); }
export default function useStoryAnimations(texts, enabled) {
  const signature = texts.map(clean).join('\u001f');
  const [records, setRecords] = useState({});
  useEffect(() => {
    if (!enabled || !signature) return undefined;
    const wanted = [...new Set(signature.split('\u001f'))].filter(Boolean).slice(0,16);
    let cancelled = false, timer;
    const load = async () => {
      const missing = wanted.filter(text => !cache.has(text) || cache.get(text).expires <= Date.now());
      if (missing.length) {
        const key = missing.join('\u001f');
        let request = requests.get(key);
        if (!request) {
          request = fetch(`${BACKEND_URL}/api/story-animations/lookup`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({texts:missing}),
          }).then(async response => {
            if (!response.ok) throw new Error('Animation lookup failed');
            const body = await response.json();
            if (body.version !== 1 || !Array.isArray(body.entries)) throw new Error('Unsupported animation response');
            for (const text of missing) {
              const entry = body.entries.find(item => item.text === text);
              remember(text, entry ? { plan:entry.status === 'ready' ? entry.plan : null, status:entry.status } : {plan:null,status:'unavailable'});
            }
          }).catch(() => missing.forEach(text => remember(text,{plan:null,status:'unavailable'})))
            .finally(()=>requests.delete(key));
          requests.set(key,request);
        }
        await request;
      }
      if (cancelled) return;
      setRecords(Object.fromEntries(wanted.map(text => [text,cache.get(text) || {plan:null,status:'pending'}])));
      if (wanted.some(text => !cache.get(text)?.plan)) timer = setTimeout(load, 16000);
    };
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [signature,enabled]);
  return text => records[clean(text)] || cache.get(clean(text)) || {plan:null,status:'pending'};
}
