// Build a briefingData-shaped map ({ [cat]: { storyCount, estimatedSec, allStories,
// previewStories } }) from a flat list of { category, story } items. Used to render
// snapshot-based feeds (My Saves, Interesting) through the same machinery as live news.
export function buildSnapshotBriefing(items) {
  const byCat = {};
  items.forEach(({ category, story }) => {
    if (!category || !story) return;
    (byCat[category] = byCat[category] || []).push(story);
  });
  const out = {};
  Object.keys(byCat).forEach(cat => {
    const all = byCat[cat];
    const totalWords = all.reduce((acc, st) => {
      const fields = [...(st.allBullets || st.tightBullets || []), st.perspectives, st.why, st.headline].filter(Boolean);
      return acc + fields.join(' ').split(/\s+/).filter(Boolean).length;
    }, 0);
    const estimatedSec = Math.max(10, Math.round((totalWords / 200) * 60));
    out[cat] = { storyCount: all.length, estimatedSec, previewStories: all.slice(0, 3), allStories: all };
  });
  return out;
}

// Normalise a URL for matching: lower-case host+path, strip trailing slash & query/hash
export const normalizeUrl = (url) => {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/+$/, '').toLowerCase();
  } catch { return url.toLowerCase(); }
};

// buildStories: single parse pass on `content` for structure + sources.
// storiesContent (optional) overlays tightBullets per story matched by headline.
// Returns { stories, hasPunchyBullets }
export const buildStories = (content, storiesContent) => {
  if (!content && !storiesContent) return { stories: [], hasPunchyBullets: false };

  const normalizeHeadline = (h) => h.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '').slice(0, 40);

  // ── Parse content for structure, bullets, perspectives, why, sources ──────
  const src = content || storiesContent || '';
  const sourcesStart = src.search(/^#{1,3}\s+(?:\[)?(?:Sources|المصادر)(?:\]|\()?/im);
  const body = sourcesStart > -1 ? src.slice(0, sourcesStart).trim() : src.trim();

  // Build source title map from ## Sources section
  const titleMap = {};
  if (sourcesStart > -1) {
    [...src.slice(sourcesStart).matchAll(/[-*\d.]\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
      .forEach(([, t, u]) => { const k = normalizeUrl(u); if (!titleMap[k]) titleMap[k] = t; });
  }

  // Single-pass: build story chunks + collect coverage URLs by story index
  const chunks = [];
  const urlToStoryIdx = {};
  let cur = null;
  let idx = -1;
  body.split('\n').forEach(line => {
    const hm = line.match(/^#{1,3} (.+)$/);
    if (hm) {
      if (cur) chunks.push(cur);
      idx++;
      const headingRaw = hm[1].trim();
      const headline = headingRaw
        .replace(/^\[(.+?)\]\(https?:\/\/[^)]+\)$/, '$1')
        .replace(/https?:\/\/\S+/g, '').replace(/[()[\]]/g, '').trim();
      cur = { headline, idx, bodyLines: [], coverageLinks: [] };
      return;
    }
    if (!cur) return;
    const cov = line.match(/^\s*\*\*(?:Coverage|التغطية|المصادر):\*\*\s*(.+)$/);
    if (cov) {
      [...cov[1].matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)].forEach(([, outlet, url]) => {
        if (urlToStoryIdx[url] === undefined) urlToStoryIdx[url] = idx;
        cur.coverageLinks.push({ outlet, url, title: titleMap[normalizeUrl(url)] || '' });
      });
    } else {
      cur.bodyLines.push(line);
      [...line.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].forEach(([, url]) => {
        if (urlToStoryIdx[url] === undefined) urlToStoryIdx[url] = idx;
      });
    }
  });
  if (cur) chunks.push(cur);

  // ── Parse storiesContent for punchy bullets keyed by headline ─────────────
  // Also kept as an ordered list so a story's summary still attaches by position when
  // the digest/stories headlines don't match exactly (older data, or model rephrasing).
  const punchyMap = {};
  const punchyList = [];
  if (storiesContent) {
    const sSrc = storiesContent;
    const sSrcEnd = sSrc.search(/^#{1,3}\s+(?:\[)?(?:Sources|المصادر)(?:\]|\()?/im);
    const sBody = sSrcEnd > -1 ? sSrc.slice(0, sSrcEnd).trim() : sSrc.trim();
    sBody.split(/(?=^#{1,3} )/m).filter(c => /^#{1,3} /.test(c.trim())).forEach(chunk => {
      const lines = chunk.trim().split('\n');
      const h = lines[0].replace(/^#{1,3}\s+/, '').replace(/^\[(.+?)\]\(https?:\/\/[^)]+\)$/, '$1')
        .replace(/https?:\/\/\S+/g, '').replace(/[()[\]]/g, '').trim();
      const bodyText = lines.slice(1).join('\n');
      const bullets = [...bodyText.matchAll(/^[-*]\s+(.+)$/gm)].map(m => m[1]);
      // Stop capture at the next **Field:** boundary so adjacent fields aren't included
      const summaryMatch = bodyText.match(/\*\*Summary:\*\*\s*([\s\S]+?)(?=\n\*\*[A-Z]|\n#{1,3} |$)/);
      const summary = summaryMatch ? summaryMatch[1].trim() : null;
      if (h && bullets.length > 0) {
        punchyMap[normalizeHeadline(h)] = { bullets, summary };
        punchyList.push({ bullets, summary });
      }
    });
  }

  // ── Build final story objects ─────────────────────────────────────────────
  let anyPunchy = false;
  // Index fallback is only safe when the two lists line up 1:1 (same story count).
  const canIndexMatch = punchyList.length === chunks.length;
  const builtStories = chunks.map((chunk, ci) => {
    const rest = chunk.bodyLines.join('\n');
    const allBullets = [...rest.matchAll(/^[-*]\s+(.+)$/gm)].map(m => m[1]);
    const perspMatch = rest.match(/\*\*(?:Perspectives differ|وجهات النظر تتباين|تباين وجهات النظر|آراء مختلفة):\*\*\s*(.+)/);
    const whyMatch = rest.match(/\*\*(?:Why this matters|لماذا هذا مهم|لماذا يهم هذا|أهمية الخبر):\*\*\s*(.+)/);
    // Only set on Evening's incremental-merge digest (see generateEveningUpdate on the
    // backend) — "Unchanged" carries no badge, only "Updated"/"New" do.
    const statusMatch = rest.match(/\*\*Status:\*\*\s*(Updated|New|Unchanged)/);
    const storySources = chunk.coverageLinks.filter((s, i, a) => a.findIndex(x => x.url === s.url) === i);
    const key = normalizeHeadline(chunk.headline);
    const punchy = punchyMap[key] || (canIndexMatch ? punchyList[ci] : undefined);
    if (punchy) anyPunchy = true;
    const tightBullets = punchy?.bullets || allBullets.slice(0, 3);
    if (!chunk.headline || allBullets.length === 0) return null;
    return {
      headline: chunk.headline,
      tightBullets,       // short: from storiesContent if available, else first 3 from content
      allBullets,         // full: all bullets from content
      perspectives: perspMatch?.[1] || null,
      why: whyMatch?.[1] || null,
      summary: punchy?.summary || null,  // elaborate narrative paragraph (new generation cycle only)
      status: statusMatch?.[1] === 'Updated' || statusMatch?.[1] === 'New' ? statusMatch[1] : null,
      storySources,
      bodyLines: chunk.bodyLines, // kept for Read mode renderer
    };
  }).filter(Boolean);

  return { stories: builtStories, hasPunchyBullets: anyPunchy };
};
