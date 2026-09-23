// HTTP usa los módulos originales; doble clic usa su copia empaquetada, sin imports locales.
(function(){
 const error=document.getElementById('loginError');
 const fail=e=>{document.getElementById('loginSubmit').disabled=true;error.textContent='No se ha podido cargar el acceso. Conserva index.html, style.css y toda la carpeta js juntos, y vuelve a abrir la página.';console.error('Inicio de Veruela:',e);};
 error.textContent='Cargando acceso…';
 if(location.protocol==='file:'){
  const script=document.createElement('script');script.src='./js/local-bundle.js';
  script.onload=()=>{if(document.getElementById('loginSubmit').disabled){fail(new Error('Arranque incompleto'));return;}error.textContent='';};
  script.onerror=fail;document.head.append(script);
 }else import('./app.js?v=mapa-3').then(()=>{error.textContent='';}).catch(fail);
})();
