// ── The v2 look on v1 ──────────────────────────────────────────────────────────
//
// Agreed 2026-10 (canvas "v1 in v2 style"). One set of colour tokens for the whole app,
// written as CSS variables so every inline style can say `var(--paper)` and the light/dark
// switch happens in one place: GlobalStyles flips the variables under
// `prefers-color-scheme: dark`. Nothing in a component needs to know which mode it is in.
//
// Topic colours are per category, so they can't live in :root. `topicVars(category)` returns
// both the light and the dark value as variables; an element carrying `className="rn-tp"`
// resolves `--tp-chip` and `--tp-card` to the right one for the current mode.
import { CATEGORY_COLORS } from './theme';

export const LIGHT = {
  '--paper': '#f5f5ef',
  '--ink': '#172015',
  '--sub': '#596253',
  '--panel': '#e7eadd',
  '--line': '#d4dacb',
  '--raised': '#fbfbf7',
  '--surface': '#fbfbf7',
  '--accent': '#31451b',      // tab underline, progress, challenge ring
  '--play-bg': '#31451b',     // the one strong colour on a screen
  '--play-fg': '#d5fa64',
  '--read': '#16a34a',               // Read: a bright green, so it shows on the panels and cards
  '--wordmark-ink': '#20271b',
  '--wordmark-dim': '#8a9284',
  '--card-ink': '#142016',
  '--card-body': '#142016',
  '--card-sub': 'rgba(20,32,22,0.66)',
  '--card-line': 'rgba(20,32,22,0.2)',
  '--card-btn': 'rgba(20,32,22,0.08)',
  '--chip-on-ink': '#f5f5ef',
  '--menu-bg': '#fbfbf7',
  '--menu-shadow': '0 10px 30px rgba(23,32,21,0.14)',
  '--raised-shadow': '0 1px 3px rgba(23,32,21,0.16)',
  '--overlay': 'rgba(23,32,21,0.30)',
  '--soft-btn': 'rgba(23,32,21,0.06)',
  '--cite-bg': 'rgba(23,32,21,0.07)',
  '--cite-ink': '#3d4637',
  '--story-panel': '#ffffff',              // Scroll's white panel behind each story
  '--error': '#b42318',
  '--story-panel-edge': 'rgba(23,32,21,0.07)',
};

// Codex's dark-mode pass: off-white rather than white headlines, grey secondary text, softer
// borders, and lime on Play only — every other accent is a quiet sage.
export const DARK = {
  '--paper': '#101113',
  '--ink': '#e8eae1',
  '--sub': '#a9b0a3',
  '--panel': '#1e221e',
  '--line': '#343b31',
  '--raised': '#363e30',
  '--surface': '#191b19',
  '--accent': '#b3be8f',
  '--play-bg': '#d5fa64',
  '--play-fg': '#101113',
  '--read': '#4ade80',
  '--wordmark-ink': '#e8eae1',
  '--wordmark-dim': '#6f776a',
  '--card-ink': '#e8eae1',
  '--card-body': '#cfd3c8',
  '--card-sub': '#aab1a5',
  '--card-line': 'rgba(232,234,225,0.12)',
  '--card-btn': 'rgba(232,234,225,0.08)',
  '--chip-on-ink': '#101113',
  '--menu-bg': '#1e221e',
  '--menu-shadow': '0 10px 30px rgba(0,0,0,0.5)',
  '--raised-shadow': 'none',
  '--overlay': 'rgba(0,0,0,0.55)',
  '--soft-btn': 'rgba(232,234,225,0.06)',
  '--cite-bg': 'rgba(232,234,225,0.08)',
  '--cite-ink': '#c9cfc2',
  '--story-panel': '#191b19',
  '--error': '#f97066',
  '--story-panel-edge': 'rgba(232,234,225,0.06)',
};

