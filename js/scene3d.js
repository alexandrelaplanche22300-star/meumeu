// Le rendu 3D du jeu : les mêmes bâtiments, unités, arbres et véhicules que la vue 2D, mais en vrais volumes éclairés, avec ombres.
// La caméra est orthographique et réglée pour retrouver exactement l'isométrique de la vue (toScreen / toWorld) : tout ce que la vue dessine
// en 2D par-dessus (barres de vie, brouillard, effets, sélection) reste donc parfaitement calé sur la scène 3D.
// Repère : x,y du monde → X,Z de la scène ; la hauteur h (en « tuiles de 32 px » de la vue) → Y = h·0,8165.
// Les foules (Meumeu, Bèè, arbres, rochers) sont dessinées par instances : un seul appel de dessin par modèle. La marche est animée dans le
// vertex shader (jambes, bras, rebond) d'après la distance parcourue — pas de squelette, donc pas de poids en plus.
import * as THREE from './lib/three.module.js';
import {loadModel,materialOf} from './mesh3d.js';
import {T,DAY,ORE_COL,CARRY,BUILDINGS} from './data.js';
import {gunModel} from './gun3d.js';
import {layout} from './gunart.js';
import {VEHDEF} from './vehicules.js';
import {buildingModels,aztecModels} from './bldg3d.js';
import {bunkerModels,bunkerDoorGeo,bunkerRoofGeo} from './bunker3d.js';
import {bargeModel,bateauModel,grandeBargeModel} from './barge3d.js';
import {deckSlots,MEU_R} from './naval.js';

export const HK=Math.sqrt(2/3);
// (V12.5) le bras droit des tenues du joueur (soldat camouflé, élite à cape), détaché au rendu seulement — le modèle n'est pas modifié : les triangles
// que choisit `sel` (centre du triangle x, y, z ; couleur moyenne r, g, b de 0 à 1) forment le bras, le reste le corps. Le bras pivote d'un bloc à l'épaule
// (le haut de la sélection, vers le corps) ; la main est son point le plus éloigné de l'épaule. Rend {body, arm:{geo,pivot,rest,len}} ou null.
const SKIN_ARM={
  meumeu_soldat:(x,y,z,r,g,b,W,H)=>x<-W*.27&&y>H*.28&&y<H*.68,
  plush_cow_knight:(x,y,z,r,g,b)=>x<-.05&&x>-.16&&y>.15&&y<.3&&z>.08&&r>.6&&Math.abs(r-b)>.05};
function skinRig(M,sel){const g=M?.geo;if(!g?.index||!sel)return null;const P=g.attributes.position,C=g.attributes.color,I=g.index.array,[W,H]=M.ext;
  const body=[],arm=[];for(let t=0;t<I.length;t+=3){let x=0,y=0,z=0,r=0,gg=0,b=0;for(let q=0;q<3;q++){const v=I[t+q];x+=P.getX(v)/3;y+=P.getY(v)/3;z+=P.getZ(v)/3;if(C){r+=C.getX(v)/3;gg+=C.getY(v)/3;b+=C.getZ(v)/3;}}
    // (les couleurs de sommets sont linéaires — LIN dans mesh3d.js ; la règle se lit en couleurs d'écran)
    const sr=Math.pow(r,1/2.2),sg=Math.pow(gg,1/2.2),sb=Math.pow(b,1/2.2);(sel(x,y,z,sr,sg,sb,W,H)?arm:body).push(I[t],I[t+1],I[t+2]);}
  if(arm.length<30)return null;
  const vs=[...new Set(arm)];let top=-9;for(const v of vs)top=Math.max(top,P.getY(v));
  let px=0,py=0,pz=0,n=0;for(const v of vs)if(P.getY(v)>top-.04*H){px+=P.getX(v);py+=P.getY(v);pz+=P.getZ(v);n++;}const pivot=[px/n*.8,py/n-.02*H,pz/n];
  let far=0,hand=null;for(const v of vs){const d=Math.hypot(P.getX(v)-pivot[0],P.getY(v)-pivot[1],P.getZ(v)-pivot[2]);if(d>far){far=d;hand=[P.getX(v),P.getY(v),P.getZ(v)];}}
  const bg=g.clone();bg.setIndex(body);const ag=g.clone();ag.translate(-pivot[0],-pivot[1],-pivot[2]);ag.setIndex(arm);
  return {body:bg,arm:{geo:ag,pivot,rest:new THREE.Vector3(hand[0]-pivot[0],hand[1]-pivot[1],hand[2]-pivot[2]),len:far}};}
const PI=Math.PI;
// un modèle par bâtiment : [modèle, part de l'empreinte occupée, rotation (quarts de tour), hauteur maximale en unités]
// (V12.5, demande du joueur) tous les bâtiments en modèles faits par le code — low poly, la palette du jeu (bldg3d.js) — sauf le moulin, qui garde le modèle du joueur
export const BUILDING_MODEL={
  centre:[':centre',1.0,0],camp:[':camp',1.0,0],maison:[':maison',1.0,0],ferme:[':ferme',1.0,0],grenier:[':grenier',1.0,0],atelier:[':atelier',1.0,0],four:[':four',1.0,0],mine:[':mine',1.0,0],gare:[':gare',1.0,0],entrepot:[':entrepot',1.0,0],labo:[':labo',1.0,0],caserne:[':caserne',1.0,0],caserne_elite:[':caserne_elite',1.0,0],poudrerie:[':poudrerie',1.0,0],arsenal:[':arsenal',1.0,0],armurerie:[':armurerie',1.0,0],manufacture:[':manufacture',1.0,0],garage:[':garage',1.0,0],hopital:[':hopital',1.0,0],tente:[':tente',1.0,0],archives:[':archives',1.0,0],fonderie:[':fonderie',1.0,0],
  moulin:['windmill',.8,0],barge:[':barge_chantier',1.0,0],grande_barge:[':grande_barge_chantier',1.0,0],bateau_bee:[':bateau_chantier',1.0,2],tour:[':tour',.8,0]};
export const OUTCROP_MODEL={fer:'rocky_outcrop',charbon:'lava_rock',pierre:'stone_rock_pile',cuivre:'crystal_rock',plomb:'rock_formation',salpetre:'multicolored_crystal_pile',or:'rock_with_gold_veins'};
export const MODEL_NAMES=[...new Set([...Object.values(BUILDING_MODEL).map(b=>b[0]).filter(n=>n[0]!==':'),...Object.values(OUTCROP_MODEL),'meumeu','meumeu_soldat','plush_cow_knight','goat_plush_toy','gewehr_43_rifle','heavy_machine_gun','assault_rifle','vintage_military_jeep_logistic_unarmed','vintage_military_logistic_jeep_with_gun','ww2_locomotive','ww2_wagon','armored_car','stone_rock_pile','silbervogel_bomber_3d_model',...Object.values(VEHDEF).map(V=>V.modele).filter(n=>n&&n[0]!==":")])];

// ---- petites géométries de code : arbres, buisson (couleurs de sommets)
const colored=(g,hex)=>{const c=new THREE.Color(hex);const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[3*i]=c.r;a[3*i+1]=c.g;a[3*i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;};
const merge=gs=>{const ps=[],cs=[];for(let g of gs){g=g.index?g.toNonIndexed():g;ps.push(g.attributes.position.array);cs.push(g.attributes.color.array);}
  const cat=(arrs)=>{const n=arrs.reduce((a,b)=>a+b.length,0),o=new Float32Array(n);let k=0;for(const a of arrs){o.set(a,k);k+=a.length;}return o;};
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(cat(ps),3));out.setAttribute('color',new THREE.BufferAttribute(cat(cs),3));out.computeVertexNormals();return out;};
const at=(g,x,y,z)=>{g.translate(x,y,z);return g;};
// V12.4 : les projectiles en 3D — un obus (corps, ceinture de cuivre, ogive) et une fusée (corps, ogive, quatre ailettes), le long de +Z, longueur 1, diamètre 1
const PROJ_GEO={
  obus:()=>merge([colored(at(new THREE.CylinderGeometry(.5,.5,.6,10).rotateX(PI/2),0,0,-.1),0xffffff),colored(at(new THREE.CylinderGeometry(.53,.53,.06,10).rotateX(PI/2),0,0,-.28),0xc8874a),
    colored(at(new THREE.ConeGeometry(.5,.4,10).rotateX(PI/2),0,0,.4),0xdedede)]),
  fusee:()=>{const L=[colored(at(new THREE.CylinderGeometry(.5,.5,.72,8).rotateX(PI/2),0,0,-.04),0xffffff),colored(at(new THREE.ConeGeometry(.5,.28,8).rotateX(PI/2),0,0,.46),0xd0d0d0)];
    for(let k=0;k<4;k++){const f=new THREE.BoxGeometry(.06,.55,.3);f.translate(0,.45,-.32);f.rotateZ(k*PI/2);L.push(colored(f,0x9a9a90));}return merge(L);}};
const TREE_GEO={
  feuillu:()=>merge([colored(at(new THREE.CylinderGeometry(.07,.11,.7,5),0,.35,0),0x6b4a2c),colored(at(new THREE.IcosahedronGeometry(.55,0),0,1.05,0),0x4f8a3a),colored(at(new THREE.IcosahedronGeometry(.38,0),.22,1.45,.1),0x5b9a44)]),
  conifere:()=>merge([colored(at(new THREE.CylinderGeometry(.06,.09,.5,5),0,.25,0),0x5e4026),colored(at(new THREE.ConeGeometry(.5,.8,6),0,.85,0),0x2f6a3c),colored(at(new THREE.ConeGeometry(.38,.7,6),0,1.35,0),0x387a45),colored(at(new THREE.ConeGeometry(.24,.55,6),0,1.78,0),0x428a50)]),
  palmier:()=>merge([colored(at(new THREE.CylinderGeometry(.05,.09,1.3,5),.06,.65,0),0x8a6a3c),colored(at(new THREE.ConeGeometry(.6,.25,7),.1,1.4,0),0x5f9a3a),colored(at(new THREE.ConeGeometry(.35,.3,7),.1,1.6,0),0x6daa44)]),
  sec:()=>merge([colored(at(new THREE.CylinderGeometry(.05,.1,1.2,5),0,.6,0),0x6a5a48),colored(at(new THREE.CylinderGeometry(.02,.04,.6,4),.25,1.1,0).rotateZ(-.9),0x6a5a48),colored(at(new THREE.CylinderGeometry(.02,.04,.5,4),-.22,1.0,0).rotateZ(.9),0x6a5a48)]),
  buisson:()=>merge([colored(at(new THREE.IcosahedronGeometry(.34,0),0,.22,0),0x58933e),colored(at(new THREE.IcosahedronGeometry(.25,0),.25,.2,.1),0x64a048)])};
