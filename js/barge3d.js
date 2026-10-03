// Oberkommando der Meumeu — les modèles de la mer, faits par le code.
//  · la barge de débarquement (d'après la LCVP « Higgins » du 6 juin 1944) : une caisse à flancs droits peinte gris marine, de hauts pavois, une rampe d'acier
//    de toute la largeur à l'avant (relevée elle fait mur, baissée elle devient la passerelle), le puits des soldats au plancher de bois ; à l'arrière le
//    barreur derrière sa plaque, entre les deux cuves de mitrailleur — chacune sa mitrailleuse sur pivot, le canon vers l'avant au repos ;
//  · la grande barge (d'après les barges de chars LCT) : une longue coque plate, le pont des véhicules à rails entre deux hauts pavois, une rampe de toute la
//    largeur ; à l'arrière le roof, la passerelle vitrée, le mât, les cheminées, les radeaux, et aux deux coins avant du roof les deux mitrailleuses lourdes ;
//  · le bateau bèè : une coque de planches, une planche en guise de rampe.
// Repère : la proue vers +x, la largeur sur z, y vers le haut, centré ; une case = une unité. Chaque modèle donne les places de l'équipage (seats : les pieds) ;
// les pièces mobiles : « rampe » (sur sa charnière) et « affut », « affut2 » (chaque mitrailleuse tourne sur son pivot).
import * as THREE from './lib/three.module.js';
import {Build} from './bldg3d.js';

const GRIS=0x66706a,GRIS2=0x4b534e,GRIS3=0x7d877f,ACIER=0x5a6164,ACIER2=0x434a4d,BOIS=0x5c5040,BOIS2=0x463d31,BLANC=0xe8e6dc,NOIR=0x1a1f1d,VITRE=0x9fb8c4,ROUILLE=0x6e4a34;

// une mitrailleuse sur pivot, le canon vers +x (l'avant) : la boîte de culasse, le canon et son cache-flamme, la bande, les poignées
function mg(B,[x,y,z],long=.5){B.box(x-.04,y,z,.2,.08,.08,NOIR);const t=new THREE.CylinderGeometry(.016,.02,long,8);t.rotateZ(Math.PI/2);t.translate(x+.06+long/2,y+.045,z);B.add(t,NOIR);
  B.box(x+.07+long,y+.03,z,.04,.03,.04,NOIR);B.box(x-.02,y-.07,z+.06,.08,.07,.05,0x5a4a2a);B.box(x-.17,y+.01,z,.05,.05,.1,ACIER2);B.box(x,y-.08,z,.04,.08,.04,ACIER2);return B;}

// une cuve de mitrailleur : un anneau de tôle ouvert (le mitrailleur se tient dedans, le buste au-dessus), son plancher, le pivot au centre
function tub(B,x,y,z,r,h,hex){const n=12;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,g=new THREE.BoxGeometry(.035,h,2*r*Math.sin(Math.PI/n)+.012);g.rotateY(-a);g.translate(x+Math.cos(a)*r,y+h/2,z+Math.sin(a)*r);B.add(g,hex);}
  B.cyl(x,y,z,r,r,.02,ACIER2,n);const t=new THREE.TorusGeometry(r,.018,4,n);t.rotateX(Math.PI/2);t.translate(x,y+h,z);B.add(t,ACIER2);return B;}

// ---------- la barge (LCVP) : 3,8 × 1,7 ----------
export const BARGE={L:3.8,W:1.7,hinge:[1.66,.13,0],guns:[[-1.5,.98,.56],[-1.5,.98,-.56]]};
function lcvpHull(B){const {L,W}=BARGE,hw=W/2;
  B.box(-.05,0,0,L*.92,.13,W*.84,GRIS2);B.box(-.1,-.04,0,L*.8,.05,.14,NOIR);
  // les hauts flancs droits jusqu'au plat-bord, le liston, les raidisseurs, le numéro de coque
  for(const s of [-1,1]){B.box(-.12,.13,s*(hw-.04),L*.88,.62,.08,GRIS);B.box(-.12,.75,s*(hw-.03),L*.89,.05,.11,GRIS3);B.box(-.12,.26,s*(hw+.005),L*.88,.035,.025,GRIS2);
    for(let k=0;k<7;k++)B.box(1.25-k*.42,.14,s*(hw+.004),.03,.6,.02,GRIS2);
    for(let k=0;k<3;k++)B.box(1.1-k*.1,.44,s*(hw+.02),.06,.13,.005,BLANC);B.box(.74,.44,s*(hw+.02),.14,.04,.005,BLANC);}
  B.box(.12,.13,0,2.7,.025,W*.86,BOIS);for(let k=0;k<8;k++)B.box(1.35-k*.33,.155,0,.035,.012,W*.84,BOIS2);
  for(const s of [-1,1])B.box(1.64,.13,s*(hw-.07),.13,.66,.09,ACIER2);
  // l'arrière : le pont surélevé, le capot du moteur, le tableau
  B.box(-1.5,.13,0,.8,.3,W*.88,GRIS2);B.box(-1.5,.43,0,.82,.04,W*.9,GRIS3);B.box(-1.8,.47,0,.2,.13,.44,ACIER);B.box(-1.8,.6,0,.22,.03,.46,ACIER2);B.box(-1.88,.13,0,.05,.66,W*.9,GRIS);
  // le barreur : une plaque blindée debout devant lui, sa fente, la barre
  B.box(-1.12,.47,0,.06,.4,.42,ACIER);B.box(-1.085,.72,0,.012,.045,.3,NOIR);B.cyl(-1.24,.47,0,.025,.025,.22,ACIER2,6);B.box(-1.24,.69,0,.02,.02,.18,NOIR);
  // les deux cuves de mitrailleur (le pivot et l'arme sont les pièces « affut »)
  for(const [gx,,gz] of BARGE.guns){tub(B,gx,.47,gz,.22,.3,GRIS3);B.cyl(gx+.1,.47,gz,.025,.025,.43,ACIER2,6);}
  for(const s of [-1,1])for(const x of [1.0,-.7])B.box(x,.8,s*(hw-.03),.08,.03,.05,ACIER2);
  B.cyl(-1.82,.47,.25,.03,.03,.36,NOIR,6);
  return B;}
