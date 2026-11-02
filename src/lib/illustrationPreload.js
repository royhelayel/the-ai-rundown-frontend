import {BACKEND_URL} from './backend';
const images=new Map();
export const illustrationURL=id=>`${BACKEND_URL}/api/world-illustrations/image/${id}`;
export const illustrationReady=id=>images.get(id)?.ready===true;
// Keep a small decoded-image window, independent of component remounts.
export function preloadIllustration(id){
 if(!/^[a-f0-9]{64}$/.test(id||''))return Promise.resolve(false);
 if(images.has(id))return images.get(id).promise;
 const image=new Image(),entry={image,ready:false};
 entry.promise=new Promise(resolve=>{
  image.onload=async()=>{try{await image.decode?.();}catch{} entry.ready=true;resolve(true);};
  image.onerror=()=>{if(images.get(id)===entry)images.delete(id);resolve(false);};
 });
 images.set(id,entry);
 while(images.size>8)images.delete(images.keys().next().value);
 image.src=illustrationURL(id);
 return entry.promise;
}
