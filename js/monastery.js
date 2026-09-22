import * as THREE from 'three';
import {PLAN_TRACE} from './plan-trace.js';
import {PLAN_SCALE,planPoint,corePoint} from './plan-coordinates.js';

// Paleta centralizada. Three.js 0.180.0 / r180, ES modules.
export const COLORS = Object.freeze({
  historic: '#51eadb', extension: '#a699ff', palace: '#ffc78b',
  site: '#397d89', active: '#ffffff', scan: '#bdfff3', background: '#050d16',
});

/**
 * Reconstrucción esquemática de Veruela, sin escala métrica certificada.
 * X/Z siguen la planta de Románico Digital p. 7; Y es altura.
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
      float band=exp(-pow((p.y-mod(time,36.))/0.65,2.))*scanEnabled;
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
  const P=planPoint,C=corePoint;
  function polygon(z,pts,h,base=0,pick=true){
    const shape=new THREE.Shape();pts.forEach(([x,y,v],i)=>i?shape.lineTo(x,-v):shape.moveTo(x,-v));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);g.translate(0,base,0);return mesh(z,g,pick);
  }
  function quad(z,u1,v1,u2,v2,h,base=0){return polygon(z,[C(u1,v1),C(u2,v1),C(u2,v2),C(u1,v2)],h,base);}
  function gable(z,u1,v1,u2,v2,h,rise=2.2,along='v'){
    const a=C(u1,v1,h),b=C(u2,v1,h),c=C(u2,v2,h),d=C(u1,v2,h);
    const r=along==='v'?C((u1+u2)/2,v1,h+rise):C(u1,(v1+v2)/2,h+rise);
    const s=along==='v'?C((u1+u2)/2,v2,h+rise):C(u2,(v1+v2)/2,h+rise);
    line(z,[a,b,c,d],true);line(z,[r,s]);for(const [q,t] of along==='v'?[[a,r],[b,r],[c,s],[d,s]]:[[a,r],[d,r],[b,s],[c,s]])line(z,[q,t]);
  }
  function block(z,u1,v1,u2,v2,h,rise=2.2,axis='v'){quad(z,u1,v1,u2,v2,h);if(rise)gable(z,u1,v1,u2,v2,h,rise,axis);}
  function curve(z,a,b,spring,rise){const pts=[];for(let i=0;i<=16;i++){const t=i/16;pts.push([a[0]+(b[0]-a[0])*t,spring+Math.sin(Math.PI*t)*rise,a[2]+(b[2]-a[2])*t]);}line(z,pts);}
  function archC(z,u,v,w,spring,rise,axis='u',base=0){
    const a=C(u-(axis==='u'?w/2:0),v-(axis==='v'?w/2:0)),b=C(u+(axis==='u'?w/2:0),v+(axis==='v'?w/2:0));
    line(z,[[a[0],base,a[2]],[a[0],spring,a[2]]]);curve(z,a,b,spring,rise);line(z,[[b[0],spring,b[2]],[b[0],base,b[2]]]);
  }
  function vault(z,u1,v1,u2,v2,spring,rise){curve(z,C(u1,v1),C(u2,v2),spring,rise);curve(z,C(u2,v1),C(u1,v2),spring,rise);}
  function circle(z,center,r,y,n=24){const pts=Array.from({length:n},(_,i)=>[center[0]+r*Math.cos(i*2*Math.PI/n),y,center[2]+r*Math.sin(i*2*Math.PI/n)]);line(z,pts,true);return pts;}
  function column(z,u,v,h,r=.24){const p=C(u,v);mesh(z,new THREE.CylinderGeometry(r,r,h,8).translate(p[0],h/2,p[2]));}
  function arcWall(z,r,start,end,h,cu=0,cv=-43){
    const pts=[];for(let i=0;i<=28;i++){const t=start+(end-start)*i/28;pts.push(C(cu+Math.sin(t)*r,cv-Math.cos(t)*r));}
    const top=pts.map(p=>[p[0],h,p[2]]);line(z,pts);line(z,top);for(let i=0;i<pts.length;i+=4)line(z,[pts[i],top[i]]);
    const inner=pts.map(p=>{const c=C(cu,cv);const f=(r-2)/r;return[c[0]+(p[0]-c[0])*f,0,c[2]+(p[2]-c[2])*f];});
    polygon(z,[...pts,...inner.reverse()],h);
  }

  // Iglesia: seis tramos, naves escalonadas, crucero, girola y cinco capillas radiales.
  // Planta p.7; alturas interpretadas de las secciones p.10, no cotas de levantamiento.
  const church=zone('iglesia','Iglesia',palette.historic);
  block(church,-18,21,18,170,18.2,2.6); // Nave mayor.
  block(church,-39,21,-18,170,9.2,1.8);block(church,18,21,39,170,9.2,1.8);
  block(church,-65,-21,66,21,18.2,2.6,'u'); // Crucero a la altura de la nave mayor.
  block(church,-18,-43,18,-21,18.2,2.6);
  arcWall(church,18,-Math.PI/2,Math.PI/2,18.2);
  arcWall(church,32,-Math.PI/2,Math.PI/2,9.2); // Anillo exterior de la girola.
  for(const side of [-1,1])block(church,side<0?-32:18,-43,side<0?-18:32,-21,9.2,1.1);
  // Ábside central y cubierta poligonal, sin cilindro cerrado que rellene la girola.
  const ac=C(0,-43,21);for(let i=0;i<7;i++){const t=-Math.PI/2+i*Math.PI/6;line(church,[C(18*Math.sin(t),-43-18*Math.cos(t),18.2),ac]);}
  for(let i=-2;i<=2;i++){
    const t=i*Math.PI/5,cu=Math.sin(t)*33,cv=-43-Math.cos(t)*33;
    const outline=[];for(let j=0;j<12;j++){const a=j*Math.PI/6;outline.push(C(cu+10*Math.cos(a),cv+10*Math.sin(a)));}
    polygon(church,outline,5.8);const center=C(cu,cv,7.5);for(let j=0;j<12;j+=2)line(church,[[outline[j][0],5.8,outline[j][2]],center]);
  }
  for(const u of [-48,49])block(church,u-10,-42,u+10,-21,7,1.5); // Capillas del crucero.
  block(church,-90,-21,-65,11,8,2,'u'); // Capilla de San Bernardo.
  block(church,-60,25,-39,51,6.7,1.4); // Sala de difuntos.
  for(let i=0;i<=6;i++){
    const v=21+i*149/6;
    for(const u of [-18,18])column(church,u,v,9.5,.4);
    archC(church,0,v,36,9.5,7.7);
    for(const u of [-40,40])quad(church,u-2,v-2,u+2,v+2,8.5);
    if(i<6){const end=21+(i+1)*149/6;vault(church,-18,v,18,end,10,7.2);vault(church,-39,v,-18,end,5.4,3.2);vault(church,18,v,39,end,5.4,3.2);
      for(const u of [-18,18])archC(church,u,(v+end)/2,17,5.8,3.2,'v');
      for(const u of [-39,39])archC(church,u,(v+end)/2,6,5.5,1.2,'v',3.5);
      for(const u of [-18,18])archC(church,u,(v+end)/2,6,14,1.2,'v',11);
    }
  }
  // Fachada occidental, arquivoltas, rosetón y torre según alzados y secciones.
  for(let i=0;i<4;i++)archC(church,0,171+i*.5,12+i*2,2.2,2.9+i*.24);
  const rose=C(0,170.8,13.2);const rp=[];for(let i=0;i<32;i++){const t=i*Math.PI/16,p=C(Math.cos(t)*6,170.8,13.2+Math.sin(t)*6*PLAN_SCALE);rp.push(p);}line(church,rp,true);for(let i=0;i<32;i+=4)line(church,[rose,rp[i]]);
  block(church,-44,155,-30,170,28,3);for(const u of [-43,-31])archC(church,u,162.5,7,24.5,1.4,'v',21.5);
  block(church,-7,-7,7,7,23,2); // Pequeño cimborrio sobre el cruce.

  // Claustro: cuatro pandas, patio abierto, dos niveles y lavatorio hexagonal.
  const cloister=zone('claustro','Claustro',palette.historic);
  for(const r of [[40,21,160,35],[40,125,160,140],[40,35,55,125],[145,35,160,125]]){quad(cloister,...r,7.2);gable(cloister,...r,7.2,1.3,r[2]-r[0]>r[3]-r[1]?'u':'v');}
  for(let u=62.5;u<144;u+=15)for(const v of [35,125]){archC(cloister,u,v,13,2.4,1.4);for(const k of [-3.5,3.5])archC(cloister,u+k,v,5.5,5.4,.8,'u',4.2);}
  for(let v=42.5;v<124;v+=15)for(const u of [55,145]){archC(cloister,u,v,13,2.4,1.4,'v');for(const k of [-3.5,3.5])archC(cloister,u,v+k,5.5,5.4,.8,'v',4.2);}
  for(let u=40;u<154;u+=15){vault(cloister,u,21,u+15,35,2.4,1.6);vault(cloister,u,125,u+15,140,2.4,1.6);}
  const lav=C(133,91);const lr=3.1;circle(cloister,lav,lr,.1,6);const lavTop=circle(cloister,lav,lr,3.3,6);for(const p of lavTop){line(cloister,[[p[0],0,p[2]],p]);line(cloister,[p,[lav[0],4.6,lav[2]]]);}circle(cloister,lav,.9,.8,12);

  // Sala Capitular: cuatro columnas, nueve tramos (los de entrada más cortos), cinco arcos.
  const chapter=zone('sala-capitular','Sala Capitular',palette.historic);
  quad(chapter,76,-23,120,21,5.7);
  const ux=[76,90.67,105.33,120],vy=[-23,-5.4,12.2,21];
  for(const u of ux.slice(1,-1))for(const v of vy.slice(1,-1))column(chapter,u,v,3.2,.2);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)vault(chapter,ux[i],vy[j],ux[i+1],vy[j+1],3.2,2.1);
  for(let i=0;i<5;i++)archC(chapter,80.4+i*8.8,21.2,7.3,2,1.2);

  // Sacristía / armarium: pequeña pieza entre crucero y sala capitular.
  const sacristy=zone('sacristia','Sacristía',palette.historic);quad(sacristy,66,-21,76,21,5.7);archC(sacristy,71,21,6,2.1,1.1);
  // Refectorio: sala perpendicular al claustro, con tramos y ventanas laterales.
  const refectory=zone('refectorio','Refectorio',palette.historic);block(refectory,160,80,260,112,8.3,2.5,'u');
  for(let u=168;u<256;u+=18){for(const v of [80,112]){archC(refectory,u,v,6.2,5.8,1,'u',3);quad(refectory,u-2,v-3,u+2,v+3,6.8);}vault(refectory,u-8,80,u+8,112,5.6,2.3);}
  archC(refectory,160,96,9,2.4,1.5,'v');
  // Dependencias: locutorio, paso a sala de monjes y cámara abacial.
  const annex=zone('dependencias','Dependencias históricas',palette.historic);
  quad(annex,120,-23,135,21,5.7);quad(annex,135,-23,149,21,5.7);quad(annex,160,21,198,79,5.7);
  vault(annex,120,-23,135,-1,3.4,2);vault(annex,120,-1,135,21,3.4,2);
  // Scriptorium: seis bóvedas sobre dos columnas exentas; letrinas al fondo.
  const scriptorium=zone('scriptorium','Scriptorium / Sala de monjes',palette.historic);quad(scriptorium,149,-23,207,15,5.7);quad(scriptorium,207,-23,222,15,5.7);
  for(const u of [168.33,187.67])column(scriptorium,u,-4,3.2,.26);
  for(let i=0;i<3;i++)for(let j=0;j<2;j++)vault(scriptorium,149+i*58/3,-23+j*19,149+(i+1)*58/3,-23+(j+1)*19,3.2,2.1);
  // Dormitorio / Salón de Reyes sobre la panda oriental, separado para poder atenuarlo.
  const dormitory=zone('dormitorio','Dormitorio / Salón de Reyes',palette.historic);quad(dormitory,76,-23,207,15,4.8,6);gable(dormitory,76,-23,207,15,10.8,2.4,'u');
  for(let u=83;u<202;u+=14)for(const v of [-23,15])archC(dormitory,u,v,6,8.8,.9,'u',7);
  // Cocina: estancia cuadrada junto al refectorio.
  const kitchen=zone('cocina','Cocina',palette.historic);block(kitchen,160,112,194,145,6,1.6);vault(kitchen,160,112,194,145,3.7,2);
  // Cilla: dos naves separadas por cuatro pilares y anexos de la entrada occidental.
  const cellar=zone('cilla','Cilla / Almacén',palette.historic);block(cellar,40,140,151,170,5.8,2,'u');
  for(let i=1;i<=4;i++)column(cellar,40+i*111/5,155,4.6,.23);
  quad(annex,40,170,151,188,4.7);quad(annex,159,145,175,188,5);quad(annex,175,172,196,188,5);

  // Monasterio nuevo: cuatro alas y partición interior que figura en la planta documental.
  const newer=zone('monasterio-nuevo','Monasterio nuevo',palette.extension);
  block(newer,62,-264,263,-229,10,2,'u');block(newer,62,-229,99,-22,10,2);
  block(newer,226,-229,263,-22,10,2);block(newer,99,-57,226,-22,10,2,'u');
  for(const r of [[111,-229,120,-57],[208,-229,217,-57],[120,-229,208,-220],[120,-79,208,-57]])quad(newer,...r,8.5);
  block(newer,120,-177,208,-124,7,2.2,'u'); // Cuerpo central; quedan dos espacios abiertos.
  for(let v=-222;v<-65;v+=17){for(const u of [99,226])for(const base of [0,4.4])archC(newer,u,v,12,base+2.5,1,'v',base);line(newer,[C(62,v,4.8),C(99,v,4.8)]);line(newer,[C(226,v,4.8),C(263,v,4.8)]);}
  for(let u=109;u<223;u+=17)for(const v of [-229,-57])for(const base of [0,4.4])archC(newer,u,v,12,base+2.5,1,'u',base);

  // Palacio Abacial: huella oblicua, patio y alas, digitalizados en el sector del acceso.
  const palace=zone('palacio-abacial','Palacio Abacial',palette.palace);
  const A=(u,v,h=0)=>P(637+.921*u-.389*v,990+.389*u+.921*v,h);
  function ab(z,u1,v1,u2,v2,h){const pts=[A(u1,v1),A(u2,v1),A(u2,v2),A(u1,v2)];polygon(z,pts,h);line(z,pts.map(p=>[p[0],h+1.5,p[2]]),true);}
  ab(palace,-44,-108,-20,140,8);ab(palace,-20,-42,48,-20,8);ab(palace,-20,22,48,42,8);ab(palace,25,-20,48,22,8);ab(palace,-20,72,85,88,5);
  // Portería/Oficinas: entrada y cuerpo longitudinal junto al límite del recinto.
  const gate=zone('porteria-oficinas','Portería / Oficinas',palette.palace);
  polygon(gate,[[405,1202],[433,1217],[423,1235],[395,1220]].map(p=>P(...p)),9);
  polygon(gate,[[485,1199],[641,1289],[625,1318],[469,1227]].map(p=>P(...p)),5.5);
  // Hospedería: huella exterior del acceso; uso provisional, no identificado por este plano.
  const guest=zone('hospederia','Hospedería · ubicación provisional',palette.extension);
  polygon(guest,[[524,862],[559,877],[520,973],[481,958]].map(p=>P(...p)),7.2);
  guest.group.userData.assumption='Huella tomada del plano; uso de hospedería provisional, no confirmado por esta fuente.';
  // Recinto: perímetro, barbacana y torres ajustados a la planta p.7.
  const enclosure=zone('recinto','Recinto y torres',palette.site);
  const boundary=[[331,378],[614,270],[954,354],[986,701],[1002,1018],[643,1321],[452,1226],[393,1317],[335,1286],[391,1192],[284,1114],[292,870],[304,622]];
  for(let i=0;i<boundary.length;i++){
   const a=P(...boundary[i]),b=P(...boundary[(i+1)%boundary.length]);line(enclosure,[a,b,[b[0],5,b[2]],[a[0],5,a[2]]],true);
   const dist=Math.hypot(a[0]-b[0],a[2]-b[2]),n=Math.ceil(dist/2);
   for(let j=0;j<=n;j++){const t=j/n,x=a[0]+(b[0]-a[0])*t,v=a[2]+(b[2]-a[2])*t;line(enclosure,[[x,5,v],[x,5.6,v]]);}
   mesh(enclosure,new THREE.CylinderGeometry(i===7||i===8?3.4:2.7,i===7||i===8?3.4:2.7,6.3,14).translate(a[0],3.15,a[2]));
  }
  const terrain=zone('terreno','Terreno y recorridos',palette.site);polygon(terrain,boundary.map(p=>P(...p)),.08,-.25,false);
  for(const pts of [[[348,1287],[405,1197],[560,842],[520,815],[499,707],[480,657],[495,609],[566,532]],[[392,1307],[448,1217],[603,869],[650,823]]])line(terrain,pts.map(p=>P(...p,.1)));
  // Aljibe, molino y anexos: huellas documentadas, alturas esquemáticas.
  const services=zone('servicios','Aljibe, molino y anexos',palette.site);
  for(const pts of [[[558,1171],[620,1180],[614,1218],[551,1205]],[[639,1191],[735,1224],[725,1254],[628,1221]],[[763,976],[808,970],[806,1040],[771,1044]],[[710,1024],[753,1016],[758,1049],[739,1052],[733,1031]]])polygon(services,pts.map(p=>P(...p)),4.5);
  // Referencia vectorial original: muros, pilares y bóvedas del dibujo, con su propia capa.
  const documentary=zone('plano-documental','Trazado del plano original',palette.site);
  for(let i=0;i<PLAN_TRACE.length;i+=4)line(documentary,[P(PLAN_TRACE[i],PLAN_TRACE[i+1],.14),P(PLAN_TRACE[i+2],PLAN_TRACE[i+3],.14)]);

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
