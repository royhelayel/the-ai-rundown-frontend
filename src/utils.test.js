import { formatDuration, readTime, stableHash } from './utils';

describe('formatDuration', () => {
  test('shows seconds under a minute', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(0)).toBe('0s');
  });

  test('shows minutes and seconds, dropping zero seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(180)).toBe('3m');
  });

  test('rounds and clamps negatives to zero', () => {
    expect(formatDuration(59.6)).toBe('1m');
    expect(formatDuration(-5)).toBe('0s');
  });
});

describe('readTime', () => {
  test('falls back to 30s with no story', () => {
    expect(readTime(null)).toBe('30s');
  });

  test('never reports less than 10s', () => {
    expect(readTime({ headline: 'Short' })).toBe('10s');
  });

  test('counts words across bullets, perspectives, why and headline at 200 wpm', () => {
    const words = n => Array(n).fill('word').join(' ');
    const story = { allBullets: [words(100), words(100)], perspectives: words(100), why: words(90), headline: words(10) };
    expect(readTime(story)).toBe('2m');
  });
});

describe('stableHash', () => {
  test('is deterministic and unsigned', () => {
    expect(stableHash('AI')).toBe(stableHash('AI'));
    expect(stableHash('AI')).not.toBe(stableHash('Tech'));
    expect(stableHash('AI')).toBeGreaterThanOrEqual(0);
  });
});
