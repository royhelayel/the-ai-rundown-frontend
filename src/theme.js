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

// ── Category icons (emoji) ─────────────────────────────────────────────────────
export const CATEGORY_ICONS = {
  'World News':    '🌍',
  'Technology':    '💻',
  'Business':      '💼',
  'Politics':      '🏛️',
  'Sports':        '⚽',
  'Entertainment': '🎬',
  'Science':       '🔬',
  'Health':        '🏥',
  'UAE':           '🇦🇪',
  'KSA':           '🇸🇦',
  'QAT':           '🇶🇦',
  'LEB':           '🇱🇧',
  'My Rundown':    '⚡',
  'AI':            '🤖',
  'Crypto':        '🪙',
  'Football':      '⚽',
  'Basketball':    '🏀',
};

// ── Subcategory → parent mapping ────────────────────────────────────────────
// Used only by the My News category picker to nest a subcategory's chip under its
// parent's. Every other consumer (All News, headers, story lists) treats these as
// ordinary flat categories — same generation unit, same data shape, no special-casing.
export const CATEGORY_PARENT = {
  'AI':         'Technology',
  'Crypto':     'Technology',
  'Football':   'Sports',
  'Basketball': 'Sports',
};

// ── Category short labels (for pills) ─────────────────────────────────────────
export const CATEGORY_SHORT = {
  'World News':    'World',
  'Technology':    'Tech',
  'Business':      'Business',
  'Politics':      'Politics',
  'Sports':        'Sports',
  'Entertainment': 'Culture',
  'Science':       'Science',
  'Health':        'Health',
  'UAE':           'UAE',
  'KSA':           'KSA',
  'QAT':           'QAT',
  'LEB':           'LEB',
  'My Rundown':    'My News',
  'AI':            'AI',
  'Crypto':        'Crypto',
  'Football':      'Football',
  'Basketball':    'Basketball',
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
  'AI':            '#7c3aed',
  'Crypto':        '#b45309',
  'Football':      '#15803d',
  'Basketball':    '#ea580c',
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
  'QAT':           'https://images.unsplash.com/photo-1763811939372-85d2f05db792?w=900&q=80&auto=format&fit=crop',
  'LEB':           'https://images.unsplash.com/photo-1779874033061-61aa1b2ec3a9?w=900&q=80&auto=format&fit=crop',
  'My Rundown':    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80&auto=format&fit=crop',
  // Reuse the parent's image as a placeholder until these get their own — swap anytime,
  // nothing else keys off this value.
  'AI':            'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80&auto=format&fit=crop',
  'Crypto':        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80&auto=format&fit=crop',
  'Football':      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80&auto=format&fit=crop',
  'Basketball':    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80&auto=format&fit=crop',
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

// ── UI trial switches ─────────────────────────────────────────────────────────
//
// A visual direction being tried on the Swipe and Listen screens. Both are one-line
// reversals: flip a flag back to `true` and the previous look returns, with no other
// change needed anywhere.
//
//   photoBackdrop  true  → the category photo fills the screen behind the story (previous)
//                  false → a flat near-black ground, so nothing competes with the card
//
//   navIcons       true  → the bottom dock shows an icon above each label (previous)
//                  false → labels only, which lets the dock sit shorter and quieter
//
// If the whole direction is unwanted, the commit that introduced it reverts cleanly on
// its own — it touches nothing but presentation.
export const UI_TRIAL = {
  photoBackdrop: false,
  navIcons: true,
};

// ── Design tokens ─────────────────────────────────────────────────────────────
//
// Agreed 2026-09. Before this the only shared tokens were the category colours below:
// everything else was decided inline, 33 components over, which is how the app arrived at 39
// distinct font sizes and 29 radii — and why the same story headline rendered at three
// different sizes depending on the mode you were in.
//
// Twenty-six values. Every one is already used somewhere in the app; the work was choosing
// which, not inventing more. If a screen needs a twenty-seventh, that is a conversation.

// Five sizes. There is no separate heading size: a section heading is a `display`, because
// nothing in this app needs a heading that differs from a headline.
export const TYPE = {
  display: '1.2rem',   // every story headline, in every mode, and every section heading
  body:    '0.92rem',  // takeaways, summaries, prose
  ui:      '0.84rem',  // pills, toggles, buttons, dates
  meta:    '0.72rem',  // sources, counts, captions
  micro:   '0.62rem',  // uppercase labels under icons
};

// Three. 900 is indistinguishable from 800 at these sizes and the system stack may have no
// true 900 to render; 700 is a third grade of bold between 600 and 800 that nobody can see.
// Numbers, never strings — the codebase currently has both.
export const WEIGHT = { body: 400, ui: 600, strong: 800 };

// Three, plus the circle. `md` covers everything that encloses content, so a chip, a card, a
// panel and a sheet's top corners are all the same shape.
export const RADIUS = { sm: 8, md: 14, pill: 999, circle: '50%' };

// Four values — not "a multiple of 4", which still permits 12, 20, 28 and 36, and that is
// precisely how 39 font sizes happened.
export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24 };

// Three: inline with text, on a control, and the transport.
export const ICON = { sm: 14, md: 18, lg: 24 };

// Two. In-place changes, and a sheet arriving or leaving.
export const MOTION = { quick: '200ms', sheet: '380ms', sheetEase: 'cubic-bezier(0.32,0.72,0,1)' };

// Five. `#0a0a0f` and `#0a0a14` were two names for the same near-black, five hundredths of a
// percent of luminance apart; one survives and serves as both the dark ground and the ink on
// light. White had two spellings too.
export const NEUTRAL = {
  ink:       '#0a0a14',
  page:      '#f5f5f7',
  surface:   '#ffffff',
  secondary: '#6b7280',
  muted:     '#9ca3af',
};

// The only semantic colour. Green means read, and means nothing else.
export const SEMANTIC = { read: '#4ade80' };
