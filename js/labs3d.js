// Les intérieurs des bâtiments de recherche (V12.6 ; V12.7 : le laboratoire de chimie produit, l'usine chimique n'est plus aux Meumeu), pour la vue recherche : le toit enlevé, la maison de poupée. Les murs du fond (−X, −Z, à l'opposé
// de la caméra) restent hauts, avec leurs tableaux et leurs étagères ; ceux de devant (+X, +Z) sont coupés à hauteur de plinthe. Même repère que bldg3d.js
// (une case = une unité, centré, +Z vers la caméra), à la taille exacte de l'empreinte. Chaque intérieur donne ses POSTES : où se tiennent les savants
// (k : le genre de poste, x et z dans le repère du modèle, f : la direction du regard, sit : assis), et la porte.
import * as THREE from './lib/three.module.js';
import {BUILDINGS} from './data.js';
import {Build,AZ} from './bldg3d.js';

const C={floorA:0xd9cdb0,floorB:0xc6b692,tileA:0xe6e6de,tileB:0xa8aeac,plank:0xb08458,plankD:0x96704a,concrete:0x9a9a92,concreteD:0x8a8a84,
  wood:0x8a5a34,woodD:0x5e3c22,woodL:0xb8885a,paper:0xf2eee0,chalk:0x2a4434,chalkLine:0xe4ece4,cork:0xb8905a,brass:0xc9a240,copper:0xc8784a,
  glass:0xa6dce4,green:0x6fd06a,violet:0x9a6ad0,amber:0xe0a040,blue:0x5aa0e0,red:0xc85a4a,steel:0x8a9094,steelD:0x5c6266,dark:0x2e2822,
  blueprint:0x3f6c9c,cloth:0x7a3a2a,pot:0xa65a3a,leaf:0x5f9a3a,white:0xeeeeea,book:[0x8a2f2a,0x2f4a7a,0x3f6a3a,0x9a7a2a,0x5a3a6a,0x7a5a3a]};

// un repère local tourné de r quarts de tour autour de (x0, z0) : r=0 → le +x local va vers +X ; r=1 → vers +Z (la caméra) ; r=2 → −X ; r=3 → −Z
function at(B,x0,z0,r=0){const c=[1,0,-1,0][r&3],s=[0,1,0,-1][r&3],sw=r&1,T=(dx,dz)=>[x0+dx*c-dz*s,z0+dx*s+dz*c];
  const o={box(dx,y,dz,w,h,d,hex){const [x,z]=T(dx,dz);B.box(x,y,z,sw?d:w,h,sw?w:d,hex);return o;},
    cyl(dx,y,dz,r0,r1,h,hex,seg=8){const [x,z]=T(dx,dz);B.cyl(x,y,z,r0,r1,h,hex,seg);return o;},
    cone(dx,y,dz,r,h,hex,seg=8){const [x,z]=T(dx,dz);B.cone(x,y,z,r,h,hex,seg);return o;},
    dome(dx,y,dz,r,hex){const [x,z]=T(dx,dz);B.dome(x,y,z,r,hex);return o;},
    rod(a,b,r,hex){const [ax,az]=T(a[0],a[2]),[bx,bz]=T(b[0],b[2]);B.rod([ax,a[1],az],[bx,b[1],bz],r,hex);return o;},
    p:(dx,dz)=>T(dx,dz),dir:(dx,dz)=>{const [x,z]=T(dx,dz);return [x-x0,z-z0];}};return o;}
