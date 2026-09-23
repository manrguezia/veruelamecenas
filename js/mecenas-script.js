import {getEntry,answerQuestion,resolveCheck,allowedSkills} from './mecenas.js?v=guion-2';
export const SCRIPT_VERSION='guion-2';
const records=data=>Object.values(data.messages||{}).filter(m=>m&&(m.epoch||'initial')===(data.epoch||'initial'));
export function pendingCheck(data,userId,channel){
 return records(data).filter(m=>m.check&&m.requester===userId&&m.ch===channel&&!data.messages?.['resolved_'+m.id]).sort((a,b)=>a.ts-b.ts).at(-1);
}
function reply(message,id,answer,extra={}){
 return {id,msg:answer,who:'Mecenas',userId:'mecenas',gm:false,bot:true,t:'text',ch:message.ch,ts:message.ts+1,replyTo:message.id,scriptVersion:SCRIPT_VERSION,...extra};
}
// Lo invoca solamente el cliente que envía el mensaje; lectura/sincronización no generan respuestas.
// La pregunta y su respuesta se guardan juntas en una única actualización del mismo ciclo de chat.
export function scriptedReply(message,data){
 if(message.gm||message.bot||message.who==='Mecenas'||!['mecenas','general'].includes(message.ch))return {};
 const responseId='mecenas_'+message.id;
 if(data.messages?.[responseId])return {};
 if(message.t==='roll'){
  const pending=message.checkId?data.messages?.[message.checkId]:pendingCheck(data,message.userId,message.ch);
  if(!pending||pending.requester!==message.userId||pending.ch!==message.ch||data.messages?.['resolved_'+pending.id]||(pending.epoch||'initial')!==(data.epoch||'initial'))return {};
  const entry=getEntry(pending.topic),result=resolveCheck(entry,message);
  if(!result)return {['messages/'+responseId]:reply(message,responseId,'La consulta sigue pendiente de '+pending.check+'. Usa esa competencia para completar la revisión.',{topic:'competencia-pendiente'})};
  const id='resolved_'+pending.id;
  return {['messages/'+id]:reply(message,id,result.answer,{topic:result.id,requester:message.userId,resolves:pending.id,checkTopic:pending.topic,succeeded:result.succeeded,grade:result.grade,improved:result.improved})};
 }
 if(message.t!=='text'||(message.ch==='general'&&!/(^|\s)@mecenas\b/i.test(message.msg)))return {};
 const history=records(data);
 const prior=history.filter(m=>m.bot&&(m.requester===message.userId||data.messages?.[m.replyTo]?.userId===message.userId)&&m.ch===message.ch).sort((a,b)=>a.ts-b.ts).at(-1);
 const entry=answerQuestion(message.msg.replace(/@mecenas\b/gi,''),{topic:prior?.checkTopic||prior?.contextTopic||prior?.topic});
 const extra={topic:entry.id};let answer=entry.answer;
 if(entry.check){
  const previous=records(data).filter(m=>m.resolves&&m.requester===message.userId&&m.checkTopic===entry.id).sort((a,b)=>a.ts-b.ts).at(-1);
  const known=history.filter(m=>m.resolves&&m.checkTopic===entry.id&&m.succeeded&&['mecenas','general'].includes(m.ch)).sort((a,b)=>(b.grade||0)-(a.grade||0)).at(0);
  const pending=pendingCheck(data,message.userId,message.ch);
  if(known&&(!previous?.succeeded||known.grade>previous.grade)){answer='Esa información ya está contrastada en el dossier compartido. '+known.msg;extra.topic='informacion-compartida';extra.contextTopic=entry.id;}
  else if(previous){answer='Esa documentación ya se ha revisado. '+previous.msg+' Para una nueva revisión, solicita otra fuente a Control.';extra.topic='revision-previa';extra.contextTopic=entry.id;}
  else if(known){answer='Esa información ya está contrastada en el dossier compartido. '+known.msg;extra.topic='informacion-compartida';extra.contextTopic=entry.id;}
  else if(pending){answer='Tienes una revisión pendiente de '+pending.check+'. Complétala desde tu ficha antes de abrir otra.';extra.topic='revision-pendiente';extra.contextTopic=pending.topic;}
  else{extra.check=allowedSkills(entry.check).join(' / ');extra.checkSkills=allowedSkills(entry.check);extra.checkTitle=entry.title;extra.difficulty=entry.check.difficulty||'regular';extra.requester=message.userId;answer+=' Competencia: '+extra.check+'. Dificultad: '+(extra.difficulty==='dificil'?'difícil':extra.difficulty)+'. Abre «Evaluar» para contrastarla.';}
 }
 return {['messages/'+responseId]:reply(message,responseId,answer,extra)};
}
