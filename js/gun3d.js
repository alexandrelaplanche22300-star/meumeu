// L'arme conçue, en 3D : le même plan que gunart.js (layout en mm depuis le talon de crosse), mais en volumes.
// Repère de l'arme : X vers la bouche, Y vers le haut, Z sur le côté ; l'axe du canon est la droite (Y=0, Z=0), le talon de crosse à X=0.
// Tout est en millimètres ; gunModel() rend une géométrie colorée unique (un seul dessin), la hauteur du sol sous l'axe (pour les affûts),
// la position de la bouche, la longueur hors tout. Le concepteur la montre sur un plateau tournant, le jeu la met dans les mains des soldats
// et sur les affûts des pièces.
import * as THREE from './lib/three.module.js';
import {ACTIONS,STOCKS,FINISHES} from './ballistics.js';
import {layout} from './gunart.js';
import {MATS} from './armor.js';
import {loadModel} from './mesh3d.js';

const PI=Math.PI;
class Build{
  constructor(){this.P=[];this.N=[];this.C=[];this.col=new THREE.Color();this.m=new THREE.Matrix4();this.nm=new THREE.Matrix3();this.xf=null;}
  // xf : une transformation appliquée à tout ce qu'on ajoute tant qu'elle est posée (la grappe de tubes inclinée d'une batterie)
  add(g,hex,m=null){g=g.index?g.toNonIndexed():g;const M=this.xf?(m?this.xf.clone().multiply(m):this.xf):m;if(M){g=g.clone();g.applyMatrix4(M);}
    if(!g.attributes.normal)g.computeVertexNormals();const p=g.attributes.position.array,n=g.attributes.normal.array;this.col.set(hex);
    for(let i=0;i<p.length;i++){this.P.push(p[i]);this.N.push(n[i]);}for(let i=0;i<p.length/3;i++)this.C.push(this.col.r,this.col.g,this.col.b);return this;}
  box(x0,x1,y0,y1,z0,z1,hex){const g=new THREE.BoxGeometry(Math.abs(x1-x0),Math.abs(y1-y0),Math.abs(z1-z0));g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);return this.add(g,hex);}
  // cylindre dont l'axe est X, de x0 à x1, rayons r0 (côté x0) et r1 (côté x1)
  cylX(x0,x1,r0,r1,y,z,hex,seg=12){const g=new THREE.CylinderGeometry(r1,r0,Math.abs(x1-x0),seg,1);g.rotateZ(-PI/2);g.translate((x0+x1)/2,y,z);return this.add(g,hex);}
  cylY(y0,y1,r0,r1,x,z,hex,seg=12){const g=new THREE.CylinderGeometry(r1,r0,Math.abs(y1-y0),seg,1);g.translate(x,(y0+y1)/2,z);return this.add(g,hex);}
  cylZ(z0,z1,r,x,y,hex,seg=16){const g=new THREE.CylinderGeometry(r,r,Math.abs(z1-z0),seg,1);g.rotateX(PI/2);g.translate(x,y,(z0+z1)/2);return this.add(g,hex);}
  // un segment de tube entre deux points
  rod(a,b,r,hex,seg=6){const v=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const L=v.length();if(L<1e-6)return this;const g=new THREE.CylinderGeometry(r,r,L,seg,1);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());const m=new THREE.Matrix4().compose(new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),q,new THREE.Vector3(1,1,1));return this.add(g,hex,m);}
  // un profil (x,y) épaissi sur z de z0 à z1
  poly(pts,z0,z1,hex){const sh=new THREE.Shape();pts.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y));const g=new THREE.ExtrudeGeometry(sh,{depth:Math.abs(z1-z0),bevelEnabled:false,curveSegments:6});g.translate(0,0,Math.min(z0,z1));return this.add(g,hex);}
  sphere(x,y,z,r,hex,sx=1,sy=1,sz=1){const g=new THREE.SphereGeometry(r,10,8);g.scale(sx,sy,sz);g.translate(x,y,z);return this.add(g,hex);}
  torus(x,y,z,R,r,arc,rotZ,hex){const g=new THREE.TorusGeometry(R,r,6,14,arc);g.rotateZ(rotZ);g.translate(x,y,z);return this.add(g,hex);}
  wheel(x,y,z,R,hex,rim){this.cylZ(z-R*.06,z+R*.06,R,x,y,hex,16);this.cylZ(z-R*.1,z+R*.1,R*.14,x,y,rim,8);return this;}   // roue pleine, moyeu
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.C,3));g.computeBoundingBox();g.computeBoundingSphere();return g;}
}
const tintHex=(hex,k)=>{const c=new THREE.Color(hex);const t=k>0?1:0,a=Math.abs(k);c.r+=(t-c.r)*a;c.g+=(t-c.g)*a;c.b+=(t-c.b)*a;return c.getHex();};


