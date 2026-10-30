// Preserve the existing counting/history key; changing it would orphan stored reads.
export function headlineKey(headline) {
  return (headline || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().slice(0, 50);
}