const Y0=.08;   // le dessus du plancher
// le socle, le plancher en damier (carreaux de t), les murs : hauts au fond (−X, −Z), bas devant (+X, +Z), une porte dans le mur de droite (+X)
function shell(B,W,D,{floor=['floorA','floorB'],t=.5,hb=.9,hf=.15,door=[.55,.72]}={}){B.box(0,0,0,W,.06,D,0xb9ad8e);
  const x0=-W/2+.11,x1=W/2-.11,z0=-D/2+.11,z1=D/2-.11,nx=Math.max(1,Math.round((x1-x0)/t)),nz=Math.max(1,Math.round((z1-z0)/t)),tx=(x1-x0)/nx,tz=(z1-z0)/nz;
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)B.box(x0+(i+.5)*tx,.06,z0+(j+.5)*tz,tx,.02,tz,C[floor[(i+j)%2]]);
  B.box(0,.06,-D/2+.06,W,hb,.1,AZ.L);B.box(-W/2+.06,.06,0,.1,hb,D,AZ.L);   // le fond
  B.box(0,.06+hb,-D/2+.06,W+.02,.05,.14,AZ.Lt);B.box(-W/2+.06,.06+hb,0,.14,.05,D+.02,AZ.Lt);B.box(0,.06+hb*.55,-D/2+.115,W-.2,.03,.02,AZ.Lt);B.box(-W/2+.115,.06+hb*.55,0,.02,.03,D-.2,AZ.Lt);
  // la frise à degrés, en haut du mur du fond
  {const n=Math.round((W-.3)/.2);for(let i=0;i<n;i++)B.box(-W/2+.2+(i+.5)*(W-.3)/n,.06+hb-.12+(i%2)*.04,-D/2+.12,(W-.3)/n*.55,.06,.02,AZ.Lt);}
  B.box(0,.06,D/2-.06,W,hf,.1,AZ.L);B.box(0,.06+hf,D/2-.06,W+.02,.03,.13,AZ.Lt);   // devant
  const [da,db]=door;
  // le mur de droite, coupé bas, avec sa porte (deux piédroits) ; door : le début et la fin de la porte, en part de la profondeur (0 au fond, 1 devant)
  const zA=-D/2+.01,zB=-D/2+D*da,zC=-D/2+D*db,zD=D/2-.01;B.box(W/2-.06,.06,(zA+zB)/2,.1,hf,zB-zA,AZ.L);B.box(W/2-.06,.06,(zC+zD)/2,.1,hf,zD-zC,AZ.L);
  for(const z of [zB,zC])B.box(W/2-.06,.06,z,.14,hf+.22,.1,AZ.Ls);B.box(W/2-.06,.06+hf,(zA+zB)/2,.13,.03,zB-zA,AZ.Lt);B.box(W/2-.06,.06+hf,(zC+zD)/2,.13,.03,zD-zC,AZ.Lt);
  // les angles de devant : des piliers coupés
  for(const [x,z] of [[W/2-.06,D/2-.06],[-W/2+.06,D/2-.06],[W/2-.06,-D/2+.06]])B.box(x,.06,z,.16,hf+.12,.16,AZ.Ls);
  return {x0,x1,z0,z1,door:[W/2-.25,(zB+zC)/2]};}
// le mobilier
const chair=(B,x,z,r)=>{const L=at(B,x,z,r);L.box(0,Y0,0,.13,.11,.13,C.woodD).box(0,Y0+.11,0,.15,.02,.15,C.wood).box(-.07,Y0+.11,0,.02,.14,.15,C.woodD);};
const stool=(B,x,z)=>{B.cyl(x,Y0,z,.05,.05,.11,C.woodD,6);B.cyl(x,Y0+.11,z,.075,.075,.02,C.wood,8);};
const legs=(L,w,d,h,hex=C.woodD)=>{for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])L.box(a*(w/2-.02),Y0,b*(d/2-.02),.03,h,.03,hex);};
// un bureau : le plateau devant l'assis (repère : l'assis regarde le +x local), des papiers, un encrier, une lampe
function desk(B,x,z,r,seed=0){const L=at(B,x,z,r);legs(L,.24,.4,.17);L.box(0,Y0+.17,0,.26,.025,.42,C.wood);
  L.box(-.02,Y0+.195,-.06+(seed%3)*.03,.12,.006,.16,C.paper).box(.03,Y0+.195,.1,.09,.006,.12,0xe8e2c8).cyl(.08,Y0+.195,-.15,.018,.018,.03,C.dark,6);
  if(seed%2===0)L.cyl(.08,Y0+.195,.15,.025,.025,.012,C.brass,6).rod([.08,Y0+.2,.15],[.06,Y0+.29,.13],.008,C.brass).cone(.06,Y0+.26,.13,.04,.05,0x3f6a3a,8);
  else L.box(.04,Y0+.195,.15,.08,.05,.1,C.book[seed%6]);
  chair(B,...L.p(-.2,0),r);}