// (V12.3 : plus de modèles convertis à la place du dessin — ils étaient déformés par la réduction ; toute arme est générée ici, d'après sa conception)
// D : la conception calculée (world.W(id)) — p, mods, COL, Dc, P, wallx, have, rocket, barrels, shield, feed, pistol
export function gunModel(D,{inhand=false}={}){
  const p=D.p,A=ACTIONS[p.action]||{},ms=new Set(D.mods||[]);const G=layout(D);
  const F=FINISHES[p.finish]||FINISHES.bleui;const M0=F.m[0],M1=F.m[1],M2=F.m[2],W1=F.w[0],W2=F.w[1];const METAL=M1,DARK=M2,WOOD=W1,WOOD2=W2;
  const d=p.d,Dc=D.Dc||d*(D.pistol?1.25:1.45),COL=D.COL,wall=d*(.35+.00075*D.P)*(D.wallx||1),Dout=d+2*wall;
  const RH=Math.max(Dc*3.2+6,Dout*1.8),r2=RH/2,bw=Math.max(2.2,Dout),R0=G.rs,Rw=G.act,B0=G.b0,L=p.L,m0=G.m0;
  const B=new Build();const out={};
  const crew=G.crewGun,howi=!!A.howitzer||ms.has('roues');
  // hauteur de l'axe au-dessus du sol pour ce qui se pose (affût, trépied, bipied)
  const gh=A.mortar&&!howi?60:howi?Math.max(70,ms.has('roues')&&!A.howitzer?Math.max(90,RH*1.6):Dout*2.6):ms.has('trepied')?Math.max(100,Dout*5+40):ms.has('bipied')?Math.max(40,r2*2.2):0;
  out.gh=gh;const gy=-gh;   // le sol est à Y = -gh
  // ---------- le tube lance-fusée
  if(D.rocket&&A.mortar)return battery(B,D,F,out);
  if(D.rocket){const Lt=G.stock+G.act+p.L,bwr=Math.max(4,d*1.25*1.1),rr=bwr/2;const tubes=Math.min(12,D.barrels||1);
    const offs=[[0,0]];if(tubes>1)for(let n=1;n<tubes;n++){const row=Math.ceil(n/2),side=n%2?1:-1;offs.push([side*row*bwr*.76,0]);}
    for(const [oz,oy] of offs){B.cylX(0,Lt,rr,rr,oy,oz,METAL,12);B.cylX(-bwr*.4,0,rr*1.5,rr,oy,oz,DARK,10);B.cylX(Lt-2,Lt+.5,rr*.9,rr*.9,oy,oz,'#171c1d',10);
      for(const f of [.2,.55,.97])B.cylX(Lt*f-2.5,Lt*f+2.5,rr*1.12,rr*1.12,oy,oz,DARK,10);}
    // la poignée, l'épaulière
    B.poly([[Lt*.4,-rr],[Lt*.4+r2*1.05,-rr],[Lt*.4+r2*.6,-rr-r2*2.1],[Lt*.4-r2*.3,-rr-r2*2.0]],-r2*.45,r2*.45,WOOD);
    B.box(Lt*.55-1,Lt*.55+1.2,rr,rr+7,-1,1,'#c9cdd2');
    const tipc=new THREE.Color('#c07a3e').getHex();B.cylX(Lt,Lt+bwr*1.1,rr*.8,.6,0,0,tipc,10);
    if(crew&&ms.has('trepied'))tripod(B,Lt*.45,-rr,gy,DARK,M1,d);
    out.muzzleX=Lt+bwr;out.L=Lt+bwr;out.gh=gh;return finish(B,out);}
  // ---------- le mortier : un tube incliné sur sa plaque, tenu par un bipied
  if(A.mortar&&!howi){const Lt=Math.max(120,G.stock+G.act+L),an=66*PI/180,r=Math.max(bw/2,d*.6),by=gy+6;
    B.cylY(gy,gy+6,Math.max(40,Lt*.22),Math.max(40,Lt*.22)*.95,0,0,F.m[2],20);
    const tip=[Math.cos(an)*Lt,by+Math.sin(an)*Lt,0];B.rod([0,by,0],tip,r,F.m[1],12);B.sphere(0,by,0,r*1.25,F.m[2]);
    B.rod([Math.cos(an)*Lt*.62,by+Math.sin(an)*Lt*.62,0],[Math.cos(an)*Lt*.62+Lt*.3,gy+2,Lt*.22],Math.max(1.6,d*.25),F.m[2]);B.rod([Math.cos(an)*Lt*.62,by+Math.sin(an)*Lt*.62,0],[Math.cos(an)*Lt*.62+Lt*.3,gy+2,-Lt*.22],Math.max(1.6,d*.25),F.m[2]);
    out.gh=-gy;out.muzzleX=tip[0];out.L=Lt;out.mortar=true;return finish(B,out);}
  // ---------- l'affût
  if(howi)carriage(B,D,G,gy,r2,F,out);
  else if(ms.has('trepied'))tripod(B,R0+Rw*.6,-r2,gy,DARK,M1,d);
  if(ms.has('bipied')&&!inhand){const lx=B0+L*.62;B.rod([lx,-bw*.3,0],[lx-18,gy+2,-22],Math.max(1.4,d*.3),DARK);B.rod([lx,-bw*.3,0],[lx-18,gy+2,22],Math.max(1.4,d*.3),DARK);B.sphere(lx,-bw*.3,0,3,M1);for(const s of [-22,22])B.box(lx-22,lx-14,gy,gy+3,s-3,s+3,'#15181b');}
  // ---------- la crosse
  const S=G.stock,T=G.ST,zs=r2*.62;   // demi-épaisseur latérale de la crosse
  if(crew){B.box(0,S,-r2*.7,r2*.7,-r2*.7,r2*.7,METAL);for(const o of [-1,1])B.box(-3,4,o*r2*.9-3,o*r2*.9+3,-4,4,DARK);B.box(-5,1,-r2*1.5,r2*1.5,-r2*.35,r2*.35,WOOD);}
  else if(T==='squelette'||T==='pliante'){const top=-r2*.7,bot=(T==='pliante'?r2*1.1:r2*2.6);const r=Math.max(1.4,r2*.2);
    const pts=[[S,-r2*.5],[2,top],[2,bot],[S*.55,r2*1.1],[S,r2*.6]];
    for(const z of [-zs*.5,zs*.5])for(let i=0;i<pts.length-1;i++)B.rod([pts[i][0],-pts[i][1],z],[pts[i+1][0],-pts[i+1][1],z],r,METAL);
    B.box(0,4,-bot,-top,-zs*.6,zs*.6,'#1d1d1f');if(T==='pliante')B.cylZ(-zs*.8,zs*.8,r2*.45,S,0,M1);}
  else if(T==='bullpup'){const Lb=B0+G.act*.15;B.poly([[0,r2*1.1],[Lb,r2*1.1],[Lb,-r2*1.2],[G.rs+G.act*.35,-r2*1.3],[G.rs,-r2*2.6],[0,-r2*2.4]],-zs,zs,M1);B.box(-2,2,-r2*2.4,r2*1.1,-zs,zs,'#1d1d1f');}
  else if(T!=='sans'){ // bois plein : la crosse galbée et le talon
    B.poly([[0,r2*1.15],[S*.5,r2*1.05],[S,r2*.85],[S,-r2*.9],[S*.72,-r2*1.1],[S*.52,-r2*1.55],[S*.25,-r2*2.6],[0,-r2*3.25]],-zs,zs,WOOD);
    B.box(-1,3,-r2*3.25,r2*1.15,-zs*1.02,zs*1.02,'#2a1a0e');}
  // ---------- la boîte de culasse
  B.box(R0,R0+Rw,-r2,r2,-r2*.72,r2*.72,METAL);B.box(R0,R0+Rw,r2*.92,r2*1.02,-r2*.5,r2*.5,tintHex(METAL,.25));
  const act=p.action;
  if(act==='verrou'||act==='culasse'){const hx=R0+Rw*.66;B.rod([hx,r2*.1,r2*.72],[hx+r2*.5,-r2*1.35,r2*1.4],Math.max(.9,r2*.11),'#cfd4d9');B.sphere(hx+r2*.55,-r2*1.45,r2*1.45,Math.max(2.2,r2*.32),'#dfe3e6');}
  else if(act==='bascule'){B.sphere(R0+Rw*.87,-r2*.1,r2*.75,Math.max(2.4,r2*.34),'#d5a94f');B.rod([R0+Rw*.7,r2*.85,0],[R0+Rw*.82,r2*1.35,0],1,'#d5d9dc');B.rod([R0+Rw*.82,r2*1.35,0],[R0+Rw*.94,r2*.85,0],1,'#d5d9dc');}
  else{B.box(R0+Rw*.42,R0+Rw*.7,r2*.05,r2*.55,r2*.72,r2*.76,'#0c0e10');B.box(R0+Rw*.76,R0+Rw*.76+Math.max(4,r2*.7),r2*.6,r2*.6+Math.max(2,r2*.28),r2*.4,r2*.7,'#c9cdd2');}
  if(act==='levier'){const lx=R0+Rw*.1;B.rod([lx,-r2,r2*.75],[lx-r2*.6,-r2*2.6,r2*.75],Math.max(.9,r2*.12),M1);B.rod([lx-r2*.6,-r2*2.6,r2*.75],[lx+r2*1.4,-r2*1.2,r2*.75],Math.max(.9,r2*.12),M1);}
  if(act==='gaz'){const gx0=B0+L*.08,gl=L*.52;B.cylX(gx0,gx0+gl,r2*.32,r2*.32,r2*1.4,0,METAL,8);}
  if(act==='recul'){for(const f of [.18,.3,.42,.54])B.box(R0+Rw*f,R0+Rw*f+Rw*.06,-r2*.85,r2*.85,r2*.72,r2*.78,'#c9cdd2');}
  // ---------- la poignée pistolet et le pontet
  {const gx=G.bull?B0-r2*.4:R0+Rw*.14,top=-r2*.9,h=r2*2.1,w=r2*1.05;
    if(!(crew&&howi)){B.poly([[gx,top],[gx+w,top],[gx+w*.55,top-h],[gx-w*.45,top-h*.9]],-r2*.4,r2*.4,crew?METAL:WOOD);
      B.torus(gx+w*1.55,top+r2*.05,0,r2*.62,Math.max(.6,r2*.07),PI,PI,M2);B.rod([gx+w*1.5,top,0],[gx+w*1.4,top-r2*.5,0],Math.max(.6,r2*.09),'#bfc5ca');}}
  // ---------- le chargeur
  magazine(B,D,G,r2,F,inhand,gy,COL,Dc);
  // ---------- le canon
  const TP=p.tube||'droit';
  if(A.multi){const show=Math.min(6,D.barrels||A.multi||4);for(let q=0;q<show;q++){const a=q/show*PI*2;B.cylX(B0,B0+L,bw*.36,bw*.36,Math.cos(a)*bw*.62,Math.sin(a)*bw*.62,METAL,8);}
    for(const f of [.05,.5,.95])B.cylX(B0+L*f-2.5,B0+L*f+2.5,bw*1.05,bw*1.05,0,0,DARK,12);}
  else if(A.mortar&&!howi){}
  else if(TP==='conique')B.cylX(B0,B0+L,bw*.68,bw*.38,0,0,METAL,14);
  else{B.cylX(B0,B0+L,bw/2,bw/2,0,0,tintHex(METAL,.04),14);
    if(TP==='lourd')for(const [f,w2] of [[.02,.2],[.27,.12],[.55,.09]])B.cylX(B0+L*f,B0+L*(f+w2),bw*.82,bw*.82,0,0,'#1c2024',14);
    if(TP==='refroidi'){B.cylX(B0,B0+L*.72,bw*1.15,bw*1.15,0,0,'#262b2f',14);for(let gx=B0+bw;gx<B0+L*.68;gx+=bw*1.5)B.sphere(gx,bw*.1,bw*1.1,bw*.22,'#0b0d0e',1,.7,.4);}}
  if(ms.has('cannelures')&&!A.multi){const n=Math.max(2,Math.floor(L/(d*8)));for(let k=0;k<n;k++){const a0=B0+L*.12+k*L*.7/n;B.cylX(a0,a0+L*.7/n*.8,bw*.56,bw*.56,0,0,'#0c0e10',10);}}
  if(ms.has('ailettes')){const n=Math.max(6,Math.floor(L*.45/(d*.9)));for(let k=0;k<n;k++){const fx=B0+L*.08+k*L*.45/n;B.cylX(fx,fx+Math.max(1.2,d*.35),bw*1.6,bw*1.6,0,0,k%2?'#c46d38':'#e0a070',12);}}
  // le garde-main : bois, métal ajouré, ou rien sur une pièce
  if(!crew&&!A.mortar){const hw=L*(A.auto?.36:.42),hr=r2*.78;
    if(act==='pompe')B.cylX(B0+L*.18,B0+L*.18+hw*.7,hr*.85,hr*.85,0,0,WOOD,12);
    else if(A.auto)B.cylX(B0,B0+hw,hr,hr,0,0,M1,12);
    else B.cylX(B0,B0+hw,hr,hr*.92,0,0,WOOD,12);
    if(D.feed?.tube&&p.mag>1){const tl=Math.min(L*.88,p.mag*COL*.95+10),tr=Math.max(1,Dc*1.1/2);B.cylX(B0,B0+tl,tr,tr,-bw/2-tr,0,METAL,8);}}
  // guidon, hausse
  B.box(m0-4,m0-2,bw/2,bw/2+5,-.8,.8,'#d6dade');
  if(!ms.has('lunette')&&!ms.has('reflex'))B.box(R0+Rw*.93,R0+Rw*.93+5,r2,r2+3,-2,2,'#d6dade');
  // ---------- la bouche
  const dev=G.dev;
  if(ms.has('manchon')){const hh=Math.max(bw*2.3,7)*Math.pow((p.supVol??250)/250,.2);B.cylX(m0,m0+dev,hh/2,hh/2,0,0,METAL,14);const nb=Math.round(p.supBaffles??5)+1;for(let k=1;k<nb;k++)B.cylX(m0+dev*k/nb-.4,m0+dev*k/nb+.4,hh/2+.3,hh/2+.3,0,0,'#0c0e10',14);}
  else if(ms.has('frein')){const hh=Math.max(bw*1.7,5);B.box(m0,m0+dev,-hh/2,hh/2,-hh/2,hh/2,METAL);for(let k=1;k<4;k++)B.box(m0+dev*k/4-1.4,m0+dev*k/4+.6,hh/2-.3,hh/2+.2,-hh*.3,hh*.3,'#0c0e10');}
  else if(ms.has('cacheflamme')){B.cylX(m0,m0+dev*.3,bw/2+1,bw/2+1,0,0,METAL,10);for(const o2 of [-1,-.33,.33,1])B.box(m0+dev*.3,m0+dev,o2*bw*.42-.7,o2*bw*.42+.7,-bw*.5,bw*.5,METAL);}
  if(ms.has('baionnette')&&!crew){const by=-bw*.9,bl=G.bay;B.box(m0-G.bay*.25,m0-G.bay*.25+8,by-2,by+2,-2,2,DARK);B.poly([[m0-G.bay*.25+6,by+1.8],[m0-G.bay*.25+6+bl,by],[m0-G.bay*.25+6,by-2.2]],-.9,.9,'#d8dde1');}
  // ---------- l'infrarouge, les visées
  if(ms.has('infrarouge')){const W=Math.max(10,Math.min(150,p.irW??35)),q=p.irQ??1;const tw=Math.max(COL*3.4,Rw*1.2),th=Math.max(7,(d*2.8+6))*(.85+q*.15),ty=r2+th/2+(ms.has('lunette')?th+6:6);
    B.cylX(R0,R0+tw,th/2,th/2,ty,0,'#2e3a33',12);B.cylX(R0-th*.5,R0,th*.42,th*.5,ty,0,'#161a18',10);const lr=Math.max(6,th*.85*Math.sqrt(W/35));B.cylX(R0+tw*.62,R0+tw*.62+lr*2.4,lr,lr,ty+lr*1.6,0,'#3a4640',12);B.cylX(R0+tw*.62+lr*2.4,R0+tw*.62+lr*2.45,lr*.9,lr*.9,ty+lr*1.6,0,'#1a0a0c',12);}
  if(ms.has('lunette')){const lw=Math.max(COL*3,Rw*1.1),lh=Math.max(5,(d*2.2+4)),ly=r2+lh/2+5,lx=R0+Rw*.05;
    B.cylX(lx,lx+lw,lh/2,lh/2,ly,0,METAL,12);B.cylX(lx+lw*.78,lx+lw,lh*.75,lh*.6,ly,0,METAL,12);B.cylX(lx-lw*.04,lx+lw*.12,lh*.6,lh*.5,ly,0,METAL,12);B.cylX(lx+lw,lx+lw+1.5,lh*.55,lh*.55,ly,0,'#3aa89a',12);
    B.box(lx+lw*.25-2,lx+lw*.25+2,r2,ly-lh/2,-2,2,DARK);B.box(lx+lw*.62-2,lx+lw*.62+2,r2,ly-lh/2,-2,2,DARK);B.box(lx+lw*.45,lx+lw*.45+lh*.5,ly+lh*.45,ly+lh*.9,-lh*.22,lh*.22,DARK);}
  else if(ms.has('reflex')){const lw=Math.max(8,Rw*.35),lh=Math.max(6,r2*1.1),lx=R0+Rw*.45;B.box(lx,lx+lw,r2,r2+lh*.35,-lh*.4,lh*.4,METAL);B.box(lx+lw*.15,lx+lw*.15+1,r2+lh*.35,r2+lh,-lh*.4,lh*.4,'#78dcc8');}
  if(ms.has('poignee')){const gx2=B0+L*.25;B.cylY(-r2*.75,-r2*3.3,r2*.36,r2*.44,gx2,0,METAL,10);}
  // ---------- le bouclier
  // la plaque se dresse du sol (Y = gy) à sa hauteur h, sur sa largeur w : exactement ce que le combat protège ; le tube passe par une fente s'il est plus bas que le bord
  if(ms.has('bouclier')&&!inhand){const Sh=D.shield||{h:.2,w:.09,t:1.8,mat:'acier'},Mt=Sh.mat==='acier'?null:MATS[Sh.mat];const sx=B0+Math.min(L*.2,40),hh=Sh.h*1000,ww=Sh.w*1000/2,th=Math.max(1.5,Sh.t*1.2);
    const col=Mt?Mt.col:M1;const bot=gy,top=gy+hh;B.box(sx,sx+th,bot,top,-ww,ww,col);B.box(sx-1,sx+th*.4,bot+2,top-2,-ww*.98,ww*.98,tintHex(col,.3));
    if(top>5)B.box(sx+th,sx+th+3,-5,5,-Math.min(ww*.3,bw*1.5),Math.min(ww*.3,bw*1.5),'#0d0f10');out.shield={x:sx,top,bot,ww};}
  out.muzzleX=m0+dev;out.L=m0+dev+(ms.has('baionnette')?G.bay*.6:0);return finish(B,out);
}
function finish(B,out){out.geo=B.geo();return out;}
// Une batterie de fusées : la grappe de tubes lisses, élevée à 40°, tenue par un berceau sur un affût à deux roues, sa flèche à bêche et son vérin.
function battery(B,D,F,out){const p=D.p,d=p.d,n=Math.min(12,D.barrels||1),bw=Math.max(5,d*1.3),rr=bw/2,Lt=Math.max(p.L,p.l*1.25)+bw*.5;
  const M1=F.m[1],DARK=F.m[2],WOOD=0x6a4424,R=Math.max(70,Lt*.24),gy=-(R+25),ang=40*PI/180,px=Lt*.34,cols=Math.ceil(n/2),rows=n>1?2:1;
  const xf=new THREE.Matrix4().makeTranslation(px,0,0).multiply(new THREE.Matrix4().makeRotationZ(ang)).multiply(new THREE.Matrix4().makeTranslation(-px,0,0));
  B.xf=xf;
  for(let i=0;i<n;i++){const c=i%cols,r=(i/cols)|0;const z=(c-(cols-1)/2)*bw*1.14,y=rows===1?0:(r?1:-1)*bw*.57;
    B.cylX(0,Lt,rr,rr,y,z,M1,14);B.cylX(Lt-4,Lt+1,rr*.94,rr*.94,y,z,'#171c1d',12);B.cylX(-bw*.35,0,rr*1.35,rr,y,z,DARK,12);}
  for(const f of [.22,.78])B.box(Lt*f-4,Lt*f+4,-bw*1.22,bw*1.22,-cols*bw*.6,cols*bw*.6,DARK);
  B.box(-bw*.3,Lt*.25,-bw*1.45,-bw*1.15,-cols*bw*.62,cols*bw*.62,tintHex(M1,-.1));   // le berceau, sous la grappe
  B.xf=null;
  const zw=cols*bw*.62+R*.28;
  B.cylZ(-zw,zw,Math.max(3,R*.06),px,gy+R,DARK,10);                                    // l'essieu
  for(const z of [-zw,zw])B.wheel(px,gy+R,z,R,WOOD,0x23272b);
  B.rod([px,gy+R,0],[px-Lt*.72,gy+5,0],Math.max(4,R*.07),DARK,8);B.box(px-Lt*.72-12,px-Lt*.72+8,gy-2,gy+10,-zw*.6,zw*.6,DARK); // la flèche et sa bêche
  B.rod([px,gy+R,0],[px-Lt*.12,-bw*1.2,0],Math.max(3,R*.05),M1,8);                      // le vérin d'élévation
  const tip=(Lt-px);out.muzzleX=px+tip*Math.cos(ang);out.muzzleY=tip*Math.sin(ang);out.L=Lt*1.05;out.gh=-gy;out.battery=true;return finish(B,out);}

