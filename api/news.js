// Vercel serverless function — the shared read layer in front of Supabase.
//
// The client used to query `news_summaries` directly from the browser, so every visitor
// hit the database for the exact same rows. This endpoint sits in between and sets a
// Cache-Control header, so Vercel's edge network serves repeat requests for the same
// day/category/slot straight from cache — no database hit at all after the first one.
//
// Two modes mirror the two direct-Supabase reads this replaces in App.js:
//   mode=one  → a single category/day/timeSlot row (category detail view)
//   mode=list → all rows for one category across the day's present slots (All News / My Feed)
//
// Cache duration is day-aware: a past day is immutable once generated, so it's cached
// hard. Today can still change — a new slot landing, or an admin manually regenerating a
// story the audit agent flagged — so it gets a short cache instead. That self-heals within
// a minute rather than needing an explicit purge call wired to the regenerate button.
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

function todayUAE() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
}

module.exports = async function handler(req, res) {
  const { mode = 'list', day, language = 'en', category, timeSlot, slots } = req.query;
  if (!day || !category) return res.status(400).json({ error: 'day and category are required' });

  const cacheControl = day === todayUAE()
    ? 'public, s-maxage=60, stale-while-revalidate=30'
    : 'public, s-maxage=86400, stale-while-revalidate=3600';

  try {
    if (mode === 'one') {
      if (!timeSlot) return res.status(400).json({ error: 'timeSlot is required for mode=one' });
      const { data, error } = await supabase
        .from('news_summaries')
        .select('category, day, time_slot, language, content, stories_content, generated_at, briefing')
        .eq('category', category).eq('day', day).eq('time_slot', timeSlot)
        .eq('language', language).is('user_id', null).is('shared_key', null)
        .maybeSingle();
      if (error) throw error;
      res.setHeader('Cache-Control', cacheControl);
      return res.status(200).json(data);
    }

    const slotList = (slots || '').split(',').filter(Boolean);
    if (!slotList.length) return res.status(400).json({ error: 'slots is required for mode=list' });
    const { data, error } = await supabase
      .from('news_summaries')
      .select('content, stories_content, time_slot, briefing')
      .eq('category', category).eq('day', day)
      .in('time_slot', slotList)
      .eq('language', language).is('user_id', null).is('shared_key', null);
    if (error) throw error;
    res.setHeader('Cache-Control', cacheControl);
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
