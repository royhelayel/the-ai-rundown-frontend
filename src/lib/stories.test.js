import { buildStories } from './stories';

describe('buildStories sources', () => {
  it('reads linked outlets from Coverage', () => {
    const { stories } = buildStories('## A headline\n**Coverage:** [WAM](https://www.wam.ae/a) · [The National](https://www.thenationalnews.com/b)\n- One fact.');
    expect(stories[0].storySources.map(s => [s.outlet, s.url])).toEqual([['WAM', 'https://www.wam.ae/a'], ['The National', 'https://www.thenationalnews.com/b']]);
  });

  it('shows an outlet named without a link, unlinked', () => {
    const { stories } = buildStories('## Qatar selected as co-chair\n**Coverage:** The Peninsula\n- Qatar was selected as co-chair.');
    expect(stories[0].storySources).toEqual([{ outlet: 'The Peninsula', url: null, title: '' }]);
  });

  it('keeps two unlinked outlets apart', () => {
    const { stories } = buildStories('## A headline\n**Coverage:** Naharnet · MTV Lebanon\n- One fact.');
    expect(stories[0].storySources.map(s => s.outlet)).toEqual(['Naharnet', 'MTV Lebanon']);
  });
});
