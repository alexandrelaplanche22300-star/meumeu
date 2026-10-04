// Les bâtiments faits par le code (V12.4, tous depuis V12.5 sauf le moulin) : un modèle distinct par bâtiment, à la taille exacte de son empreinte (une case = une unité).
// Avant, dix modèles convertis se partageaient vingt-trois bâtiments (la caserne reprenait le centre-ville, cinq bâtiments l'entrepôt, trois la forge…).
// Repère : x vers la droite, z vers la caméra (la façade, la porte, les fenêtres sont du côté +Z et +X, ceux que l'on voit), y vers le haut, centré en x et z.
import * as THREE from './lib/three.module.js';
import {BUILDINGS} from './data.js';

const PI=Math.PI;
const PAL={bois:0x9a6a3a,boisSombre:0x6a4426,boisClair:0xc89a5a,chaume:0xcfae58,pierre:0x9c988c,pierreSombre:0x6f6c64,brique:0xa4513c,briqueSombre:0x5e463c,
  creme:0xe6dcc0,blanc:0xece7da,toitVert:0x2f6f55,ardoise:0x4a5560,rouille:0x7a4a30,metal:0x5a5e60,metalClair:0x9ea4a8,sable:0xc4a874,olive:0x6b7048,
  verre:0x35505e,rouge:0xb83a2c,jaune:0xd9b23a,feu:0xff9a3a,noir:0x23201e,violet:0x6a5a86,cuivre:0x4f9a86,beton:0x8d9088};

class Build{
  constructor(){this.parts=[];}
  add(g,hex){g=g.index?g.toNonIndexed():g;const n=g.attributes.position.count,c=new THREE.Color(hex),a=new Float32Array(n*3);for(let i=0;i<n;i++){a[3*i]=c.r;a[3*i+1]=c.g;a[3*i+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(a,3));if(g.attributes.uv)g.deleteAttribute('uv');this.parts.push(g);return this;}
  // un parallélépipède posé sur y (centré en x, z)
  box(x,y,z,w,h,d,hex){const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y+h/2,z);return this.add(g,hex);}
  // un toit à deux pans : faîtage le long de x (axe 'x') ou de z, posé sur y, débord ov
  gable(x,y,z,w,d,h,hex,axe='x',ov=.08){const a=(axe==='x'?w:d)/2+ov,b=(axe==='x'?d:w)/2+ov;const P=[];
    // les extrémités du faîtage (±a) et les bords des pans (±b)
    const V=(u,v,hh)=>axe==='x'?[x+u,y+hh,z+v]:[x+v,y+hh,z+u];
    const tri=(p,q,r)=>P.push(...p,...q,...r);
    tri(V(-a,-b,0),V(-a,b,0),V(-a,0,h));tri(V(a,b,0),V(a,-b,0),V(a,0,h));
    tri(V(-a,-b,0),V(-a,0,h),V(a,0,h));tri(V(-a,-b,0),V(a,0,h),V(a,-b,0));
    tri(V(-a,b,0),V(a,b,0),V(a,0,h));tri(V(-a,b,0),V(a,0,h),V(-a,0,h));
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));return this.add(g,hex);}
  cyl(x,y,z,r0,r1,h,hex,seg=10){const g=new THREE.CylinderGeometry(r1,r0,h,seg);g.translate(x,y+h/2,z);return this.add(g,hex);}
  cone(x,y,z,r,h,hex,seg=8){const g=new THREE.ConeGeometry(r,h,seg);g.translate(x,y+h/2,z);return this.add(g,hex);}
  dome(x,y,z,r,hex){const g=new THREE.SphereGeometry(r,10,6,0,PI*2,0,PI/2);g.translate(x,y,z);return this.add(g,hex);}
  // une tige entre deux points
  rod(a,b,r,hex){const v=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=v.length();if(L<1e-6)return this;const g=new THREE.CylinderGeometry(r,r,L,5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));g.translate((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);return this.add(g,hex);}
  // des fenêtres sur la façade avant (+Z, à zf) et sur le côté droit (+X, à xf)
  winsZ(zf,y,xs,w,h,hex=PAL.verre){for(const x of xs)this.box(x,y,zf+.012,w,h,.03,hex);return this;}
  winsX(xf,y,zs,w,h,hex=PAL.verre){for(const z of zs)this.box(xf+.012,y,z,.03,h,w,hex);return this;}
  geo(){let n=0;for(const g of this.parts)n+=g.attributes.position.count;const pos=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
    for(const g of this.parts){pos.set(g.attributes.position.array,o*3);col.set(g.attributes.color.array,o*3);o+=g.attributes.position.count;}
    const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('color',new THREE.BufferAttribute(col,3));out.computeVertexNormals();out.computeBoundingBox();return out;}
}
const slab=(B,W,D,hex=PAL.pierre,h=.1)=>B.box(0,0,0,W,h,D,hex);
const sacks=(B,x,z,n=3)=>{for(let k=0;k<n;k++)B.box(x+k*.18,.1,z+(k%2)*.1,.16,.14,.12,PAL.sable);};
const crates=(B,x,z,hex=PAL.boisClair)=>{B.box(x,.1,z,.2,.18,.2,hex);B.box(x+.22,.1,z+.02,.18,.14,.18,PAL.bois);B.box(x+.08,.28,z+.02,.16,.14,.16,hex);};
const flag=(B,x,z,hex)=>{B.cyl(x,.1,z,.025,.025,1.7,PAL.metalClair,5);B.box(x+.17,1.38,z,.3,.2,.02,hex);};

