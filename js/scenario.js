// Única fuente del escenario de juego. Seguridad inventada, no describe instalaciones reales.
export const CONFIG={ database:'https://veruela-89cec-default-rtdb.europe-west1.firebasedatabase.app', path:'/veruela_preparacion_v2', pollMs:3500, mecenasEndpoint:'https://mecenas-veruela.manrguezia.workers.dev' };
export const MAP_TILES={url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'};
export const SECURITY_COLORS={camaras:'#ff758d',alarmas:'#ffc66e',rondas:'#ae9cff',garitas:'#8baeff',accesos:'#66e6a8',objetivos:'#fff2b6'};
export const site=(x,y)=>[(x-600)*.16,(y-430)*.16];
export const old=(x,y)=>site(840-(y-100)*.33,405+(x-340)*.33);
export const ZONE_INFO={
 'iglesia':'Nave y cabecera. Alberga la sección de pintura de la exposición. Dos obras forman parte del encargo.',
 'claustro':'Patio abierto con cuatro galerías. Conecta iglesia, sala capitular y dependencias del refectorio.',
 'sala-capitular':'Colección histórica Polavieja. El relicario colonial se expone aquí, en vitrina.',
 'refectorio':'Tercera sala de exposición. Sus cuadros no están incluidos en el encargo. Se comunica con las dependencias de cocina.',
 'sacristia':'Dependencia de servicio entre la iglesia y la sala capitular. La documentación de cobertura está incompleta.',
 'palacio-abacial':'Conjunto separado con patio. Espacios auxiliares de la exposición; no contiene piezas del encargo.',
 'porteria-oficinas':'Control de entrada y puesto principal de vigilancia descrito en el dossier.',
 'hospederia':'Ala auxiliar. La asignación de este uso es provisional en la reconstrucción.',
 'monasterio-nuevo':'Patio oriental y galerías del conjunto nuevo. Sin piezas incluidas en el encargo.',
 'dependencias':'Scriptorium, cocina y almacén representados como volúmenes auxiliares.',
 'recinto':'Contorno amurallado y torres del plano general. Las alturas son aproximadas.',
 'terreno':'Caminos principales y espacio abierto del recinto.',
 'servicios':'Aljibe, molino y otros anexos del conjunto.',
};
const cam=(id,name,zone,pos,yaw)=>({id,name,zone,pos,yaw,layer:'camaras',detail:'Cámara fija propuesta en el dossier. El abanico indica orientación aproximada, sin calcular oclusiones por muros.',status:'Registrado en el dossier'});
const door=(id,name,zone,pos)=>({id,name,zone,pos,layer:'accesos',detail:'Acceso identificado para comparar alternativas sobre el plano. Su estado debe confirmarse antes de tomar una decisión.',status:'Acceso documentado'});
export const DEVICES=[
 cam('C01','Control de portería','porteria-oficinas',site(335,225),-2.5),
 cam('C02','Claustro · esquina 1','claustro',old(476,334),.7),
 cam('C03','Claustro · esquina 2','claustro',old(677,334),2.4),
 cam('C04','Claustro · esquina 3','claustro',old(476,534),-.7),
 cam('C05','Claustro · esquina 4','claustro',old(677,534),-2.4),
 cam('C06','Entrada de monjes','iglesia',old(437,340),-Math.PI/2),
 cam('C07','Sala capitular · puerta','sala-capitular',old(568,295),0),
 cam('C08','Refectorio · claustro','refectorio',old(716,456),Math.PI/2),
 cam('C09','Refectorio · cocina','refectorio',old(748,498),Math.PI),
 cam('C10','Plaza de la iglesia','iglesia',old(340,700),0),
 ...[
 ['A01','Contacto de portería','porteria-oficinas',site(335,225),'Contacto de apertura asociado al control de entrada.'],
 ['A02','Contacto de sala capitular','sala-capitular',old(568,291),'Sensor de apertura de la sala, independiente de las cámaras.'],
 ['A03','Vitrina del relicario','sala-capitular',old(575,247),'Aviso de manipulación de la vitrina. El embalaje de conservación se prepara por separado.'],
 ['A04','Control de sala · iglesia','iglesia',old(340,445),'Detección de movimiento propuesta para la nave fuera de horario de visita.'],
 ['A05','Control de sala · refectorio','refectorio',old(834,456),'Detección de movimiento propuesta para la sala de exposición.'],
 ['A06','Contacto de almacén','dependencias',old(553,590),'Aviso de apertura en la zona auxiliar. Estado pendiente de comprobación en el dossier.'],
 ].map(([id,name,zone,pos,detail])=>({id,name,zone,pos,detail,layer:'alarmas',status:'Por confirmar'})),
 {id:'G01',name:'Puesto principal',zone:'porteria-oficinas',pos:site(335,214),layer:'garitas',detail:'Puesto fijo durante la apertura. De noche sirve de base al vigilante nocturno.',status:'Puesto principal'},
 {id:'G02',name:'Caseta auxiliar',zone:'dependencias',pos:site(613,552),layer:'garitas',detail:'Caseta de apoyo señalada en el dossier. Sin dotación nocturna permanente confirmada.',status:'Apoyo · ocupación no confirmada'},
 door('P01','Puerta del recinto','porteria-oficinas',site(335,233)),
 door('P02','Portada de iglesia','iglesia',old(340,676)),
 door('P03','Entrada de monjes','iglesia',old(436,340)),
 door('P04','Puerta de los conversos','iglesia',old(436,600)),
 door('P05','Puerta capitular','sala-capitular',old(568,291)),
 door('P06','Refectorio · galería','refectorio',old(716,456)),
 door('P07','Refectorio · cocina','refectorio',old(748,495)),
 door('P08','Cocina','dependencias',old(715,541)),
 door('P09','Almacén','dependencias',old(550,581)),
 door('P10','Monasterio nuevo','monasterio-nuevo',site(837,528)),
 ...[
 ['V01','La luz que nace de la sombra','iglesia',old(330,420)],
 ['V02','Los durmientes','iglesia',old(350,520)],
 ['P07-obra','Relicario colonial','sala-capitular',old(554,250)],
 ].map(([id,name,zone,pos])=>({id,name,zone,pos,layer:'objetivos',detail:'Pieza incluida en el encargo. Debe conservarse intacta. Preparar protección y responsable de transporte.',status:'Objetivo del encargo'})),
];
export const PATROL={id:'R01',name:'Ronda nocturna orientativa',layer:'rondas',zone:'claustro',
 detail:'Un vigilante nocturno. El dossier recoge rondas horarias entre las 23:00 y las 07:00; los tiempos y el recorrido no garantizan una zona libre. La línea es esquemática.',status:'Rutina por contrastar',
 points:[site(335,225),site(395,276),site(601,395),old(452,551),old(452,317),old(694,317),old(694,551),old(452,551),site(601,395),site(395,276),site(335,225)]};
export const PLAN_FIELDS=[
 ['roles','Responsabilidades','Quién coordina, documenta, transporta y mantiene el contacto.'],
 ['approach','Aproximación prevista','Punto de reunión y alternativa de aproximación.'],
 ['equipment','Equipo y conservación','Protección de las tres piezas, transporte y material pendiente.'],
 ['timing','Horario propuesto','Disponibilidad del grupo y momento previsto para salir de la base.'],
 ['fallback','Contingencias','Qué circunstancias os harían aplazar o abandonar el plan.'],
 ['questions','Dudas pendientes','Lo que todavía necesita confirmación de Control.'],
];
