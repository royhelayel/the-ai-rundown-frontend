import { computeChallengeStats, dayKey } from './useListenHistory';

// n unique story reads credited to the content date `date`.
const reads = (date, n, category = 'AI') =>
  Array.from({ length: n }, (_, i) => ({ date, category, storyIndex: i, timestamp: 0 }));

describe('computeChallengeStats', () => {
  test('counts unique stories for the content date, not repeats', () => {
    const history = [...reads('2026-09-24', 3), ...reads('2026-09-24', 3)];
    const stats = computeChallengeStats(history, 10, '2026-09-24');
    expect(stats.todayCount).toBe(3);
    expect(stats.streakDays).toBe(0);
  });

  test('streak counts consecutive days that met the goal, ending at the viewed day', () => {
    const history = [...reads('2026-09-22', 2), ...reads('2026-09-23', 2), ...reads('2026-09-24', 2)];
    expect(computeChallengeStats(history, 2, '2026-09-24').streakDays).toBe(3);
  });

  test('an unfinished viewed day does not break a streak from the days before it', () => {
    const history = [...reads('2026-09-22', 2), ...reads('2026-09-23', 2), ...reads('2026-09-24', 1)];
    expect(computeChallengeStats(history, 2, '2026-09-24').streakDays).toBe(2);
  });

  test('weekly grid is the Monday-to-Sunday week of the viewed day', () => {
    // 2026-09-24 is a Thursday.
    const history = [...reads('2026-09-21', 2), ...reads('2026-09-20', 2)];
    const stats = computeChallengeStats(history, 2, '2026-09-24');
    expect(stats.weekGrid.map(d => d.key)[0]).toBe('2026-09-21');
    expect(stats.weekGrid.map(d => d.key)[6]).toBe('2026-09-27');
    expect(stats.weeklyDays).toBe(1); // Sunday the 20th belongs to last week
    expect(stats.weekGrid.find(d => d.isToday).day).toBe('T');
    expect(stats.weekGrid.filter(d => d.isFuture)).toHaveLength(3);
  });

  test('falls back to the read timestamp for old entries without a date', () => {
    const ts = new Date(2026, 8, 24, 9, 0, 0).getTime();
    const history = [{ category: 'AI', storyIndex: 0, timestamp: ts }];
    expect(dayKey(ts)).toBe('2026-09-24');
    expect(computeChallengeStats(history, 10, '2026-09-24').todayCount).toBe(1);
  });
});
