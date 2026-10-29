import {storySwipeDirection,canSkipStory} from './storySwipe';
test('horizontal intent is required; small, diagonal and vertical movement is ignored',()=>{
 expect(storySwipeDirection(-100,10)).toBe(1);expect(storySwipeDirection(100,10)).toBe(-1);
 for(const [x,y] of [[20,0],[100,95],[10,100],[NaN,0]])expect(storySwipeDirection(x,y)).toBe(0);
});
test('boundary resistance agrees with next/previous buttons and available topics',()=>{
 expect(canSkipStory(0,2,'World',['World','Tech'],-1)).toBe(false);
 expect(canSkipStory(1,2,'World',['World','Tech'],1)).toBe(true);
 expect(canSkipStory(1,2,'Tech',['World','Tech'],1)).toBe(false);
 expect(canSkipStory(0,0,'World',['World','Tech'],1)).toBe(false);
});