function lcvpRamp(B){const {W,hinge}=BARGE,[hx,hy]=hinge,rw=W*.84;
  B.box(hx,hy,0,.08,.74,rw,ACIER);for(let k=0;k<5;k++)B.box(hx+.05,hy+.07+k*.14,0,.025,.035,rw*.96,ACIER2);B.box(hx,hy+.72,0,.12,.04,rw*1.02,GRIS3);
  for(const s of [-1,1])B.rod([hx,hy+.74,s*rw*.45],[hx-.6,hy+.68,s*rw*.48],.008,NOIR);
  return B;}
const gunPart=(p)=>{const B=new Build();mg(B,p,.42);return B.geo();};
export function bargeModel(){const {L,W,hinge,guns}=BARGE;const H=lcvpHull(new Build()).geo(),R=lcvpRamp(new Build()).geo(),G1=gunPart(guns[0]),G2=gunPart(guns[1]);
  const full=lcvpRamp(lcvpHull(new Build()));for(const p of guns)mg(full,p,.42);const F=full.geo();H.computeBoundingBox();const bh=H.boundingBox;
  return {ext:[L,Math.max(.8,bh.max.y),W],name:'barge',geo:H,full:F,mat:null,seats:{pilot:[-1.3,.47,0],gunners:guns.map(([x,,z])=>[x,.5,z])},
    parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[...hinge]},{name:'affut',geo:G1,pivot:[...guns[0]]},{name:'affut2',geo:G2,pivot:[...guns[1]]}],
    byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:hinge},affut:{geo:G1,pivot:guns[0]},affut2:{geo:G2,pivot:guns[1]}}};}

// ---------- la grande barge (LCT) : 7 × 2,6 ----------
export const GBARGE={L:7,W:2.6,hinge:[3.36,.14,0],guns:[[-2.5,1.55,.92],[-2.5,1.55,-.92]]};
function lctHull(B){const {L,W}=GBARGE,hw=W/2;
  B.box(-.05,0,0,L*.96,.14,W*.92,GRIS2);B.box(0,-.04,0,L*.9,.05,.24,NOIR);
  // les hauts pavois du pont des véhicules, leurs raidisseurs, leur liston ; les numéros
  for(const s of [-1,1]){B.box(.4,.14,s*(hw-.06),5.9,.82,.12,GRIS);B.box(.4,.96,s*(hw-.05),5.92,.05,.15,GRIS3);B.box(.4,.3,s*(hw+.005),5.9,.04,.025,GRIS2);
    for(let k=0;k<14;k++)B.box(3.1-k*.44,.15,s*(hw+.004),.035,.8,.02,GRIS2);
    for(let k=0;k<3;k++)B.box(2.7-k*.15,.5,s*(hw+.02),.09,.18,.005,BLANC);B.box(2.15,.5,s*(hw+.02),.2,.05,.005,BLANC);}
  B.box(.4,.14,0,5.85,.03,W*.86,ACIER2);for(let k=0;k<16;k++)B.box(3.1-k*.36,.17,0,.02,.01,W*.84,ACIER);for(const z of [-.5,.5])B.box(.4,.17,z,5.8,.02,.14,ROUILLE);
  for(const s of [-1,1]){B.box(3.34,.14,s*(hw-.1),.18,.9,.14,ACIER2);B.cyl(3.08,.98,s*(hw-.15),.08,.08,.09,ACIER,8);}
  // l'arrière : le roof, la passerelle vitrée, sa plateforme, le mât, les cheminées, les radeaux ; aux coins avant du roof, les deux cuves des mitrailleuses
  B.box(-2.95,.14,0,1.0,.9,W*.88,GRIS);B.box(-2.95,1.04,0,1.04,.04,W*.9,GRIS3);for(const s of [-1,1])for(const x of [-2.7,-3.15])B.box(x,.5,s*W*.445,.13,.13,.01,VITRE);
  B.box(-3.05,1.08,0,.6,.38,1.0,GRIS);B.box(-2.74,1.24,0,.012,.13,.9,VITRE);for(const s of [-1,1])B.box(-3.05,1.24,s*.502,.5,.13,.012,VITRE);B.box(-3.05,1.46,0,.66,.04,1.1,GRIS3);
  for(const [gx,,gz] of GBARGE.guns){tub(B,gx,1.08,gz,.24,.28,GRIS3);B.cyl(gx+.1,1.08,gz,.025,.025,.4,ACIER2,6);}
  B.rod([-3.2,1.5,0],[-3.2,2.35,0],.022,GRIS2);B.rod([-3.2,2.12,-.34],[-3.2,2.12,.34],.012,GRIS2);
  for(const s of [-1,1]){B.cyl(-3.3,1.08,s*.75,.07,.07,.46,NOIR,8);B.box(-2.7,.45,s*(hw+.03),.46,.2,.07,0xb8743a);}
  B.box(-3.47,.14,0,.04,.92,W*.92,GRIS2);
  return B;}
