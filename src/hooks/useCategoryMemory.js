// Module-level map, same shape as useScrollRestore's — survives remounts across tab
// switches, resets on a hard reload.
const savedCategory = {};

/**
 * Remember the last category selected on a given tab (key = route path).
 *
 * This exists because category selection was going through the *cross-mode* focus ref in
 * App.js — the one that lets Swipe and Scroll continue on the same story within one tab.
 * That ref is shared by every tab, which risked leaking a selection from one tab into
 * another. A tab's own category choice needs its own memory, scoped to that tab and
 * independent of the swipe/scroll handoff.
 *
 * Plain functions, not hooks — reading and writing a module-level map needs no React state
 * of its own, and naming them like hooks would only invite a rules-of-hooks lint false
 * positive at the call sites (they're read inside a useState initializer).
 */
export function getRememberedCategory(key) {
  return savedCategory[key] ?? null;
}

export function rememberCategory(key, cat) {
  savedCategory[key] = cat;
}