// une paillasse : un meuble bas à plateau de faïence, ses flacons, un bec à gaz, une rampe à éprouvettes (repère : la paillasse court le long du z local)
function bench(B,x,z,len,r,seed=0){const L=at(B,x,z,r);L.box(0,Y0,0,.32,.2,len,C.woodD).box(0,Y0+.2,0,.36,.025,len+.04,C.white);
  const cols=[C.green,C.violet,C.amber,C.blue,C.red];const n=Math.floor(len/.22);
  for(let k=0;k<n;k++){const dz=-len/2+.12+k*(len-.24)/Math.max(1,n-1),c=cols[(k+seed)%5],kind=(k+seed)%4;
    if(kind===0){L.cyl(.04,Y0+.225,dz,.045,.03,.06,c,8).cyl(.04,Y0+.285,dz,.012,.012,.05,C.glass,6);}
    else if(kind===1){L.cyl(.06,Y0+.225,dz,.02,.02,.012,C.steelD,6).cyl(.06,Y0+.237,dz,.012,.006,.03,0xff9a3a,6).dome(.06,Y0+.29,dz,.035,c);}
    else if(kind===2){L.box(.05,Y0+.225,dz,.06,.02,.14,C.woodL);for(let e=0;e<4;e++)L.cyl(.05,Y0+.245,dz-.05+e*.033,.008,.008,.06,cols[(e+k)%5],5);}
    else{L.cyl(.03,Y0+.225,dz,.03,.03,.09,c,8).cyl(.03,Y0+.315,dz,.015,.02,.02,C.glass,6);}}}
// une planche à dessin inclinée, un plan bleu dessus, une règle en T (repère : le dessinateur regarde le +x local)
function drafting(B,x,z,r){const L=at(B,x,z,r);for(const b of [-.13,.13])L.box(0,Y0,b,.04,.2,.04,C.woodD);
  const g=new THREE.BoxGeometry(.3,.02,.4);g.rotateZ(.32);const [px,pz]=L.p(0,0);g.rotateY(-r*Math.PI/2);g.translate(px,Y0+.24,pz);B.add(g,C.woodL);
  const p=new THREE.BoxGeometry(.24,.006,.32);p.translate(0,.014,0);p.rotateZ(.32);p.rotateY(-r*Math.PI/2);p.translate(px,Y0+.24,pz);B.add(p,C.blueprint);
  const tq=new THREE.BoxGeometry(.02,.01,.34);tq.translate(-.05,.02,0);tq.rotateZ(.32);tq.rotateY(-r*Math.PI/2);tq.translate(px,Y0+.24,pz);B.add(tq,C.woodD);stool(B,...L.p(-.22,0));}
const shelf=(B,x,z,len,h,r,seed=0,jars=false)=>{const L=at(B,x,z,r);L.box(0,Y0,0,.16,h,len,C.woodD);const rows=Math.max(2,Math.round(h/.17));
  for(let q=0;q<rows;q++){const y=Y0+.04+q*(h-.06)/rows;L.box(.06,y,0,.06,.012,len-.04,C.wood);const n=Math.floor((len-.06)/(jars?.09:.045));
    for(let k=0;k<n;k++){const dz=-len/2+.05+k*(len-.08)/n,s=(k*7+q*3+seed)%6;if(jars)L.cyl(.07,y+.012,dz,.025,.025,.06+(s%3)*.015,[C.green,C.amber,C.violet,C.blue,C.glass,C.red][s],7);
      else L.box(.07,y+.012,dz,.05,.08+(s%3)*.02,.035,C.book[s]);}}};
const plant=(B,x,z)=>{B.cyl(x,Y0,z,.07,.09,.12,C.pot,8);B.cyl(x,Y0+.12,z,.095,.095,.02,0x7a3a22,8);B.cone(x,Y0+.14,z,.11,.22,C.leaf,6);B.cone(x+.03,Y0+.2,z-.02,.07,.16,0x6fae4a,6);};
// des lignes de craie (des formules) sur un tableau, sur le mur du fond (−Z)
const scribble=(B,x,y,z,w,h,seed=0)=>{let r=seed*9301+49297;const rnd=()=>((r=(r*9301+49297)%233280)/233280);for(let l=0;l<5;l++){let cx=x-w/2+.06;const yy=y+h-.07-l*(h-.1)/5;while(cx<x+w/2-.08){const L=.02+rnd()*.09;
  B.box(cx+L/2,yy+(rnd()-.5)*.012,z,L,.008,.004,C.chalkLine);cx+=L+.02+rnd()*.03;if(rnd()<.12)B.box(cx,yy-.004,z,.012,.024,.004,C.chalkLine);}}};
