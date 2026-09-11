import {CONFIG} from './scenario.js';
// Un ciclo de chat evita que un navegador sin conexión reponga mensajes borrados.
export function createStore(onChange,onStatus,{database=CONFIG.database}={}){
 const key=database?'veruela-preparacion-v2':'veruela-preparacion-v2-local';
 let data={messages:{},plan:{},epoch:'initial',epochTs:0},pending={},busy=false,stopped=false,debounce;
 try{const c=JSON.parse(localStorage.getItem(key)||'null');if(c){data={...data,...c.data};pending=c.pending||{};}}catch{}
 const safe=id=>id&&!['__proto__','constructor','prototype'].includes(id);
 const epochOf=m=>m?.epoch||'initial';
 const status=text=>onStatus(text);
 function cache(){try{localStorage.setItem(key,JSON.stringify({data,pending}));}catch{status('No se puede guardar en este navegador. Exporta antes de cerrar.');}}
 function notify(){onChange(data);}
 function switchEpoch(epoch){if(epoch===data.epoch)return;data.epoch=epoch;data.messages={};for(const k of Object.keys(pending))if(k.startsWith('messages/'))delete pending[k];}
 function apply(patch){for(const [path,value]of Object.entries(patch)){const [bucket,id]=path.split('/');if(!safe(id)||!['messages','plan'].includes(bucket))continue;if(bucket==='messages'&&epochOf(value)!==data.epoch)continue;data[bucket][id]=value;}}
 function merge(remote){
  switchEpoch(remote?.epoch||'initial');data.epochTs=remote?.epochTs||0;
  for(const bucket of ['messages','plan'])for(const [id,v]of Object.entries(remote?.[bucket]||{})){
   if(!safe(id)||!v||typeof v!=='object'||(bucket==='messages'&&epochOf(v)!==data.epoch))continue;
   if(!data[bucket][id]||(v.ts||0)>=(data[bucket][id].ts||0))data[bucket][id]=v;
  }
  apply(pending);
 }
 async function request(method,body){const r=await fetch(database+CONFIG.path+'.json',{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
 async function refresh(){
  if(stopped||busy)return;
  if(!database){status('Modo local · solo este navegador');return;}
  busy=true;
  try{
   // Leer el ciclo vigente ANTES de enviar mensajes pendientes de otra sesión.
   const remote=await request('GET');if(stopped)return;merge(remote);cache();notify();
   const batch={...pending};if(Object.keys(batch).length){await request('PATCH',batch);for(const k of Object.keys(batch))if(pending[k]===batch[k])delete pending[k];cache();}
   status(Object.keys(pending).length?'Guardado aquí · pendiente de compartir':'Compartido · al día');
  }catch{status('Sin conexión compartida · cambios guardados aquí; se reintentará.');}finally{busy=false;}
 }
 function put(patch){const stamped={};for(const [k,v]of Object.entries(patch))stamped[k]=k.startsWith('messages/')?{...v,epoch:data.epoch}:v;apply(stamped);Object.assign(pending,stamped);cache();notify();if(database){status('Guardado aquí · compartiendo…');clearTimeout(debounce);debounce=setTimeout(refresh,350);}else{pending={};cache();status('Modo local · solo este navegador');}}
 async function flush(){clearTimeout(debounce);while(busy)await new Promise(resolve=>setTimeout(resolve,50));await refresh();}
 async function resetChat(){
  if(busy)throw Error('Hay una sincronización en curso. Espera unos segundos y reintenta.');
  busy=true;clearTimeout(debounce);const epoch=crypto.randomUUID(),epochTs=Date.now();
  try{
   // Una única escritura borra TODOS los canales, conservando el plan del equipo.
   if(database)await request('PATCH',{messages:null,epoch,epochTs});
   switchEpoch(epoch);data.epochTs=epochTs;cache();notify();status(database?'Historial compartido vaciado':'Historial local vaciado');
  }catch(e){throw Error('No se ha podido confirmar el borrado. Comprueba la conexión y reintenta.');}finally{busy=false;}
 }
 function storage(e){if(e.key!==key||!e.newValue)return;try{const c=JSON.parse(e.newValue);if(c?.data){if((c.data.epochTs||0)<data.epochTs)return;merge(c.data);for(const [k,v]of Object.entries(c.pending||{}))if(!k.startsWith('messages/')||epochOf(v)===data.epoch)pending[k]=v;notify();}}catch{}}
 window.addEventListener('storage',storage);notify();void refresh();const timer=setInterval(refresh,CONFIG.pollMs);
 return {get data(){return data;},put,refresh,flush,resetChat,stop(){stopped=true;clearInterval(timer);clearTimeout(debounce);window.removeEventListener('storage',storage);},get pendingCount(){return Object.keys(pending).length;}};
}
