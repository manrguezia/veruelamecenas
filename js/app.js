import {OPERATIVOS,CHARS,SKILLBASE} from './characters.js';
import {CONFIG,MAP_TILES,DEVICES,PATROL,PLAN_FIELDS,ZONE_INFO,SECURITY_COLORS} from './scenario.js';
import {FAQ,answerQuestion,resolveCheck,normalize} from './mecenas.js';
import {createStore} from './store.js?v=2';
import {channelsFor,summarize} from './conversations.js';
import {playAccessSequence} from './access-sequence.js';
import {createRoomGallery} from './room-gallery.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,action)=>{const b=node('button',text);b.type='button';b.onclick=action;return b;};
const uid=()=>crypto.randomUUID();
const localMode=location.protocol==='file:'||new URLSearchParams(location.search).get('local')==='1';
let loginBusy=false;
let user,store,atlas,currentChannel='mecenas',viewedId,chatSignature='',mapInstance,loadingMap=false,readSeen={},mecenasErrorUntil=0;
const roomGallery=createRoomGallery();
const labels={camaras:'Cámaras',alarmas:'Alarmas',rondas:'Rondas',garitas:'Garitas',accesos:'Accesos',objetivos:'Objetivos'};
const zoneLabels={'iglesia':'Iglesia','claustro':'Claustro','sala-capitular':'Sala Capitular','sacristia':'Sacristía','refectorio':'Refectorio','dependencias':'Dependencias','scriptorium':'Scriptorium','dormitorio':'Dormitorio / Salón de Reyes','cocina':'Cocina','cilla':'Cilla / Almacén','plano-documental':'Trazado del plano','palacio-abacial':'Palacio Abacial','porteria-oficinas':'Portería / Oficinas','hospederia':'Hospedería','monasterio-nuevo':'Monasterio nuevo','recinto':'Recinto y torres','terreno':'Terreno','servicios':'Aljibe, molino y anexos'};
for(const o of OPERATIVOS){if([...$('#who').options].some(option=>option.value===o.id))continue;const op=node('option',o.name+' · '+o.role);op.value=o.id;$('#who').append(op);}
$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(user||loginBusy)return;const o=OPERATIVOS.find(x=>x.id===$('#who').value);
 const accepted=!!o&&$('#pin').value.trim().toLowerCase()===o.pin;
 loginBusy=true;$('#loginSubmit').disabled=true;$('#loginError').textContent='';$('#pin').value='';
 let enter=false;try{enter=await playAccessSequence(accepted);}catch(err){console.error('Secuencia de acceso:',err);}finally{loginBusy=false;$('#loginSubmit').disabled=false;}
 if(!enter){$('#loginError').textContent=accepted?'Enlace cancelado. Introduce de nuevo tu clave.':'Acceso no autorizado. Comprueba tu identidad y tu clave.';$('#pin').focus();return;}
 user=o;viewedId=o.gm?'marina':o.id;$('#pin').value='';$('#login').hidden=true;$('#app').hidden=false;$('#identity').textContent=o.name;
 $('#controlTab').hidden=!user.gm;buildPlan();buildChannels();buildSuggestions();
 store=createStore(data=>{renderChat(data);renderPlan(data);renderFindings(data);renderControl(data);},text=>{if(Date.now()>=mecenasErrorUntil)$('#syncStatus').textContent=text;$('#planStatus').textContent=text;},{database:localMode?'':CONFIG.database});
 try{const {createAtlas}=await import('./atlas.js?v=layers-1');atlas=createAtlas($('#c3d'),showSelection);buildLayers();$('#scanToggle').setAttribute('aria-pressed',String(atlas.scan));}
 catch(err){$('#atlasError').hidden=false;$('#atlasError').textContent='No se ha podido cargar el visor 3D. El chat, el dossier y el plan siguen disponibles. Comprueba la conexión o el soporte WebGL y recarga la página.';console.error(err);buildLayers();}
});
$('#logout').onclick=()=>{store?.stop();atlas?.dispose();location.reload();};
function tab(id){if(id==='control'&&!user?.gm)return;for(const page of $$('.page'))page.hidden=page.id!==id;for(const b of $$('[data-tab]')){const active=b.dataset.tab===id;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');}if(id==='map')void openMap();}
for(const b of $$('[data-tab]'))b.onclick=()=>tab(b.dataset.tab);
for(const b of $$('[data-zone]'))b.onclick=()=>{tab('atlas');atlas?.focusZone(b.dataset.zone);showSelection({zone:b.dataset.zone});};
$('.brand').onclick=e=>{e.preventDefault();if(user)tab('atlas');};
$('#viewFull').onclick=()=>{clearAtlasSelection();atlas?.perspective();};$('#viewPlan').onclick=()=>atlas?.plan();
$('#scanToggle').onclick=()=>{if(!atlas)return;atlas.setScan(!atlas.scan);$('#scanToggle').setAttribute('aria-pressed',String(atlas.scan));};
function clearAtlasSelection(){$('#selection').hidden=true;atlas?.select(null);}
$('#selectionClose').onclick=clearAtlasSelection;
const layersToggle=button('Capas',()=>{const open=$('#atlas').classList.toggle('layers-open');layersToggle.setAttribute('aria-expanded',String(open));});layersToggle.id='layersToggle';layersToggle.setAttribute('aria-expanded','false');$('.canvas-wrap').append(layersToggle);
$('.view-controls').append(button('Núcleo',()=>{atlas?.focusZone('claustro');clearAtlasSelection();}),button('Plano original',()=>roomGallery.open('plano-documental','Planta de referencia')));

function buildLayers(){
 $('#layerList').replaceChildren();$('#zoneList').replaceChildren();
 let saved={};try{saved=JSON.parse(localStorage.getItem('veruela-layers-v2')||'{}');}catch{}
 function row(id,label,color,kind){const r=node('div',null,'toggle-row'),sw=node('i',null,'swatch');sw.style.setProperty('--swatch',color);r.append(sw);
  if(kind==='zone')r.append(button(label,()=>{showSelection({zone:id});}));
  else{const l=node('label',label);l.htmlFor='show-'+id;r.append(l);}
  const c=node('input');c.type='checkbox';c.id='show-'+id;c.setAttribute('aria-label','Mostrar '+label);
  c.checked=saved[kind+'-'+id]??(kind==='zone'||!['alarmas','accesos'].includes(id));
  const update=()=>{r.classList.toggle('dim',!c.checked);if(kind==='zone'){if(!c.checked&&atlas?.selected===id)clearAtlasSelection();atlas?.dimZone(id,!c.checked);}else atlas?.dimLayer(id,!c.checked);saved[kind+'-'+id]=c.checked;try{localStorage.setItem('veruela-layers-v2',JSON.stringify(saved));}catch{}updateAllToggle();};
  c.onchange=update;r.append(c);update();return r;
 }
 for(const [id,label]of Object.entries(labels))$('#layerList').append(row(id,label,SECURITY_COLORS[id],'layer'));
 for(const [id,label]of Object.entries(zoneLabels))$('#zoneList').append(row(id,label,atlas?.model.zones[id].color||'#66e6ce','zone'));
 updateAllToggle();
}
function updateAllToggle(){
 const boxes=$$('#zoneList input, #layerList input');
 const all=boxes.length>0&&boxes.every(c=>c.checked);
 $('#toggleAllLayers').textContent=all?'Desmarcar todas':'Marcar todas';
}
$('#toggleAllLayers').onclick=()=>{
 const boxes=$$('#zoneList input, #layerList input'),checked=!boxes.every(c=>c.checked);
 clearAtlasSelection();
 for(const c of boxes){c.checked=checked;c.dispatchEvent(new Event('change'));}
 updateAllToggle();
};
function showSelection({zone,device}){
 if(!zone&&!device){clearAtlasSelection();return;}
 const selectedZone=zone||device.zone,checkbox=$('#show-'+selectedZone);
 if(checkbox&&!checkbox.checked){checkbox.checked=true;checkbox.dispatchEvent(new Event('change'));}
 atlas?.select(selectedZone);
 const photoZone=zone||device?.zone;if(photoZone)roomGallery.select(photoZone,zoneLabels[photoZone]||photoZone);
 $('#selection').hidden=false;$('#selectionActions').replaceChildren();
 if(device){$('#selectionType').textContent=device.id+' / '+labels[device.layer];$('#selectionTitle').textContent=device.name;$('#selectionText').textContent=device.detail;
  $('#selectionActions').append(button('Consultar al Mecenas',()=>ask('¿Qué sabemos de '+labels[device.layer].toLowerCase()+'?')));
 }else{
  atlas?.select(zone);$('#selectionType').textContent='DEPENDENCIA / DOSSIER';$('#selectionTitle').textContent=zoneLabels[zone];$('#selectionText').textContent=ZONE_INFO[zone];
  $('#selectionActions').append(button('Acercar',()=>atlas?.focusZone(zone)),button('Dispositivos',()=>{
   const list=DEVICES.filter(d=>d.zone===zone);$('#selectionText').textContent=list.length?'Elementos del dossier para esta dependencia:':'No hay dispositivos asignados en este dossier. Esto no confirma ausencia de vigilancia.';
   $('#selectionActions').replaceChildren();$('#selectionActions').style.flexWrap='wrap';for(const d of list)$('#selectionActions').append(button(d.id,()=>showSelection({device:d})));
  }));
 }
}
function allowedChannels(){return channelsFor(user);}
function messages(data=store?.data){return Object.values(data?.messages||{}).filter(m=>m&&typeof m.msg==='string'&&Number.isFinite(m.ts)&&typeof m.id==='string').map(m=>{
 // Actualiza la presentación del guion antiguo sin modificar el historial almacenado.
 const entry=m.bot?FAQ.find(f=>f.id===m.topic):null;
 let text=entry?entry.answer:m.msg;
 if(m.bot){
  if(m.topic==='mesa')text=answerQuestion('desactivo').answer;
  else if(m.topic==='fallback')text=answerQuestion('dato no catalogado').answer;
  text=text.replaceAll('con el Máster','con Control').replaceAll('para el Máster','para Control');
 }
 if(m.t==='roll'&&m.label&&Number.isFinite(m.roll)&&Number.isFinite(m.val))text='Revisión de '+m.label+': '+rollLevel(m.roll,m.val);
 return {...m,who:m.gm||m.who==='MÁSTER'?'Control':m.who,msg:text};
 }).sort((a,b)=>a.ts-b.ts||a.id.localeCompare(b.id));}
function buildChannels(){
 $('#channels').replaceChildren();for(const c of allowedChannels().filter(c=>['mecenas','general','priv_'+user.id].includes(c.id))){
  const unread=messages().filter(m=>m.ch===c.id&&m.userId!==user.id&&m.ts>(readSeen[c.id]||0)).length;
  const b=button(c.label+(unread&&c.id!==currentChannel?' · '+unread:''),()=>{currentChannel=c.id;chatSignature='';renderChat(store.data);buildSuggestions();});b.dataset.channel=c.id;b.classList.toggle('active',c.id===currentChannel);b.setAttribute('aria-pressed',String(c.id===currentChannel));$('#channels').append(b);
 }
 const select=$('#directContact');select.replaceChildren(new Option('Elegir contacto…',''));
 for(const c of allowedChannels().filter(c=>!['mecenas','general','priv_'+user.id].includes(c.id))){const unread=messages().filter(m=>m.ch===c.id&&m.userId!==user.id&&m.ts>(readSeen[c.id]||0)).length;select.append(new Option(c.label+(unread&&c.id!==currentChannel?' · '+unread:''),c.id));}select.value=currentChannel;
 $('#channelPrivacy').textContent=currentChannel.startsWith('dm_')?'Enlace individual · visible para ambos y Control':currentChannel.startsWith('priv_')?'Enlace individual con Control':'Canal compartido con el equipo';
 $('#chatInput').placeholder=currentChannel==='mecenas'?'Pregunta al Mecenas…':currentChannel==='general'?'Habla con el equipo · @mecenas para preguntar':'Mensaje para este canal…';
}
function buildSuggestions(){
 $('#suggestions').replaceChildren();if(!['mecenas','general'].includes(currentChannel))return;
 for(const [label,q]of [['Encargo',FAQ[0].title],['Cámaras',FAQ[3].title],['Rondas',FAQ[5].title],['Analizar','Quiero analizar el dossier de cámaras']])$('#suggestions').append(button(label,()=>ask(q)));
}
function ask(q){currentChannel='mecenas';chatSignature='';$('#chat').classList.add('open');send(q);buildChannels();buildSuggestions();}
async function send(text){
 const msg=String(text).trim().slice(0,1200);if(!msg||!user||!store||!allowedChannels().some(c=>c.id===currentChannel))return;
 const id=uid(),ts=Date.now(),record={id,msg,who:user.name,userId:user.id,ch:currentChannel,ts,t:'text',gm:!!user.gm};
 const patch={['messages/'+id]:record};
 // Las respuestas las publica el flujo remoto del Mecenas. Control puede intervenir
 // escribiendo normalmente; sus mensajes nunca generan una respuesta automática.
 store.put(patch);$('#chatInput').value='';$('#chatLog').scrollTop=$('#chatLog').scrollHeight;
 if(!user.gm&&(currentChannel==='mecenas'||currentChannel==='general'||currentChannel.startsWith('priv_'))){await store.flush();void llamarMecenas(id);}
}
async function llamarMecenas(messageId){
 const endpoint=CONFIG.mecenasEndpoint;
 if(!endpoint||endpoint.includes('REEMPLAZA-ESTA-URL')){ $('#syncStatus').textContent='El Mecenas aún no está conectado.';return; }
 try{
  $('#syncStatus').textContent='Consultando al Mecenas…';
  const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messageId})});
  if(!res.ok)throw Error('HTTP '+res.status);
  $('#syncStatus').textContent='El Mecenas está preparando una respuesta…';
 }catch(err){console.error('Mecenas remoto:',err);mecenasErrorUntil=Date.now()+15000;$('#syncStatus').textContent='El Mecenas ha devuelto un error. Revisa los registros del Worker.';}
}
$('#chatForm').onsubmit=e=>{e.preventDefault();send($('#chatInput').value);};
$('#chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send(e.currentTarget.value);}};
$('#chatToggle').onclick=()=>$('#chat').classList.toggle('open');$('#chatClose').onclick=()=>$('#chat').classList.remove('open');$('#retrySync').onclick=()=>store?.refresh();
function renderChat(data){
 const list=messages(data).filter(m=>m.ch===currentChannel);const sig=JSON.stringify(list);if(sig===chatSignature){buildChannels();return;}
 const log=$('#chatLog'),nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<75||!chatSignature;chatSignature=sig;
  log.replaceChildren();for(const m of list){const e=node('article',null,'message'+(m.bot?' bot':'')+(m.t==='roll'?' roll':''));e.dataset.message=m.id;
   const visibleMessage=m.t==='roll'&&!user.gm?`Tirada de ${m.label} enviada al Mecenas.`:m.msg;
   e.append(node('div',m.who+' · '+new Date(m.ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}),'author'),node('p',visibleMessage));
  if(m.check&&m.requester===user.id&&!data.messages['resolved_'+m.id])e.append(button('Evaluar · '+m.check,()=>openSheet()));
  log.append(e);
 }
 if(!list.length)log.append(node('p',currentChannel==='mecenas'?'El Mecenas está disponible. Pregunta por el encargo o utiliza una de las consultas sugeridas.':currentChannel==='general'?'Canal del equipo. Las preguntas al Mecenas pueden dirigirse con @mecenas.':'Sin mensajes todavía. Este enlace es visible para sus interlocutores y Control.','empty'));
 if(nearBottom)log.scrollTop=log.scrollHeight;
 readSeen[currentChannel]=Math.max(0,...list.map(m=>m.ts));buildChannels();
}
function renderFindings(data){const el=$('#findings'),latest=new Map();for(const m of messages(data))if(m.who==='Mecenas'&&['general','mecenas'].includes(m.ch))latest.set(m.id,m);
 el.replaceChildren();for(const m of latest.values()){const item=node('article',null,'finding');item.append(node('small','MECENAS · '+new Date(m.ts).toLocaleDateString('es-ES')),node('p',m.msg));el.append(item);}if(!latest.size)el.append(node('p','Las respuestas al grupo aparecerán aquí.','empty'));}
