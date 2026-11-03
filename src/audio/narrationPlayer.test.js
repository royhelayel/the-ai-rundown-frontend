test('unlocking never overwrites a paused prepared narration clip',()=>{
 jest.resetModules();const Original=global.Audio;
 const audio={src:'',paused:true,play:jest.fn(()=>Promise.resolve())};global.Audio=jest.fn(()=>audio);
 try{
  const {narrationPlayer,unlockNarrationAudio}=require('./narrationPlayer');
  narrationPlayer().src='https://example.com/current-news.mp3';unlockNarrationAudio();
  expect(audio.src).toBe('https://example.com/current-news.mp3');expect(audio.play).not.toHaveBeenCalled();
 }finally{global.Audio=Original;}
});
