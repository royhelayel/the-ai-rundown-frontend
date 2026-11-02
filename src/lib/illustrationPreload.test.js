import {preloadIllustration,illustrationReady} from './illustrationPreload';
test('deduplicates downloads and waits for decode; failed downloads can retry',async()=>{
 const Original=global.Image,created=[];
 global.Image=class{constructor(){created.push(this);this.decode=jest.fn(()=>Promise.resolve());}};
 try{
  const id='c'.repeat(64),first=preloadIllustration(id);
  expect(preloadIllustration(id)).toBe(first);expect(created).toHaveLength(1);
  expect(illustrationReady(id)).toBe(false);
  await created[0].onload();expect(await first).toBe(true);expect(illustrationReady(id)).toBe(true);
  const failedId='d'.repeat(64),failed=preloadIllustration(failedId);
  created[1].onerror();expect(await failed).toBe(false);
  preloadIllustration(failedId);expect(created).toHaveLength(3);
 }finally{global.Image=Original;}
});
