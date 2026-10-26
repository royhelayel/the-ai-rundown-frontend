import { coverage, mergeRanges, mergeProgress, programmeKey, completedMixDays } from './programmeProgress';
test('70 percent of unique played intervals completes a recap; replayed sections count once', () => {
  expect(coverage(mergeRanges([[0,.4]], [[.2,.7]]))).toBeCloseTo(.7);
  expect(mergeProgress({ ranges: [[0,.4]] }, { ranges: [[.2,.7]] }).completed).toBe(true);
  expect(mergeProgress({}, { ranges: [[0,.699]] }).completed).toBe(false);
  expect(coverage([[0,.4],[0,.4]])).toBeCloseTo(.4);
});
test('a seek position never counts as coverage and updated recap text has its own identity', () => {
  expect(mergeProgress({}, { position: .99, ranges: [[0,.1]] }).completed).toBe(false);
  const a = { day: '2026-10-26', period: 'Daily', language: 'en', category: 'World', text: 'First facts.' };
  expect(programmeKey(a)).not.toBe(programmeKey({ ...a, text: 'Updated facts.' }));
});
test('mix days remain separate from headline read counts and period recaps', () => {
  expect(completedMixDays({ a:{day:'2026-10-26',period:'Daily',mixCompleted:true}, b:{day:'2026-10-25',period:'Weekly',mixCompleted:true} })).toEqual(['2026-10-26']);
});