function tripod(B,hx,hy,gy,DARK,M1,d){const r=Math.max(2.4,d*.5);B.rod([hx,hy,0],[hx+(hy-gy)*.95,gy,0],r,DARK);B.rod([hx,hy,0],[hx-(hy-gy)*.6,gy,(hy-gy)*.95],r,DARK);B.rod([hx,hy,0],[hx-(hy-gy)*.6,gy,-(hy-gy)*.95],r,DARK);B.box(hx-7,hx+7,hy-3,hy+5,-7,7,M1);B.sphere(hx,hy+1,0,2.5,DARK);}
function magazine(B,D,G,r2,F,inhand,gy,COL,Dc){
  const p=D.p,A=ACTIONS[p.action]||{},mag=p.mag,M1=F.m[1],M2=F.m[2];const feed=p.feed||(A.auto&&mag>=50?'bande':p.action==='pompe'||p.action==='levier'?'tube':mag>40?'tambour':mag>12?'courbe':'boite');
  if(mag<=1||A.mortar||feed==='tube'||feed==='interne')return;
  const mx0=G.bull?G.rs+G.act*.25:G.rs+G.act*.55;const brass=0xc9a043;
  if(feed==='bande'){ // la caisse de bande sur le côté et les maillons qui montent à l'arme
    const bh=Math.max(11,Math.min(40,mag*.12*4)),bw2=Math.max(16,COL*1.8);
    if(!inhand){B.box(mx0-bw2*.6,mx0+bw2*.4,-r2*1.4-bh,-r2*1.4,r2*.9,r2*.9+bw2*.7,'#4f5a3a');for(let k=0;k<7;k++){const q=k/6;B.cylZ(r2*.72+q*r2*.3,r2*.72+q*r2*.3+Math.max(2,Dc*1.1),Math.max(1,COL*.12),mx0-q*8,-r2*(.3+q*1.1),brass,6);}}
    else for(let k=0;k<4;k++)B.cylX(mx0-k*COL*.35-COL*.5,mx0-k*COL*.35+COL*.5,Dc*.5,Dc*.5,-r2-k*Dc*1.3,0,brass,6);return;}
  if(feed==='plateau'){const rr=Math.max(8,Math.sqrt(mag)*Dc*.9);B.cylY(r2+rr*.05,r2+rr*.36,rr,rr,mx0+rr*.2,0,M1,18);B.cylY(r2+rr*.36,r2+rr*.46,rr*.14,rr*.14,mx0+rr*.2,0,M2,8);return;}
  if(feed==='helicoidal'){const L2=Math.max(24,Math.min(100,mag*Dc*.24)),H=Math.max(6,Dc*3);B.cylX(mx0-L2*.2,mx0+L2*.8,H/2,H/2,r2+H/2+3,0,M1,12);return;}
  if(feed==='tremie'){const H=Math.max(14,Math.min(60,Math.sqrt(mag)*Dc*1.4)),W=Math.max(14,Math.min(70,COL*2.4));B.poly([[mx0-W*.58,r2+H],[mx0+W*.58,r2+H],[mx0+W*.28,r2],[mx0-W*.28,r2]],-W*.4,W*.4,M1);return;}
  if(feed==='tambour'){const rr=Math.max(7,Math.sqrt(mag)*Dc*1.25);B.cylZ(-rr*.45,rr*.45,rr,mx0+rr*.3,-r2-rr*.95,M1,20);B.cylZ(-rr*.5,rr*.5,rr*.2,mx0+rr*.3,-r2-rr*.95,M2,8);return;}
  const mh=Math.max(7,Math.min(r2*9,mag/2*Dc*1.02+6)),mw=Math.max(5,COL*1.08);const curve=feed==='courbe'?Math.min(.72,.25+mag/100):0;
  // boîte droite ou courbe : le profil, épaissi de la largeur d'une cartouche
  B.poly([[mx0,-r2],[mx0+mw,-r2],[mx0+mw+mh*(.15+curve*.7),-r2-mh],[mx0+mh*(.15+curve*.7),-r2-mh]],-Math.max(3,Dc*.7),Math.max(3,Dc*.7),M1);
  B.box(mx0+mh*(.15+curve*.7)-1,mx0+mh*(.15+curve*.7)+mw+1,-r2-mh-1.5,-r2-mh+1.5,-Math.max(3,Dc*.7)-.5,Math.max(3,Dc*.7)+.5,M2);}
