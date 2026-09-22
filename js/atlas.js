import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createMonasteryModel,COLORS} from './monastery.js';
import {DEVICES,PATROL,SECURITY_COLORS} from './scenario.js';

export function createAtlas(canvas,onSelect){
 const scene=new THREE.Scene();scene.background=new THREE.Color(COLORS.background);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const camera=new THREE.PerspectiveCamera(37,1,.1,4000),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.minDistance=18;controls.maxDistance=1400;controls.maxPolarAngle=Math.PI*.49;
 const model=createMonasteryModel(scene);const layers={},targets=[],owned=[],zoneDim=new Set(),layerDim=new Set();
 const center=model.bounds.getCenter(new THREE.Vector3());center.y=0;
 let selected=null,scan=!matchMedia('(prefers-reduced-motion: reduce)').matches,overview=true;
 const baseOpacity=new Map();
 function own(g){owned.push(g);return g;}
 function mat(color,opacity=1){return own(new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));}
 function lines(points,color,opacity=.7){const o=new THREE.Line(own(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)))),own(new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false})));return o;}
 function label(text,color){const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#081824';ctx.fillRect(12,10,104,44);ctx.strokeStyle=color;ctx.strokeRect(12,10,104,44);ctx.fillStyle=color;ctx.font='bold 25px monospace';ctx.textAlign='center';ctx.fillText(text,64,42);const t=own(new THREE.CanvasTexture(c));return new THREE.Sprite(own(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false})));}
 for(const id of Object.keys(SECURITY_COLORS)){const g=new THREE.Group();g.name=id;layers[id]=g;scene.add(g);}
 for(const d of DEVICES){
  const group=new THREE.Group();group.userData.device=d;layers[d.layer].add(group);
  const [x,z]=d.pos,color=SECURITY_COLORS[d.layer],height=d.layer==='objetivos'?19:d.layer==='accesos'?1.2:15.6;
  const icon=label(d.id==='P07-obra'?'P07':d.id,color);icon.position.set(x,height,z);icon.scale.set(3.6,1.8,1);icon.userData.device=d;group.add(icon);targets.push(icon);
  const stem=lines([[x,.15,z],[x,height-.8,z]],color,.35);group.add(stem);
  const marker=new THREE.Mesh(own(new THREE.OctahedronGeometry(.55)),mat(color));marker.position.set(x,.6,z);group.add(marker);
  if(d.layer==='camaras'){
   const points=[[x,.12,z]],radius=6;
   for(let i=0;i<=16;i++){const a=d.yaw-.5+i/16;points.push([x+Math.cos(a)*radius,.12,z+Math.sin(a)*radius]);}points.push(points[0]);
   group.add(lines(points,color,.45));const triangle=[];for(let i=1;i<points.length-2;i++)triangle.push(...points[0],...points[i],...points[i+1]);
   const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(triangle,3));group.add(new THREE.Mesh(g,mat(color,.055)));
  }
  if(d.layer==='alarmas'){const r=new THREE.Mesh(own(new THREE.RingGeometry(.9,1.02,24)),mat(color,.7));r.rotation.x=-Math.PI/2;r.position.set(x,.15,z);group.add(r);}
  if(d.layer==='garitas'){const g=own(new THREE.EdgesGeometry(new THREE.BoxGeometry(2,2.5,2)));const frame=new THREE.LineSegments(g,own(new THREE.LineBasicMaterial({color,transparent:true,opacity:.7})));frame.position.set(x,1.25,z);group.add(frame);}
 }
 const route=lines(PATROL.points.map(([x,z])=>[x,.3,z]),SECURITY_COLORS.rondas,.8);layers.rondas.add(route);
 const routeIcon=label('R01',SECURITY_COLORS.rondas);routeIcon.position.set(...[PATROL.points[3][0],17,PATROL.points[3][1]]);routeIcon.scale.set(3.6,1.8,1);routeIcon.userData.device=PATROL;layers.rondas.add(routeIcon);targets.push(routeIcon);
 for(const layer of Object.values(layers))layer.traverse(o=>{if(o.material)baseOpacity.set(o.material,o.material.opacity);});
 function sync(){
  for(const [id,z]of Object.entries(model.zones)){
   const factor=zoneDim.has(id)?.09:1;z.lineMaterial.uniforms.alpha.value=.78*factor;z.surfaceMaterial.uniforms.alpha.value=(z.active?.12:.035)*factor;
  }
  for(const [id,g]of Object.entries(layers))g.traverse(o=>{if(o.material){const d=o.userData.device||o.parent.userData.device;const dim=layerDim.has(id)||(d&&zoneDim.has(d.zone));o.material.opacity=baseOpacity.get(o.material)*(dim?.055:1);}});
 }
 function select(id){selected=id;model.clearActive();if(model.zones[id])model.setActive(id);sync();}
 function fitDistance(){const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);return model.bounds.getBoundingSphere(new THREE.Sphere()).radius/Math.sin(Math.min(vertical,horizontal)/2)*1.05;}
 function perspective(){overview=true;controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(65,143,163).normalize().multiplyScalar(fitDistance()));controls.update();}
 function plan(){overview=false;controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(0,fitDistance(),.001));controls.update();}
 function focusZone(id){overview=false;const z=model.zones[id];if(!z)return;select(id);const b=new THREE.Box3().setFromObject(z.group),c=b.getCenter(new THREE.Vector3());controls.target.copy(c);const dist=Math.max(26,b.getSize(new THREE.Vector3()).length()*1.6)/Math.min(1,camera.aspect);camera.position.copy(c).add(new THREE.Vector3(dist*.5,dist,dist*.8));controls.update();}
 const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let down;
 canvas.addEventListener('pointerdown',e=>{overview=false;down=[e.clientX,e.clientY];});
 canvas.addEventListener('wheel',()=>{overview=false;},{passive:true});
 canvas.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);
  const eligible=targets.filter(o=>!layerDim.has(o.userData.device.layer)&&!zoneDim.has(o.userData.device.zone));
  const marker=raycaster.intersectObjects(eligible,false)[0];if(marker){onSelect({device:marker.object.userData.device});return;}
  const hit=raycaster.intersectObjects(model.pickables.filter(o=>!zoneDim.has(o.userData.zoneId)),false)[0];
  const id=model.getZoneFromIntersection(hit);if(id){select(id);onSelect({zone:id});}
 });
 const resize=()=>{const r=canvas.parentElement.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(overview)perspective();};
 const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);perspective();resize();model.setScanEnabled(scan);
 renderer.setAnimationLoop(t=>{if(canvas.closest('[hidden]'))return;model.update(t/1000);controls.update();renderer.render(scene,camera);});
 return {model,scene,camera,renderer,layers,zoneDim,layerDim,select,perspective,plan,focusZone,
  dimZone(id,value){value?zoneDim.add(id):zoneDim.delete(id);sync();},
  dimLayer(id,value){value?layerDim.add(id):layerDim.delete(id);sync();},
  setScan(value){scan=value;model.setScanEnabled(value);},
  get scan(){return scan;},
  dispose(){renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();model.dispose();owned.forEach(o=>o.dispose());renderer.dispose();},
 };
}
