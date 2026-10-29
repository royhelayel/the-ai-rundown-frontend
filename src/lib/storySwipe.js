export function storySwipeDirection(dx,dy) {
  return Number.isFinite(dx) && Number.isFinite(dy) && Math.abs(dx)>=55 && Math.abs(dx)>Math.abs(dy)*1.2 ? (dx<0?1:-1) : 0;
}
export function canSkipStory(index,total,category,categories,direction) {
  if(!total) return false;
  const next=index+direction;
  if(next>=0 && next<total) return true;
  const cat=categories.indexOf(category);
  return cat>=0 && !!categories[cat+direction];
}