// l'affût de campagne : berceau, deux roues, flèche, bêche
function carriage(B,D,G,gy,r2,F,out){const p=D.p,M1=F.m[1],M2=F.m[2];const cx=G.rs+G.act*.8;const R=Math.max(10,(-gy)*.8);const wy=gy+R;const kind=p.carriage||'roues';const WOOD=0x6a4424;
  if(kind==='plateforme'){const W=Math.max(34,R*2.3);B.cylY(gy,gy+6,W,W*.96,cx,0,M1,22);B.cylY(gy+6,gy+6+Math.max(7,R*.42),Math.max(7,R*.42),Math.max(7,R*.42),cx,0,M1,14);B.rod([cx,gy+8,0],[cx,-r2,0],Math.max(2,r2*.25),M2);return;}
  if(kind==='traineau'){for(const z of [-R*.5,R*.5]){B.rod([cx-R*1.2,gy+1,z],[cx+R*.9,gy+1,z],Math.max(2,r2*.27),M2);B.rod([cx-R*1.2,gy+1,z],[cx-R*1.65,gy+8,z],Math.max(2,r2*.27),M2);}B.rod([cx,gy,0],[cx,-r2,0],Math.max(2,r2*.27),M2);B.box(cx-R*.55,cx+R*.6,-r2*1.4,-r2*.4,-R*.5,R*.5,M1);return;}
  // deux roues, l'essieu, la flèche (et la seconde en bifurquée)
  for(const z of [-R*.72,R*.72]){B.wheel(cx,wy,z,R,WOOD,0x23272b);}B.cylZ(-R*.72,R*.72,Math.max(2,r2*.2),cx,wy,M2,8);
  B.rod([cx,wy,0],[-G.stock*.8,gy+2,0],Math.max(2,r2*.27),M2);if(kind==='bifleche'){B.rod([cx,wy,R*.3],[-G.stock*.72,gy+6,R*.5],Math.max(2,r2*.22),M2);B.rod([cx,wy,-R*.3],[-G.stock*.72,gy+6,-R*.5],Math.max(2,r2*.22),M2);}
  B.box(G.rs,G.rs+G.act+p.L*.3,-r2*1.5,-r2*.6,-r2*.8,r2*.8,M1);B.rod([cx,wy,0],[cx,-r2,0],Math.max(2,r2*.25),M2);}


