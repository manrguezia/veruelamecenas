import {INTEL,findIntel} from './mecenas-intel.js?v=guion-2';
// Guion local cerrado: no ejecuta peticiones externas, no usa un modelo de lenguaje.
// Cada entrada puede editarse sin cambiar el chat ni el visor.
export const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const FAQ=[
 {id:'encargo',title:'¿Qué tenemos que llevarnos?',keys:['encargo','objetivo','robar','robo','piezas','llevarnos','llevamos','robamos','objetivos'],answer:'Tres piezas: «Los durmientes», «La luz que nace de la sombra» y el relicario colonial. Los dos lienzos están en la iglesia; el relicario, en la sala capitular. Nada más. Las quiero intactas.'},
 {id:'pago',title:'¿Cuál es el acuerdo económico?',keys:['pago','pagar','dinero','anticipo','cobrar','millón','reparto','cobramos','pagan','pagas','cobro','adelanto','remuneracion','cuanto nos pagas'],answer:'Un millón en total. El anticipo de cien mil ya está en manos de Marina. El resto, contra entrega de las tres piezas intactas. El reparto interno es cosa vuestra.'},
 {id:'plazo',title:'¿Cuándo se desmonta la exposición?',keys:['plazo','desmontaje','desmonta','fecha','mes','limite','fecha limite','nochevieja','cuando es el robo','cuando termina','cuando acaba','fin de exposicion','31 de diciembre'],answer:'La exposición finaliza el 31 de diciembre de 2026. La operación será esa misma noche, del 31 de diciembre al 1 de enero. El desmontaje será posterior al cierre; su horario no está confirmado. El fin de la muestra no desconecta las protecciones.'},
 {id:'camaras',title:'¿Qué cámaras recoge el informe?',keys:['camaras','camara','cctv','cobertura','grabacion','graban'],answer:'El dossier contempla diez cámaras: portería, cuatro esquinas del claustro, entrada de monjes, sala capitular, dos accesos al refectorio y plaza de la iglesia. Consulta la capa Cámaras; los abanicos son aproximados.'},
 {id:'alarmas',title:'¿Qué alarmas hay previstas?',keys:['alarmas','alarma','sensor','sensores','vitrina','contactos','movimiento'],answer:'Seis avisos propuestos: portería, puerta capitular, vitrina del relicario, iglesia, refectorio y almacén. Son independientes de las cámaras. Quitar una capa del plano no cambia su estado.'},
 {id:'rondas',title:'¿Cómo se organiza la vigilancia?',keys:['rondas','ronda','guardias','guardia','vigilantes','vigilante','turnos','horarios','vigilancia','vigila','vigilan'],answer:'El informe indica dos vigilantes de día y uno de noche. El nocturno parte de portería y realiza rondas orientativas cada hora, de 23:00 a 07:00. No toméis esa rutina como garantía de paso libre.'},
 {id:'garitas',title:'¿Dónde están los puestos?',keys:['garita','garitas','puestos','caseta','casetas'],answer:'El puesto principal está en portería. El plano añade una caseta auxiliar junto a las dependencias; su ocupación está por confirmar. No presupongáis otro vigilante nocturno.'},
 {id:'accesos',title:'¿Qué accesos podemos estudiar?',keys:['accesos','acceso','puertas','puerta','cerradura','cerraduras','entrada'],answer:'Estudiad las puertas señaladas en verde y sus conexiones con el claustro. Elegid una alternativa y anotad sus dudas en el plan. No deis por confirmado un acceso sin contrastar la información.'},
 {id:'iglesia',title:'¿Qué hay en la iglesia?',keys:['iglesia','lienzos','durmientes','luz','cuadros','pinturas'],answer:'En la iglesia están los dos lienzos del encargo. El plano distingue los marcadores V01 y V02. Documentad dimensiones y protección antes de decidir quién los transportará.'},
 {id:'capitular',title:'¿Dónde está el relicario?',keys:['capitular','relicario','colonial','polavieja'],answer:'El relicario colonial está en la sala capitular. El dossier lo sitúa en una vitrina con aviso de manipulación. El resto de la colección histórica queda fuera del encargo.'},
 {id:'refectorio',title:'¿Hay objetivos en el refectorio?',keys:['refectorio','farruca','triptico'],answer:'El refectorio forma parte de la exposición, pero ninguna de sus obras está en el encargo. Consideradlo al estudiar conexiones y personal; no añadáis piezas a la lista.'},
 {id:'claustro',title:'¿Qué conecta el claustro?',keys:['claustro','galeria','galerias','patio'],answer:'El claustro conecta las principales dependencias del núcleo antiguo. Comparad las capas de cámaras y rondas sobre sus galerías. El patio central está abierto.'},
 {id:'sacristia',title:'¿Qué sabemos de la sacristía?',keys:['sacristia','palacio','abacial','ciego','ciegos'],answer:'No consta cámara propia en la sacristía ni en el palacio abacial dentro de este dossier. Eso no confirma ausencia de cobertura desde otra zona. Dejadlo como dato por contrastar.'},
 {id:'nuevo',title:'¿Para qué sirve el monasterio nuevo?',keys:['hospederia','nuevo','anexos'],answer:'Es un conjunto auxiliar con alas y patios junto al núcleo antiguo. No contiene piezas del encargo. El uso de hospedería se ha asignado de forma provisional en el modelo.'},
 {id:'personal',title:'¿Quién trabaja en la exposición?',keys:['personal','empleados','empleado','limpieza','conservadora','comisaria','mantenimiento'],answer:'El informe recoge comisaria, conservación, taquilla, limpieza, mantenimiento y vigilancia. Preparad qué dato necesitáis de cada función. Coordinad cualquier contacto con Control.'},
 {id:'equipo',title:'¿Qué deberíamos preparar?',keys:['equipo','material','herramientas','embalaje','embalajes','proteccion','transportar'],answer:'Protección de conservación para dos lienzos y una pieza pequeña, capacidad de transporte y responsables claros. Anotad el material pendiente; no deis por adquiridos recursos que nadie ha confirmado.'},
 {id:'logistica',title:'¿Cómo organizamos el traslado?',keys:['traslado','coche','vehiculo','ruta','base','reunion','logistica'],answer:'Acordad en el plan el punto de reunión, quién conduce y una alternativa si hay que aplazar. No iniciéis el traslado hasta haber cerrado la preparación.'},
 {id:'fase',title:'¿Qué falta antes de salir?',keys:['empezar','salimos','viaje','presencial','preparacion','partida','listos','terminar'],answer:'Por aquí cerramos la preparación: información, responsabilidades, equipo y dudas. La salida se prepara para la noche del 31 de diciembre de 2026.'},
 {id:'identidad',title:'¿Quién está detrás del encargo?',keys:['identidad','comprador','motivos','quien eres','tu nombre','para quien'],answer:'Soy vuestro contacto. El comprador no forma parte de la conversación. Las condiciones del encargo sí.'},
 {id:'saludo',title:'Hola, Mecenas',keys:['hola','buenas','saludos','gracias'],answer:'Os leo. Concretad la duda: piezas, seguridad, personal o preparación.'},
 {id:'analisis',title:'Quiero analizar el dossier de cámaras',keys:['analizar','analisis','investigar','investigacion','comprobar','estudiar'],answer:'Revisa el dossier desde tu perfil, con la competencia Descubrir. Necesito una evaluación documental antes de confirmar nada más.',check:{skill:'Descubrir',difficulty:'regular',success:'El documento no confirma cobertura total entre las dependencias. Marca esa incertidumbre y prepara una alternativa; la ausencia de un dispositivo dibujado no demuestra que el paso esté libre.',failure:'La documentación no permite confirmar nada más. Anotad la duda y pedid a Control otra fuente.'}},
 {id:'seguridad',title:'Resumen de seguridad',keys:['seguridad','sistemas de seguridad'],answer:'El dossier distingue cámaras, alarmas, rondas y puestos. Puedo resumir cada apartado. El atlas permite estudiarlos por separado; atenuarlos no los desconecta.'},
 {id:'exposicion',title:'¿Qué exposición es?',keys:['exposicion','general y el sonador','muestra'],answer:'«El general y el soñador» reúne el legado Polavieja · Valenzuela y finaliza el 31 de diciembre de 2026. Las piezas del encargo son dos pinturas en la iglesia y un relicario en la Sala Capitular.'},
 {id:'dimensiones',title:'¿Qué dimensiones tienen las piezas?',keys:['dimensiones','medidas','peso','pesan','tamano','ficha tecnica'],answer:'La documentación disponible aquí no confirma medidas, peso ni estado de conservación. Dejad esa petición para Control antes de cerrar los embalajes.'},
 {id:'planos',title:'¿Dónde están los planos y fotografías?',keys:['plano','planos','fotografias','fotos','imagenes','mapa','3d'],answer:'En el atlas, seleccionad una estancia para abrir sus fotografías. «Plano original» permite ampliar la planta documental. Las alturas son aproximadas y algunas asignaciones de uso están pendientes de confirmar.'},
 {id:'scriptorium',title:'¿Qué es el scriptorium?',keys:['scriptorium','sala de monjes'],answer:'La sala de monjes está junto al ala del capítulo. El atlas muestra sus seis tramos y columnas. Ninguna de las tres piezas del encargo está asignada allí.'},
 {id:'dormitorio',title:'¿Qué hay en el dormitorio?',keys:['dormitorio','salon de reyes'],answer:'El dormitorio ocupa la planta superior del ala del capítulo. Atenuadlo en el atlas para estudiar las dependencias de abajo. No tiene piezas del encargo.'},
 {id:'cocina',title:'¿Qué sabemos de la cocina?',keys:['cocina'],answer:'La cocina es contigua al refectorio. El atlas permite comparar sus accesos y conexiones. No hay piezas del encargo asignadas a ella.'},
 {id:'cilla',title:'¿Qué es la cilla?',keys:['cilla','almacen'],answer:'La cilla es el antiguo almacén junto al lado de los conversos. En el dossier tiene un aviso de apertura; su estado requiere confirmación.'},
 {id:'ayuda',title:'¿Sobre qué puedo preguntar?',keys:['ayuda','opciones','que sabes','que puedo preguntar'],answer:'Puedo aclarar el encargo y la noche del 31 de diciembre. También puedo contrastar fichas de personal, proveedores, residentes y dispositivos: pedid una persona, una función, C01–C10 o A01–A06. Esas fichas requieren una evaluación desde vuestro perfil.'}

];
export const getEntry=id=>FAQ.find(f=>f.id===id)||INTEL.find(f=>f.id===id);
export function answerQuestion(text,context={}){
 const q=normalize(text),words=new Set(q.split(' '));
 const entry=id=>FAQ.find(f=>f.id===id);
 if(!q)return {id:'empty',answer:'Formula una pregunta sobre el encargo.'};
 if(/\b(desactivo|desactivar|anulo|anular|hackeo|hackear|forzar|forzamos|entramos|entro|saltamos|escalar|disparo)\b/.test(q))return {id:'mesa',answer:'Anótalo como propuesta del plan. Primero necesito que cerréis la preparación. No daré por ejecutada una acción desde este canal.'};
 if(/\b(prompt|ignora|olvida|secreto|sobrenatural|fantasma|monstruo|campana anterior)\b/.test(q))return {id:'limite',answer:'Me ciño al dossier del encargo. Pregunta por las piezas, la seguridad prevista o la preparación.'};
 if(/\b(he sacado|he obtenido|mi tirada|resultado de la tirada)\b/.test(q))return {id:'resultado-manual',answer:'La revisión se completa desde tu ficha, con la competencia solicitada. Un resultado escrito en el chat no sustituye esa evaluación.'};
 const dossier=findIntel(q,context.topic);if(dossier)return dossier;
 if(/\b(analizar|analisis|investigar|investigacion|comprobar)\b/.test(q)&&/\b(camaras|camara|cobertura|dossier|documentacion|informe|vigilancia)\b/.test(q))return entry('analisis');
 const exact=FAQ.find(f=>normalize(f.title)===q);if(exact)return exact;
 const ranked=FAQ.filter(f=>f.id!=='analisis').map(f=>({f,score:f.keys.reduce((n,k)=>n+(normalize(k).includes(' ')?(' '+q+' ').includes(' '+normalize(k)+' ')?6:0:words.has(normalize(k))?2:0),0)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score);
 if(!ranked.length)return {id:'fallback',answer:'No tengo ese dato confirmado en el dossier. Déjalo en Dudas pendientes para Control. Puedo aclarar piezas, cámaras, alarmas, rondas, accesos y equipo.'};
 // Un saludo no debe desplazar una pregunta; las consultas ambiguas no revelan datos extra.
 const substantive=ranked.filter(r=>r.f.id!=='saludo');const matches=substantive.length?substantive:ranked;
 if(matches.length>1&&matches[0].score===matches[1].score){
  if(/\by\b/.test(q))return {id:'varios',answer:matches.slice(0,2).map(r=>r.f.answer).join('\n\n')};
  return {id:'aclarar',answer:'Concreta la consulta: «'+matches[0].f.title+'» o «'+matches[1].f.title+'».'};
 }
 return matches[0].f;
}
export function allowedSkills(check){return check?.skills||[check?.skill].filter(Boolean);}
export function canUseSkill(check,label){return allowedSkills(check).some(s=>normalize(s)===normalize(label));}
export function resolveCheck(entry,roll){
 if(!entry?.check||!canUseSkill(entry.check,roll.label))return null;
 const r=roll.roll,v=roll.val;if(!Number.isInteger(r)||r<1||r>100||!Number.isInteger(v)||v<0||v>100)return null;
 const required=entry.check.difficulty==='dificil'?2:entry.check.difficulty==='extremo'?3:1;
 const fumble=r===100||(v<50&&r>=96);
 const grade=r===1?4:fumble?-1:r<=Math.floor(v/5)?3:r<=Math.floor(v/2)?2:r<=v?1:0;
 const succeeded=grade>=required,improved=succeeded&&grade>required;
 const answer=succeeded?entry.check.success+(improved&&entry.check.improvement?'\n\n'+entry.check.improvement:''):entry.check.failure;
 return {id:'resultado-'+entry.id,answer,succeeded,grade,improved};
}
