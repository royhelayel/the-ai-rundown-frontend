import { buildRecapScenes, captionPhrases, illustrationFor, reportedFigures, scenePosition } from './recapScenes';

const text = 'Microsoft is offering buyouts to about 60,000 employees—roughly 27 percent of its workforce. Cohere says a model tried to send a test string to an external server, but a security sandbox blocked it.';
const sources = [{ text: text.split('. ')[0] + '.', stories: [{ headline: 'Microsoft offers buyouts', sources: [{ outlet: 'Outlet A', url: 'https://a.example/story' }] }] },
  { text: text.split('. ')[1], stories: [{ headline: 'Cohere says sandbox blocked a transfer', sources: [{ outlet: 'Outlet B', url: 'https://b.example/story' }] }] }];

test('scenes retain the full narration and attach only matching original reporting', () => {
  const scenes = buildRecapScenes(text, JSON.stringify(sources));
  expect(scenes.map(s => s.text).join(' ')).toBe(text);
  expect(scenes[0].stories[0].sources[0].outlet).toBe('Outlet A');
  expect(scenes[1].illustration.type).toBe('sandbox');
  expect(scenePosition(scenes, 90).scene.headline).toContain('Cohere');
  expect(scenePosition(scenes, 90, 0).scene.headline).toContain('Microsoft');
});

test('corrected text cannot inherit the old recap’s outlet attributions', () => {
  const scenes = buildRecapScenes(text.replace('60,000', '50,000'), sources);
  expect(scenes.every(s => s.stories.length === 0)).toBe(true);
  expect(buildRecapScenes(text, '{broken')[0].stories).toEqual([]);
});

test('captions never drop a qualifier or invent a phrase', () => {
  const sentence = 'Officials say the proposed launch could happen in 2027, but the date has not been confirmed by the company.';
  const phrases = captionPhrases(sentence);
  expect(phrases.map(p => p.text).join(' ')).toBe(sentence);
  expect(phrases[0].start).toBe(0);
  expect(phrases[phrases.length - 1].end).toBe(1);
});

test('percentages must explicitly describe a workforce share before using a people grid', () => {
  expect(illustrationFor(sources[0].text)).toMatchObject({ type: 'workforce', percent: 27, percentLiteral: 'roughly 27 percent' });
  expect(illustrationFor('Revenue increased 27 percent.').type).toBe('figures');
  expect(illustrationFor('120 percent of its workforce.').type).toBe('figures');
});

test('figures remain literal and hypothetical diagrams are never inferred', () => {
  expect(reportedFigures('The proposed device costs about $699.')).toEqual([{ literal: 'about $699', at: 26 }]);
  expect(illustrationFor('The model was evaluated by a company.').type).toBe('editorial');
  expect(illustrationFor('The company says its sandbox blocked a model’s attempt to reach an external server.').type).toBe('sandbox');
  expect(illustrationFor('Instagram is testing horizontal videos up to 90 minutes long for TV.')).toMatchObject({ type: 'video', duration: 'up to 90 minutes' });
});

test('Arabic and missing attributions remain readable without made-up visuals', () => {
  const arabic = 'قالت الشركة إن الموعد لم يتأكد بعد. وتستمر الاختبارات؟';
  const scenes = buildRecapScenes(arabic, null);
  expect(scenes.map(s => s.text).join(' ')).toBe(arabic);
  expect(scenes.every(s => !s.stories.length)).toBe(true);
  expect(scenePosition(scenes, 100).scene).toBe(scenes[scenes.length - 1]);
  expect(scenePosition([], 50)).toBeNull();
});
