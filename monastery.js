import * as THREE from 'three';

// Paleta centralizada. Three.js 0.180.0 / r180, ES modules.
export const COLORS = Object.freeze({
  historic: '#51eadb', extension: '#a699ff', palace: '#ffc78b',
  site: '#397d89', active: '#ffffff', scan: '#bdfff3', background: '#050d16',
});

/**
 * Reconstrucción esquemática de Veruela, sin escala métrica certificada.
 * X/Z siguen la imagen verde (derecha/abajo); Y es altura.
 * No crea cámara, luces, renderer, eventos ni bucle de animación.
 * @param {THREE.Scene|THREE.Group} scene Contenedor de la aplicación.
 * @param {{colors?:object, scanSpeed?:number, scanEnabled?:boolean}} options
 */
export function createMonasteryModel(scene, options = {}) {
  if (!scene?.isObject3D) throw new TypeError('Se requiere una Scene o Group de Three.js');
  const palette = { ...COLORS, ...options.colors };
  const root = new THREE.Group(); root.name = 'Monasterio de Veruela';
  const zones = {}, pickables = [], geometries = new Set(), materials = new Set();
  const time = { value: 0 }, enabled = { value: options.scanEnabled === false ? 0 : 1 };
  const speed = options.scanSpeed ?? 2.3;
  let disposed = false;
  const vertexShader = `varying vec3 p;
    void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const fragmentShader = `uniform vec3 color; uniform vec3 scanColor;
    uniform float time; uniform float scanEnabled; uniform float alpha;
    varying vec3 p;
    void main(){
      float band=exp(-pow((p.y-mod(time,20.))/0.65,2.))*scanEnabled;
      float stripes=0.89+0.11*sin(p.y*16.-time*2.*scanEnabled);
      gl_FragColor=vec4(mix(color,scanColor,band*.9),min(1.,alpha*(stripes+band*.65)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function material(color, alpha) {
    const m = new THREE.ShaderMaterial({
      uniforms: {color:{value:new THREE.Color(color)},scanColor:{value:new THREE.Color(palette.scan)},
        time,scanEnabled:enabled,alpha:{value:alpha}}, vertexShader, fragmentShader,
      transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending,
    }); materials.add(m); return m;
  }
  function zone(id,label,color) {
    const group=new THREE.Group(); group.name=label; group.userData.zoneId=id; root.add(group);
    const z={id,label,group,color,active:false,lineMaterial:material(color,.78),
      surfaceMaterial:material(color,.035),segments:[]}; zones[id]=z; return z;
  }
  function line(z,points,closed=false) {
    const pts=closed?[...points,points[0]]:points;
    for(let i=1;i<pts.length;i++) z.segments.push(...pts[i-1],...pts[i]);
  }
  function mesh(z,g,pick=true) {
    geometries.add(g);
    const e=new THREE.EdgesGeometry(g,22), a=e.attributes.position.array;
    for(let i=0;i<a.length;i++)z.segments.push(a[i]); e.dispose();
    const m=new THREE.Mesh(g,z.surfaceMaterial);m.userData.zoneId=z.id; z.group.add(m);
    if(pick)pickables.push(m); return m;
  }
  function box(z,x,v,w,d,h,base=0,pick=true) {
    return mesh(z,new THREE.BoxGeometry(w,h,d).translate(x,base+h/2,v),pick);
  }
  function roof(z,x,v,w,d,y,rise,axis='x') {
    const a=[x-w/2,y,v-d/2],b=[x+w/2,y,v-d/2],c=[x+w/2,y,v+d/2],e=[x-w/2,y,v+d/2];
    const r=axis==='x'?[x-w/2,y+rise,v]:[x,y+rise,v-d/2];
    const s=axis==='x'?[x+w/2,y+rise,v]:[x,y+rise,v+d/2];
    line(z,[a,b,c,e],true); line(z,[r,s]);
    for(const [u,t] of axis==='x'?[[a,r],[e,r],[b,s],[c,s]]:[[a,r],[b,r],[e,s],[c,s]])line(z,[u,t]);
  }
  function building(z,x,v,w,d,h=6,axis='x') {box(z,x,v,w,d,h);roof(z,x,v,w,d,h,2,axis);}
  // Coordenadas digitalizadas del plano verde, centradas y reducidas.
  const S=.16;
  const site=(x,y,h=0)=>[(x-600)*S,h,(y-430)*S];
  function sb(z,x,y,w,d,h=5,axis='x'){building(z,(x-600)*S,(y-430)*S,w*S,d*S,h,axis);}
  // Registro del plano detallado sobre el conjunto: rotación de 90° y escala aproximada.
  const old=(x,y,h=0)=>site(840-(y-100)*.33,405+(x-340)*.33,h);
  function ob(z,x1,y1,x2,y2,h=6){
    const a=old(x1,y1),b=old(x2,y2);
    building(z,(a[0]+b[0])/2,(a[2]+b[2])/2,Math.abs(b[0]-a[0]),Math.abs(b[2]-a[2]),h,
      Math.abs(y2-y1)>Math.abs(x2-x1)?'x':'z');
  }
  function arch(z,c,width,height,axis='x',base=0){
    const pts=[];
    for(let i=0;i<=16;i++){
      const t=Math.PI-i*Math.PI/16, u=Math.cos(t)*width/2;
      pts.push([c[0]+(axis==='x'?u:0),base+height*.55+Math.sin(t)*height*.45,c[2]+(axis==='z'?u:0)]);
    }
    line(z,[[pts[0][0],base,pts[0][2]],...pts,[pts[16][0],base,pts[16][2]]]);
  }
  function ring(z,x,v,r,h,n=16){
    const pts=Array.from({length:n},(_,i)=>[x+r*Math.cos(i*2*Math.PI/n),h,v+r*Math.sin(i*2*Math.PI/n)]);
    line(z,pts,true);return pts;
  }

  // Iglesia: tres naves, crucero, cabecera poligonal y capillas radiales.
  const church=zone('iglesia','Iglesia',palette.historic);
  ob(church,294,205,384,675,12);ob(church,245,300,294,675,7);ob(church,384,300,434,675,7);
  ob(church,204,205,475,300,10);
  const ap=old(340,180);
  mesh(church,new THREE.CylinderGeometry(4.3,4.3,10,10).translate(ap[0],5,ap[2]));
  for(let i=-2;i<=2;i++){
    const t=i*Math.PI/5, x=ap[0]+Math.cos(t)*4.2,v=ap[2]+Math.sin(t)*4.2;
    mesh(church,new THREE.CylinderGeometry(1.55,1.55,6,8).translate(x,3,v));ring(church,x,v,1.55,7.2,8);
  }
  for(let y=320;y<=640;y+=62){
    for(const x of [245,434]){const p=old(x,y);box(church,p[0],p[2],.7,1.25,6.7);arch(church,old(x,y+25),1.1,4.4,'x',1);}
    for(const x of [294,384]){const p=old(x,y);box(church,p[0],p[2],.4,.4,8.8);}
    const a=old(294,y,8.8),b=old(384,y,8.8);line(church,[a,[(a[0]+b[0])/2,12,(a[2]+b[2])/2],b]);
  }
  arch(church,old(340,677),3.2,5.5,'z');
  const rose=old(340,677,8.8);const rp=[];
  for(let i=0;i<24;i++){const t=i*Math.PI/12;rp.push([rose[0],rose[1]+Math.sin(t)*1.15,rose[2]+Math.cos(t)*1.15]);}
  line(church,rp,true);for(let i=0;i<24;i+=3)line(church,[rose,rp[i]]);

  // Claustro: patio abierto, cuatro galerías con arquerías y lavatorio hexagonal.
  const cloister=zone('claustro','Claustro',palette.historic);
  ob(cloister,438,300,714,334,4.7);ob(cloister,438,534,714,572,4.7);
  ob(cloister,438,334,476,534,4.7);ob(cloister,677,334,714,534,4.7);
  for(let x=494;x<675;x+=31)for(const y of [334,534])arch(cloister,old(x,y),1.35,3.6,'z');
  for(let y=352;y<528;y+=30)for(const x of [476,677])arch(cloister,old(x,y),1.35,3.6,'x');
  for(const h of [0.12,3.3]){const p=old(646,466);ring(cloister,p[0],p[2],1.65,h,6);}
  const lav=old(646,466);for(const p of ring(cloister,lav[0],lav[2],1.65,3.3,6))line(cloister,[p,[lav[0],4.5,lav[2]]]);

  // Sala Capitular: al lado de la sacristía; columnas y nervios de nueve tramos.
  const chapter=zone('sala-capitular','Sala Capitular',palette.historic);
  ob(chapter,520,208,616,291,5.5);
  for(const x of [548,584])for(const y of [233,263]){const p=old(x,y);box(chapter,p[0],p[2],.18,.18,3.8);}
  for(let x=520;x<610;x+=32)for(let y=208;y<286;y+=28){
    const c=old(x+16,y+14,5.3);
    for(const [u,v] of [[x,y],[x+32,y],[x,y+28],[x+32,y+28]])line(chapter,[old(u,v,3.8),c]);
  }
  for(const x of [535,568,601])arch(chapter,old(x,292),1.45,3.8,'z');

  // Sacristía: pieza pequeña junto a la cabecera y la sala capitular.
  const sacristy=zone('sacristia','Sacristía',palette.historic);ob(sacristy,478,151,517,206,5.8);
  // Refectorio: perpendicular a la galería opuesta a la iglesia.
  const refectory=zone('refectorio','Refectorio',palette.historic);ob(refectory,716,421,953,492,7);
  for(let x=738;x<947;x+=37)for(const y of [421,492])arch(refectory,old(x,y),1.1,4.5,'z',1);
  const annex=zone('dependencias','Dependencias históricas',palette.historic);
  ob(annex,693,206,853,290,5.5);ob(annex,717,500,793,568,5);ob(annex,438,581,675,665,5);

  // Palacio Abacial: conjunto separado, con patio, siguiendo la imagen verde.
  const palace=zone('palacio-abacial','Palacio Abacial',palette.palace);
  // Planta oblicua a la iglesia: se construye en ejes locales y después se rota.
  const start=palace.segments.length;
  sb(palace,459,341,207,25,7);sb(palace,459,403,83,20,7);
  sb(palace,423,372,20,43,7,'z');sb(palace,496,372,20,43,7,'z');
  const pivot=site(459,372),angle=.49;
  const matrix=new THREE.Matrix4().makeTranslation(pivot[0],0,pivot[2])
    .multiply(new THREE.Matrix4().makeRotationY(-angle))
    .multiply(new THREE.Matrix4().makeTranslation(-pivot[0],0,-pivot[2]));
  for(const m of palace.group.children)m.geometry.applyMatrix4(matrix);
  const vec=new THREE.Vector3();for(let i=start;i<palace.segments.length;i+=3){vec.fromArray(palace.segments,i).applyMatrix4(matrix);vec.toArray(palace.segments,i);}

  // Portería/Oficinas: acceso noroeste y ala alargada junto a la cerca.
  const gate=zone('porteria-oficinas','Portería / Oficinas',palette.palace);
  sb(gate,335,213,26,27,10);sb(gate,270,306,25,129,5,'z');sb(gate,346,303,35,23,4.5);
  arch(gate,site(335,228),2.4,5,'x');

  // Hospedería: asignación funcional PROVISIONAL al ala exterior del monasterio nuevo.
  const guest=zone('hospederia','Hospedería · ubicación provisional',palette.extension);
  sb(guest,1002,520,25,151,8,'z');
  guest.group.userData.assumption='Ubicación funcional no rotulada en las referencias; confirmar antes de publicar.';
  // Monasterio nuevo: gran patio oriental; tres alas, la cuarta es Hospedería.
  const newer=zone('monasterio-nuevo','Monasterio nuevo',palette.extension);
  sb(newer,916,454,150,27,8);sb(newer,916,591,150,27,8);sb(newer,848,523,26,111,8,'z');
  for(let x=874;x<988;x+=16)for(const y of [468,578])for(const base of [0,4])arch(newer,site(x,y),1.85,3.4,'x',base);
  for(let y=485;y<574;y+=16)for(const [x,z]of [[861,newer],[989,guest]])for(const base of [0,4])arch(z,site(x,y),1.85,3.4,'z',base);

  // Recinto completo del plano verde: cerca irregular, torres, aljibe, molino y caminos.
  const enclosure=zone('recinto','Recinto y torres',palette.site);
  const boundary=[[230,163],[268,118],[345,179],[422,94],[631,135],[840,177],[1045,231],[1098,513],[966,760],[686,743],[412,720],[198,375],[308,225]];
  for(let i=0;i<boundary.length;i++){
    const a=site(...boundary[i]),b=site(...boundary[(i+1)%boundary.length]);
    line(enclosure,[a,b,[b[0],3,b[2]],[a[0],3,a[2]]],true);
    const dist=Math.hypot(a[0]-b[0],a[2]-b[2]),n=Math.ceil(dist/1.4);
    for(let j=0;j<=n;j++){const t=j/n,x=a[0]+(b[0]-a[0])*t,v=a[2]+(b[2]-a[2])*t;line(enclosure,[[x,3,v],[x,3.5,v]]);}
    mesh(enclosure,new THREE.CylinderGeometry(1.35,1.35,4.2,10).translate(a[0],2.1,a[2]));
  }
  const terrain=zone('terreno','Terreno y recorridos',palette.site);
  const shape=new THREE.Shape();boundary.forEach(([x,y],i)=>{const p=site(x,y);i?shape.lineTo(p[0],-p[2]):shape.moveTo(p[0],-p[2]);});shape.closePath();
  const ground=new THREE.ShapeGeometry(shape);ground.rotateX(-Math.PI/2);ground.translate(0,-.12,0);mesh(terrain,ground,false);
  for(const offset of [-12,12])line(terrain,[[275+offset,147],[358+offset,241],[621+offset,399],[591+offset,476],[594+offset,572]].map(p=>site(...p,.05)));
  const services=zone('servicios','Aljibe, molino y anexos',palette.site);
  sb(services,313,344,29,57,2.5,'z');sb(services,449,539,55,32,4.5);sb(services,557,318,78,20,3.5);
  for(const [x,y]of [[320,620],[380,590],[485,630],[710,230],[800,250],[870,300]]){
    const p=site(x,y);line(terrain,[[p[0]-1,.03,p[2]],[p[0]+1,.03,p[2]]]);line(terrain,[[p[0],.03,p[2]-1],[p[0],.03,p[2]+1]]);
  }

  // Una sola malla de líneas por zona para reducir las llamadas de dibujo.
  for(const z of Object.values(zones)){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(z.segments,3));
    geometries.add(g);const lines=new THREE.LineSegments(g,z.lineMaterial);lines.userData.zoneId=z.id;
    z.group.add(lines);delete z.segments;
  }
  scene.add(root); root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  function getZone(id){if(!zones[id])throw new RangeError(`Zona desconocida: ${id}`);return zones[id];}
  function setActive(id,active=true,color=palette.active){
    const z=getZone(id);z.active=Boolean(active);
    for(const m of [z.lineMaterial,z.surfaceMaterial])m.uniforms.color.value.set(z.active?color:z.color);
    z.surfaceMaterial.uniforms.alpha.value=z.active?.12:.035;
  }
  return {
    root,zones,pickables,bounds,
    update(elapsedSeconds){if(!disposed&&Number.isFinite(elapsedSeconds))time.value=elapsedSeconds*speed;},
    setActive,
    setZoneColor(id,color){const z=getZone(id);z.color=color;if(!z.active)setActive(id,false);},
    clearActive(){for(const id of Object.keys(zones))setActive(id,false);},
    setScanEnabled(value){enabled.value=value?1:0;},
    getZoneFromIntersection(hit){let o=hit?.object;while(o&&o!==root){if(o.userData.zoneId)return o.userData.zoneId;o=o.parent;}return null;},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());pickables.length=0;},
  };
}
