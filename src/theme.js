// ── Design tokens ─────────────────────────────────────────────────────────────

export const colors = {
  bg:            '#09090f',
  bgCard:        '#111119',
  bgCardHigh:    '#18181f',
  bgOverlay:     'rgba(9,9,15,0.92)',
  text:          '#ffffff',
  textSub:       'rgba(255,255,255,0.6)',
  textMuted:     'rgba(255,255,255,0.32)',
  border:        'rgba(255,255,255,0.08)',
  borderLight:   'rgba(255,255,255,0.14)',
  accent:        '#6366f1',
};

// ── Category accent colours ────────────────────────────────────────────────────
export const CATEGORY_COLORS = {
  'World News':    '#6366f1',
  'Technology':    '#0891b2',
  'Business':      '#d97706',
  'Politics':      '#e11d48',
  'Sports':        '#16a34a',
  'Entertainment': '#9333ea',
  'Science':       '#2563eb',
  'Health':        '#db2777',
  'UAE':           '#0369a1',
  'KSA':           '#166534',
  'QAT':           '#86198f',
  'LEB':           '#c2410c',
  'My Rundown':    '#7c3aed',
};

// ── Category hero images (Unsplash CDN) ───────────────────────────────────────
// One atmospheric image per category — used as the full-bleed hero in the player
// and as the thumbnail in the briefing feed.
export const CATEGORY_IMAGES = {
  'World News':    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80&auto=format&fit=crop',
  'Technology':    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80&auto=format&fit=crop',
  'Business':      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80&auto=format&fit=crop',
  'Politics':      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=900&q=80&auto=format&fit=crop',
  'Sports':        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80&auto=format&fit=crop',
  'Entertainment': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80&auto=format&fit=crop',
  'Science':       'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=900&q=80&auto=format&fit=crop',
  'Health':        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80&auto=format&fit=crop',
  'UAE':           'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&q=80&auto=format&fit=crop',
  'KSA':           'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=900&q=80&auto=format&fit=crop',
  'QAT':           'https://images.unsplash.com/photo-1584592740039-cddf0671f3d4?w=900&q=80&auto=format&fit=crop',
  'LEB':           'https://images.unsplash.com/photo-1555169062-013468b47731?w=900&q=80&auto=format&fit=crop',
  'My Rundown':    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80&auto=format&fit=crop',
};

// ── Helper: derive dark gradient from hex colour ───────────────────────────────
export function darkenHex(hex, f) {
  const h = (hex.startsWith('#') ? hex.slice(1) : hex).padEnd(6, '0');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

export function categoryGradient(color) {
  return `linear-gradient(160deg, ${darkenHex(color, 0.08)}, ${darkenHex(color, 0.14)}, ${darkenHex(color, 0.22)})`;
}

export function categoryGlow(color) {
  const h = (color.startsWith('#') ? color.slice(1) : color).padEnd(6, '0');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `radial-gradient(ellipse at 30% 20%, rgba(${r},${g},${b},0.25) 0%, transparent 65%)`;
}