// ---------- le plateau 3D du concepteur ----------
// Un seul contexte WebGL (canevas caché) : on rend l'arme, ses servants et le sol, puis on recopie l'image dans le canevas 2D du plateau,
// là où les étiquettes et les règles restent dessinées en 2D. Glisser : tourner ; molette : rapprocher ; double clic : recentrer.
export class GunViewer{
  constructor(){
    this.r=new THREE.WebGLRenderer({antialias:true,alpha:true,premultipliedAlpha:true});this.r.setPixelRatio(1);this.r.shadowMap.enabled=true;this.r.shadowMap.type=THREE.PCFSoftShadowMap;this.r.setClearColor(0x000000,0);
    this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xfff0d6,0x4a4a3c,1.15));
    const sun=new THREE.DirectionalLight(0xffe6bd,2.3);sun.position.set(-300,520,380);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const c=sun.shadow.camera;c.left=-900;c.right=900;c.top=900;c.bottom=-900;c.near=10;c.far=2000;sun.shadow.bias=-.001;this.scene.add(sun);
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),new THREE.ShadowMaterial({opacity:.45}));this.floor.rotation.x=-PI/2;this.floor.receiveShadow=true;this.scene.add(this.floor);
    this.grid=new THREE.GridHelper(2400,24,0x6a7a80,0x3c484d);this.grid.material.transparent=true;this.grid.material.opacity=.35;this.scene.add(this.grid);
    this.holder=new THREE.Group();this.scene.add(this.holder);this.people=new THREE.Group();this.scene.add(this.people);
    this.fx=new THREE.Group();this.scene.add(this.fx);
    // (orthographique, comme la vue du jeu : deux Meumeu de 30 cm ont la même taille à l'écran, quelle que soit leur place sur le plateau)
    this.cam=new THREE.OrthographicCamera(-500,500,300,-300,1,20000);
    this.key='';this.az=-.75;this.el=.22;this.zoom=1;this.auto=true;this.lastTouch=0;this.mesh=null;this.meumeu=null;
    this.mat=new THREE.MeshPhongMaterial({vertexColors:true,shininess:55,specular:0x444444});
    this.flashMat=new THREE.MeshBasicMaterial({color:0xffc060,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});
    this.flash=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),this.flashMat);this.fx.add(this.flash);
    this.smoke=[];for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshBasicMaterial({color:0xc8c4bc,transparent:true,opacity:0,depthWrite:false}));this.fx.add(m);this.smoke.push(m);}
    // les servants du plateau : le soldat meumeu (V12.4, modèle du joueur, casque compris) ; à défaut la peluche
    loadModel('meumeu_soldat','assets3d/').catch(()=>loadModel('meumeu','assets3d/')).then(m=>{this.meumeu=m;this.key='';}).catch(()=>{});
  }
  // les gestes : on attache le canevas 2D du plateau ; ses évènements font tourner la caméra
  attach(cv){if(this.cv===cv)return;this.cv=cv;let drag=null;
    cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};this.auto=false;this.lastTouch=performance.now();cv.setPointerCapture?.(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;this.az-=(e.clientX-drag.x)*.008;this.el=Math.max(-.15,Math.min(1.25,this.el+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};this.lastTouch=performance.now();this.dirty=true;});
    const up=()=>{drag=null;};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.35,Math.min(3,this.zoom*(e.deltaY>0?1.1:.9)));this.dirty=true;},{passive:false});
    cv.addEventListener('dblclick',()=>{this.az=-.75;this.el=.22;this.zoom=1;this.auto=true;this.dirty=true;});}
  set(D){
    const key=JSON.stringify([D.p,D.mods,D.have,D.roles,D.shield,!!this.meumeu]);if(key===this.key)return;this.key=key;
    if(this.mesh){this.holder.remove(this.mesh);this.mesh.geometry.dispose();}this.people.clear();
    const m=gunModel(D);this.m=m;const mesh=new THREE.Mesh(m.geo,this.mat);mesh.castShadow=true;mesh.receiveShadow=true;this.holder.add(mesh);this.mesh=mesh;
    this.floorY=-(D.have==='epaule'&&!D.rocket?185:D.have==='bipied'?50:m.gh||100);this.floor.position.y=this.floorY;this.grid.position.y=this.floorY;
    // des Meumeu de 30 cm derrière l'arme : le tireur, le chargeur, les pourvoyeurs — tous à la même échelle, uniforme (couché : le même Meumeu, basculé)
    if(this.meumeu){const M=this.meumeu,k=300/M.ext[1];const add=(x,z,pose,tint=0xe6dcc6,yaw=PI/2)=>{const g=new THREE.Mesh(M.geo,new THREE.MeshLambertMaterial(M.mat?{map:M.mat.map,color:tint,flatShading:true}:{vertexColors:true,color:tint,flatShading:true}));g.scale.setScalar(k);g.castShadow=true;
        g.position.set(x,this.floorY,z);g.rotation.y=yaw;if(pose==='couche'){g.rotation.set(PI/2,0,0);g.rotation.order='YXZ';g.rotation.y=yaw;g.position.y=this.floorY+60;}this.people.add(g);};
      const bear=(D.roles||[]).filter(r=>r!=='tireur'&&r!=='chargeur').length;const G=layout(D);
      add(-75,0,D.have==='epaule'?'debout':D.have==='bipied'?'couche':'genou');
      if((D.roles||[]).includes('chargeur'))add(G.rs+G.act*.5,110,'genou',0xdcd2bc,PI/2);
      for(let i=0;i<bear;i++)add(-160-i*120,(i%2?1:-1)*70,'debout',0xd4d8c0);}
    const b=new THREE.Box3().setFromBufferAttribute(m.geo.attributes.position);this.box=b;
  }
  draw(x,W,H,D,t){
    this.set(D);const dpr=Math.min(2,devicePixelRatio||1);const pw=Math.max(2,Math.round(W*dpr)),ph=Math.max(2,Math.round(H*dpr));if(this.r.domElement.width!==pw||this.r.domElement.height!==ph)this.r.setSize(pw,ph,false);
    const now=performance.now();if(!this.auto&&now-this.lastTouch>9000)this.auto=true;if(this.auto)this.az+=.004;
    const m=this.m,L=m.L||400,cx=L*.42,span=Math.max(L*1.15,520);const hH=span/2/this.zoom*Math.max(1,1.6/(W/H)),hW=hH*W/H,dist=4000;
    const C=this.cam;C.left=-hW;C.right=hW;C.top=hH;C.bottom=-hH;C.updateProjectionMatrix();const cy=(this.floorY||0)*.35;
    C.position.set(cx+Math.sin(this.az)*Math.cos(this.el)*dist,cy+40+Math.sin(this.el)*dist,Math.cos(this.az)*Math.cos(this.el)*dist);C.lookAt(cx,cy+40,0);
    // le tir : recul de l'arme, éclair à la bouche, fumée, pour ce que le concepteur montre déjà en 2D
    const rec=t>0&&t<.35?Math.sin(Math.min(1,t/.35)*PI)*Math.min(26,4+(D.rk||0)*40)*(1-Math.min(1,t/.35)):0;this.holder.position.x=-rec;
    const mx=m.muzzleX||L;const fl=t>0&&t<.15&&D.flash>.02;this.flash.visible=fl;if(fl){const r=(12+D.flash*66)*(1-t/.15)*1.8;this.flash.position.set(mx-rec+r*.4,(m.muzzleY||0),0);this.flash.scale.set(r*1.6,r*.8,r*.8);}
    this.smoke.forEach((s,i)=>{const on=t>0&&t<2.2,k=t/2.2;s.visible=on;if(on){s.position.set(mx+10+i*14+k*70,(m.muzzleY||0)+k*60+i*5,0);const rr=6+k*28+i*3;s.scale.setScalar(rr);s.material.opacity=.4*(1-k);}});
    this.r.render(this.scene,this.cam);x.drawImage(this.r.domElement,0,0,W,H);
  }
}