function lctRamp(B){const {W,hinge}=GBARGE,[hx,hy]=hinge,rw=W*.86;
  B.box(hx,hy,0,.1,.9,rw,ACIER);for(let k=0;k<6;k++)B.box(hx+.06,hy+.07+k*.14,0,.03,.04,rw*.96,ACIER2);B.box(hx,hy+.88,0,.14,.05,rw*1.02,GRIS3);
  for(const s of [-1,1])B.rod([hx,hy+.88,s*rw*.45],[hx-.28,hy+.92,s*rw*.48],.012,NOIR);
  return B;}
export function grandeBargeModel(){const {L,W,hinge,guns}=GBARGE;const H=lctHull(new Build()).geo(),R=lctRamp(new Build()).geo(),G1=gunPart(guns[0]),G2=gunPart(guns[1]);
  const full=lctRamp(lctHull(new Build()));for(const p of guns)mg(full,p,.42);const F=full.geo();H.computeBoundingBox();const bh=H.boundingBox;
  return {ext:[L,Math.max(1.4,bh.max.y),W],name:'grande_barge',geo:H,full:F,mat:null,seats:{pilot:[-3.05,.86,0],gunners:guns.map(([x,,z])=>[x,1.08,z])},
    parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[...hinge]},{name:'affut',geo:G1,pivot:[...guns[0]]},{name:'affut2',geo:G2,pivot:[...guns[1]]}],
    byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:hinge},affut:{geo:G1,pivot:guns[0]},affut2:{geo:G2,pivot:guns[1]}}};}

// ---------- le bateau bèè : une coque de planches (bois clair, bords renforcés), une barre à l'arrière, une planche à l'avant qui sert de rampe ----------
const BEE={L:3.4,W:1.3};
function boatHull(){const {L,W}=BEE,B=new Build(),BOIS=0x9a6a3a,BOIS2=0x6a4426,CLAIR=0xc89a5a;
  B.box(0,0,0,L*.86,.12,W*.7,BOIS2);
  for(const s of [-1,1]){B.box(-.1,.12,s*W*.4,L*.74,.3,.08,BOIS);B.box(-.1,.42,s*W*.4,L*.74,.04,.1,CLAIR);}
  for(const s of [-1,1]){const g=new THREE.BoxGeometry(.8,.3,.08);g.rotateY(-s*.55);g.translate(L*.34,.12+.15,s*W*.28);B.add(g,BOIS);}
  B.box(-L*.42,.12,0,.08,.3,W*.72,BOIS);B.box(-.1,.12,0,L*.8,.03,W*.62,0x7a5a36);
  for(let k=0;k<4;k++)B.box(.5-k*.5,.15,0,.06,.04,W*.64,BOIS2);   // les bancs
  B.cyl(-L*.4,.12,0,.03,.03,.7,BOIS2,6);B.box(-L*.4,.8,0,.08,.03,.5,BOIS2);   // la barre
  return B.geo();}
function boatRamp(){const {W}=BEE,hinge=[1.52,.14,0],B=new Build();B.box(hinge[0]-.06,hinge[1],0,.08,.36,W*.62,0x7a5a36);B.box(hinge[0]-.06,hinge[1]+.34,0,.1,.04,W*.64,0xc89a5a);return B.geo();}
export function bateauModel(){const {L,W}=BEE,hinge=[1.52,.14,0],H=boatHull(),R=boatRamp();H.computeBoundingBox();const bh=H.boundingBox;
  return {ext:[L,Math.max(.6,bh.max.y),W],name:'bateau_bee',geo:H,mat:null,seats:{pilot:[-L*.4,.12,0]},parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[hinge[0]-.06,hinge[1],hinge[2]]}],byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:[hinge[0]-.06,hinge[1],hinge[2]]}}};}