// ---------- les bâtiments ----------
const MAKERS={
  // la caserne : un long bâtiment de brique, toit vert, perron, drapeau, sacs de sable devant la porte
  caserne:(W,D)=>{const B=new Build();slab(B,W,D);const bw=W*.9,bd=D*.58;B.box(0,.1,-D*.12,bw,.8,bd,0xb59a6a);B.gable(0,.9,-D*.12,bw,bd,.5,PAL.toitVert,'x');
    B.box(0,.1,D*.28,.9,.95,.5,PAL.pierre);B.gable(0,1.05,D*.28,.9,.5,.36,PAL.ardoise,'z');B.box(0,.1,D*.28+.26,.36,.62,.04,PAL.noir);
    B.winsZ(-D*.12+bd/2,.45,[-1.0,-.6,.6,1.0].map(v=>v*W/3),.22,.26);B.winsX(bw/2,.45,[-.7,-.2,.35].map(v=>v*D/3-D*.1),.22,.26);
    flag(B,W*.42,D*.36,PAL.rouge);for(let k=0;k<3;k++)B.box(-.55+k*.2,.1,D*.42,.18,.12,.1,PAL.sable);B.cyl(-W*.4,.1,D*.36,.05,.05,.18,PAL.metal,6);return B.geo();},
  // la caserne d'élite : sombre, deux tourelles d'angle, bannière violette
  caserne_elite:(W,D)=>{const B=new Build();slab(B,W,D,PAL.pierreSombre);const bw=W*.86,bd=D*.56;B.box(0,.1,-D*.1,bw,.9,bd,0x8c8498);B.gable(0,1.0,-D*.1,bw,bd,.42,PAL.noir,'x');
    for(const sx of [-1,1]){B.cyl(sx*bw*.5,.1,D*.18,.3,.3,1.25,0x7a728a,10);B.cone(sx*bw*.5,1.35,D*.18,.38,.42,PAL.noir,10);}
    B.box(0,.1,D*.3,.8,1.0,.45,PAL.pierreSombre);B.box(0,.1,D*.3+.24,.34,.66,.04,PAL.noir);B.winsZ(-D*.1+bd/2,.5,[-.7,-.35,.35,.7].map(v=>v*W/3),.18,.3,0x2a2832);
    B.box(0,1.15,D*.3+.24,.5,.5,.03,PAL.violet);B.box(0,1.62,D*.3+.24,.3,.12,.03,PAL.jaune);B.winsX(bw/2,.5,[-.5,0,.45].map(v=>v*D/3),.2,.3,0x2a2832);return B.geo();},
  // le grenier : une grange sur pilotis, un silo rond, des sacs
  grenier:(W,D)=>{const B=new Build();slab(B,W,D,0x7c8a5a,.05);for(const [x,z] of [[-.55,-.45],[.55,-.45],[-.55,.4],[.55,.4]])B.cyl(x,.05,z,.07,.07,.2,PAL.boisSombre,6);
    B.box(-.1,.25,0,W*.62,.62,D*.72,0xb08a52);B.gable(-.1,.87,0,W*.62,D*.72,.4,PAL.chaume,'x');B.box(-.1,.25,D*.36+.01,.3,.46,.04,PAL.boisSombre);
    B.cyl(W*.33,.05,-D*.2,.34,.34,1.1,0xd9d0b0,12);B.cone(W*.33,1.15,-D*.2,.4,.4,0x8a4a2a,12);B.box(W*.33,.4,-D*.2+.35,.12,.5,.03,PAL.boisSombre);
    sacks(B,-.7,D*.42);sacks(B,.1,D*.44,2);return B.geo();},
  // la gare : bâtiment de brique, tour de l'horloge, quai couvert
  gare:(W,D)=>{const B=new Build();slab(B,W,D,PAL.pierre,.08);const bw=W*.86,bd=D*.4;B.box(-.1,.08,-D*.28,bw,.75,bd,PAL.brique);B.gable(-.1,.83,-D*.28,bw,bd,.34,PAL.ardoise,'x');
    B.box(W*.3,.08,-D*.28,.5,1.3,.5,PAL.brique);B.cone(W*.3,1.38,-D*.28,.4,.5,PAL.toitVert,4);B.box(W*.3,1.0,-D*.28+.26,.24,.24,.03,PAL.blanc);
    B.winsZ(-D*.28+bd/2,.4,[-.9,-.5,-.1,.3].map(v=>v*W/3.4),.2,.28);B.box(-.1,.08,D*.2,bw,.05,D*.34,0xb5b0a4);
    for(const x of [-1,-.3,.4,1].map(v=>v*W/3.4))B.cyl(x,.1,D*.34,.04,.04,.7,PAL.metal,6);B.box(-.1,.8,D*.2,bw+.1,.05,D*.46,PAL.toitVert);return B.geo();},
  // l'entrepôt : un grand hangar à deux pans, grande porte coulissante, caisses empilées
  entrepot:(W,D)=>{const B=new Build();slab(B,W,D,0x8a8c7e);B.box(-.12,.1,-.1,W*.78,.9,D*.66,0xa8a08a);B.gable(-.12,1.0,-.1,W*.78,D*.66,.5,PAL.rouille,'x');
    B.box(-.12,.1,D*.23+.01,1.0,.72,.04,PAL.boisSombre);B.box(-.12,.1,D*.23+.03,.04,.72,.03,PAL.metalClair);B.winsX(W*.39-.12,.6,[-.5,.2,.7].map(v=>v*D/3),.2,.18);
    crates(B,W*.36,D*.36);crates(B,W*.36+.3,D*.4,PAL.bois);crates(B,-W*.42,D*.38);B.box(-W*.28,.1,D*.44,.5,.06,.4,PAL.boisSombre);return B.geo();},
  // l'arsenal : un blockhaus de béton, lourde porte d'acier, caisses de munitions, antenne
  arsenal:(W,D)=>{const B=new Build();slab(B,W,D,0x7a7d74,.08);B.box(0,.08,-.1,W*.82,.75,D*.68,PAL.beton);B.gable(0,.83,-.1,W*.82,D*.68,.26,0x5a5f58,'x',.04);
    B.box(0,.08,D*.24+.01,.62,.6,.05,PAL.metal);B.box(0,.08,D*.24+.04,.62,.05,.03,PAL.jaune);B.box(0,.4,D*.24+.04,.62,.05,.03,PAL.jaune);
    for(let k=0;k<3;k++)B.box(W*.34,.08+k*.13,D*.3,.3,.12,.2,PAL.olive);B.box(-W*.34,.08,D*.34,.5,.14,.1,PAL.sable);B.box(-W*.34,.22,D*.34,.4,.12,.1,PAL.sable);
    B.cyl(-W*.32,.83,-.3,.025,.025,.8,PAL.metalClair,5);B.winsX(W*.41,.5,[-.3,.15],.16,.12,0x2a2f2a);return B.geo();},
  // le bureau d'études : bâtiment clair aux grandes vitres et sa coupole de cuivre
  armurerie:(W,D)=>{const B=new Build();slab(B,W,D,0xb5ae98,.06);B.box(0,.06,-.1,W*.8,.8,D*.6,PAL.creme);B.gable(0,.86,-.1,W*.8,D*.6,.36,0x2c5f6a,'x');
    B.cyl(W*.22,.86,-.28,.3,.32,.18,PAL.creme,12);B.dome(W*.22,1.04,-.28,.32,PAL.cuivre);B.cyl(W*.22,1.36,-.28,.02,.02,.2,PAL.metalClair,5);
    B.winsZ(-.1+D*.3,.3,[-.6,-.2,.2,.6].map(v=>v*W/3),.26,.46,0x4a7a9a);B.winsX(W*.4,.3,[-.4,.1].map(v=>v*D/3),.26,.46,0x4a7a9a);
    B.box(-W*.3,.06,D*.4,.5,.1,.26,PAL.boisClair);B.box(-W*.3,.16,D*.4,.44,.02,.2,0xe9e3d0);return B.geo();},
  // la manufacture : une usine à toit en dents de scie, une haute cheminée, un quai de chargement
  manufacture:(W,D)=>{const B=new Build();slab(B,W,D,0x7e7a70);const bw=W*.82,bd=D*.7;B.box(-.05,.1,-.1,bw,.8,bd,0x9b4f3b);
    for(let k=0;k<4;k++){const z=-.1-bd/2+(k+.5)*bd/4;B.box(-.05,.9,z+.12,bw,.34,.04,0xa8a090);B.gable(-.05,.9,z,bw,bd/4-.04,.34,0x3d4a52,'x',0);}
    B.cyl(W*.36,.1,-D*.34,.2,.14,2.1,0x6a3a2e,10);B.cyl(W*.36,2.2,-D*.34,.16,.17,.1,PAL.noir,10);B.winsZ(-.1+bd/2,.45,[-.9,-.5,-.1,.3,.7].map(v=>v*W/3.4),.2,.26);
    B.box(-bw/2-.1,.1,D*.28,.5,.3,.5,PAL.beton);B.box(.1,.1,D*.42,.6,.2,.3,PAL.boisSombre);return B.geo();},
  // le garage : un grand hangar de tôle, trois portes, une pompe à essence
  garage:(W,D)=>{const B=new Build();slab(B,W,D,0x8a8c84,.06);const bw=W*.86,bd=D*.62;B.box(-.1,.06,-D*.12,bw,.95,bd,0x7d8a6e);B.gable(-.1,1.01,-D*.12,bw,bd,.34,0x4e5a48,'x',.1);
    for(const x of [-.3,0,.3].map(v=>v*bw*1.0)){B.box(x-.1,.06,-D*.12+bd/2+.01,bw*.26,.72,.04,PAL.metal);B.box(x-.1,.7,-D*.12+bd/2+.03,bw*.26,.06,.03,PAL.jaune);}
    B.cyl(W*.4,.06,D*.34,.09,.09,.34,PAL.rouge,8);B.box(W*.4-.08,.4,D*.34-.05,.16,.1,.1,PAL.noir);B.box(-W*.42,.06,D*.4,.5,.12,.34,0xbdb39a);return B.geo();},
  // les archives : bibliothèque de pierre, portique à colonnes, fronton, petit dôme
  archives:(W,D)=>{const B=new Build();slab(B,W,D,0xb8b2a0,.06);B.box(0,.06,-.15,W*.78,.85,D*.62,0xd8cdb2);B.gable(0,.91,-.15,W*.78,D*.62,.34,PAL.ardoise,'x');
    for(const x of [-.5,-.17,.17,.5].map(v=>v*W*.8))B.cyl(x,.1,D*.32,.05,.05,.8,PAL.blanc,8);B.box(0,.9,D*.32,W*.74,.07,.22,PAL.blanc);B.gable(0,.97,D*.32,W*.74,.22,.2,PAL.blanc,'x',0);
    B.box(0,.06,D*.34,W*.5,.05,.2,0xcfc9b6);B.box(0,.06,-.15+D*.31+.01,.34,.6,.04,PAL.boisSombre);B.winsX(W*.39,.4,[-.4,.1],.2,.4,0x4a6a8a);
    B.cyl(-W*.2,1.2,-.35,.2,.2,.14,PAL.blanc,10);B.dome(-W*.2,1.34,-.35,.2,PAL.cuivre);return B.geo();},
  // la fonderie : brique sombre, deux hautes cheminées, gueulard orange, lingots
  fonderie:(W,D)=>{const B=new Build();slab(B,W,D,0x6c685e);B.box(-.1,.1,-D*.1,W*.8,.8,D*.62,PAL.briqueSombre);B.gable(-.1,.9,-D*.1,W*.8,D*.62,.34,0x6b4430,'x');
    for(const x of [-.5,.4]){B.cyl(x,.1,-D*.32,.2,.15,1.8,0x4a3a32,10);B.cyl(x,.9,-D*.32,.19,.19,.05,PAL.metal,10);B.cyl(x,1.9,-D*.32,.16,.18,.08,PAL.noir,10);B.cone(x,1.98,-D*.32,.12,.14,PAL.feu,8);}
    B.box(.05,.1,D*.21+.01,.6,.5,.05,PAL.noir);B.box(.05,.16,D*.21+.04,.44,.34,.03,PAL.feu);B.box(.05,.1,D*.3,.7,.04,.2,PAL.metal);
    for(let k=0;k<3;k++)B.box(W*.34+k*.1,.1+k*.0,D*.34,.18,.1,.1,PAL.metalClair);B.winsX(W*.3,.45,[-.3,.2],.16,.22,PAL.feu);return B.geo();},
  // la mine : un chevalement de bois (poulie, A-frame), une cabane, un wagonnet sur rails, un tas de minerai
  mine:(W,D)=>{const B=new Build();slab(B,W,D,0x6a6256,.06);const t=[-.15,0,-.1];
    B.rod([t[0]-.35,.06,t[2]-.3],[t[0],1.5,t[2]],.04,PAL.boisSombre);B.rod([t[0]+.35,.06,t[2]-.3],[t[0],1.5,t[2]],.04,PAL.boisSombre);
    B.rod([t[0]-.35,.06,t[2]+.3],[t[0],1.5,t[2]],.04,PAL.boisSombre);B.rod([t[0]+.35,.06,t[2]+.3],[t[0],1.5,t[2]],.04,PAL.boisSombre);
    B.rod([t[0]-.2,.7,t[2]-.15],[t[0]+.2,.7,t[2]+.15],.025,PAL.bois);const wheel=new THREE.CylinderGeometry(.22,.22,.05,12);wheel.rotateX(PI/2);wheel.translate(t[0],1.5,t[2]);B.add(wheel,PAL.metal);
    B.box(W*.28,.06,-D*.2,.55,.5,.5,PAL.boisClair);B.gable(W*.28,.56,-D*.2,.55,.5,.2,PAL.rouille,'x');B.box(W*.28,.06,-D*.2+.26,.14,.3,.03,PAL.boisSombre);
    B.box(0,.06,D*.3,.9,.02,.04,PAL.metal);B.box(0,.06,D*.3+.12,.9,.02,.04,PAL.metal);B.box(-.25,.1,D*.3+.06,.3,.16,.22,PAL.rouille);
    for(let k=0;k<4;k++)B.box(-W*.32+k*.1,.06,D*.28+(k%2)*.1,.14,.1+(k%3)*.04,.14,0x5a4a46);return B.geo();},
  // l'hôpital : bâtiment blanc à toit vert, croix rouge, ambulance du jardin (un banc et une civière)
  hopital:(W,D)=>{const B=new Build();slab(B,W,D,0xcfd4c6,.06);B.box(0,.06,-D*.1,W*.82,.85,D*.62,PAL.blanc);B.gable(0,.91,-D*.1,W*.82,D*.62,.4,PAL.toitVert,'x');
    B.box(0,.06,D*.3,.7,.95,.4,PAL.blanc);B.gable(0,1.01,D*.3,.7,.4,.3,PAL.toitVert,'z');B.box(0,.5,D*.3+.21,.3,.1,.03,PAL.rouge);B.box(0,.4,D*.3+.21,.1,.3,.03,PAL.rouge);
    B.box(0,.06,D*.3+.2,.28,.4,.03,0x4a7a9a);B.winsZ(-D*.1+D*.31,.4,[-1,-.55,.55,1].map(v=>v*W/3),.22,.3,0x6a9ab0);B.winsX(W*.41,.4,[-.5,0,.4].map(v=>v*D/3),.2,.3,0x6a9ab0);
    B.box(W*.36,.9,-D*.1,.34,.04,.04,PAL.rouge);B.box(W*.36,.82,-D*.1,.04,.2,.04,PAL.rouge);B.box(-W*.36,.06,D*.4,.4,.12,.12,PAL.boisSombre);return B.geo();},
  // l'usine chimique : des cuves rondes, des tuyaux, un petit bâtiment de contrôle, des bandes de danger
  poudrerie:(W,D)=>{const B=new Build();slab(B,W,D,0x8a8678,.06);B.cyl(-.4,.06,-.3,.34,.34,.9,0xe0d28a,14);B.cone(-.4,.96,-.3,.36,.2,PAL.metal,14);B.cyl(.35,.06,-.35,.28,.28,1.2,0xcfd0c6,14);B.dome(.35,1.26,-.35,.28,PAL.metal);
    B.rod([-.4,.7,-.3],[.35,.8,-.35],.04,PAL.rouille);B.rod([-.1,.7,-.32],[-.1,.1,.2],.03,PAL.rouille);B.box(.2,.06,.35,.8,.5,.6,PAL.creme);B.gable(.2,.56,.35,.8,.6,.22,PAL.rouille,'x');
    B.winsZ(.35+.3,.3,[-.1,.2,.5],.16,.16);B.box(-.45,.06,.4,.3,.12,.3,PAL.jaune);B.box(-.45,.06,.4,.3,.02,.1,PAL.noir);B.cyl(-.7,.06,.2,.05,.05,.5,PAL.rouge,6);return B.geo();},
  // le centre-ville : l'hôtel de ville de pierre claire, deux ailes, un beffroi à horloge, un perron, une fontaine sur la place
  centre:(W,D)=>{const B=new Build();slab(B,W,D,0xb3ab96,.08);const bw=W*.84,bd=D*.46,z0=-D*.14;
    B.box(0,.08,z0,bw,1.0,bd,PAL.creme);B.gable(0,1.08,z0,bw,bd,.55,PAL.ardoise,'x');B.box(0,.08,z0+bd/2-.02,bw*1.0,.12,.06,PAL.pierre);
    for(const sx of [-1,1]){B.box(sx*bw*.36,.08,z0+bd*.38,bw*.28,.85,bd*.5,PAL.creme);B.gable(sx*bw*.36,.93,z0+bd*.38,bw*.28,bd*.5,.36,PAL.ardoise,'z');}
    B.box(0,.08,z0+bd*.18,.8,1.75,.8,PAL.pierre);B.box(0,1.83,z0+bd*.18,.86,.08,.86,PAL.pierreSombre);B.cone(0,1.91,z0+bd*.18,.62,.7,PAL.toitVert,4);B.cyl(0,2.6,z0+bd*.18,.02,.02,.3,PAL.metalClair,5);
    {const cg=new THREE.CylinderGeometry(.22,.22,.04,16);cg.rotateX(PI/2);cg.translate(0,1.42,z0+bd*.18+.42);B.add(cg,PAL.blanc);B.box(0,1.36,z0+bd*.18+.445,.025,.14,.02,PAL.noir).box(.05,1.41,z0+bd*.18+.445,.1,.025,.02,PAL.noir);}   // l'horloge, face à la place
    B.box(0,.08,z0+bd*.18+.41,.36,.6,.04,PAL.boisSombre);B.box(0,.08,z0+bd*.18+.6,1.0,.06,.4,PAL.pierre);B.box(0,.14,z0+bd*.18+.55,.8,.06,.3,PAL.pierre);
    B.winsZ(z0+bd/2,.5,[-1.25,-.8,.8,1.25].map(v=>v*W/4),.22,.36,0x4a6a8a);B.winsZ(z0+bd*.38+bd*.25,.45,[-1,1].map(v=>v*bw*.36),.26,.3,0x4a6a8a);B.winsX(bw/2,.5,[-.4,.1].map(v=>v*D/3+z0),.22,.36,0x4a6a8a);
    B.cyl(W*.3,.08,D*.34,.36,.4,.16,PAL.pierre,14);B.cyl(W*.3,.24,D*.34,.3,.3,.02,0x5a8aa8,14);B.cyl(W*.3,.08,D*.34,.06,.06,.42,PAL.pierre,8);
    flag(B,-W*.36,D*.36,PAL.rouge);for(const x of [-W*.12,W*.08])B.cyl(x,.08,D*.42,.03,.03,.5,PAL.noir,5).box(x,.58,D*.42,.12,.1,.12,PAL.jaune);return B.geo();},
  // le camp-dépôt : une grande tente de toile, des caisses, un tas de bûches, une charrette
  camp:(W,D)=>{const B=new Build();slab(B,W,D,0x8a8466,.04);B.gable(-.15,.04,-.15,W*.62,D*.5,.75,0xcbbd94,'x',0);B.box(-.15,.04,-.15+D*.25-.02,.24,.5,.03,0x6a5a3a);
    B.cyl(-.15-W*.31,.04,-.15,.025,.025,.8,PAL.boisSombre,5);B.cyl(-.15+W*.31,.04,-.15,.025,.025,.8,PAL.boisSombre,5);
    crates(B,W*.2,D*.25);for(let k=0;k<4;k++){const g=new THREE.CylinderGeometry(.06,.06,.5,7);g.rotateZ(PI/2);g.translate(-W*.28,.1+(k>2?.11:0),D*.3+(k%3)*.12-.06);B.add(g,PAL.bois);}
    B.box(W*.32,.12,-D*.32,.36,.1,.24,PAL.boisClair);for(const z of [-.12,.12]){const w=new THREE.CylinderGeometry(.1,.1,.03,10);w.rotateX(PI/2);w.translate(W*.32,.11,-D*.32+z*1.1);B.add(w,PAL.boisSombre);}return B.geo();},
  // la maison : murs crème à colombages, toit de chaume, cheminée, une porte et deux fenêtres, un muret
  maison:(W,D)=>{const B=new Build();slab(B,W,D,0x7f8a5c,.04);const bw=W*.62,bd=D*.5;B.box(0,.04,-.1,bw,.62,bd,PAL.creme);
    for(const x of [-bw/2+.02,bw/2-.02])B.box(x,.04,-.1+bd/2+.005,.04,.62,.02,PAL.boisSombre);B.box(0,.6,-.1+bd/2+.005,bw,.04,.02,PAL.boisSombre);
    B.gable(0,.66,-.1,bw,bd,.48,PAL.chaume,'x',.1);B.box(bw*.3,.8,-.2,.14,.42,.14,PAL.brique);B.box(-.12,.04,-.1+bd/2+.01,.18,.36,.03,PAL.boisSombre);
    B.winsZ(-.1+bd/2,.28,[.2],.16,.16,0x4a6a8a);B.winsX(bw/2,.28,[-.15],.16,.16,0x4a6a8a);B.box(0,.04,D*.4,W*.7,.12,.06,PAL.pierre);B.cyl(-W*.3,.04,D*.28,.08,.1,.18,0x5a7a3a,7);return B.geo();},
  // la ferme (bèè) : une grange rouge à grande porte, un enclos de piquets, des bottes de foin
  ferme:(W,D)=>{const B=new Build();slab(B,W,D,0x7c8a52,.04);B.box(-.2,.04,-.25,W*.5,.8,D*.42,0xa8432e);B.gable(-.2,.84,-.25,W*.5,D*.42,.45,0x5a4a3e,'x');
    B.box(-.2,.04,-.25+D*.21+.01,.5,.56,.03,PAL.blanc);B.box(-.2,.04,-.25+D*.21+.03,.44,.5,.02,0x8a3424);
    for(let k=0;k<9;k++){const a=k/8;B.cyl(-W*.4+a*W*.8,.04,D*.4,.025,.025,.3,PAL.boisSombre,5);}B.box(0,.22,D*.4,W*.8,.03,.02,PAL.boisClair);B.box(0,.14,D*.4,W*.8,.03,.02,PAL.boisClair);
    for(const [x,z] of [[W*.28,D*.12],[W*.36,-D*.1],[W*.2,-D*.28]]){const g=new THREE.CylinderGeometry(.14,.14,.24,10);g.rotateZ(PI/2);g.translate(x,.18,z);B.add(g,PAL.chaume);}return B.geo();},
  // l'atelier : un bâtiment de brique, un auvent sur l'établi, une forge rougeoyante et sa cheminée, des engrenages
  atelier:(W,D)=>{const B=new Build();slab(B,W,D,0x857e6e,.06);const bw=W*.66,bd=D*.48;B.box(-.12,.06,-.18,bw,.7,bd,PAL.brique);B.gable(-.12,.76,-.18,bw,bd,.34,PAL.ardoise,'x');
    B.cyl(bw*.3-.12,.76,-.3,.1,.08,.6,PAL.briqueSombre,8);B.box(-.12,.06,-.18+bd/2+.01,.32,.46,.03,PAL.boisSombre);B.winsX(bw/2-.12,.35,[-.25],.18,.2,PAL.feu);
    B.box(-.12,.58,-.18+bd/2+.2,bw,.03,.42,PAL.rouille);for(const x of [-bw/2-.08,bw/2-.16])B.cyl(x,.06,-.18+bd/2+.38,.02,.02,.52,PAL.boisSombre,5);
    B.box(-.35,.06,D*.3,.5,.28,.2,PAL.bois);B.box(-.35,.34,D*.3,.5,.03,.22,PAL.boisClair);const g=new THREE.CylinderGeometry(.12,.12,.04,10);g.rotateX(PI/2);g.translate(W*.32,.25,D*.32);B.add(g,PAL.metal);
    B.box(W*.32,.06,D*.32,.08,.14,.08,PAL.metal);return B.geo();},
  // le four à charbon de bois : une meule de terre fumante, un hangar ouvert, des sacs de charbon, du bois empilé
  four:(W,D)=>{const B=new Build();slab(B,W,D,0x5e5a4e,.04);B.dome(-.2,.04,-.15,.5,0x5a4a3c);B.cyl(-.2,.45,-.15,.06,.08,.12,PAL.noir,8);B.dome(-.2,.6,-.15,.1,0x9a9a9a);B.dome(-.12,.78,-.12,.08,0xb0b0b0);
    B.box(-.2,.04,-.15+.48,.16,.14,.04,PAL.feu);for(const [x,z] of [[W*.22,-D*.3],[W*.42,-D*.3],[W*.22,D*.05],[W*.42,D*.05]])B.cyl(x,.04,z,.025,.025,.55,PAL.boisSombre,5);
    B.box(W*.32,.59,-D*.12,.5,.04,.62,PAL.rouille);for(let k=0;k<3;k++)B.box(W*.32,.04+k*.1,-D*.12,.36,.09,.5,PAL.bois);for(let k=0;k<3;k++)B.box(-W*.32+k*.17,.04,D*.36,.15,.13,.12,PAL.noir);return B.geo();},
  // (V12.5, demande du joueur) le centre-ville meumeu : une pyramide aztèque à degrés — cinq terrasses (le talus incliné en bas, le panneau droit
  // au-dessus, un cordon clair), le grand escalier sur la façade (+Z) entre ses deux rampes terminées par des têtes de serpent, et au sommet deux
  // sanctuaires comme au Templo Mayor : l'un blanc et bleu, l'autre ocre et rouge, sous leurs crêtes ; des braseros aux quatre angles de la plate-forme
  pyramide:(W,D)=>{const B=new Build(),L=0xcdb68a,Ls=0xa8936a,Lt=0xe0cfa4,Rg=0xa8402e,Bl=0x3e6e9c,Bc=0xf0ebe0,Sb=0x8a7a5c;slab(B,W,D,0xb9ad8e,.06);
    const N=5,h=.28,s0=Math.min(W,D)*.92,s1=Math.min(W,D)*.44,back=.06;let y=.06;const tiers=[];
    for(let k=0;k<N;k++){const s=s0-(s0-s1)*k/(N-1),z=-back*k;tiers.push({s,z,y});
      {const g=new THREE.CylinderGeometry(s*.69,s*.71,h*.42,4,1);g.rotateY(PI/4);g.translate(0,y+h*.21,z);B.add(g,Ls);}   // le talus : une base carrée un peu évasée
      B.box(0,y+h*.42,z,s*.94,h*.5,s*.94,L);B.box(0,y+h*.92,z,s*.98,h*.08,s*.98,Lt);y+=h;}
    const yT=y,zT=tiers[N-1].z,sT=tiers[N-1].s,zf=s0/2+.04,zb=zT+sT/2-.05;
    // le grand escalier : des marches de la place jusqu'au sommet, entre deux rampes ; une tête de serpent au pied de chaque rampe
    const M=14,sw=Math.min(W,D)*.24,rs=(yT-.06)/M,run=(zf-zb)/M;
    for(let i=0;i<M;i++){const fz=zf-i*run,bz=zT;B.box(0,.06+i*rs,(fz+bz)/2,sw,rs,fz-bz,i%2?Lt:0xd8c69a);}
    for(const sx of [-1,1]){const x=sx*(sw/2+.07);B.rod([x,.13,zf],[x,yT+.02,zb],.075,Ls);B.box(x,yT-.02,zb-.04,.17,.16,.17,Ls);
      B.box(x,.06,zf+.08,.17,.15,.22,Sb);B.box(x,.1,zf+.2,.12,.04,.04,Rg);B.box(x+sx*.05,.17,zf+.14,.03,.03,.03,0x2a2622);}
    // la plate-forme du sommet et ses deux sanctuaires
    B.box(0,yT,zT,sT*.98,.05,sT*.98,Lt);
    const sh=(x,wall,band,crest)=>{const w=sT*.4,d=sT*.56,z=zT-sT*.12;B.box(x,yT+.05,z,w,.5,d,wall);for(const k of [0,1,2])B.box(x,yT+.12+k*.14,z,w*1.02,.04,d*1.02,band);
      B.box(x,yT+.05,z+d/2+.01,w*.36,.32,.03,0x241e1a);   // la porte, face à l'escalier
      B.box(x,yT+.55,z,w*1.08,.06,d*1.08,band);B.box(x,yT+.61,z,w*.9,.22,d*.86,crest);B.box(x,yT+.83,z,w*.7,.06,d*.6,band);
      for(let k=0;k<4;k++)B.box(x-w*.36+k*w*.24,yT+.89,z+d*.3,.06,.12,.06,crest);};   // les merlons de la crête
    sh(-sT*.22,Bc,Bl,Bl);sh(sT*.22,0xc8935a,Rg,Rg);
    // les braseros aux angles de la plate-forme
    for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=sx*sT*.42,z=zT+sz*sT*.42;B.cyl(x,yT+.05,z,.07,.09,.14,0x5a5048,8);B.cone(x,yT+.19,z,.06,.14,PAL.feu,5);}
    return B.geo();},
  // le laboratoire : un pavillon blanc, une verrière, une coupole d'observation, des cornues sur le perron
  labo:(W,D)=>{const B=new Build();slab(B,W,D,0xb9b4a4,.06);const bw=W*.7,bd=D*.5;B.box(-.15,.06,-.2,bw,.85,bd,PAL.blanc);B.gable(-.15,.91,-.2,bw,bd,.32,0x2c5f6a,'x');
    B.box(-.15,.06,-.2+bd/2+.01,.36,.55,.03,PAL.boisSombre);B.winsZ(-.2+bd/2,.32,[-.75,-.45,.2,.5].map(v=>v*bw),.2,.38,0x5a8aaa);B.winsX(bw/2-.15,.32,[-.4,.15].map(v=>v*bd),.2,.38,0x5a8aaa);
    B.box(W*.3,.06,D*.18,.7,.5,.6,0x8ab0b8);B.gable(W*.3,.56,D*.18,.7,.6,.22,0x6a9aa4,'z',.02);for(const x of [-.3,0,.3])B.box(W*.3+x,.06,D*.18+.31,.02,.5,.02,PAL.metalClair);
    B.cyl(-W*.32,.91,-.3,.28,.3,.2,PAL.blanc,12);B.dome(-W*.32,1.11,-.3,.3,PAL.cuivre);B.box(-W*.32,1.2,-.05,.08,.08,.14,PAL.noir);
    B.box(-W*.38,.06,D*.4,.44,.22,.2,PAL.boisClair);B.cyl(-W*.44,.28,D*.4,.05,.03,.12,0x6ad08a,8);B.cyl(-W*.32,.28,D*.4,.05,.03,.12,0xd06a8a,8);return B.geo();},
  // la tente médicale : une toile blanche sur deux mâts, une croix rouge sur chaque pan, deux brancards
  tente:(W,D)=>{const B=new Build();slab(B,W,D,0x8a9070,.03);B.gable(0,.03,-.1,W*.66,D*.56,.78,0xeee8d8,'x',0);B.cyl(-W*.33,.03,-.1,.025,.025,.84,PAL.boisSombre,5);B.cyl(W*.33,.03,-.1,.025,.025,.84,PAL.boisSombre,5);
    for(const s of [-1,1]){B.box(0,.42,-.1+s*D*.15,.24,.07,.02,PAL.rouge);B.box(0,.42,-.1+s*D*.15,.07,.24,.02,PAL.rouge);}
    for(const x of [-.35,.25]){B.box(x,.08,D*.38,.18,.03,.5,0xd8d0b8);for(const dx of [-.08,.08])B.box(x+dx,.03,D*.38,.02,.06,.5,PAL.boisSombre);}return B.geo();},
};

// les géométries et leurs mesures, prêtes pour la scène : { nom: {ext:[largeur,hauteur,profondeur], geo} }
export function buildingModels(){const out={};for(const [k,mk] of Object.entries(MAKERS)){const [W,D]=BUILDINGS[k==='pyramide'?'centre':k]?.size||[2,2];   /* (la pyramide : l'empreinte du centre-ville) */const geo=mk(W,D);const b=geo.boundingBox;out[':'+k]={ext:[b.max.x-b.min.x,b.max.y,b.max.z-b.min.z],geo};}return out;}
export const BUILDING_KEYS=Object.keys(MAKERS);
export {Build,PAL};