// un tableau noir sur le mur du fond, centré en x, de largeur w
const board=(B,x,w,D,{y=.3,h=.48,cork=false,seed=0}={})=>{const z=-D/2+.115;B.box(x,y,z,w+.06,h+.06,.02,C.woodD);B.box(x,y+.03,z+.012,w,h,.006,cork?C.cork:C.chalk);
  if(cork){for(let k=0;k<6;k++)B.box(x-w/2+.1+(k%3)*(w-.2)/2,y+.08+Math.floor(k/3)*.2,z+.017,.16,.12,.004,[C.paper,C.blueprint,0xe8d8a0][k%3]);}else{scribble(B,x,y+.03,z+.017,w,h,seed);B.box(x,y-.01,z+.03,w,.02,.04,C.woodL);}};

// ---------- le centre de recherche (5 × 4) : l'école et son tableau, la salle de réunion, six bureaux, la bibliothèque, le coin café ----------
function centreInterior(W,D){const B=new Build(),S=shell(B,W,D,{hb:.92});const st=[];const P=(k,x,z,fx,fz,sit=0,via=null)=>st.push({k,x,z,f:[fx,fz],sit,via});
  // l'école : le grand tableau, le pupitre du maître, quatre bancs face au tableau
  board(B,-1.2,1.5,D,{seed:3});const lec=at(B,-.1,-1.5,1);lec.box(0,Y0,0,.16,.22,.12,C.wood).box(0,Y0+.22,0,.2,.02,.16,C.woodL);
  P('maitre',-1.25,-1.55,0,1,0,[[-1.25,.17],[-1.25,-1.55]]);P('maitre',-.32,-1.55,0,1,0,[[-.32,.17],[-.32,-1.55]]);
  for(const [x,z] of [[-1.75,-.85],[-.75,-.85],[-1.75,-.2],[-.75,-.2]]){const L=at(B,x,z,0);legs(L,.42,.2,.15);L.box(0,Y0+.15,0,.44,.02,.22,C.woodL).box(-.08,Y0+.17,.02,.1,.005,.12,C.paper);stool(B,x,z+.22);P('ecole',x,z+.22,0,-1,1,z<-.5?[[-1.25,.17],[-1.25,z+.22]]:null);}
  // la salle de réunion : la grande table, huit chaises, le tableau de liège
  board(B,1.25,1.1,D,{cork:true,y:.34,h:.42});{const L=at(B,1.25,-.72,0);legs(L,1.5,.6,.17);L.box(0,Y0+.17,0,1.56,.03,.64,C.wood);L.box(-.3,Y0+.2,.05,.14,.005,.1,C.paper).box(.35,Y0+.2,-.1,.12,.005,.1,C.paper).cyl(.05,Y0+.2,0,.04,.04,.06,C.brass,8);}
  const back=x=>[[.1,.17],[.1,-1.48],[x,-1.48]];for(const x of [.75,1.25,1.75]){chair(B,x,-1.22,1);P('table',x,-1.15,0,1,1,back(x));chair(B,x,-.22,3);P('table',x,-.29,0,-1,1);}
  chair(B,.3,-.72,0);P('roi',.37,-.72,1,0,1,[[.1,.17],[.1,-.72]]);chair(B,2.2,-.72,2);P('table',2.13,-.72,-1,0,1,[[2.3,.17],[2.3,-.72]]);P('orateur',1.25,-1.62,0,1,0,back(1.25));
  // six bureaux, en deux rangées, l'assis tourné vers la caméra de droite (+X)
  let n=0;for(const z of [.5,1.3])for(const x of [-1.6,-.75,.1]){desk(B,x,z,0,n++);const c=x<-1?-2.05:x<0?-1.25:-.4;P('bureau',x-.2,z,1,0,1,z>1?[[c,.17],[c,z]]:null);}
  // la bibliothèque, le long du mur de gauche (−X)
  shelf(B,-2.3,.95,1.5,.75,0,1);P('livres',-2.08,.62,-1,0,0,[[-2.08,.17]]);P('livres',-2.08,1.0,-1,0,0,[[-2.08,.17]]);
  // le coin café : un guéridon, la cafetière, des tasses ; un poêle
  B.cyl(1.85,Y0,1.3,.04,.04,.17,C.woodD,6);B.cyl(1.85,Y0+.17,1.3,.2,.2,.02,C.woodL,12);B.cyl(1.82,Y0+.19,1.28,.04,.035,.09,C.dark,8);B.cone(1.82,Y0+.28,1.28,.035,.03,C.dark,8);
  for(const [a,b] of [[.08,.06],[-.06,.1],[.1,-.08]])B.cyl(1.85+a,Y0+.19,1.3+b,.02,.018,.03,C.white,6);B.box(2.25,Y0,1.68,.22,.3,.22,C.steelD);B.cyl(2.25,Y0+.3,1.68,.04,.04,.4,C.steelD,6);
  P('cafe',1.55,1.2,1,0,0,[[1.3,.17],[1.3,1.2]]);P('cafe',2.12,1.05,-1,.3,0,[[2.2,.17],[2.2,.9]]);P('cafe',1.82,1.64,0,-1,0,[[1.3,.17],[1.3,1.64]]);P('cafe',1.48,1.55,.7,-.7,0,[[1.3,.17],[1.3,1.55]]);
  // la fenêtre (le mur bas de droite), une plante, un globe
  P('fenetre',2.2,.17,1,0);P('fenetre',2.25,-1.45,1,.3,0,[[2.3,.17],[2.3,-1.45]]);plant(B,2.2,-1.65);plant(B,-2.2,-1.6);B.cyl(.62,Y0,1.72,.03,.03,.2,C.woodD,6);B.dome(.62,Y0+.25,1.72,.09,C.blue);B.dome(.62,Y0+.25,1.72,-.09,0x4f8f5a);
  return {geo:B.geo(),st,door:S.door,aisle:{z:.17}};}

