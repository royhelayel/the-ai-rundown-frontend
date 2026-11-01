import {captionLines,currentCaptionLine} from './NarratedCaption';
test('caption lines fit the available width without dropping or repeating words',()=>{
 const text='Officials approved the proposed agreement. Delivery will take several years.';
 const lines=captionLines(text,30,s=>s.length);
 expect(lines.every(line=>line.length<=30)).toBe(true);
 expect(lines.join(' ')).toBe(text);
 expect(currentCaptionLine(lines,0)).toBe(lines[0]);
 expect(currentCaptionLine(lines,.99)).toBe(lines[lines.length-1]);
 expect(currentCaptionLine(lines,1)).toBe(lines[lines.length-1]);
 expect(currentCaptionLine(lines,0)).toBe(lines[0]);
});
test('narrow captions preserve long words and refit into fewer lines when widened',()=>{
 const text='A cryptocurrency investigation continues.';
 expect(captionLines(text,8,s=>s.length).join(' ')).toBe(text);
 expect(captionLines(text,100,s=>s.length)).toEqual([text]);
});