// (V12.5) les bras de la peluche meumeu : le modèle est fait de douze pièces cousues (corps, tête, jambes, oreilles, cornes, queue, bras) ; les deux bras
// sont des pièces à part (un morceau d'un seul tenant, sur un côté, entre 22 et 70 % de la hauteur). On les détache : le corps sans ses bras devient
// un modèle, chaque bras un autre, posé sur son épaule (le haut du bras) — il pivote d'un bloc, rien ne se déforme. Rend {body, bras:{'-1','1'}} ou null.
// (le côté −X est la droite de la Meumeu : elle regarde vers +Z)
function meumeuRig(M){const g=M?.geo;if(!g?.index)return null;const P=g.attributes.position,I=g.index.array,n=P.count,[W,H]=M.ext;
  const par=new Int32Array(n);for(let i=0;i<n;i++)par[i]=i;const f=x=>{while(par[x]!==x)x=par[x]=par[par[x]];return x;};
  for(let t=0;t<I.length;t+=3){const a=f(I[t]),b=f(I[t+1]),c=f(I[t+2]);par[a]=b;par[f(c)]=f(b);}
  const box=new Map();for(let v=0;v<n;v++){const r=f(v);let q=box.get(r);if(!q)box.set(r,q={mn:[9,9,9],mx:[-9,-9,-9]});for(let a=0;a<3;a++){const x=P.getComponent(v,a);if(x<q.mn[a])q.mn[a]=x;if(x>q.mx[a])q.mx[a]=x;}}
  const side=r=>{const q=box.get(r);if(!(q.mn[1]>H*.22&&q.mx[1]<H*.7))return 0;if(q.mn[0]>W*.15&&q.mx[0]>W*.4)return 1;if(q.mx[0]<-W*.15&&q.mn[0]<-W*.4)return -1;return 0;};
  const tri={body:[],'-1':[],'1':[]};for(let t=0;t<I.length;t+=3){const s=side(f(I[t]));tri[s?String(s):'body'].push(I[t],I[t+1],I[t+2]);}
  if(!tri['-1'].length||!tri['1'].length)return null;
  const body=g.clone();body.setIndex(tri.body);const bras={};
  for(const s of ['-1','1']){const q=box.get(f(tri[s][0])),top=q.mx[1],bot=q.mn[1];let px=0,py=0,pz=0,pn=0,hx=0,hy=0,hz=0,hn=0;
    for(const v of new Set(tri[s])){const x=P.getX(v),y=P.getY(v),z=P.getZ(v);if(y>top-.03*H){px+=x;py+=y;pz+=z;pn++;}if(y<bot+.03*H){hx+=x;hy+=y;hz+=z;hn++;}}
    const pivot=[px/pn,py/pn-.02*H,pz/pn],hand=[hx/hn,hy/hn,hz/hn];   // l'épaule : un peu sous le haut du bras ; la main : le bas du bras
    const geo=g.clone();geo.translate(-pivot[0],-pivot[1],-pivot[2]);geo.setIndex(tri[s]);
    bras[s]={geo,pivot,rest:new THREE.Vector3(hand[0]-pivot[0],hand[1]-pivot[1],hand[2]-pivot[2]),len:Math.hypot(hand[0]-pivot[0],hand[1]-pivot[1],hand[2]-pivot[2])};}
  return {body,bras};}
const CYL=(r0,r1,h,seg=6)=>new THREE.CylinderGeometry(r1,r0,h,seg);
const ANIMAL_GEO={
  biche:()=>{const c=0xb58a5a,d=0x8a6238;const g=[colored(at(new THREE.SphereGeometry(.32,8,6).scale(1.5,.8,.8),0,.62,0),c),colored(at(CYL(.07,.1,.5).rotateZ(-.55),.42,.92,0),c),colored(at(new THREE.SphereGeometry(.13,8,6).scale(1.3,1,.9),.62,1.12,0),d),colored(at(new THREE.SphereGeometry(.05,5,4),-.45,.72,0),0xf0e6d6)];
    for(const [x,z] of [[.3,.12],[.3,-.12],[-.3,.12],[-.3,-.12]])g.push(colored(at(CYL(.035,.05,.46),x,.23,z),d));return merge(g);},
  lapin:()=>{const c=0xcfc4b2;return merge([colored(at(new THREE.SphereGeometry(.17,8,6).scale(1.3,1,.9),0,.17,0),c),colored(at(new THREE.SphereGeometry(.09,8,6),.2,.27,0),c),colored(at(new THREE.SphereGeometry(.03,5,4).scale(1,3,1),.2,.4,.04),0xe8c8c0),colored(at(new THREE.SphereGeometry(.03,5,4).scale(1,3,1),.2,.4,-.04),0xe8c8c0),colored(at(new THREE.SphereGeometry(.05,5,4),-.2,.17,0),0xffffff)]);},
  charrette:()=>{const w=0x8a5a2e,d=0x5a3a1a;return merge([colored(at(new THREE.BoxGeometry(.9,.12,.55),0,.32,0),w),colored(at(new THREE.BoxGeometry(.9,.22,.04),0,.46,.26),w),colored(at(new THREE.BoxGeometry(.9,.22,.04),0,.46,-.26),w),colored(at(new THREE.BoxGeometry(.04,.22,.55),-.44,.46,0),w),
    colored(at(new THREE.CylinderGeometry(.27,.27,.06,12).rotateX(PI/2),0,.27,.33),d),colored(at(new THREE.CylinderGeometry(.27,.27,.06,12).rotateX(PI/2),0,.27,-.33),d),colored(at(new THREE.BoxGeometry(.6,.04,.04),.75,.32,.2),d),colored(at(new THREE.BoxGeometry(.6,.04,.04),.75,.32,-.2),d)]);},
  buche:()=>merge([colored(at(new THREE.CylinderGeometry(.055,.055,.56,7).rotateZ(PI/2),0,0,0),0x7a5432),colored(at(new THREE.CylinderGeometry(.045,.045,.02,7).rotateZ(PI/2),.285,0,0),0xd8b47a),colored(at(new THREE.CylinderGeometry(.045,.045,.02,7).rotateZ(PI/2),-.285,0,0),0xd8b47a)]),
  caillou:()=>boulder(9),
  sac:()=>merge([colored(at(new THREE.SphereGeometry(.14,9,7).scale(1,1.15,.85),0,.08,0),0xc9b48a),colored(at(new THREE.CylinderGeometry(.04,.06,.06,7),0,.23,0),0x8a7450)]),
  tonnelet:()=>merge([colored(at(new THREE.CylinderGeometry(.11,.11,.22,10),0,.11,0),0x8d6a3a),colored(at(new THREE.CylinderGeometry(.115,.115,.025,10),0,.05,0),0x3a3a36),colored(at(new THREE.CylinderGeometry(.115,.115,.025,10),0,.17,0),0x3a3a36)]),
  obus:()=>merge([colored(at(new THREE.CylinderGeometry(.06,.06,.22,9).rotateZ(PI/2),0,0,0),0x7b7a52),colored(at(new THREE.CylinderGeometry(.062,.062,.04,9).rotateZ(PI/2),-.1,0,0),0xd8b04a),colored(at(new THREE.ConeGeometry(.06,.1,9).rotateZ(-PI/2),.16,0,0),0x55553a)]),
  caisse:()=>merge([colored(at(new THREE.BoxGeometry(.2,.17,.16),0,.085,0),0x8a6a3a),colored(at(new THREE.BoxGeometry(.21,.03,.17),0,.17,0),0xa88048)]),
  poteau:()=>colored(at(new THREE.BoxGeometry(.06,.5,.06),0,.25,0),0x91603b),
  lisse:()=>colored(at(new THREE.BoxGeometry(1,.04,.04),.5,0,0),0x91603b)};
const TOWER_GEO=()=>{const st=0x8d8a82,st2=0x76736b,rf=0x7a3f2a;const g=[colored(at(new THREE.CylinderGeometry(.34,.44,1.25,9),0,.625,0),st),colored(at(new THREE.CylinderGeometry(.46,.4,.16,9),0,1.3,0),st2)];
  for(let k=0;k<9;k++){const a=k/9*PI*2;g.push(colored(at(new THREE.BoxGeometry(.16,.16,.1).rotateY(-a),Math.cos(a)*.44,1.46,Math.sin(a)*.44),st));}
  g.push(colored(at(new THREE.ConeGeometry(.34,.45,9),0,1.63,0),rf),colored(at(new THREE.BoxGeometry(.2,.34,.06),0,.17,.42),0x2e2118),colored(at(new THREE.BoxGeometry(.05,.12,.05),.3,.85,.36),0x1c1a18),colored(at(new THREE.BoxGeometry(.05,.12,.05),-.3,.85,.36),0x1c1a18));return merge(g);};
