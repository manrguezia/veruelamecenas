// Registro de la planta de Románico Digital, p. 7, sobre X/Z. Y representa altura.
// Escala gráfica leída: 10 m ≈ 38 píxeles a 130 ppp; no es un levantamiento certificado.
export const PLAN_SCALE=10/38;
export const planPoint=(x,y,h=0)=>[(x-640)*PLAN_SCALE,h,(y-790)*PLAN_SCALE];
// Ejes de la iglesia y claustros, ligeramente girados respecto al papel.
export const corePixel=(u,v)=>[573+.978*u+.208*v,642-.208*u+.978*v];
export const corePoint=(u,v,h=0)=>{const [x,y]=corePixel(u,v);return planPoint(x,y,h);};
// Compatibilidad con referencias del dossier anterior. Para nuevos marcadores usar corePoint.
export const oldPoint=(x,y)=>{const p=corePoint((x-340)*.425,(y-252)*.397);return [p[0],p[2]];};
export const sitePoint=(x,y)=>{
 // Registro aproximado del plano verde anterior, anclado en portería, iglesia y palacio.
 const px=422+.324*(x-335)+.488*(y-213),py=1209-1.045*(x-335)+.392*(y-213);
 const p=planPoint(px,py);return [p[0],p[2]];
};
