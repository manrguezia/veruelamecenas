// Fotografías extraídas del PDF aportado por el usuario, sin alterar su contenido.
const SOURCE='https://www.romanicodigital.com/sites/default/files/pdfs/files/zaragoza_Vera_de_Moncayo.pdf';
const picture=(file,title,page)=>({src:'./assets/veruela/'+file,title,page,source:SOURCE+'#page='+page,credit:'Románico Digital · Fundación Santa María la Real · Fotos: CMA (crédito del documento)'});
export const PLAN_IMAGE={src:'./assets/veruela/planta-general.jpg',title:'Planta general del monasterio y sus anexos',page:7,source:SOURCE+'#page=7',credit:'Románico Digital · Fundación Santa María la Real · Planos: BHC (Beatriz Hernández Carceller)'};
const church=[picture('pdf-05-1.jpg','Exterior de la iglesia desde el este',5),picture('pdf-16-1.jpg','Interior de la iglesia · nave central',16),picture('pdf-16-2.jpg','Interior de la iglesia · segunda vista',16),picture('pdf-26-1.jpg','Fachada occidental',26),picture('pdf-28-1.jpg','Cabecera de la iglesia',28),picture('pdf-23-1.jpg','Bóvedas de la capilla mayor',23),picture('pdf-37-1.jpg','Nave del Evangelio',37)];
const chapter=[picture('pdf-33-2.jpg','Interior de la Sala Capitular',33),picture('pdf-33-1.jpg','Acceso a la Sala Capitular desde el claustro',33)];
const cloister=[picture('pdf-29-1.jpg','Galería del claustro · puerta del Miserere',29),chapter[1]];
const general=[picture('pdf-03-1.jpg','Vista del conjunto desde el sur',3),picture('pdf-04-1.jpg','Vista del conjunto desde el este',4)];
export const ZONE_PHOTOS={
 iglesia:church,'sala-capitular':chapter,claustro:cloister,
 scriptorium:[picture('pdf-34-1.jpg','Interior del scriptorium / sala de monjes',34)],
 dormitorio:[picture('pdf-35-1.jpg','Dormitorio monástico / Salón de Reyes',35)],
 cilla:[picture('pdf-30-1.jpg','Puerta de los conversos · conexión con la iglesia',30)],
 recinto:general,terreno:general,'monasterio-nuevo':general,
};
// Las vistas generales no se presentan como interiores de los anexos.
export function mediaForZone(zone){return [...(ZONE_PHOTOS[zone]||[]),PLAN_IMAGE];}
export function createRoomGallery(){
 const $=s=>document.querySelector(s),dialog=$('#roomGallery');let items=[],index=0,lastFocus=null;
 const title=$('#roomGalleryTitle'),img=$('#roomPhoto'),credit=$('#roomPhotoCredit'),status=$('#roomPhotoStatus');
 const thumbs=$('#roomPhotoThumbs'),zoom=$('#roomPhotoZoom');
 function show(i){
  index=(i+items.length)%items.length;const item=items[index];zoom.value='1';applyZoom();
  title.textContent=item.title;$('#roomPhotoCount').textContent=(index+1)+' / '+items.length;
  credit.textContent=item.credit+' · PDF p. '+item.page+' (impresa '+(740+item.page)+')';
  const source=$('#roomPhotoSource');source.href=item.source;status.textContent='Cargando imagen…';
  img.hidden=false;img.alt=item.title;img.onload=()=>{status.textContent='';};img.onerror=()=>{img.hidden=true;status.textContent='No se encuentra la imagen. Comprueba que la carpeta assets/veruela acompaña al HTML.';};img.src=item.src;
  for(const b of thumbs.children)b.setAttribute('aria-pressed',String(Number(b.dataset.index)===index));
  $('#roomPhotoPrevious').disabled=items.length<2;$('#roomPhotoNext').disabled=items.length<2;
 }
 function applyZoom(){const large=Number(zoom.value)>1;$('#roomPhotoViewport').classList.toggle('zoomed',large);img.style.width=large?(Number(zoom.value)*100)+'%':'';$('#roomPhotoViewport').scrollTop=0;$('#roomPhotoViewport').scrollLeft=0;}
 zoom.oninput=applyZoom;
 function open(zone,label){
  items=mediaForZone(zone);lastFocus=document.activeElement;$('#roomGalleryZone').textContent=label;thumbs.replaceChildren();
  items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.dataset.index=i;b.setAttribute('aria-label',item.title);b.onclick=()=>show(i);const thumb=document.createElement('img');thumb.src=item.src;thumb.alt='';thumb.loading='lazy';b.append(thumb);thumbs.append(b);});
  show(0);dialog.showModal();
 }
 $('#roomPhotoPrevious').onclick=()=>show(index-1);$('#roomPhotoNext').onclick=()=>show(index+1);$('#roomGalleryClose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>lastFocus?.focus());
 dialog.addEventListener('keydown',e=>{if(e.target===zoom)return;if(e.key==='ArrowLeft'){e.preventDefault();show(index-1);}if(e.key==='ArrowRight'){e.preventDefault();show(index+1);}});
 function select(zone,label){
  const target=$('#selectionMedia'),photos=ZONE_PHOTOS[zone]||[],first=photos[0]||PLAN_IMAGE;target.replaceChildren();target.dataset.zone=zone;
  const b=document.createElement('button');b.type='button';b.className='room-preview';b.setAttribute('aria-label',(photos.length?'Ver fotografías de ':'Ver plano de ')+label);b.onclick=()=>open(zone,label);
  const image=document.createElement('img');image.src=first.src;image.alt=first.title;image.loading='lazy';image.onerror=()=>{image.hidden=true;};
  const caption=document.createElement('span');caption.textContent=photos.length?'Ver fotografías · '+photos.length:'Ver planta documental';b.append(image,caption);target.append(b);
  if(!photos.length){const note=document.createElement('small');note.textContent='Sin fotografía específica identificada en este documento.';target.append(note);}
 }
 return {select,open};
}