// un bloc de roche : une icosphère écrasée dont chaque sommet est déplacé (le même déplacement pour un même point : pas de trou), teintée du gris chaud au clair
const boulder=seed=>{const g=new THREE.IcosahedronGeometry(.5,1);const pos=g.attributes.position,n=pos.count,col=new Float32Array(n*3);
  const hh=(x,y,z)=>{const s=Math.sin(x*127.1+y*311.7+z*74.7+seed*13.37)*43758.5453;return s-Math.floor(s);};
  for(let i=0;i<n;i++){let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);const k=.74+.5*hh(Math.round(x*9)/9,Math.round(y*9)/9,Math.round(z*9)/9);x*=k*(1+.15*(seed%3-1));y*=k*.64;z*=k;y=Math.max(y,-.05);pos.setXYZ(i,x,y,z);
    const t=Math.max(0,Math.min(1,(y+.1)/.42)),n2=hh(x*5,y*5,z*5)*.12;const c=new THREE.Color().setRGB(.30+.30*t+n2,.29+.28*t+n2,.26+.24*t+n2*.8);if(t>.75&&seed%2===0)c.lerp(new THREE.Color(0x5d7a3c),.25);col[3*i]=c.r;col[3*i+1]=c.g;col[3*i+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g;};
const TREE_KIND=name=>/fir|pine|spruce|snow/.test(name)?'conifere':/palm|banana|umbrella/.test(name)?'palmier':/dead|cypress|bamboo/.test(name)?'sec':'feuillu';

// ---- le brouillard de guerre DANS la scène (V12.5) : chaque fragment prend le brouillard de SA case (la carte du brouillard, une texture N × N, lue à la
// position monde x, z). Avant, un calque plat posé sur l'image coupait les arbres et les toits en bandes : un arbre vu dépassait dans une case cachée de l'écran.
// Le matériau garde ses propres retouches (l'animation des peluches) : on les enchaîne, et la clé de programme les distingue.
function fowMaterial(m,U){const prev=m.onBeforeCompile,key0=m.customProgramCacheKey();
  m.onBeforeCompile=function(sh,r){if(prev)prev.call(this,sh,r);sh.uniforms.fowMap=U.map;sh.uniforms.fowN=U.N;sh.uniforms.fowOn=U.on;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vFow;')
      .replace('#include <project_vertex>','#include <project_vertex>\n{vec4 fw=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nfw=instanceMatrix*fw;\n#endif\nfw=modelMatrix*fw;vFow=fw.xz;}');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vFow;uniform sampler2D fowMap;uniform float fowN;uniform float fowOn;')
      .replace('#include <dithering_fragment>','#include <dithering_fragment>\nif(fowOn>.5){float fa=texture2D(fowMap,vFow/fowN).a;gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.024,.047,.071),fa);}');};
  m.customProgramCacheKey=()=>key0+'|fow';m.needsUpdate=true;}

// ---- un groupe d'instances (un seul dessin pour des centaines de copies)
class Pool{
  constructor(geo,{cap=1024,anim=null,flat=true,color=true,ghost=false,base=null}={}){
    const g=geo.clone();this.cap=cap;this.n=0;
    this.anim=anim;if(anim)g.setAttribute('aAnim',new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4));
    let mat=(base||materialOf(flat)).clone();   // base : le matériau texturé d'un modèle cuit (V12.4), sinon les couleurs de sommets
    if(anim){const {H,W}=anim,AK=anim.AK||[.16,.30,1.35,0];mat.onBeforeCompile=sh=>{sh.uniforms.uH={value:H};sh.uniforms.uW={value:W};sh.uniforms.uAK={value:new THREE.Vector4(...AK)};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aAnim;uniform float uH;uniform float uW;uniform vec4 uAK;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      {float hN=position.y/uH;float ph=aAnim.x,amp=aAnim.y;float sg=position.x>0.?0.:3.14159;float sa=position.x>0.?3.14159:0.;
       float leg=max(0.,1.-hN/.30);transformed.z+=sin(ph+sg)*amp*leg*uH*.20;transformed.y+=max(0.,cos(ph+sg))*amp*leg*uH*.05;
       float arm=smoothstep(.30,.42,hN)*(1.-smoothstep(.62,.80,hN))*smoothstep(uW*.16,uW*.30,abs(position.x));
       transformed.y+=abs(sin(ph))*amp*uH*.028;transformed.x+=sin(ph)*amp*uH*.012;
       // les bras se lèvent vers l'avant autour des épaules (arme tenue, charge portée) ; le recul pousse le haut du corps en arrière
       float am=0.;if(am>.001){float mk=smoothstep(uW*uAK.x,uW*uAK.y,abs(position.x))*smoothstep(.26,.40,hN)*(1.-smoothstep(.70,.84,hN));
         if(mk>.001){vec3 S=vec3(sign(position.x)*uW*.22,uH*.62,0.);vec3 v=transformed-S;float a=-am*uAK.z*mk;float c=cos(a),s2=sin(a);transformed=S+vec3(v.x,v.y*c-v.z*s2,v.y*s2+v.z*c);}}
       transformed.z+=am*uH*uAK.w*smoothstep(.35,.9,hN);float kk=0.;if(kk>.001){transformed.z-=kk*uH*.10*(.3+.7*hN);transformed.y-=kk*uH*.02*hN;}}`);};}
    // ghost : la variante transparente (les arbres autour de nos unités et des ennemis repérés) — sans ombre portée, sans masquer ce qui est derrière
    if(ghost){mat.transparent=true;mat.opacity=.22;mat.depthWrite=false;}
    this.mesh=new THREE.InstancedMesh(g,mat,cap);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.castShadow=!ghost;this.mesh.receiveShadow=false;if(ghost)this.mesh.renderOrder=2;
    this.mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3).fill(1),3);
    this.m=new THREE.Matrix4();this.q=new THREE.Quaternion();this.p=new THREE.Vector3();this.s=new THREE.Vector3();this.e=new THREE.Euler();this.c=new THREE.Color();}
  begin(){this.n=0;}
  add(x,y,z,yaw,sx,sy,sz,{tint=null,ph=0,amp=0,pitch=0,roll=0,arm=0,kick=0,q=null}={}){
    if(this.n>=this.cap)return;const i=this.n++;if(q)this.q.copy(q);else{this.e.set(pitch,yaw,roll,'YXZ');this.q.setFromEuler(this.e);}this.p.set(x,y,z);this.s.set(sx,sy,sz);this.m.compose(this.p,this.q,this.s);this.mesh.setMatrixAt(i,this.m);
    if(tint!==null){this.c.setHex(tint);this.mesh.instanceColor.setXYZ(i,this.c.r,this.c.g,this.c.b);}else this.mesh.instanceColor.setXYZ(i,1,1,1);
    if(this.anim){const a=this.mesh.geometry.attributes.aAnim;a.setXYZW(i,ph,amp*(1-.85*arm),arm,kick);}}
  end(){this.mesh.count=this.n;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;if(this.anim)this.mesh.geometry.attributes.aAnim.needsUpdate=true;}
}

export class Scene3D{
  constructor(models){
    this.M=models;      // nom → {ext,half,geo}
    const cv=document.createElement('canvas');this.cv=cv;
    this.r=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true,premultipliedAlpha:true});
    this.r.setClearColor(0x000000,0);this.r.shadowMap.enabled=true;this.r.shadowMap.type=THREE.PCFSoftShadowMap;this.r.setPixelRatio(1);
    this.scene=new THREE.Scene();
    this.cam=new THREE.OrthographicCamera(-10,10,10,-10,-600,600);
    // La lumière vient du côté de la caméra (V12.3) : la vue isométrique montre les faces +X et +Z ; avant, le soleil venait de −X −Z et tout ce que le
    // joueur voyait des murs et des peluches était à contre-jour, éclairé par le seul ciel chaud (mesuré : 58 % de la couleur propre, décalé vers l'orange).
    // Les ombres partent vers le haut de l'écran, derrière les objets. (Lumières physiques de three.js : une intensité π rend la couleur telle quelle.)
    this.sunOff=[43,47,29];
    this.hemi=new THREE.HemisphereLight(0xfcfbf7,0x9a9a90,2.0);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight(0xfff8ef,2.2);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.bias=-.0008;this.sun.shadow.normalBias=.04;this.scene.add(this.sun,this.sun.target);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.ShadowMaterial({opacity:.4}));sh.rotation.x=-PI/2;sh.receiveShadow=true;this.scene.add(sh);
    this.fowU={map:{value:null},N:{value:1},on:{value:0}};this.fowMats=new WeakSet();this.fowTex=null;
    this.pools={};this.kicks=new Map();this.shellCarrier=new Map();this.guns=new Map();this.blds=new Map();this.vehs=new Map();this.yaw=new Map();this.tintMats=new Map();
    const mk=(name,opt)=>{const m=this.M[name];const p=new Pool(m.geo,{...opt,base:m.mat||null});this.scene.add(p.mesh);return p;};
    const ch=n=>({H:this.M[n].ext[1],W:this.M[n].ext[0]});
    for(const k of ['feuillu','conifere','palmier','sec','buisson']){const p=new Pool(TREE_GEO[k](),{cap:3000});this.pools[k]=p;this.scene.add(p.mesh);
      const q=new Pool(TREE_GEO[k](),{cap:800,ghost:true});this.pools[k+'_g']=q;this.scene.add(q.mesh);}
    for(const k of ['biche','lapin','charrette','caisse','poteau','lisse','buche','caillou','sac','tonnelet','obus']){const p=new Pool(ANIMAL_GEO[k](),{cap:k==='poteau'||k==='lisse'?4000:k==='caisse'||k==='buche'||k==='caillou'||k==='sac'?1500:600,flat:true});this.pools[k]=p;this.scene.add(p.mesh);}
    this.pools.avion=mk('silbervogel_bomber_3d_model',{cap:60});
    this.pools.meumeu=mk('meumeu',{cap:1200,anim:ch('meumeu')});
    // (V12.5) le soldat meumeu qui tient son arme : le corps sans les bras, et ses deux bras, des pièces à part qui pivotent d'un bloc à l'épaule
    this.skinRigs={};for(const mod of Object.keys(SKIN_ARM)){const R=this.M[mod]&&skinRig(this.M[mod],SKIN_ARM[mod]);if(!R)continue;this.skinRigs[mod]=R;
      for(const [k,geo,anim] of [['skC_'+mod,R.body,ch(mod)],['skA_'+mod,R.arm.geo,null]]){const p=new Pool(geo,{cap:1200,anim,base:this.M[mod].mat||null});this.pools[k]=p;this.scene.add(p.mesh);}}
    this.rig=meumeuRig(this.M.meumeu);if(this.rig){const mat=this.M.meumeu.mat||null;for(const [k,geo,anim] of [['corps',this.rig.body,ch('meumeu')],['brasD',this.rig.bras['-1'].geo,null],['brasG',this.rig.bras['1'].geo,null]]){const p=new Pool(geo,{cap:1200,anim,base:mat});this.pools[k]=p;this.scene.add(p.mesh);}}
    // V12.4 : les modèles donnés par le joueur — le soldat meumeu (casque compris) et la troupe de choc (chevalier à cape) ; à défaut, la peluche
    this.pools.soldat=this.M.meumeu_soldat?mk('meumeu_soldat',{cap:1200,anim:ch('meumeu_soldat')}):this.pools.meumeu;
    this.pools.choc=this.M.plush_cow_knight?mk('plush_cow_knight',{cap:400,anim:ch('plush_cow_knight')}):this.pools.soldat;this.pools.bee=mk('goat_plush_toy',{cap:1500,anim:ch('goat_plush_toy')});
    this.pools.obus3d=new Pool(PROJ_GEO.obus(),{cap:300});this.scene.add(this.pools.obus3d.mesh);this.pools.fusee3d=new Pool(PROJ_GEO.fusee(),{cap:300});this.scene.add(this.pools.fusee3d.mesh);
    this.booms=[];this.boomGeo={ball:new THREE.IcosahedronGeometry(1,2),ring:new THREE.RingGeometry(.86,1,56).rotateX(-PI/2),dome:new THREE.SphereGeometry(1,16,8,0,PI*2,0,PI/2)};
    this.pools.fusil=mk('gewehr_43_rifle',{cap:1500});this.pools.mg=mk('heavy_machine_gun',{cap:200});
    for(let k=0;k<3;k++){const p=new Pool(boulder(k+1),{cap:1400});this.pools['rock'+k]=p;this.scene.add(p.mesh);}
    this.M[':tour']={ext:[.9,1.8,.9],geo:TOWER_GEO()};Object.assign(this.M,buildingModels(),aztecModels(),bunkerModels());this.M[':barge']=bargeModel();this.M[':grande_barge']=grandeBargeModel();this.M[':bateau_bee']=bateauModel();this.M[':barge_chantier']={ext:this.M[':barge'].ext,geo:this.M[':barge'].full};this.M[':grande_barge_chantier']={ext:this.M[':grande_barge'].ext,geo:this.M[':grande_barge'].full};this.M[':bateau_chantier']={ext:this.M[':bateau_bee'].ext,geo:this.M[':bateau_bee'].geo};this.doorGeo=bunkerDoorGeo();this.doorMat=new THREE.MeshStandardMaterial({color:0x50565a,roughness:.7,metalness:.4});
    for(const [res,name] of Object.entries(OUTCROP_MODEL)){this.pools['ore_'+res]=mk(name,{cap:300});}
    this.pools.jeep=mk('vintage_military_jeep_logistic_unarmed',{cap:40});this.pools.loco=mk('ww2_locomotive',{cap:20});this.pools.wagon=mk('ww2_wagon',{cap:200});
    this.ok=true;
  }
  static async create(){const M={};await Promise.all(MODEL_NAMES.map(async n=>{try{M[n]=await loadModel(n,'assets3d/');}catch(e){console.warn('modèle 3D manquant',n);}}));return new Scene3D(M);}

  setCamera(view){
    const z=view.z(),cw=view.canvas.width,ch=view.canvas.height;if(this.cv.width!==cw||this.cv.height!==ch)this.r.setSize(cw,ch,false);
    const s=45.2548*z,hw=cw/2/s,hh=ch/2/s,dx=view.sx/s,dy=view.sy/s;
    this.cam.left=-hw-dx;this.cam.right=hw-dx;this.cam.top=hh+dy;this.cam.bottom=-hh+dy;
    // V12.4 : la caméra libre — azimut π/4 + yaw, élévation elev (30° d'origine : la direction (0,612 ; 0,5 ; 0,612)) ; le soleil tourne avec elle (toujours
    // du côté de la caméra, comme le veut K4) ; mêmes formules que View.toScreen
    const yaw=view.yaw||0,el=view.elev??Math.asin(.5),f=PI/4+yaw;
    const tx=view.cx,tz=view.cy,D=160;this.cam.position.set(tx+Math.cos(el)*Math.sin(f)*D,Math.sin(el)*D,tz+Math.cos(el)*Math.cos(f)*D);this.cam.lookAt(tx,0,tz);this.cam.updateProjectionMatrix();this.cam.updateMatrixWorld();
    const cy=Math.cos(yaw),sy=Math.sin(yaw),so=this.sunOff,sx0=so[0]*cy+so[2]*sy,sz0=-so[0]*sy+so[2]*cy;
    this.sun.position.set(tx+sx0,so[1],tz+sz0);this.sun.target.position.set(tx,0,tz);this.sun.target.updateMatrixWorld();
    const c=this.sun.shadow.camera,R=Math.max(hw,hh)*1.25+4;c.left=-R;c.right=R;c.top=R;c.bottom=-R;c.near=1;c.far=260;c.updateProjectionMatrix();
  }

  // un coup de feu : le corps et l'arme reculent (les évènements « shot » de la vue l'appellent)
  kick(id,e){if(e.veh!=null){this.kicks.set('v'+e.veh+':'+e.mount,{t:0,L:Math.max(.008,Math.min(.12,(e.cal||2)/250))});return;}const amp=Math.max(.15,Math.min(1,Math.log10(1+(e.E||30))/5))*(e.arc?1.25:1);this.kicks.set(id,{t:0,amp:Math.min(1,amp)});}
  designOf(W,id){try{return W.W(id);}catch(e){return null;}}
  // l'arme conçue, en 3D : un groupe d'instances par conception ; une pièce sert posée devant son tireur, une arme d'épaule est tenue
  // (V12.5) le soldat meumeu tient son arme, droite dans l'axe de son corps : à la hanche, sur le flanc droit, à l'horizontale ; en visée, la crosse à
  // l'épaule ; au rechargement le canon pique du nez. Seul le bras droit tient l'arme (demande du joueur) : il pivote d'un bloc autour de son épaule,
  // la main à la poignée ; le bras gauche reste au repos le long du corps. Le fusil (aussi long que la Meumeu est haute) ne traverse pas le corps.
  holdGun(u,D,H,Hmod,sc,yaw,ux,uy,pose,st){const P=this.pools,R=this.rig,cr=pose==='crouch'?.72:1,hx=Math.sin(yaw),hz=Math.cos(yaw),PI2=PI/2;
    const bob=Math.abs(Math.sin(st.ph))*st.amp*Hmod*.028,sway=Math.sin(st.ph)*st.amp*Hmod*.012;   // (le rebond de la marche, comme le corps, en unités du modèle)
    P.corps.add(ux,0,uy,yaw,sc,sc*cr,sc,{tint:st.tint,ph:st.ph,amp:st.amp,kick:st.kick});
    const toW=(x,y,z)=>[ux+((x+sway)*hz+z*hx)*sc,(y*cr+bob)*sc,uy+(-(x+sway)*hx+z*hz)*sc];   // repère du modèle (+Z devant) → monde
    const k=st.reloading?Math.sin(st.rp*PI):0,kick=st.kick||0,G=layout(D),sMm=H/300*(D.pistol?.82:1.12),grip=(G.rs||60)*sMm/sc;   // (la poignée : au bout de la crosse)
    // la poignée (repère du modèle) : à la hanche, ou à l'épaule en visée ; un peu plus bas au rechargement ; reculée par le coup
    const gp=st.aiming?[-.165*Hmod/.752,.40*Hmod/.752,.16*Hmod/.752]:[-.17*Hmod/.752,(.30-.04*k)*Hmod/.752,.17*Hmod/.752];gp[2]-=kick*.03*Hmod;
    const qy=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),qa=new THREE.Quaternion(),q=new THREE.Quaternion(),v=new THREE.Vector3();
    for(const [s,pool,tgt] of [['-1',P.brasD,gp],['1',P.brasG,null]]){const A=R.bras[s],pv=A.pivot;
      if(tgt){v.set(tgt[0]-pv[0],tgt[1]*cr-pv[1]*cr,tgt[2]-pv[2]).normalize();qa.setFromUnitVectors(A.rest.clone().normalize(),v);q.copy(qy).multiply(qa);}else q.copy(qy);
      const w=toW(pv[0],pv[1],pv[2]);pool.add(w[0],w[1],w[2],0,sc,sc,sc,{tint:st.tint,q});}
    // le fusil : sa crosse à « grip » derrière la poignée, l'axe juste au-dessus des mains, le canon vers l'avant
    const b=toW(gp[0],gp[1]+.02*Hmod,gp[2]-grip);{const e=this.gunEntry(u,D);if(e.pool)e.pool.add(b[0],b[1],b[2],yaw-PI2,sMm,sMm,sMm,{roll:-.35*k});}}
  // (V12.5, demande du joueur : « le bras en avant, tendu ») une tenue du joueur tient son arme d'épaule bras droit tendu devant elle : le corps (sans le bras
  // droit), puis le bras qui pivote d'un bloc à l'épaule pour pointer droit devant (un peu plus haut en visée), la poignée dans la main au bout du bras,
  // l'arme droite dans l'axe ; le canon pique du nez au rechargement. Le modèle de la tenue n'est pas modifié.
  holdSkin(u,D,H,Hmod,sc,yaw,ux,uy,pose,mod,st){const R=this.skinRigs[mod],A=R.arm,cr=pose==='crouch'?.72:1,hx=Math.sin(yaw),hz=Math.cos(yaw);
    const bob=Math.abs(Math.sin(st.ph))*st.amp*Hmod*.028,sway=Math.sin(st.ph)*st.amp*Hmod*.012;
    this.pools['skC_'+mod].add(ux,0,uy,yaw,sc,sc*cr,sc,{tint:st.tint,ph:st.ph,amp:st.amp,kick:st.kick});
    const toW=(x,y,z)=>[ux+((x+sway)*hz+z*hx)*sc,(y*cr+bob)*sc,uy+(-(x+sway)*hx+z*hz)*sc];
    const k=st.reloading?Math.sin(st.rp*PI):0,dir=new THREE.Vector3(0,st.aiming?.12:-.06,1).normalize();
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw).multiply(new THREE.Quaternion().setFromUnitVectors(A.rest.clone().normalize(),dir));
    const pv=A.pivot,w=toW(pv[0],pv[1],pv[2]);this.pools['skA_'+mod].add(w[0],w[1],w[2],0,sc,sc,sc,{tint:st.tint,q});
    const hand=[pv[0]+dir.x*A.len,pv[1]+dir.y*A.len,pv[2]+dir.z*A.len],G=layout(D),sMm=H/300*1.12,grip=(G.rs||60)*sMm/sc,back=(st.kick||0)*.03*Hmod;
    const b=toW(hand[0],hand[1],hand[2]-grip-back);const e=this.gunEntry(u,D);if(e.pool)e.pool.add(b[0],b[1],b[2],yaw-PI/2,sMm,sMm,sMm,{roll:-.35*k});}
  // le modèle 3D d'une arme et son groupe d'instances (gardés par conception)
  gunEntry(u,D){const crew=D.crew>1;const key=u.w+'|'+JSON.stringify(D.p)+'|'+(D.mods||[]).join(',')+'|'+(crew?'m':'h');
    let e=this.guns.get(key);if(!e){try{const m=gunModel(D,{inhand:!crew});e={m,pool:new Pool(m.geo,{cap:300,flat:false})};this.scene.add(e.pool.mesh);}catch(err){console.warn('arme 3D',err);e={m:null,pool:null};}this.guns.set(key,e);}
    this.gunsUsed.add(e);return e;}
  putGun(u,D,H,yaw,pose,walking,st={}){
    const crew=D.crew>1,e=this.gunEntry(u,D);if(!e.pool)return;
    const sMm=H/300*(crew?.9:D.pistol?.82:1.12),th=yaw-PI/2,hx=Math.sin(yaw),hz=Math.cos(yaw),kick=st.kick||0;
    // une pièce servie : posée devant son tireur ; au tir elle glisse en arrière sur son affût
    if(crew){const back=kick*H*.22;e.pool.add(u.x-hx*back,(e.m.gh||0)*sMm,u.y-hz*back,th,sMm,sMm,sMm);return;}
    // une arme d'épaule : la crosse contre l'épaule, le garde-main dans les mains levées ; baissée en marche, inclinée au rechargement, relevée par le coup
    const aiming=st.aiming,rl=st.reloading,rp=st.rp||0;
    let hh=(pose==='prone'?.10:pose==='crouch'?.43:aiming?.56:walking?.44:.50)*H,back=(aiming?.08:.04)*H,side=(aiming?.08:.10)*H,roll=aiming?0:.42;
    if(rl){const k=Math.sin(rp*PI);hh-=k*.10*H;roll=-.55*k+.1*(1-k);back+=k*.03*H;}
    roll+=kick*.30;back+=kick*.11*H;hh+=kick*.02*H;
    e.pool.add(u.x-hx*back-hz*side,hh,u.y-hz*back+hx*side,th,sMm,sMm,sMm,{roll});
    // le chargeur qu'on va chercher à la ceinture : il monte à l'arme à mi-rechargement, puis redescend
    if(rl&&pose!=='down'){const k=Math.sin(rp*PI),bx=u.x+hx*.06*H-hz*side*1.5,bz=u.y+hz*.06*H+hx*side*1.5,gx=u.x-hx*back-hz*side+hx*.30*H*.6,gz=u.y-hz*back+hx*side+hz*.30*H*.6;
      this.pools.caisse.add(bx+(gx-bx)*k,.30*H+(hh-.04*H-.30*H)*k,bz+(gz-bz)*k,yaw,.6,.6,.6,{tint:0x55603c});}}
  // Un véhicule de combat : la caisse et ses pièces sur leurs pivots (roues, tourelle, armes), à la longueur voulue (V.long cases), teinte meumeu.
  // Les armes portées par la tourelle tournent avec elle ; chaque roue tourne sur son essieu selon la distance parcourue.
  vehicleGroup(V){const M=this.M[V.modele];if(!M?.parts)return null;const ax=V.avant[1]==='x'?0:2,sg=V.avant[0]==='+'?1:-1;const sc=V.long/M.ext[ax];
    const root=new THREE.Group(),body=new THREE.Group();body.scale.setScalar(sc);root.add(body);const mat=M.mat?M.mat:this.tinted(0xe4e8cc);
    const mk=p=>{const g=new THREE.Group();g.position.set(...p.pivot);const m=new THREE.Mesh(p.geo,mat);m.castShadow=true;m.receiveShadow=true;m.position.set(-p.pivot[0],-p.pivot[1],-p.pivot[2]);m.userData.base=m.position.clone();g.userData.mesh=m;g.add(m);return g;};
    const parts={};for(const p of M.parts){if(p.name==='caisse'){const m=new THREE.Mesh(p.geo,mat);m.castShadow=true;m.receiveShadow=true;body.add(m);continue;}parts[p.name]=mk(p);}
    if(parts.tourelle){body.add(parts.tourelle);const T0=M.byName.tourelle.pivot;for(const k of ['armes','canon'])if(parts[k]){const Pk=M.byName[k].pivot;parts[k].position.set(Pk[0]-T0[0],Pk[1]-T0[1],Pk[2]-T0[2]);parts.tourelle.add(parts[k]);}}
    for(const g of Object.values(parts))if(!g.parent)body.add(g);
    const wheels=Object.keys(parts).filter(k=>k.startsWith('roue')).map(k=>{const bb=M.byName[k].geo.boundingBox;return {g:parts[k],r:Math.max(.02,(bb.max.y-bb.min.y)/2*sc)};});
    root.userData={parts,wheels,ax,sg,body,mat,sc};return root;}
  // L'équipage d'un engin découvert (la jeep) : chacun à sa place, à la même échelle qu'à terre (le bas du corps caché par la caisse, le buste au-dessus) ;
  // le servant se tient derrière son arme et tourne avec elle autour du pivot. Dans un engin fermé, l'équipage ne se voit pas.
  // (V12.5) sur un bateau : les véhicules du pont à l'avant, les soldats en rangs serrés derrière eux (autant de files que la largeur en prend) ; le barreur à son
  // poste, le mitrailleur debout derrière sa pièce (il tourne avec elle) — les places viennent du modèle (seats)
  deckSlots(v,V,pax){const ids=(v.cargoVehs||[]).join(','),key=ids+'|'+pax+'|'+V.long;const C=(this.slotCache??=new Map()).get(v.id);if(C?.key===key)return C.slots;
    const c=Math.cos(v.h),s=Math.sin(v.h),m=MEU_R*.85;const rects=[];for(const id of v.cargoVehs||[]){const o=(this.vlist||[]).find(q=>q.id===id),D=o&&VEHDEF[o.k];if(!D)continue;const f=(o.x-v.x)*c+(o.y-v.y)*s;rects.push([f-D.long/2-m,f+D.long/2+m,D.large/2+m]);}
    const slots=deckSlots(V,rects,pax);
    this.slotCache.set(v.id,{key,slots});return slots;}
  vehCrew3d(v,V,P){if(V.nav==='eau'){if(!v.crew?.length||v.hp<=0)return;const Hm=this.M.meumeu.ext[1],c=Math.cos(v.h),s=Math.sin(v.h),S=this.M[V.modele]?.seats||{};
      const pax=v.crew.filter(u=>u.hp>0&&u.vrole==='passager').length,floor=V.pont?(V.long>4?.17:.155):.1,slots=this.deckSlots(v,V,pax);
      const guns=[...new Map(V.armes.filter(a=>a.piece.startsWith('affut')).map(a=>[a.piece,a])).values()];let n=0,g=0;const W=(f,sd)=>[v.x+c*f-s*sd,v.y+s*f+c*sd];
      for(const u of v.crew){if(u.hp<=0)continue;let x,y,yy=floor,a=v.h;
        if(u.vrole==='conducteur'){const p=S.pilot||[-V.long*.3,.1,0];[x,y]=W(p[0],p[2]);yy=p[1];}
        // le mitrailleur : debout dans sa cuve, derrière sa pièce, tourné avec elle
        else if(u.vrole==='servant'&&guns[g]){const A=guns[g],m=v.mounts?.find(q=>q.id===A.id),p=S.gunners?.[g]||[A.pos[0],A.pos[2]-.5,A.pos[1]];g++;a=v.h+(m?.yaw??A.repos??0);const [px,py]=W(p[0],p[2]);x=px-Math.cos(a)*.17;y=py-Math.sin(a)*.17;yy=p[1];}
        else{const q=slots[n%Math.max(1,slots.length)]||[0,0];n++;[x,y]=W(q[0],q[1]);}
        const sc=.5*(u.k==='villageois'?.92:1.02)/Hm,down=u.h?.state==='hors';
        P.meumeu.add(x,yy,y,Math.atan2(Math.cos(a),Math.sin(a)),sc,sc,sc,{tint:down?0x9a8a80:u.k==='villageois'?0xf4efe2:0xdcd8c4,ph:0,amp:0,arm:down?0:u.vrole==='conducteur'?.85:u.vrole==='servant'?.65:.5});}return;}
    if((V.blindage.dessus?.[0]||0)>=.05||!v.crew?.length||v.hp<=0)return;const Hm=this.M.meumeu.ext[1],c=Math.cos(v.h),s=Math.sin(v.h);
    const A=V.armes.find(a=>a.piece==='affut'),m=A&&v.mounts.find(q=>q.id===A.id);const seats=[[.08,.2],[.08,-.2],[-.38,.2],[-.38,-.2]];let n=0;
    const W=(f,sd)=>[v.x+c*f-s*sd,v.y+s*f+c*sd];
    for(const u of v.crew){if(u.hp<=0)continue;let x,y,a=v.h;
      if(u.vrole==='servant'&&A){a=v.h+(m?.yaw??0);const [px,py]=W(A.pos[0],A.pos[1]);x=px-Math.cos(a)*.24;y=py-Math.sin(a)*.24;}else{[x,y]=W(...seats[Math.min(n++,3)]);}
      // (assis, à 0,8 de leur taille de marche, échelle uniforme : debout à pleine taille, quatre peluches cachaient la jeep ; le servant debout derrière
      // son arme)
      const sc=.62*(u.k==='villageois'?.92:1.02)/Hm,down=u.h?.state==='hors',y0=(u.vrole==='servant'&&A?.04:-.08)+(v.onDeck?.16:0);
      P.meumeu.add(x,y0,y,Math.atan2(Math.cos(a),Math.sin(a)),sc,sc,sc,{tint:down?0x9a8a80:u.k==='villageois'?0xf4efe2:0xdcd8c4,ph:0,amp:0,arm:down?0:u.vrole==='servant'?.65:u.vrole==='conducteur'?.85:0});}}
  // la pose d'un véhicule : place, cap (selon l'axe avant de son modèle), tourelle, hausse des armes, roues, un léger roulis de suspension
  syncVehicle(v,V,dtc){let e=this.vehs.get(v.id);if(!e){const g=this.vehicleGroup(V);if(!g)return;e={g};this.vehs.set(v.id,e);this.scene.add(g);}
    const {g}=e,U=g.userData,base={'+x':0,'-x':PI,'+z':PI/2,'-z':-PI/2}[V.avant];g.position.set(v.x,v.onDeck?.16:0,v.y);g.rotation.y=base-v.h;g.visible=true;
    // la suspension : un petit tangage à l'accélération et au freinage, un frémissement en roulant (plus fort sur un terrain bouleversé)
    const acc=(v.spd-(e.spd??v.spd))/Math.max(1e-3,dtc);e.spd=v.spd;e.pitch=(e.pitch||0)+((-Math.max(-1,Math.min(1,acc/120))*.035)-(e.pitch||0))*Math.min(1,dtc*6);
    const shake=Math.min(1,v.spd/12)*.012*Math.sin((v.odo||0)*7.3);U.body.position.y=shake*V.long*.3;if(U.ax===2)U.body.rotation.x=e.pitch*U.sg;else U.body.rotation.z=-e.pitch*U.sg;
    for(const w of U.wheels){const a=(v.odo||0)/w.r;if(U.ax===2)w.g.rotation.x=a*U.sg;else w.g.rotation.z=-a*U.sg;}
    if(V.nav==='eau'){const tt=performance.now()/1000+v.id*1.7;g.position.y=.02+.018*Math.sin(tt*1.6);g.rotation.z=.028*Math.sin(tt*1.25);g.rotation.x=.018*Math.sin(tt*1.05+1);if(U.parts.rampe)U.parts.rampe.rotation.z=-(v.ramp||0)*1.5;}
    const mt=(piece)=>v.mounts?.find(m=>V.armes.find(a=>a.id===m.id)?.piece===piece);
    if(U.parts.tourelle){const m=mt('tourelle');U.parts.tourelle.rotation.y=-(m?.yaw||0);const el=m?.el||0;for(const k of ['armes','canon'])if(U.parts[k]){if(U.ax===2)U.parts[k].rotation.x=-el*U.sg;else U.parts[k].rotation.z=el*U.sg;}}
    for(const k in U.parts)if(k.startsWith('affut')){const m=mt(k),A=V.armes.find(a=>a.piece===k);if(A)U.parts[k].rotation.y=-((m?.yaw??A.repos??0)-(A.repos||0));}
    // (les tubes d'une casemate : chacun dans sa rotule, tous au même pointage)
    // (la hausse autour de l'axe du tube lui-même, puis la direction : l'ordre des rotations « direction en dernier »)
    for(const k in U.parts)if(k.startsWith('canons')){const P=U.parts[k],m=mt('canons');P.rotation.order=U.ax===2?'YXZ':'YZX';P.rotation.y=-(m?.yaw||0);const el=m?.el||0;if(U.ax===2)P.rotation.x=-el*U.sg;else P.rotation.z=el*U.sg;}
    // le recul : l'arme part en arrière le long de son axe (selon le calibre), puis revient en douceur ; deux tubes jumelés reculent ensemble
    const rk={};for(const m of v.mounts||[]){const key='v'+v.id+':'+m.id,kk=this.kicks.get(key);if(!kk)continue;kk.t+=dtc;rk[m.id]=kk.L*(kk.t<.04?kk.t/.04:Math.exp(-(kk.t-.04)/.18));if(kk.t>1)this.kicks.delete(key);}
    for(const k in U.parts){const piece=k==='canon'||k==='armes'?'tourelle':k.startsWith('canons')?'canons':null;if(!piece)continue;let r=0;
      for(const A of V.armes)if(A.piece===piece&&!(k==='canon'&&A.coax))r=Math.max(r,rk[A.id]||0);
      const M=U.parts[k].userData.mesh;if(!M)continue;M.position.copy(M.userData.base);if(r>0){const d=-r/U.sc*U.sg;if(U.ax===2)M.position.z+=d;else M.position.x+=d;}}
    // détruit : noirci
    const dead=v.hp<=0;if(e.dead!==dead){e.dead=dead;const mat=dead?this.tintedFor(this.M[V.modele],0x3a3632):U.mat;g.traverse(o=>{if(o.isMesh)o.material=mat;});}}
  // les ailes d'un moulin, dans le repère du modèle (unités du moulin converti : tour de 0,61 de haut) : axe = X, ailes dans le plan YZ,
  // longueur 0,26 (le bout passe à 0,21 au-dessus du sol), un longeron de bois et une toile tendue d'un côté
  windSails(){const G=new THREE.Group();this._wm??={bois:new THREE.MeshLambertMaterial({color:0x6b4a2e,flatShading:true}),toile:new THREE.MeshLambertMaterial({color:0xe6dcc4,flatShading:true,side:THREE.DoubleSide})};
    const W=this._wm,hubM=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,.05,8),W.bois);hubM.rotation.z=PI/2;hubM.castShadow=true;G.add(hubM);
    /* (V12.5) l'arbre de couche : du cœur de la calotte jusqu'au moyeu — les ailes tiennent à la tour */
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.013,.016,.15,8),W.bois);shaft.rotation.z=PI/2;shaft.position.x=-.075;shaft.castShadow=true;G.add(shaft);
    for(let k=0;k<4;k++){const arm=new THREE.Group();arm.rotation.x=k*PI/2+PI/4;
      const spar=new THREE.Mesh(new THREE.BoxGeometry(.012,.27,.012),W.bois);spar.position.set(.02,.135,0);spar.castShadow=true;arm.add(spar);
      const sail=new THREE.Mesh(new THREE.BoxGeometry(.004,.19,.055),W.toile);sail.position.set(.02,.165,.032);sail.castShadow=true;arm.add(sail);
      for(const y of [.08,.15,.22]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.008,.008,.065),W.bois);bar.position.set(.024,y,.03);arm.add(bar);}
      G.add(arm);}
    return G;}
  // V12.4 : une explosion en 3D, à la taille de sa charge — boule de feu (lumière ajoutée), onde de choc au sol jusqu'au rayon de souffle, dôme de
  // poussière qui s'étale et retombe. e.blast : rayon de souffle (cases), e.chargeKg : la charge ; en l'air (fusante), pas d'onde au sol ni de dôme
  boom(e){if(e.kind==='pop')return;const kg=Math.max(.002,e.chargeKg||(e.kind==='bomb'?20:e.kind==='shell'?.5:.05)),K=Math.cbrt(kg/.05);
    const RB=Math.max(.6,Math.min(14,(e.blast||e.r||1)*1.1)),RF=Math.max(.22,Math.min(5,.32*K)),Y=e.air?1.1:.15;
    const add=(geo,mat,sc)=>{const m=new THREE.Mesh(geo,mat);m.position.set(e.x,Y,e.y);m.scale.setScalar(sc);m.renderOrder=3;this.scene.add(m);return m;};
    const ball=add(this.boomGeo.ball,new THREE.MeshBasicMaterial({color:0xffc070,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}),.01);
    const ring=e.air?null:add(this.boomGeo.ring,new THREE.MeshBasicMaterial({color:0xfff2dc,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}),.01);
    const dome=e.air?null:add(this.boomGeo.dome,new THREE.MeshLambertMaterial({color:0x8a7558,transparent:true,opacity:.5,depthWrite:false}),.01);
    if(ring)ring.position.y=.04;if(dome)dome.position.y=0;
    this.booms.push({t:0,RB,RF,ball,ring,dome,life:Math.max(1.6,2.2+K*.4)});
    while(this.booms.length>40)this.dropBoom(this.booms.shift());}
  dropBoom(b){for(const m of [b.ball,b.ring,b.dome])if(m){this.scene.remove(m);m.material.dispose();}}
  boomsTick(dt){for(const b of this.booms){b.t+=dt;const t=b.t;
      // la boule : gonfle en 0,12 s, puis pâlit et rougit en 0,45 s
      {const k=Math.min(1,t/.12),f=Math.max(0,1-(t-.1)/.45);b.ball.scale.setScalar(b.RF*(.35+.65*(1-Math.pow(1-k,3)))*(1+.25*Math.max(0,t-.12)));b.ball.material.opacity=f;b.ball.material.color.setHSL(.09-.06*Math.min(1,t/.5),1,.55+.25*f);b.ball.visible=f>0;}
      // l'onde : file jusqu'au rayon de souffle en 0,35 s, et s'efface
      if(b.ring){const k=Math.min(1,t/.35),f=Math.max(0,1-t/.5);b.ring.scale.setScalar(Math.max(.01,b.RB*(1-Math.pow(1-k,2))));b.ring.material.opacity=.9*f;b.ring.visible=f>0;}
      // la poussière : un dôme qui s'élève et s'étale, puis retombe
      if(b.dome){const k=Math.min(1,t/.6),f=Math.max(0,1-Math.max(0,t-.3)/(b.life-.3));const r=b.RB*.55*(.3+.7*(1-Math.pow(1-k,2)))*(1+.15*t);b.dome.scale.set(r,r*.55*(1-.4*Math.min(1,t/b.life)),r);b.dome.material.opacity=.5*f;b.dome.visible=f>0;}}
    const done=this.booms.filter(b=>b.t>=b.life);if(done.length){for(const b of done)this.dropBoom(b);this.booms=this.booms.filter(b=>b.t<b.life);}}
  // un matériau teinté (bâtiments bèè, ruines, chantier)
  tinted(hex){let m=this.tintMats.get(hex);if(!m){m=materialOf(true).clone();m.color.setHex(hex);this.tintMats.set(hex,m);}return m;}
  // V12.4 : la même teinte pour un modèle cuit (sa texture multipliée par la couleur) ; un modèle sans texture garde la teinte des couleurs de sommets
  tintedFor(M,hex){if(!M?.mat)return hex==null?materialOf(true):this.tinted(hex);if(hex==null)return M.mat;const key=M.name+':'+hex;let m=this.tintMats.get(key);if(!m){m=M.mat.clone();m.color.setHex(hex);this.tintMats.set(key,m);}return m;}

  buildingMesh(b,def,[w,h]){
    const M=this.M[def[0]];if(!M)return null;const [ex,ey,ez]=M.ext;const q=def[2]||0;const ww=q%2?ez:ex,dd=q%2?ex:ez;
    const s=Math.min(w*def[1]/ww,h*def[1]/dd);const body=M.parts?M.byName.tour:M;
    const mesh=new THREE.Mesh(body.geo,M.mat||materialOf(true));mesh.scale.setScalar(s);mesh.castShadow=true;mesh.receiveShadow=true;
    const g=new THREE.Group();mesh.rotation.y=q*PI/2;g.add(mesh);g.userData={s,ey,subs:[mesh]};
    // les pièces mobiles (les ailes du moulin) tournent autour de leur pivot, dans le repère du modèle
    // V12.4 : les ailes du moulin converti étaient à l'intérieur de la tour, côté opposé à la caméra (elles dépassaient du toit, « détachées ») ;
    // elles sont faites par le code : un moyeu sur la face du toit vue par la caméra (+X), quatre ailes en croix qui tournent autour de l'axe du moyeu
    /* (V12.5) le moyeu à 0,20 devant l'axe, au milieu de la calotte (y 0,44) : le plan des ailes (x 0,22) passe devant le bord du toit (0,177), l'auvent (0,195)
       et le socle ; le bout des ailes descend à 0,17 — avant, à 0,135, elles traversaient le toit et ne tenaient à rien */
    if(def[0]==='windmill'&&M.parts){const hub=new THREE.Group();hub.position.set(.2,.44,0);hub.add(this.windSails());mesh.add(hub);g.userData.spin=hub;
      return g;}   // (les ailes gardent leurs matériaux : la teinte du chantier ou des ruines ne vise que les pièces à couleurs de sommets)
    if(M.parts)for(const p of M.parts){if(p===body)continue;const sub=new THREE.Mesh(p.geo,M.mat||materialOf(true));sub.castShadow=true;sub.position.set(-p.pivot[0],-p.pivot[1],-p.pivot[2]);
      const pg=new THREE.Group();pg.position.set(p.pivot[0],p.pivot[1],p.pivot[2]);pg.add(sub);mesh.add(pg);if(p.name==='ailes')g.userData.spin=pg;g.userData.subs.push(sub);}
    return g;}

  sync(view,dt,[i0,i1,j0,j1]){
    const W=view.world,s=W.s,N=W.N;const dtc=Math.min(.1,dt||.016);const P=this.pools;for(const k in P)P[k].begin();for(const e of this.guns.values())if(e.pool)e.pool.begin();this.gunsUsed=new Set();
    // ----- arbres, buissons, rochers, filons
    // V12.4 (K12) : les arbres deviennent transparents autour de nos unités et des ennemis repérés (deux cases autour) — on voit qui est sous les arbres
    const clear=new Set();{const fogOn=s.fog!==false;for(const u of s.units){if(!(u.hp>0)||u.inBarracks||u.x<i0-2||u.x>i1+2||u.y<j0-2||u.y>j1+2)continue;if(u.f!=='meumeu'&&(fogOn&&!W.spotted(u,'meumeu',.5)))continue;
        const ci=Math.floor(u.x),cj=Math.floor(u.y);for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++)if(di*di+dj*dj<=5)clear.add((cj+dj)*N+ci+di);}}
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const id=W.nodeAt[j*N+i];if(id<0)continue;const n=s.nodes[id];const f=Math.min(1,n.left/Math.max(1,n.max));
      const cx=n.i+.5+((n.id*37)%9-4)*.03,cz=n.j+.5+((n.id*53)%7-3)*.03,rot=(n.id*2.399)%6.283;
      if(n.type==='tree'){if(n.left<1||view.zoom<.3)continue;const terr=W.G.terrain[n.j*N+n.i];const kind=TREE_KIND(terrainTreeName(terr,n));const sc=1.3*(f<.25?.42:.62+.22*f)*(.92+((n.id*13)%7)*.025);
        (clear.has(n.j*N+n.i)?P[kind+'_g']:P[kind]).add(cx,0,cz,rot,sc,sc*(.95+((n.id*7)%5)*.04),sc,{tint:treeTint(n.id,terr)});}
      else if(n.type==='bush'){if(view.zoom<.3)continue;(clear.has(n.j*N+n.i)?P.buisson_g:P.buisson).add(cx,0,cz,rot,.9,.9,.9,{tint:n.left>=1&&n.id%4===0?0xffb0c8:null});}
      else if(n.type==='rock'){if(n.left<1||view.zoom<.3)continue;const v=n.id%3,sc=.42+.3*f+((n.id*7)%5)*.03,tn=.85+((n.id*11)%7)*.04;const c=(a)=>(((a*2654435761)>>>0)%1000)/1000;
        P['rock'+v].add(cx,-.02,cz,rot,sc*(1.1+c(n.id)*.3),sc,sc,{tint:new THREE.Color(tn,tn*.98,tn*.94).getHex()});
        const m=1+(n.id%2);for(let q=0;q<m;q++){const a=rot+q*2.4+c(n.id+q)*2,d=.3+.15*c(n.id*3+q),ss=.2+.14*c(n.id*5+q);P['rock'+((v+q+1)%3)].add(cx+Math.cos(a)*d,-.02,cz+Math.sin(a)*d,a,ss*1.2,ss,ss,{tint:new THREE.Color(tn*.95,tn*.93,tn*.9).getHex()});}}
      else if(n.type==='ore'){const pool=P['ore_'+n.res]||P.ore_pierre;const M=this.M[OUTCROP_MODEL[n.res]||'stone_rock_pile'];const sc=(W.s.buildings.some(b=>b.ore===n.id)?0.001:1.5)/M.ext[0];pool.add(cx,0,cz,rot,sc,sc,sc,{tint:n.left>0?null:0x777777});}}
    // ----- bâtiments
    const seen=new Set();
    for(const b of s.buildings){const [w,h]=W.sizeOf(b);if(b.i+w<i0-6||b.i>i1+6||b.j+h<j0-6||b.j>j1+6)continue;
      const fog=s.fog!==false;if(fog&&b.f==='beee'&&!view.fxVisible(b.i+w/2,b.j+h/2,b.f))continue;
      /* (V12.5) les bâtiments meumeu en style aztèque (le centre-ville : la pyramide) ; ceux des Bèè gardent les leurs */
      const def=(b.f==='meumeu'&&(b.k==='centre'?[':pyramide',1.0,0]:this.M[':az_'+b.k]&&[':az_'+b.k,1.0,0])||BUILDING_MODEL[b.k])||(BUILDINGS[b.k]?.bunker?[':bk_'+BUILDINGS[b.k].bunker+'_'+(b.rot||0),1,0]:null);if(!def)continue;seen.add(b.id);
      let e=this.blds.get(b.id);const sig=def[0]+'|'+w+'x'+h+'|'+(b.rot||0);   /* (le modèle choisi : le centre change de modèle avec sa faction) */if(!e||e.sig!==sig){if(e)this.scene.remove(e.g);const g=this.buildingMesh(b,def,[w,h]);if(!g)continue;
        if(BUILDINGS[b.k]?.bunker){const PL=W.bunkerPlanOf(b);g.userData.doors=PL.doors.map(([da,dc])=>{const dm=new THREE.Mesh(this.doorGeo,this.doorMat);dm.position.set(da+.5-PL.w/2,0,dc+.5-PL.h/2);if('#ED'.includes(PL.at(da,dc-1))||'#ED'.includes(PL.at(da,dc+1)))dm.rotation.y=Math.PI/2;dm.castShadow=true;g.add(dm);return {key:(b.j+dc)*N+b.i+da,mesh:dm};});
          // le toit : opaque (il cache l'intérieur) ; presque transparent tant que nos unités y sont (voir plus bas)
          const rg=bunkerRoofGeo(BUILDINGS[b.k].bunker,b.rot||0);if(rg){const rm=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:1,roughness:.9}));rm.castShadow=true;rm.receiveShadow=true;g.add(rm);g.userData.roof=rm;g.userData.plan=PL;}}e={g,sig,ruin:null,done:null,prog:-1};this.blds.set(b.id,e);this.scene.add(g);}
      const {g}=e;const mesh=g.children[0];if(g.userData.doors)for(const D of g.userData.doors)D.mesh.visible=!b.ruin&&!(b.doorsDown&&b.doorsDown.includes(D.key));
      if(g.userData.roof){const PL=g.userData.plan||(g.userData.plan=W.bunkerPlanOf(b)),nowT=performance.now();g.userData.roof.visible=b.done&&!b.ruin;
        // le toit devient transparent seulement quand l'un des nôtres est à l'intérieur (sol couvert ou porte) ; le brouillard ne change rien : on voit les nôtres
        if(!e.roofT||nowT-e.roofT>150){e.roofT=nowT;let inside=false;if(b.f==='meumeu'&&b.done)for(const u of s.units){if(u.f!=='meumeu')continue;const ra=Math.floor(u.x)-b.i,rc=Math.floor(u.y)-b.j;if(ra<0||rc<0||ra>=PL.w||rc>=PL.h)continue;const ch=PL.rows[rc][ra];if(ch==='.'||ch==='G'||ch==='A'||ch==='D'||ch==='o'){inside=true;break;}}e.roofTarget=inside?.16:1;}
        const rmat=g.userData.roof.material;rmat.opacity+=((e.roofTarget??1)-rmat.opacity)*Math.min(1,dtc*7);rmat.depthWrite=rmat.opacity>.6;}const cx=b.i+w/2,cz=b.j+h/2;g.position.set(cx,0,cz);
      const prog=b.done?1:b.ruin?0:Math.max(.12,b.progress||0);// V12.4 : les dégâts se voient avant l'effondrement — quatre états selon la solidité perdue (25, 50, 75 %) : la suie noircit, puis le bâtiment
      // penche et s'affaisse un peu (rotation et position seulement : jamais déformé)
      const dmg=b.done&&!b.ruin&&b.max>0?Math.max(0,Math.min(3,Math.floor((1-b.hp/b.max)*4))):0;const stage=b.ruin?'r':b.done?'d'+dmg:prog.toFixed(2);
      if(e.stage!==stage||e.f!==b.f){e.stage=stage;e.f=b.f;const base=b.f==='beee'?0xe8b8a0:0xffffff;const SOOT=[null,.8,.6,.42];const shade=(hex,k)=>{const c=new THREE.Color(hex);c.multiplyScalar(k);return c.getHex();};
        const MB=this.M[def[0]],T=hex=>this.tintedFor(MB,hex);
        const mat=b.ruin?T(0x5a5048):dmg>0?T(shade(b.f==='beee'?base:def[3]||0xffffff,SOOT[dmg])):b.f==='beee'?T(base):(b.done?(def[3]?T(def[3]):T(null)):T(0xd8d0c0));for(const m of g.userData.subs)m.material=mat;
        mesh.scale.set(g.userData.s,g.userData.s*(b.ruin?.3:b.done?1:.25+.75*prog),g.userData.s);mesh.rotation.z=b.ruin?.05:dmg>=2?(dmg-1)*.035*((b.id%2)?1:-1):0;mesh.rotation.x=dmg>=3?.03:0;mesh.position.y=-.06*Math.max(0,dmg-1);}
      if(g.userData.spin){e.ang=(e.ang||0)+(b.done&&!b.ruin?dtc*.45:0);g.userData.spin.rotation.x=e.ang;}
      g.visible=true;}
    for(const [id,e] of this.blds)if(!seen.has(id))e.g.visible=false;
    // ----- unités
    const Hm=this.M.meumeu.ext[1],Hb=this.M.goat_plush_toy.ext[1];
    const fog=s.fog!==false;
    // les servants qui portent un obus vers une pièce en train de recharger : le plus proche de chaque pièce
    this.shellCarrier.clear();
    for(const g of s.units){if(!g.w||!(g.reload>0)||!(g.reloadTotal>1.4)||g.hp<=0)continue;const Wg0=this.designOf(W,g.w);if(!Wg0||!(Wg0.crew>1))continue;
      const sv=W.servants(g).sort((a,z)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(z.x-g.x,z.y-g.y))[0];if(sv)this.shellCarrier.set(sv.id,{g,W:Wg0});}
    const addUnit=u=>{if(u.x<i0-3||u.x>i1+3||u.y<j0-3||u.y>j1+3)return;
      if(fog&&u.f!=='meumeu'&&!W.spotted(u,'meumeu',.5))return;
      const bee=u.f==='beee';const down=u.h?.state==='hors'||u.hp<=0;
      let fx=u.fx,fy=u.fy;if(fx==null){const d=u.dir||'se';[fx,fy]=d==='se'?[1,0]:d==='sw'?[0,1]:d==='ne'?[0,-1]:[-1,0];}
      const want=Math.atan2(fx,fy);let y=this.yaw.get(u.id);if(y==null)y=want;let dlt=((want-y+PI)%(2*PI)+2*PI)%(2*PI)-PI;y+=dlt*Math.min(1,dtc*12);this.yaw.set(u.id,y);
      // le modèle : la peluche pour les civils et les soignants, le soldat pour qui porte les armes (servants compris), le chevalier pour la troupe de choc
      const mod=bee?'goat_plush_toy':(u.k==='villageois'||u.k==='medecin'||u.k==='infirmier')?'meumeu':this.M[u.skin]?u.skin:u.k==='choc'?'plush_cow_knight':'meumeu';
      const M0=this.M[mod]||this.M.meumeu,Hmod=M0.ext[1];
      const H=u.k==='villageois'?.92:u.k==='choc'?1.06:1.02;const sc=H/Hmod;const pool=bee?P.bee:mod==='plush_cow_knight'?P.choc:mod==='meumeu_soldat'?P.soldat:P.meumeu;const hx=Math.sin(y),hz=Math.cos(y);
      let walking=u.anim==='walk'&&!down;
      // les servants suivent leur pièce par petits bonds : on lisse leur place à l'écran, et leur pas suit leur vitesse affichée
      let ux=u.x,uy=u.y;if(u.serve&&!down){const dp=(this.dpos??=new Map()),q=dp.get(u.id);if(q&&Math.hypot(q[0]-u.x,q[1]-u.y)<2){const k=Math.min(1,dtc*8);const nx=q[0]+(u.x-q[0])*k,ny=q[1]+(u.y-q[1])*k;const sp=Math.hypot(nx-q[0],ny-q[1])/Math.max(1e-3,dtc);q[0]=nx;q[1]=ny;ux=nx;uy=ny;walking=sp>.15;}else dp.set(u.id,[u.x,u.y]);}const ph=(u.walkPh||0)*2.4,amp=walking?1:0;
      const pose=down?'down':u.post==='couche'?'prone':u.post==='accroupi'?'crouch':'up';
      const tint=bee?(u.k==='soldat'||u.k==='commando'?0xd8a090:0xffd4b8):(u.k==='villageois'?0xf4efe2:u.k==='medecin'||u.k==='infirmier'?0xf2f6f0:0xf6f2e8);
      // le recul d'un coup : monte vite, retombe en un dixième de seconde
      let kick=0;const kk=this.kicks.get(u.id);if(kk){kk.t+=dtc;kick=kk.amp*(kk.t<.05?kk.t/.05:Math.exp(-(kk.t-.05)/.13));if(kk.t>.8)this.kicks.delete(u.id);}
      const Wg=(u.w&&!down&&!u.serve)?this.designOf(W,u.w):null;const crewGun=Wg&&Wg.crew>1;
      const aiming=u.anim==='aim'||u.anim==='action'||(u.cool>0&&!walking);const reloading=u.reload>0&&u.reloadTotal>0,rp=reloading?1-u.reload/u.reloadTotal:0;
      const carry=u.carry&&u.carry.n>=1&&!down;const carrier=this.shellCarrier.get(u.id);
      // la pose des bras : arme tenue (à l'épaule en visée, baissée en marche, à mi-hauteur au rechargement), charge portée devant soi, obus porté à la pièce
      let arm=0;
      // (les bras restent le long du corps : les lever par déformation donnait des « bras de manchot » ; seule la visée les relève un peu)
      if(!down){if(Wg&&!crewGun)arm=aiming?.3:0;else if(carry||u.crates>0||carrier&&u.serve)arm=.3;}
      // (V12.5) un soldat meumeu avec une arme d'épaule la tient, bras levés (holdGun) ; les autres comme avant
      // (V12.5) une arme d'épaule (ni pièce servie, ni pistolet) est tenue du bras droit : la Meumeu normale lève son bras droit (holdGun) ; les tenues
      // du joueur (soldat camouflé, élite à cape — leurs modèles restent tels quels) la tiennent bras droit tendu devant elles (holdSkin)
      const shoulder=!!Wg&&!crewGun&&!Wg.pistol&&!bee&&u.k!=='villageois'&&(pose==='up'||pose==='crouch');
      const rig=shoulder&&this.rig&&mod==='meumeu',skr=shoulder&&!rig&&!!this.skinRigs?.[mod];
      if(rig)this.holdGun(u,Wg,H,Hmod,sc,y,ux,uy,pose,{ph,amp,tint,kick,aiming,reloading,rp});
      else if(skr)this.holdSkin(u,Wg,H,Hmod,sc,y,ux,uy,pose,mod,{ph,amp,tint,kick,aiming,reloading,rp});
      else if(pose==='up'){pool.add(ux,0,uy,y,sc,sc,sc,{tint,ph,amp,arm,kick});}
      else if(pose==='crouch'){pool.add(ux,0,uy,y,sc,sc*.72,sc,{tint,ph:0,amp:0,arm,kick});}
      else{const r=Hmod*sc*.22;pool.add(u.x,r,u.y,y,sc,sc,sc,{tint:down?0x9a8a80:tint,pitch:down?-PI/2:PI/2});}
      // ce qu'on porte, devant soi (les bras le tiennent) : des bûches, des pierres, un sac de vivres, un tonnelet, des caisses
      const front=(dx,dy,dz)=>[ux+hx*(.30*H+dz)-hz*dx,dy,uy+hz*(.30*H+dz)+hx*dx];
      if(carry&&pose!=='down'){const res=u.carry.k,f=Math.min(1,u.carry.n/CARRY),cnt=1+Math.floor(f*2.99),h0=H*(pose==='crouch'?.38:.50);
        if(res==='bois'){for(let c=0;c<cnt;c++){const p=front((c-(cnt-1)/2)*.05,h0+c*.02,0);P.buche.add(p[0],p[1],p[2],y+PI/2+(c-1)*.12,1,1,1);}}
        else if(res==='vivres'){for(let c=0;c<cnt;c++){const p=front((c-(cnt-1)/2)*.17,h0-.06,0);P.sac.add(p[0],p[1],p[2],c*1.3,1,1,1,{tint:c%2?0xd9c79a:null});}}
        else if(res==='poudre'||res==='explosifs'||res==='explosifs_brisants'||res==='melange_inc'||res==='carburant'){for(let c=0;c<Math.min(2,cnt);c++){const p=front((c-.5*(Math.min(2,cnt)-1))*.24,h0-.1,0);P.tonnelet.add(p[0],p[1],p[2],0,1,1,1,{tint:res==='carburant'?0x4a6a8a:res==='poudre'?0x6a6a6a:0xc85a3a});}}
        else if(res==='pierre'||ORE_COL[res]){const col=ORE_COL[res]||'#8a8a80';const c0=new THREE.Color(res==='pierre'?'#b8b2a4':col);for(let c=0;c<cnt;c++){const p=front((c-(cnt-1)/2)*.12,h0-.02+c%2*.05,0);P.caillou.add(p[0],p[1],p[2],c*2.1,.2,.17,.2,{tint:c0.getHex()});}}
        else{for(let c=0;c<Math.min(3,cnt);c++){const p=front(0,h0-.05+c*.16,0);P.caisse.add(p[0],p[1],p[2],y,1,1,1,{tint:res==='sante'?0xeeeeee:null});}}}
      if(u.crates>0&&!down&&pose!=='down'){const n=Math.min(3,Math.ceil(u.crates));for(let c=0;c<n;c++){const p=front(0,H*.40+c*.17,0);P.caisse.add(p[0],p[1],p[2],y,1,1,1);}}
      // l'obus qu'un servant apporte à la culasse, pendant tout le rechargement (2D : même trajet, même courbe)
      if(carrier&&pose!=='down'){const g=carrier.g,Wd=carrier.W,pp=1-g.reload/g.reloadTotal,tt=Math.max(0,Math.min(1,(pp-.12)/.8)),e=tt*tt*(3-2*tt);
        const gy=this.yaw.get(g.id)??Math.atan2(g.fx??1,g.fy??0),gh=Math.sin(gy),gz=Math.cos(gy);const sMm=H/300*.9;const br=[g.x+gh*(.22*(Wd.lengthMm||500)*sMm),(.3*H),g.y+gz*(.22*(Wd.lengthMm||500)*sMm)];
        const sp=front(0,H*.5,0);const px=sp[0]+(br[0]-sp[0])*e,pz=sp[2]+(br[2]-sp[2])*e,py=sp[1]+(br[1]-sp[1])*e+Math.sin(PI*e)*.08;
        const sc2=Math.max(.9,Math.min(2.2,.8+(Wd.rm||300)/900));P.obus.add(px,py,pz,tt<.999?Math.atan2(br[0]-sp[0],br[2]-sp[2])-PI/2:gy-PI/2,sc2,sc2,sc2);}
      // l'arme telle qu'elle a été conçue (à défaut, un fusil générique) ; plus de casque (V12.5, demande du joueur)
      if(Wg){if(!rig&&!skr)this.putGun(u,Wg,H,y,pose,walking,{aiming,reloading,rp,kick});}   /* (holdGun a déjà posé l'arme) */
      else if(u.k!=='villageois'&&pose==='up'&&(bee||u.w)){const k=H*.62/this.M.gewehr_43_rifle.ext[0];P.fusil.add(u.x+hx*.23-hz*.07,H*.48,u.y+hz*.23+hx*.07,y-PI/2,k,k,k);}
    };
    for(const u of s.units)addUnit(u);
    for(const v of s.vehicles||[])if(v.k==='porteur'&&v.u)addUnit(Object.assign(v.u,{x:v.x,y:v.y,fx:v.dx,fy:v.dy,anim:v.path?'walk':'idle'}));
    // la faune libre, et le troupeau des enclos
    const animal=(kind,x,z,yaw,alive,mv,id)=>{const bob=mv?Math.abs(Math.sin(view.frame*2+id))*.05:0;
      if(kind==='belier'){const M=this.M.goat_plush_toy,sc=.75/M.ext[1];(alive?P.bee:P.bee).add(x,bob,z,yaw,sc,sc,sc,{tint:alive?0xf2ece0:0x8a8078,ph:view.frame*2.4+id,amp:mv?1:0,pitch:alive?0:-PI/2});return;}
      const pool=kind==='lapin'?P.lapin:P.biche;pool.add(x,alive?bob:.05,z,yaw,1,1,1,{tint:alive?null:0x8a8078,roll:alive?0:PI/2});};
    this.fpos??=new Map();
    for(const a of s.fauna||[]){if(a.x<i0-2||a.x>i1+2||a.y<j0-2||a.y>j1+2||view.zoom<.3)continue;if(!(a.alive||a.food>0))continue;
      let f=this.fpos.get(a.id);if(!f){f={x:a.x,y:a.y,yaw:(a.id*1.3)%6.28,mv:0};this.fpos.set(a.id,f);}
      const dx=a.x-f.x,dy=a.y-f.y;if(dx*dx+dy*dy>1e-6){f.yaw=Math.atan2(dx,dy)-PI/2;f.mv=.25;}else f.mv=Math.max(0,f.mv-dtc);f.x=a.x;f.y=a.y;
      animal(a.kind,a.x,a.y,f.yaw,a.alive,f.mv>0,a.id);}
    for(const b of s.buildings){if(b.k!=='enclos'||!b.done||b.ruin)continue;const [w,h]=W.sizeOf(b);if(b.i+w<i0-3||b.i>i1+3||b.j+h<j0-3||b.j>j1+3)continue;
      const c=[[b.i,b.j],[b.i+w,b.j],[b.i+w,b.j+h],[b.i,b.j+h]];
      for(let e=0;e<4;e++){const [x0,y0]=c[e],[x1,y1]=c[(e+1)%4];const len=Math.hypot(x1-x0,y1-y0),yw=Math.atan2(-(y1-y0),x1-x0);
        for(const hh of [.18,.36])P.lisse.add(x0,hh,y0,yw,len,1,1);const posts=e%2?w:h;for(let t=0;t<posts;t++)P.poteau.add(x0+(x1-x0)*t/posts,0,y0+(y1-y0)*t/posts,0,1,1,1);}
      const herd=b.herd||{biche:b.animals};let index=0;for(const kind of ['biche','lapin'])for(let n=0;n<Math.min(herd[kind]||0,Math.min(12,w*h));n++){
        const fx=.5+((index*13+5)%Math.max(1,w*4-4))/4,fy=.5+((index*17+3)%Math.max(1,h*4-4))/4;animal(kind,b.i+fx,b.j+fy,index*1.7,true,false,index);index++;}}
    // la charrette et les avions (les porteurs sont des Meumeu ; le train est traité plus haut)
    for(const v of s.vehicles||[]){if(v.x<i0-8||v.x>i1+8||v.y<j0-8||v.y>j1+8)continue;
      if(fog&&v.f!=='meumeu'&&!view.fogVis?.[Math.floor(v.y)*N+Math.floor(v.x)])continue;
      if(v.k==='charrette'&&!(v.alt>0)){P.charrette.add(v.x,0,v.y,Math.atan2(v.dx??1,v.dy??0)-PI/2+PI,1.1,1.1,1.1);
        if(v.cargo){const n=Math.min(5,Math.ceil(Object.values(v.cargo).reduce((a,b)=>a+b,0)/4));for(let c=0;c<n;c++)P.caisse.add(v.x+(c%3-1)*.22*Math.cos(0),.34+(c/3|0)*.17,v.y+((c%2)-.5)*.2,c,1,1,1);}}
      else if(v.alt>0){const M=this.M.silbervogel_bomber_3d_model,sc=2.6/Math.max(M.ext[0],M.ext[2]);const along=M.ext[2]>=M.ext[0];P.avion.add(v.x,v.alt*HK,v.y,Math.atan2(v.dx??1,v.dy??0)+(along?0:-PI/2),sc,sc,sc,{tint:v.f==='beee'?0xd8a090:null});}}
    // les cadavres : à terre, assombris
    for(const c of s.corpses||[]){if(c.x<i0-3||c.x>i1+3||c.y<j0-3||c.y>j1+3)continue;const age=W.t-c.t;if(age>3*DAY)continue;const bee=c.f==='beee'||/bee/.test(c.sheet||'');const H=(c.k==='villageois'?.92:1.02);const sc=H/(bee?Hb:Hm);const y=c.dir==='se'?PI/2:c.dir==='sw'?0:c.dir==='ne'?PI:-PI/2;
      (bee?P.bee:P.meumeu).add(c.x,(bee?Hb:Hm)*sc*.2,c.y,y,sc,sc,sc,{tint:0x8a7a72,pitch:-PI/2});}
    // les véhicules : le train suit la trace de sa locomotive (mêmes distances que le dessin 2D) ; le reste est une jeep
    const vseen=new Set();this.vlist=s.vehicles||[];
    for(const v of s.vehicles||[]){if(v.x<i0-8||v.x>i1+8||v.y<j0-8||v.y>j1+8)continue;if(v.alt>0)continue;
      if(fog&&v.f!=='meumeu'&&!view.fogVis?.[Math.floor(v.y)*N+Math.floor(v.x)])continue;
      if(VEHDEF[v.k]){vseen.add(v.id);this.syncVehicle(v,VEHDEF[v.k],dtc);this.vehCrew3d(v,VEHDEF[v.k],P);continue;}
      if(v.k==='train'){const pts=[[v.x,v.y],...(v.trail||[])];
        const at=d=>{let left=d;for(let n=0;n<pts.length-1;n++){const [ax,ay]=pts[n],[bx,by]=pts[n+1];const L=Math.hypot(bx-ax,by-ay);if(left<=L){const t=L?left/L:0;return [ax+(bx-ax)*t,ay+(by-ay)*t,ax-bx,ay-by];}left-=L;}const l=pts[pts.length-1];return [l[0]-(v.dx||1)*left,l[1]-(v.dy||0)*left,v.dx||1,v.dy||0];};
        const cars=[{k:'loco',len:3.0},{k:'tender',len:1.9},{k:'wagon',len:2.4},{k:'wagon',len:2.4},{k:'wagon',len:2.4},{k:'wagon',len:2.4}];let d=0;
        for(let n=0;n<cars.length;n++){const c=cars[n];if(n)d+=cars[n-1].len/2+c.len/2+.14;const [x,y,dx,dy]=at(d);const L=Math.hypot(dx,dy)||1;
          const M=this.M[c.k==='loco'?'ww2_locomotive':'ww2_wagon'];const sc=c.len/Math.max(M.ext[0],M.ext[2]);
          const along=M.ext[2]>=M.ext[0];const yaw=Math.atan2((dx||v.dx||1)/L,(dy||v.dy||0)/L)+(along?0:-PI/2)+(c.k==='loco'?PI:0);   // (le modèle de locomotive regarde vers −Z : on la retourne, la cheminée en tête)
          (c.k==='loco'?P.loco:P.wagon).add(x,0,y,yaw,sc,sc,sc,{tint:c.k==='tender'?0x6a6a66:null});}}
      else if(v.k==='porteur')continue;
      else{const M=this.M.vintage_military_jeep_logistic_unarmed;const sc=1.2/M.ext[0];P.jeep.add(v.x,0,v.y,Math.atan2(v.dx??1,v.dy??0)-PI/2,sc,sc,sc);}}
    for(const [id,e] of this.vehs){if(vseen.has(id))continue;if(!s.vehicles.some(o=>o.id===id)){this.scene.remove(e.g);this.vehs.delete(id);}else e.g.visible=false;}
    // V12.4 : les obus et les fusées en vol, en 3D, à l'échelle des Meumeu (1 unité ≈ 0,29 m : un Meumeu de 30 cm mesure 1,02), orientés selon la tangente
    // de leur arc ; même courbe que la couche 2D (hauteur h → Y = h × 0,8165). Calibre d en mm : longueur ≈ 4,2 d (fusée : 7 d), avec un minimum visible.
    {const Hh=(sh,q)=>(sh.kind==='hshell'?Math.min(14,Math.max(1.5,sh.top||3)):3)*4*q*(1-q)+.5*(1-q);const MM=1.02/300;
      for(const sh of s.shots){if(sh.kind!=='shell'&&sh.kind!=='hshell')continue;const q=Math.min(1,sh.t/sh.dur);const x=sh.x0+(sh.x1-sh.x0)*q,y=sh.y0+(sh.y1-sh.y0)*q;
        if(x<i0-3||x>i1+3||y<j0-3||y>j1+3)continue;if(fog&&sh.f!=='meumeu'&&!view.fxVisible?.(x,y,sh.f))continue;
        const d=sh.w&&W.design(sh.w),p=d?.p,cal=p?.d||8,rk=p?.prop==='fusee'||(sh.w&&this.designOf(W,sh.w)?.rocket);
        const q2=Math.min(1,q+.01),q1=q2-.01,dx=(sh.x1-sh.x0)*(q2-q1),dz=(sh.y1-sh.y0)*(q2-q1),dY=(Hh(sh,q2)-Hh(sh,q1))*.8165,hz=Math.hypot(dx,dz)||1e-6;
        const L=Math.max(rk?.3:.2,cal*(rk?7:4.2)*MM),D=Math.max(rk?.05:.045,L/(rk?7:4.2));
        (rk?P.fusee3d:P.obus3d).add(x,Hh(sh,q)*.8165,y,Math.atan2(dx,dz),D,D,L,{pitch:-Math.atan2(dY,hz),tint:p?.cons==='he'||p?.cons==='hei'||W.W?.(sh.w)?.he?0x8a8a5a:0x5c6670});}}
    this.boomsTick(dtc);
    for(const k in P)P[k].end();for(const e of this.guns.values())if(e.pool)e.pool.end();
  }
  // la carte du brouillard de la vue (une case = un texel ; transparente = vue, mi-sombre = explorée, sombre = jamais vue), envoyée quand elle change
  fog(view,on){const U=this.fowU,cv=view.fogCv;U.on.value=on&&cv?1:0;if(!U.on.value)return;
    if(!this.fowTex||this.fowTex.image!==cv||this.fowW!==cv.width){this.fowTex?.dispose();const t=new THREE.CanvasTexture(cv);t.flipY=false;t.magFilter=t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;
      this.fowTex=t;this.fowW=cv.width;U.map.value=t;this.fowVer=-1;}
    if(this.fowVer!==view.fogVer){this.fowTex.needsUpdate=true;this.fowVer=view.fogVer;}U.N.value=cv.width;}
  // les matériaux nouveaux venus (armes conçues, bâtiments, engins) reçoivent le brouillard une fois
  fowPatch(){this.scene.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];
    for(const m of ms)if(m&&!this.fowMats.has(m)){this.fowMats.add(m);if(m.isMeshStandardMaterial||m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshBasicMaterial||m.isMeshToonMaterial)fowMaterial(m,this.fowU);}});}
  render(){this.fowPatch();this.r.render(this.scene,this.cam);return this.cv;}
}

const treeName=(t)=>t;
function terrainTreeName(terr,n){const ks=TREE_NAMES[terr]||TREE_NAMES[T.grass];return ks[(n.id*7+n.i)%ks.length];}
const TREE_NAMES={[T.grass]:['tree_oak','tree_birch','tree_round','tree_maple','tree_cherry','tree_fruit','tree_willow','tree_red','tree_oak','tree_round'],[T.meadow]:['tree_fir','tree_pines','tree_birch-yellow','tree_oak','tree_firs','tree_yellow','tree_jacaranda','tree_fir'],[T.sand]:['tree_palm','tree_banana','tree_umbrella','tree_palm'],[T.dirt]:['tree_spruce','tree_fir','tree_snowfir','tree_orange','tree_spruce'],[T.scrub]:['tree_dead','tree_cypress','tree_bamboo','tree_cypress']};
// une variation de teinte par arbre (les mêmes arbres partout, ça se voit)
function treeTint(id,terr){const v=((id*2654435761)>>>0)%1000/1000;const base=terr===T.dirt?[.85,.95,.85]:terr===T.sand?[1,.95,.75]:[.85+.3*v,.9+.2*v,.8+.2*(1-v)];const c=new THREE.Color(base[0],base[1],base[2]);return c.getHex();}
