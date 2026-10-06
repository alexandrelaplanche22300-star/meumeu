// La balistique 3D sur un engin conçu (V12.8) : un tir est un RAYON dans le repère de la caisse (x à droite, y en hauteur, z vers l'avant, en cm de
// peluche — celui du bureau des engins). Il frappe les VRAIES plaques de la conception (deriveVeh : D.plates, leur normale, leur épaisseur ; celles
// d'une tourelle tournées de son pointage), sous l'angle d'incidence exact (le rayon contre la normale, en 3D). S'il perce, il continue dans
// l'habitacle et rencontre ce qui s'y trouve dans l'ordre : les postes (le Meumeu assis), les râteliers, le moteur, l'essence, la soute — les boîtes
// de la disposition (D.mods). Les éclats arrachés à la face intérieure partent en cône, chacun son rayon.
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
// une tourelle tourne autour de son axe (x = T.x, z = T.z) ; un angle positif la tourne vers la droite (comme le pointage des armes de l'engin)
const rotY=(p,cx,cz,c,s)=>[cx+(p[0]-cx)*c+(p[2]-cz)*s,p[1],cz-(p[0]-cx)*s+(p[2]-cz)*c];
// les plaques telles qu'elles sont à cet instant : la caisse, et chaque tourelle (non fixe) tournée de yaw[ti]
export function platesAt(D,yaw=[]){const out=[];for(const P of D.plates){const ti=P.ti;const y=P.part==='tourelle'&&!P.fixe?(yaw[ti]||0):0;
    if(!y){out.push(P);continue;}const T=D.tur[ti].T,c=Math.cos(y),s=Math.sin(y);
    out.push({...P,poly:P.poly.map(p=>rotY(p,T.x,T.z,c,s)),n:rotY(P.n,0,0,c,s),c:rotY(P.c,T.x,T.z,c,s)});}
  return out;}
// le point X est-il dans le polygone (plan, convexe ou non) ? projeté en 2D sur le plan des deux axes où la normale pèse le moins
function inPoly(X,poly,n){const ax=Math.abs(n[0]),ay=Math.abs(n[1]),az=Math.abs(n[2]);const [i,j]=ax>=ay&&ax>=az?[1,2]:ay>=az?[0,2]:[0,1];
  let inside=false;for(let k=0,l=poly.length-1;k<poly.length;l=k++){const a=poly[k],b=poly[l];if((a[j]>X[j])!==(b[j]>X[j])&&X[i]<(b[i]-a[i])*(X[j]-a[j])/((b[j]-a[j])||1e-12)+a[i])inside=!inside;}return inside;}
// toutes les traversées du rayon O + s·d (d unitaire) par les plaques, dans l'ordre : entrée (la normale fait face au rayon) ou sortie
export function rayPlates(O,d,plates){const hits=[];for(const P of plates){const den=dot(P.n,d);if(Math.abs(den)<1e-9)continue;const s=dot(P.n,sub(P.c,O))/den;if(s<=0)continue;
    const X=add(O,mul(d,s));if(!inPoly(X,P.poly,P.n))continue;hits.push({s,X,P,enter:den<0,cosI:Math.abs(den)});}
  return hits.sort((a,b)=>a.s-b.s);}
// la traversée d'une boîte alignée (les boîtes de la disposition : {x0,x1,y0,y1,z0,z1}) : [entrée, sortie] le long du rayon, ou null
export function rayBox(O,d,b){let t0=-Infinity,t1=Infinity;for(const [o,dd,lo,hi] of [[O[0],d[0],b.x0,b.x1],[O[1],d[1],b.y0,b.y1],[O[2],d[2],b.z0,b.z1]]){
    if(Math.abs(dd)<1e-12){if(o<lo||o>hi)return null;continue;}let a=(lo-o)/dd,c=(hi-o)/dd;if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return null;}
  return t1<0?null:[Math.max(0,t0),t1];}
// les boîtes de l'habitacle traversées, dans l'ordre (une boîte faite de plusieurs blocs — les bancs, la soute — compte une fois, à son premier bloc)
export function rayMods(O,d,mods,sMin=0,sMax=Infinity){const out=[];for(const m of mods){let best=null;for(const b of (m.blocks?.length?m.blocks:[m.box])){if(!b)continue;const r=rayBox(O,d,b);if(r&&r[0]>=sMin-1e-6&&r[0]<=sMax&&(!best||r[0]<best[0]))best=r;}
    if(best)out.push({s:best[0],s1:best[1],m});}
  return out.sort((a,b)=>a.s-b.s);}
// une direction au hasard dans un cône d'axe d et de demi-angle ang (rad), uniforme sur la calotte
export function inCone(d,ang,rand){const up=Math.abs(d[1])<.9?[0,1,0]:[1,0,0];const u=nrm(cross(d,up)),w=cross(d,u);const ct=1-rand()*(1-Math.cos(ang)),st=Math.sqrt(1-ct*ct),ph=rand()*Math.PI*2;
  return nrm(add(add(mul(d,ct),mul(u,st*Math.cos(ph))),mul(w,st*Math.sin(ph))));}
// le rayon d'un tir dans le repère de la caisse : rel (l'angle du tir par rapport à l'avant de l'engin, positif vers la droite), le point visé :
// décalé de ex (cm) sur le côté, à la hauteur y (cm) ; une pente dy (montant si > 0) ; l'origine loin devant le point visé, en amont du rayon
export function shotRay(rel,ex,y,dy=0){const d=nrm([Math.sin(rel),dy,Math.cos(rel)]);const side=[Math.cos(rel),0,-Math.sin(rel)];const P=[side[0]*ex,y,side[2]*ex];return {O:sub(P,mul(d,4000)),d,P};}
// qui est assis où : le conducteur à son poste, les servants aux postes des armes dans l'ordre, les passagers sur les bancs
export function seatsOf(D,crew){const map=new Map();const posts=D.mods.filter(m=>m.kind==='equipage');const cond=posts.filter(m=>m.role==='conducteur'),serv=posts.filter(m=>m.role!=='conducteur');
  const alive=(crew||[]).filter(u=>u.hp>0);const C=alive.filter(u=>u.vrole==='conducteur'),S=alive.filter(u=>u.vrole==='servant'),Pa=alive.filter(u=>u.vrole==='passager');
  cond.forEach((m,i)=>{if(C[i])map.set(m.id,[C[i]]);});serv.forEach((m,i)=>{if(S[i])map.set(m.id,[S[i]]);});
  const pm=D.mods.find(m=>m.kind==='passager');if(pm&&Pa.length)map.set(pm.id,Pa);return map;}
export {sub,add,mul,dot};