// ---------- le laboratoire de chimie (3 × 3) : la paillasse, la hotte, les étagères de flacons, l'évier, la balance — et la production : la cuve de cuivre,
// son condenseur, les tonneaux de poudre (les ouvriers y travaillent) ----------
function laboInterior(W,D){const B=new Build(),S=shell(B,W,D,{floor:['tileA','tileB'],t:.375,hb:.84,door:[.6,.8]});const st=[];const P=(k,x,z,fx,fz,sit=0,via=null)=>st.push({k,x,z,f:[fx,fz],sit,via});
  bench(B,-.12,-.32,1.7,1,0);for(const x of [-.72,-.12,.5])P('paillasse',x,-.7,0,1,0,[[.9,-.7]]);
  {const x=-.55,z=.72;for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])B.box(x+a*.13,Y0,z+b*.13,.035,.08,.035,C.steelD);B.cyl(x,Y0+.08,z,.2,.2,.3,C.copper,14);B.cyl(x,Y0+.22,z,.21,.21,.02,C.brass,14);
    B.dome(x,Y0+.38,z,.2,C.copper);B.cyl(x,Y0+.5,z,.04,.04,.1,C.steel,8);const g=new THREE.TorusGeometry(.05,.009,5,10);g.translate(x+.22,Y0+.3,z+.08);B.add(g,C.red);
    const cx=-.05,cz=.95;B.cyl(cx,Y0,cz,.1,.1,.4,C.steel,12);B.dome(cx,Y0+.4,cz,.1,C.steel);for(let k=0;k<3;k++)B.cyl(cx,Y0+.08+k*.1,cz,.11,.11,.02,C.steelD,12);B.rod([x,Y0+.56,z],[cx,Y0+.5,cz],.018,C.copper);
    for(const [a,b] of [[-1.15,1.15],[-1.15,.92],[-.92,1.18]])B.cyl(a,Y0,b,.08,.08,.18,0x4a4038,10);
    P('cuve',-.55,.38,0,1,0,[[.9,.38]]);P('ouvrier',-.2,.55,-1,.3,0,[[.9,.55]]);P('ouvrier',-.88,.36,.3,1,0,[[.9,.3]]);P('ouvrier',.2,.95,-1,0,0,[[.9,.95]]);}
  // la hotte, au fond à droite
  {const x=1.0,z=-D/2+.3;B.box(x,Y0,z,.56,.24,.36,C.steelD);B.box(x,Y0+.24,z,.56,.02,.38,C.white);B.box(x,Y0+.26,z-.1,.56,.42,.16,C.steel);B.box(x,Y0+.3,z+.02,.5,.3,.01,C.glass);B.box(x,Y0+.68,z-.06,.6,.06,.26,C.steelD);
    B.cyl(x,Y0+.74,z-.08,.06,.06,.3,C.steel,8);B.cyl(x-.1,Y0+.26,z-.02,.03,.025,.08,C.green,8);P('hotte',x,z+.36,0,-1,0,[[.9,z+.36]]);}
  shelf(B,-D/2+.2,-.55,1.0,.7,0,2,true);P('etagere',-1.1,-.7,-1,0,0,[[.9,-.86],[-1.1,-.86]]);
  // l'évier et la balance, le long du mur bas de devant
  B.box(.85,Y0,1.05,.4,.2,.3,C.woodD);B.box(.85,Y0+.2,1.05,.44,.02,.34,C.white);B.box(.85,Y0+.205,1.05,.2,.02,.16,C.steelD);B.rod([.85,Y0+.22,.93],[.85,Y0+.36,.97],.012,C.steel);
  {const z=-.42;B.box(1.15,Y0,z,.24,.2,.24,C.woodD);B.box(1.15,Y0+.2,z,.26,.02,.26,C.white);B.cyl(1.15,Y0+.22,z,.012,.012,.12,C.brass,6);B.box(1.15,Y0+.34,z,.16,.008,.012,C.brass);for(const s of [-1,1])B.cyl(1.15+s*.08,Y0+.27,z,.035,.035,.006,C.brass,8);P('balance',.9,z,1,0);}
  P('evier',.85,.74,0,1,0,[[.9,.74]]);
  // des bouteilles de gaz, un bocal (un spécimen), une plante
  for(const z of [-.15,.0])B.cyl(-1.18,Y0,z+.35,.05,.05,.36,C.blueprint,8);B.cyl(.3,Y0+.225,-.32,.06,.06,.12,C.glass,10);B.dome(.3,Y0+.33,-.32,.055,C.amber);plant(B,1.18,1.18);
  return {geo:B.geo(),st,door:S.door,aisle:{x:.9}};}

