// Le modèle 3D d'un engin conçu (V12.8), généré par le code à partir de sa conception (engins.js) — mêmes plaques que le bureau et la balistique.
// En pièces, comme les modèles de la scène : « caisse » (caisse, train, mitrailleuse de caisse), « tourelleI » (tourne), « canonI » (se pointe en
// hauteur, enfant de sa tourelle), « canonsI » (une casemate ou un sponson : tourne dans son débattement), « roueN » (tourne en roulant).
// Repère et unités du bureau : centimètres de peluche, z vers l'avant, y vers le haut, x à droite ; ext = [largeur, hauteur, longueur de caisse].
import * as THREE from './lib/three.module.js';
import {deriveVeh} from './engins.js';

const PAINT=new THREE.Color(0x6e7350),PAINT_T=new THREE.Color(0x787d58),STEEL=new THREE.Color(0x55595c),RUBBER=new THREE.Color(0x262626),TRACK=new THREE.Color(0x3a3a36);
// un petit outil : des triangles colorés, réunis en une géométrie
class Geo{constructor(){this.P=[];this.C=[];}
  tri(a,b,c,col){for(const q of [a,b,c]){this.P.push(q[0],q[1],q[2]);this.C.push(col.r,col.g,col.b);}}
  poly(P,col){for(let i=1;i<P.length-1;i++){this.tri(P[0],P[i],P[i+1],col);this.tri(P[0],P[i+1],P[i],col);}}   // les deux faces (le repère des polygones n'est pas orienté)
  mesh(g,col,m=null){g=g.toNonIndexed();if(m)g.applyMatrix4(m);const p=g.attributes.position.array;for(let i=0;i<p.length;i+=3){this.P.push(p[i],p[i+1],p[i+2]);this.C.push(col.r,col.g,col.b);}}
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.C,3));g.computeVertexNormals();g.computeBoundingBox();return g;}}
const M4=()=>new THREE.Matrix4();
const cyl=(r0,r1,h,seg=12)=>new THREE.CylinderGeometry(r1,r0,h,seg);
// le tube d'une arme, de l'origine (x,y,z) dans la direction (dx,0,dz), long de len, de rayon rad, avec son masque
function barrel(G,x,y,z,dx,dz,len,rad){const m=M4().makeRotationX(Math.PI/2);if(dx)m.premultiply(M4().makeRotationY(dx>0?Math.PI/2:-Math.PI/2));m.premultiply(M4().makeTranslation(x+dx*len/2,y,z+dz*len/2));
  G.mesh(cyl(rad*1.1,rad,len,12),STEEL,m);G.mesh(new THREE.BoxGeometry(rad*5,rad*5,rad*3),STEEL,M4().makeTranslation(x,y,z));}
export function enginModel(v){const D=deriveVeh(v),C=D.C,G0=D.G,parts=[];
  const body=new Geo();for(const f of G0.faces)body.poly(f.poly,PAINT);
  if(v.mgCaisse)barrel(body,v.W*.22,G0.y0+v.H*.6,G0.zN-v.H*.3,0,1,16,.4);
  // le train : des roues (pièces qui tournent) ; des chenilles ; le semi : des roues devant, des chenilles derrière ; le losange : la chenille fait le tour
  const xs=v.W/2+2.6;let nw=0;const wheel=(z,r)=>{for(const s of [-1,1]){const g=new Geo();g.mesh(cyl(r,r,5,16),RUBBER,M4().makeRotationZ(Math.PI/2).premultiply(M4().makeTranslation(s*xs,r,z)));
      g.mesh(cyl(r*.45,r*.45,5.4,10),STEEL,M4().makeRotationZ(Math.PI/2).premultiply(M4().makeTranslation(s*xs,r,z)));parts.push({name:'roue'+(nw++),geo:g.geo(),pivot:[s*xs,r,z]});}};
  const track=(z0,z1,h)=>{for(const s of [-1,1])body.mesh(new THREE.BoxGeometry(5,h,z1-z0),TRACK,M4().makeTranslation(s*xs,h/2,(z0+z1)/2));};
  if(C.train==='roues'){const n=Math.max(2,C.roues/2|0),r=Math.max(3,C.garde+v.H*.22);for(let k=0;k<n;k++)wheel(-v.L*.36+k*(v.L*.72)/Math.max(1,n-1),r);}
  else if(C.train==='semi'){wheel(v.L*.34,Math.max(3,C.garde+v.H*.2));track(-v.L*.48,v.L*.08,C.garde+v.H*.42);}
  else if(C.train==='losange'){const P=[[G0.zF0,G0.y0],[G0.zN,G0.yN+v.H*.25],[G0.zF2,G0.y1+2],[G0.zR1,G0.y1+2],[G0.zR0,G0.y0+v.H*.3]];
    for(const s of [-1,1])for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);
      body.mesh(new THREE.BoxGeometry(7,4,L+3),TRACK,M4().makeRotationX(-Math.atan2(b[1]-a[1],b[0]-a[0])).premultiply(M4().makeTranslation(s*(v.W/2+3.5),(a[1]+b[1])/2,(a[0]+b[0])/2)));}}
  else track(-v.L*.47,v.L*.47,C.garde+v.H*.45);
  parts.push({name:'caisse',geo:body.geo(),pivot:[0,0,0]});
  // les tourelles et leurs armes
  D.tur.forEach((t,i)=>{const T=t.T,g=new Geo();for(const f of t.geo.faces)g.poly(f.poly,PAINT_T);const p=t.A?.D?.p;
    const y=t.base+T.h*.5,len=Math.max(4,(p?.L||200)/10),rad=Math.max(.35,(p?.d||3)/10*.75);
    if(t.F.fixe){let dx=0,dz=1,ox=T.x,oz=T.z+T.D*(T.long||1)/2*.92;if(t.F.flanc){dx=Math.sign(T.x)||1;dz=0;ox=T.x+dx*T.D*.45;oz=T.z;}if(p)barrel(g,ox,y,oz,dx,dz,len,rad);
      parts.push({name:'canons'+i,geo:g.geo(),pivot:[T.x,y,T.z]});return;}
    parts.push({name:'tourelle'+i,geo:g.geo(),pivot:[T.x,t.base,T.z]});
    if(p){const c=new Geo(),oz=T.z+(T.forme==='boite'||T.forme==='hexagone'?T.D*(T.long||1)/2:T.D/2)*.92;barrel(c,T.x,y,oz,0,1,len,rad);if(t.Ac)barrel(c,T.x+rad*3,y,oz,0,1,len*.35,.35);parts.push({name:'canon'+i,geo:c.geo(),pivot:[T.x,y,oz]});}});
  const byName=Object.fromEntries(parts.map(p=>[p.name,p]));const hmax=G0.y1+(D.tur.length?Math.max(...D.tur.map(t=>t.T.h)):0);
  return {ext:[v.W+12,hmax,v.L],parts,byName,mat:new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}),engin:true};}
