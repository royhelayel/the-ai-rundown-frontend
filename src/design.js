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
  '--read': '#245a2a',
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
  '--read': '#a3b09a',
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
    '--tp-card-d': mix(desaturate(mix(base, '#101113', 0.75), 0.35), '#ffffff', 0.02),
  };
  cache[category] = v;
  return v;
}

const cssBlock = (vars) => Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ');

// The variables and the few rules that can't be inline styles. Rendered by GlobalStyles.
export const DESIGN_CSS = `
  :root { ${cssBlock(LIGHT)} color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root { ${cssBlock(DARK)} color-scheme: dark; } }
  .rn-tp { --tp-chip: var(--tp-chip-l); --tp-card: var(--tp-card-l); }
  @media (prefers-color-scheme: dark) { .rn-tp { --tp-chip: var(--tp-chip-d); --tp-card: var(--tp-card-d); } }
  .rn-hscroll { overflow-x: auto; scrollbar-width: none; -webkit-mask-image: linear-gradient(to right, #000 82%, transparent); mask-image: linear-gradient(to right, #000 82%, transparent); }
  .rn-hscroll::-webkit-scrollbar { display: none; }
  .rn-btn { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
`;
