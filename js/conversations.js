import {OPERATIVOS} from './characters.js';
export const pairId=(a,b)=>'dm_'+[a,b].sort().join('_');
export function channelsFor(user){
 const people=OPERATIVOS.filter(o=>!o.gm);
 const channels=[{id:'mecenas',label:'Mecenas'},{id:'general',label:'Equipo'}];
 if(user.gm){
  for(const p of people)channels.push({id:'priv_'+p.id,label:'Control · '+p.name});
  people.forEach((a,i)=>people.slice(i+1).forEach(b=>channels.push({id:pairId(a.id,b.id),label:a.name+' ↔ '+b.name})));
 }else{
  channels.push({id:'priv_'+user.id,label:'Control'});
  for(const p of people)if(p.id!==user.id)channels.push({id:pairId(user.id,p.id),label:p.name});
 }
 return channels;
}
// Resumen extractivo: conserva palabras del autor; no inventa acuerdos ni conclusiones.
export function summarize(list){
 const texts=list.filter(m=>!m.bot&&m.t!=='roll');
 const quote=m=>({id:m.id,text:m.who+': '+m.msg});
 return {count:list.length,participants:[...new Set(texts.map(m=>m.who))],
  proposals:texts.filter(m=>/\b(acordamos|propongo|encargo|llevar|quedamos|podemos|prefiero|confirmo|decidido|me ocupo)\b/i.test(m.msg)).slice(-4).map(quote),
  questions:texts.filter(m=>/[¿?]/.test(m.msg)).slice(-3).map(quote),
  recent:texts.slice(-3).map(quote),last:list.at(-1)?.ts};
}
