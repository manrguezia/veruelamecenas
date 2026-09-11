// Teatro de acceso exclusivamente visual. No geolocalización, IP, telemetría ni solicitudes de red.
export async function playAccessSequence(accepted){
 const dialog=document.querySelector('#accessSequence'),title=document.querySelector('#accessTitle');
 const log=document.querySelector('#accessLog'),progress=document.querySelector('#accessProgress');
 const state=document.querySelector('#accessState'),back=document.querySelector('#accessBack');
 const controller=new AbortController();let completed=false;
 const pause=ms=>new Promise(resolve=>{if(controller.signal.aborted){resolve();return;}const done=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,ms);controller.signal.addEventListener('abort',done,{once:true});});
 const line=(text,kind='')=>{const p=document.createElement('p');p.textContent=text;p.className=kind;log.append(p);log.scrollTop=log.scrollHeight;};
 const cancel=e=>{e?.preventDefault();controller.abort();};
 dialog.addEventListener('cancel',cancel);back.onclick=cancel;
 dialog.classList.remove('access-denied','access-approved');log.replaceChildren();progress.value=0;
 title.textContent='Estableciendo enlace';state.textContent='IDENTIFICACIÓN EN CURSO';back.textContent='Cancelar enlace';
 try{
  dialog.showModal();
  for(const [text,value,delay]of [['[01] Contactando con el nodo Veruela…',18,450],['[02] Comprobando credenciales…',40,700],['[03] Contrastando identidad del operativo…',65,650]]){
   if(controller.signal.aborted)return false;line(text);progress.value=value;await pause(delay);
  }
  if(controller.signal.aborted)return false;
  if(accepted){
   line('[OK] Identidad confirmada.','access-ok');progress.value=80;
   title.textContent='Asegurando el entorno';line('[04] Estableciendo canal reservado…');await pause(650);
   if(controller.signal.aborted)return false;
   dialog.classList.add('access-approved');title.textContent='Acceso autorizado';state.textContent='ENTORNO SEGURO / OK';
   progress.value=100;line('[OK] Canal establecido. Abriendo sala de preparación.','access-ok');await pause(900);
   completed=!controller.signal.aborted;
  }else{
   dialog.classList.add('access-denied');title.textContent='Intrusión detectada';state.textContent='ALERTA / ACCESO RECHAZADO';
   line('[ERROR] Credenciales no reconocidas.','access-alert');progress.value=76;back.textContent='Volver al acceso';await pause(700);
   if(controller.signal.aborted)return false;
   line('[!] Intento de acceso no autorizado.','access-alert');line('[RASTREO] Localizando coordenadas del intruso…');await pause(1000);
   if(controller.signal.aborted)return false;
   line('[RASTREO] Triangulando origen: LAT **.**** / LON **.****');progress.value=92;await pause(900);
   if(controller.signal.aborted)return false;
   line('[BLOQUEO] Enlace interrumpido. Restableciendo acceso.','access-alert');progress.value=100;await pause(850);
  }
  return completed;
 }finally{controller.abort();dialog.removeEventListener('cancel',cancel);back.onclick=null;if(dialog.open)dialog.close();}
}