// ---------- le bureau d'études (2 × 2) : trois planches à dessin, l'établi et sa maquette, les plans au mur ----------
function bureauInterior(W,D){const B=new Build(),S=shell(B,W,D,{floor:['plank','plankD'],t:.25,hb:.78,door:[.42,.7]});const st=[];const P=(k,x,z,fx,fz,sit=0,via=null)=>st.push({k,x,z,f:[fx,fz],sit,via});const gap=[[-.02,.03],[-.02,-.66]];
  drafting(B,-.42,-.38,1);P('planche',-.42,-.62,0,1,1,gap);drafting(B,.38,-.38,1);P('planche',.38,-.62,0,1,1,gap);drafting(B,-.4,.5,1);P('planche',-.4,.26,0,1,1);
  // l'établi, la maquette (un fusil de bois et d'acier), un étau
  {const L=at(B,.45,.5,1);legs(L,.42,.3,.18);L.box(0,Y0+.18,0,.44,.03,.32,C.woodL).box(-.12,Y0+.21,.02,.06,.05,.06,C.steelD);
    L.box(.05,Y0+.215,-.02,.3,.02,.04,C.wood).box(.1,Y0+.235,-.02,.22,.014,.014,C.steelD).box(-.1,Y0+.215,-.02,.08,.035,.035,C.woodD);P('maquette',.45,.26,0,1);}
  // les plans épinglés au fond et à gauche
  for(let k=0;k<4;k++)B.box(-.62+k*.38,.34+(k%2)*.06,-D/2+.12,.26,.18,.006,k%2?C.blueprint:C.paper);for(let k=0;k<3;k++)B.box(-W/2+.12,.32+(k%2)*.07,-.55+k*.42,.006,.18,.26,k%2?C.paper:C.blueprint);
  P('plans',-.02,-.8,0,-1,0,gap);shelf(B,-W/2+.2,.15,.5,.5,0,4);
  return {geo:B.geo(),st,door:S.door,aisle:{z:.03}};}

const MAKE={centre_recherche:centreInterior,labo:laboInterior,armurerie:bureauInterior};
// les intérieurs, prêts pour la scène : { ':in_<bâtiment>': {ext, geo, st, door} }
export function labInteriors(){const out={};for(const [k,mk] of Object.entries(MAKE)){const [W,D]=BUILDINGS[k].size;const m=mk(W,D);const b=m.geo.boundingBox;out[':in_'+k]={ext:[b.max.x-b.min.x,b.max.y,b.max.z-b.min.z],...m};}return out;}