function buildPlan(){
 for(const [id,label,hint]of PLAN_FIELDS){const wrap=node('div',null,'plan-field'),l=node('label',label);l.htmlFor='plan-'+id;const input=node('textarea');input.id='plan-'+id;input.maxLength=2400;input.rows=3;input.oninput=()=>{store.put({['plan/'+id]:{value:input.value,author:user.name,ts:Date.now()}});};wrap.append(l,node('p',hint),input,node('small','Sin acuerdos todavía'));$('#planFields').append(wrap);}
}
function planVersion(data){return JSON.stringify(PLAN_FIELDS.map(([id])=>data.plan[id]?.value||''));}
function renderPlan(data){
 for(const [id]of PLAN_FIELDS){const input=$('#plan-'+id),v=data.plan[id];if(document.activeElement!==input)input.value=v?.value||'';input.nextElementSibling.textContent=v?'Último cambio: '+v.author+' · '+new Date(v.ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'Sin acuerdos todavía';}
 const version=planVersion(data),ready=data.plan['ready_'+user.id];$('#ready').textContent=ready?.value&&ready.version===version?'Retirar mi confirmación':'Marcar mi preparación como lista';$('#ready').hidden=!!user.gm;
 $('#readiness').replaceChildren();for(const o of OPERATIVOS.filter(o=>!o.gm)){const r=data.plan['ready_'+o.id],ok=r?.value&&r.version===version;$('#readiness').append(node('span',o.name.split(' ')[0]+(ok?' · listo':' · pendiente'),'ready-pill'+(ok?' done':'')));}
}
$('#ready').onclick=()=>{
 if(!store||user.gm)return;const required=PLAN_FIELDS.slice(0,5).every(([id])=>store.data.plan[id]?.value?.trim());if(!required){$('#planStatus').textContent='Completad responsabilidades, aproximación, equipo, horario y contingencias antes de confirmar.';return;}
 const previous=store.data.plan['ready_'+user.id],version=planVersion(store.data);store.put({['plan/ready_'+user.id]:{value:!(previous?.value&&previous.version===version),version,author:user.name,ts:Date.now()}});
};
$('#exportPlan').onclick=()=>{
 const lines=['# Operación Veruela — Preparación','', 'Tres piezas intactas: La luz que nace de la sombra, Los durmientes y el relicario colonial.',''];
 for(const [id,label]of PLAN_FIELDS)lines.push('## '+label,store.data.plan[id]?.value||'Pendiente','');
 lines.push('## Información reunida');for(const m of messages())if(m.who==='Mecenas'&&['mecenas','general'].includes(m.ch))lines.push('- '+m.msg);
 lines.push('','## Siguiente paso','Confirmar responsabilidades, recursos y disponibilidad antes de acordar la salida.');
 const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'})),a=node('a');a.href=url;a.download='Veruela-plan-del-equipo.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function pendingFor(id){return messages().filter(m=>m.check&&m.requester===id&&!store.data.messages['resolved_'+m.id]).at(-1);}
function openSheet(){renderSheet(viewedId);$('#sheet').showModal();$('#sheet').scrollTop=0;}
$('#sheetOpen').onclick=openSheet;$('#sheetClose').onclick=()=>$('#sheet').close();
function renderSheet(id){
 viewedId=id;$('#skillSearch').value='';$('#trainedOnly').checked=false;const c=CHARS[id],o=OPERATIVOS.find(x=>x.id===id);$('#sheetName').textContent=o.name;$('#sheetRole').textContent=o.role+' / '+id.toUpperCase();
 if(user.gm){$('#sheetPick').hidden=false;if(!$('#sheetPick').options.length)for(const p of OPERATIVOS.filter(x=>!x.gm)){const opt=node('option',p.name);opt.value=p.id;$('#sheetPick').append(opt);}$('#sheetPick').value=id;$('#sheetPick').onchange=e=>renderSheet(e.target.value);}
 const pending=pendingFor(id);$('#pendingCheck').hidden=!pending;$('#pendingCheck').textContent=pending?'Consulta pendiente: '+pending.check+'. Usa esa habilidad para completar el análisis.':'';
 $('#resources').replaceChildren();for(const [name,value,detail]of [['Puntos de vida',c.pv,'Máximo '+c.pv],['Temple',c.temple,'Valor inicial'],['Suerte',c.suerte,'Valor inicial']]){const card=node('article',null,'resource');card.append(node('span',name),node('strong',value),node('small',detail));$('#resources').append(card);}
 const names={FUE:'Fuerza',CON:'Constitución',DES:'Destreza',APA:'Apariencia',INT:'Inteligencia',POD:'Poder',EDU:'Educación',TAM:'Tamaño'};
 $('#stats').replaceChildren();for(const [k,v]of Object.entries(c.stats)){const b=button('',()=>roll(k,v));b.append(node('span',names[k]),node('strong',v),node('small',k+' / '+Math.floor(v/2)+' / '+Math.floor(v/5)));$('#stats').append(b);}
 $('#derived').replaceChildren();for(const [label,value]of [['Movimiento',c.mov],['Bonificación al daño',c.bd],['Corpulencia',c.corp]]){const el=node('div');el.append(node('span',label),node('b',value));$('#derived').append(el);}
 $('#skills').replaceChildren();const skills={...c.skills};for(const [name,value]of SKILLBASE){if(Object.keys(skills).some(k=>normalize(k.split('(')[0])===normalize(name)))continue;skills[name]=value==='DES2'?Math.floor(c.stats.DES/2):value==='EDU'?c.stats.EDU:value;}
 for(const [name,val]of Object.entries(skills).sort((a,b)=>a[0].localeCompare(b[0],'es'))){const b=button(name,()=>roll(name,val));b.dataset.trained=String(name in c.skills);b.dataset.skill=normalize(name);b.append(node('b',val+'%'),node('small',Math.floor(val/2)+' / '+Math.floor(val/5)),node('span',name in c.skills?'Entrenada':'Base','skill-kind'));$('#skills').append(b);}
}
function filterSkills(){const q=normalize($('#skillSearch').value);for(const b of $$('#skills button'))b.hidden=!b.dataset.skill.includes(q)||($('#trainedOnly').checked&&b.dataset.trained!=='true');}
$('#skillSearch').oninput=filterSkills;$('#trainedOnly').onchange=filterSkills;
export function rollLevel(r,v){if(r===1)return 'EVALUACIÓN EXCEPCIONAL';if(r==100||(v<50&&r>=96))return 'REVISIÓN NECESARIA';if(r<=Math.floor(v/5))return 'ANÁLISIS CONCLUYENTE';if(r<=Math.floor(v/2))return 'HALLAZGO SÓLIDO';if(r<=v)return 'ANÁLISIS FAVORABLE';return 'SIN CONCLUSIÓN';}
function roll(label,val){
 const pending=user.gm?null:pendingFor(viewedId),id=uid(),r=1+Math.floor(Math.random()*100),ts=Date.now(),o=OPERATIVOS.find(x=>x.id===viewedId);
 const channel=pending?.ch||currentChannel,record={id,msg:'Revisión de '+label+': '+rollLevel(r,val),who:o.name,userId:user.id,gm:!!user.gm,t:'roll',label,val,roll:r,ts,ch:channel};const patch={['messages/'+id]:record};
  currentChannel=channel;store.put(patch);$('#sheet').close();$('#chat').classList.add('open');buildSuggestions();
  if(!user.gm&&(channel==='mecenas'||channel==='general'||channel.startsWith('priv_')))void (async()=>{await store.flush();await llamarMecenas(id);})();
}
async function openMap(){
 if(mapInstance){mapInstance.invalidateSize();return;}if(loadingMap)return;loadingMap=true;
 try{
  if(!window.L)await new Promise((resolve,reject)=>{const s=node('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
  const L=window.L;$('#zmap').replaceChildren();mapInstance=L.map('zmap').setView([41.77,-1.74],11);
  const tileLayer=L.tileLayer(MAP_TILES.url,{maxZoom:MAP_TILES.maxZoom,attribution:MAP_TILES.attribution});
  const notice=node('div',null,'map-load-status');notice.hidden=true;notice.setAttribute('role','status');$('#map').append(notice);
  let failed=false;
  tileLayer.on('loading',()=>{failed=false;});
  tileLayer.on('tileerror',()=>{failed=true;notice.hidden=false;notice.replaceChildren(node('span','No se ha podido cargar parte del callejero. Comprueba tu conexión.'),button('Reintentar',()=>{failed=false;notice.hidden=true;tileLayer.redraw();}));});
  tileLayer.on('load',()=>{if(!failed)notice.hidden=true;});
  tileLayer.addTo(mapInstance);L.control.scale({imperial:false}).addTo(mapInstance);
  for(const [lat,lon,name]of [[41.7333,-1.6883,'Monasterio de Veruela'],[41.81233,-1.81984,'Base del equipo · provisional'],[41.7406,-1.6986,'Vera de Moncayo'],[41.7469,-1.7261,'Trasmoz'],[41.9042,-1.7239,'Tarazona']])L.circleMarker([lat,lon],{radius:6,color:'#66e6ce'}).addTo(mapInstance).bindTooltip(name);
 }catch{$('#zmap').replaceChildren(node('p','No se ha podido cargar el mapa. Comprueba la conexión y vuelve a abrir esta pestaña.','empty'));}finally{loadingMap=false;}
}
window.addEventListener('beforeunload',()=>{store?.stop();atlas?.dispose();});

$('#directContact').onchange=e=>{if(!e.target.value)return;currentChannel=e.target.value;chatSignature='';renderChat(store.data);buildSuggestions();};
function download(name,text,type='text/markdown;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderControl(data){
 if(!user?.gm)return;const el=$('#controlSummaries');el.replaceChildren();const all=messages(data);
 const channels=allowedChannels().map(c=>({...c,list:all.filter(m=>m.ch===c.id)})).filter(c=>c.list.length).sort((a,b)=>b.list.at(-1).ts-a.list.at(-1).ts);
 $('#controlStatus').textContent=all.length+' mensajes · '+channels.length+' conversaciones con actividad';
 for(const c of channels){const summary=summarize(c.list),card=node('article',null,'summary-card');card.append(node('h2',c.label),node('small',summary.count+' mensajes · '+new Date(summary.last).toLocaleString('es-ES')));
 for(const [title,items]of [['Propuestas y confirmaciones',summary.proposals],['Preguntas planteadas',summary.questions],['Últimos intercambios',summary.recent]])if(items.length){card.append(node('h3',title));for(const item of items){const b=button(item.text,()=>{currentChannel=c.id;chatSignature='';renderChat(store.data);buildSuggestions();$('#chat').classList.add('open');const target=$$('#chatLog article').find(e=>e.dataset.message===item.id);target?.scrollIntoView({block:'center'});});b.className='summary-quote';card.append(b);}}
 card.append(node('p','Extractos automáticos. Una propuesta no implica acuerdo; las preguntas pueden haber recibido respuesta.','muted'));el.append(card);
 }
 if(!channels.length)el.append(node('p','Sin conversaciones todavía.','empty'));
}
$('#exportChats').onclick=()=>{if(!user?.gm)return;const lines=['# Control — Historial y resúmenes','',new Date().toLocaleString('es-ES'),''];for(const c of allowedChannels()){const list=messages().filter(m=>m.ch===c.id);if(!list.length)continue;const s=summarize(list);lines.push('## '+c.label,'','### Resumen por extractos',...s.proposals.map(x=>'- Propuesta: '+x.text),...s.questions.map(x=>'- Pregunta: '+x.text),...s.recent.map(x=>'- Reciente: '+x.text),'','### Historial completo',...list.map(m=>'['+new Date(m.ts).toLocaleString('es-ES')+'] '+m.who+': '+m.msg),'');}download('Veruela-control-historial.md',lines.join('\n'));};
$('#resetOpen').onclick=()=>{if(!user?.gm)return;$('#resetWord').value='';$('#resetError').textContent='';$('#resetConfirm').disabled=true;$('#resetScope').textContent=localMode?'Estás en modo local: solo se vaciarán las pruebas de este navegador.':'Se vaciará el historial compartido para todos los operativos. Descarga antes una copia si quieres conservarlo.';$('#resetDialog').showModal();};
$('#resetCancel').onclick=()=>$('#resetDialog').close();$('#resetWord').oninput=()=>$('#resetConfirm').disabled=$('#resetWord').value!=='BORRAR';
$('#resetConfirm').onclick=async()=>{if(!user?.gm||$('#resetWord').value!=='BORRAR')return;$('#resetConfirm').disabled=true;try{await store.resetChat();readSeen={};chatSignature='';renderChat(store.data);$('#resetDialog').close();}catch(e){$('#resetError').textContent=e.message;}finally{$('#resetConfirm').disabled=false;}};
$('#loginSubmit').disabled=false;