const toRgb = (hex) => {
  const n = parseInt(String(hex).replace('#', '').padEnd(6, '0'), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// Move `hex` toward `target` by `amount` (0 = unchanged, 1 = target). v2's own helper.
export function mix(hex, target, amount) {
  const a = toRgb(hex), b = toRgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

// Pull a colour toward its own grey. Used only in dark mode, where saturated tints glow.
function desaturate(hex, amount) {
  const [r, g, b] = toRgb(hex);
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  return toHex([r, g, b].map(v => v + (grey - v) * amount));
}

// The topic's name as text on Scroll's panels (Roy, 2026-10-18 — a pill behind it was more than it
// needed). The topic's own colour, darkened in light mode or lightened in dark mode only as far as
// it takes to read clearly (4.5:1 on the panel), so each topic stays as vivid as it can be.
const luminance = (hex) => {
  const [r, g, b] = toRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
function readableOn(base, ground, toward, min = 4.5) {
  for (let t = 0; t <= 1; t += 0.02) { const c = mix(base, toward, t); if (contrast(c, ground) >= min) return c; }
  return toward;
}

const cache = {};
export function topicVars(category) {
  if (cache[category]) return cache[category];
  const base = CATEGORY_COLORS[category] || '#4517cf';
  const v = {
    // Light: the active chip and labels are the topic darkened; the card is the topic
    // lightened almost to white (v2's categoryStyle).
    '--tp-chip-l': mix(base, '#000000', 0.46),
    '--tp-card-l': mix(base, '#ffffff', 0.79),
    // Dark: a lifted, desaturated chip, and a card tinted toward the ground rather than a
    // pastel block glowing on black (Roy chose this over v2's light card, 2026-10-15).
    '--tp-chip-d': desaturate(mix(base, '#ffffff', 0.55), 0.3),
    // The topic's name on Scroll's panels: white in light mode, #191b19 in dark.
    '--tp-label-l': readableOn(base, '#ffffff', '#000000'),
    '--tp-label-d': readableOn(base, '#191b19', '#ffffff'),
    '--tp-card-d': mix(desaturate(mix(base, '#101113', 0.75), 0.35), '#ffffff', 0.02),
  };
  cache[category] = v;
  return v;
}

const cssBlock = (vars) => Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ');

// The variables and the few rules that can't be inline styles. Rendered by GlobalStyles.
// Appearance is System (follow the phone), Light or Dark: `data-theme` on <html> overrides the
// phone's setting when it is "light" or "dark", and is absent for System.
const DARK_ROOT = `${cssBlock(DARK)} color-scheme: dark;`;
const DARK_TOPIC = '--tp-chip: var(--tp-chip-d); --tp-card: var(--tp-card-d); --tp-label: var(--tp-label-d);';
export const DESIGN_CSS = `
  :root { ${cssBlock(LIGHT)} color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${DARK_ROOT} } }
  :root[data-theme="dark"] { ${DARK_ROOT} }
  .rn-tp { --tp-chip: var(--tp-chip-l); --tp-card: var(--tp-card-l); --tp-label: var(--tp-label-l); }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .rn-tp { ${DARK_TOPIC} } }
  :root[data-theme="dark"] .rn-tp { ${DARK_TOPIC} }
  .rn-hscroll { overflow-x: auto; scrollbar-width: none; -webkit-mask-image: linear-gradient(to right, #000 82%, transparent); mask-image: linear-gradient(to right, #000 82%, transparent); }
  .rn-hscroll::-webkit-scrollbar { display: none; }
  .rn-btn { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
  @keyframes rn-spin { to { transform: rotate(360deg); } }
  @keyframes rn-sheet-up { from { transform: translateY(100%); } to { transform: none; } }
  @keyframes rn-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rn-enter-next { from { transform: translateX(60%); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes rn-enter-prev { from { transform: translateX(-60%); opacity: 0; } to { transform: none; opacity: 1; } }
`;

export const THEME_KEY = 'rundown_theme';
// Read once at start-up (before the first paint, from index.js) and on every change.
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}
export function storedTheme() {
  try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}
