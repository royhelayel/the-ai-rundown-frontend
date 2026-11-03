// The exact period keys used to fetch recaps, shared with their menu descriptions.
export function recapEndDay(day,today,period){
 const d=new Date(`${day||today}T00:00:00Z`);
 if(!Number.isFinite(d.getTime()))return '';
 if(period==='Weekly')d.setUTCDate(d.getUTCDate()-d.getUTCDay());
 if(period==='Monthly'){
  const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0));
  if(end.toISOString().slice(0,10)>today)end.setUTCDate(0);
  return end.toISOString().slice(0,10);
 }
 return d.toISOString().slice(0,10);
}
export function briefDates(day,today){
 const format=(value,options)=>new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US',{timeZone:'UTC',...options});
 const daily=recapEndDay(day,today,'Daily'),weeklyEnd=recapEndDay(day,today,'Weekly'),monthlyEnd=recapEndDay(day,today,'Monthly');
 if(!daily)return {daily:'Selected day',weekly:'',monthly:''};
 const start=new Date(`${weeklyEnd}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-6);
 const weekStart=start.toISOString().slice(0,10),monthStart=monthlyEnd.slice(0,8)+'01';
 const options={month:'short',day:'numeric',year:'numeric'};
 return{daily:format(daily,{weekday:'short',...options}),weekly:`${format(weekStart,options)} – ${format(weeklyEnd,options)}`,monthly:`${format(monthStart,options)} – ${format(monthlyEnd,options)}`};
}
