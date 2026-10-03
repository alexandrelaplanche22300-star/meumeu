// Oberkommando der Meumeu — les modèles de la mer, faits par le code.
//  · la barge de débarquement (V12.5 : d'après la LCVP « Higgins » du 6 juin 1944) : une caisse à flancs droits en contreplaqué peint gris marine, une rampe d'acier
//    de toute la largeur à l'avant (relevée elle fait mur, baissée elle devient la passerelle), le puits des soldats au plancher de bois, à l'arrière le poste
//    surélevé du barreur derrière sa plaque, les deux cuves de mitrailleur de poupe et le capot du moteur ;
//  · la grande barge (V12.5 : d'après les barges de chars LCT) : une longue coque plate, le pont des véhicules à rails entre deux hauts pavois, une rampe de
//    toute la largeur, et à l'arrière le roof, la passerelle vitrée, le mât, les cheminées, les radeaux — et sur la passerelle la mitrailleuse lourde sur son
//    affût tournant (la pièce « affut » : elle pivote avec le tir, le canon vers l'arrière au repos) ;
//  · le bateau bèè : une coque de planches, une planche en guise de rampe.
// Repère : la proue vers +x, la largeur sur z, y vers le haut, centré ; une case = une unité. Chaque modèle donne aussi les places de l'équipage (seats).
import * as THREE from './lib/three.module.js';
import {Build} from './bldg3d.js';

const GRIS=0x66706a,GRIS2=0x4b534e,GRIS3=0x7d877f,ACIER=0x5a6164,ACIER2=0x434a4d,BOIS=0x5c5040,BOIS2=0x463d31,BLANC=0xe8e6dc,NOIR=0x1a1f1d,VITRE=0x9fb8c4,ROUILLE=0x6e4a34;

// ---------- la barge (LCVP) : 3,4 × 1,3 ----------
export const BARGE={L:3.4,W:1.3,hinge:[1.47,.12,0]};
function lcvpHull(B){const {L,W}=BARGE,hw=W/2;
  // le fond (un peu plus étroit : la caisse s'évase vers le haut) et la quille
  B.box(-.05,0,0,L*.9,.12,W*.8,GRIS2);B.box(-.1,-.04,0,L*.8,.05,.12,NOIR);
  // les flancs droits, jusqu'au plat-bord ; le liston (une bande plus claire), les raidisseurs verticaux à l'extérieur
  for(const s of [-1,1]){B.box(-.12,.12,s*(hw-.04),L*.86,.42,.07,GRIS);B.box(-.12,.54,s*(hw-.03),L*.87,.05,.1,GRIS3);B.box(-.12,.22,s*(hw+.005),L*.86,.035,.025,GRIS2);
    for(let k=0;k<6;k++)B.box(1.05-k*.42,.13,s*(hw+.004),.03,.4,.02,GRIS2);
    // le numéro de coque, peint en blanc près de l'avant
    for(let k=0;k<3;k++)B.box(.95-k*.09,.32,s*(hw+.02),.055,.11,.005,BLANC);B.box(.62,.32,s*(hw+.02),.12,.035,.005,BLANC);}
  // le plancher du puits (lattes de bois) et ses traverses
  B.box(.1,.12,0,2.5,.025,W*.8,BOIS);for(let k=0;k<7;k++)B.box(1.2-k*.33,.145,0,.035,.012,W*.78,BOIS2);
  // les montants de la charnière de la rampe, de chaque côté de la proue
  for(const s of [-1,1])B.box(1.45,.12,s*(hw-.06),.12,.46,.08,ACIER2);
  // l'arrière : le pont surélevé, le capot du moteur, le tableau
  B.box(-1.38,.12,0,.62,.3,W*.86,GRIS2);B.box(-1.38,.42,0,.64,.04,W*.88,GRIS3);B.box(-1.58,.46,0,.24,.13,.42,ACIER);B.box(-1.58,.59,0,.26,.03,.44,ACIER2);
  B.box(-1.69,.12,0,.05,.46,W*.88,GRIS);
  // le poste du barreur : une plaque blindée debout à gauche, sa fente, la barre
  B.box(-1.12,.46,-.2,.06,.34,.38,ACIER);B.box(-1.085,.66,-.2,.012,.04,.26,NOIR);B.cyl(-1.22,.46,-.2,.025,.025,.2,ACIER2,6);B.box(-1.22,.66,-.2,.02,.02,.16,NOIR);
  // les deux cuves de mitrailleur, rondes, à la poupe (vides : la barge de base ne tire pas)
  for(const s of [-1,1]){B.cyl(-1.3,.46,s*.42,.13,.14,.18,GRIS3,12);B.cyl(-1.3,.64,s*.42,.145,.145,.025,ACIER2,12);}
  // les taquets d'amarrage, l'échappement
  for(const s of [-1,1])for(const x of [.9,-.6])B.box(x,.59,s*(hw-.03),.08,.03,.04,ACIER2);
  B.cyl(-1.62,.46,.42,.03,.03,.32,NOIR,6);
  return B;}
function lcvpRamp(B){const {W,hinge}=BARGE,[hx,hy]=hinge,rw=W*.84;
  // la rampe relevée : une plaque d'acier debout sur la charnière, ses nervures horizontales devant, son rebord en haut, ses câbles de levage
  B.box(hx,hy,0,.08,.5,rw,ACIER);for(let k=0;k<4;k++)B.box(hx+.05,hy+.06+k*.12,0,.025,.035,rw*.96,ACIER2);B.box(hx,hy+.49,0,.12,.04,rw*1.02,GRIS3);
  for(const s of [-1,1])B.rod([hx,hy+.5,s*rw*.45],[hx-.55,hy+.46,s*rw*.48],.008,NOIR);
  return B;}
export function bargeModel(){const {L,W,hinge}=BARGE;const H=lcvpHull(new Build()).geo(),R=lcvpRamp(new Build()).geo(),full=lcvpRamp(lcvpHull(new Build())).geo();H.computeBoundingBox();const bh=H.boundingBox;
  return {ext:[L,Math.max(.7,bh.max.y),W],name:'barge',geo:H,full,mat:null,seats:{pilot:[-1.22,.46,-.2]},
    parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[hinge[0],hinge[1],hinge[2]]}],byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:hinge}}};}

// ---------- la grande barge (LCT) : 6 × 2 ----------
export const GBARGE={L:6,W:2,hinge:[2.86,.13,0],gun:[-2.45,1.3,0]};
function lctHull(B){const {L,W}=GBARGE,hw=W/2;
  B.box(-.05,0,0,L*.96,.13,W*.9,GRIS2);B.box(0,-.04,0,L*.9,.05,.2,NOIR);
  // les hauts pavois du pont des véhicules, leurs raidisseurs, leur liston ; les numéros
  for(const s of [-1,1]){B.box(.25,.13,s*(hw-.05),5.1,.56,.1,GRIS);B.box(.25,.69,s*(hw-.04),5.12,.05,.13,GRIS3);B.box(.25,.25,s*(hw+.005),5.1,.04,.025,GRIS2);
    for(let k=0;k<12;k++)B.box(2.6-k*.44,.14,s*(hw+.004),.035,.54,.02,GRIS2);
    for(let k=0;k<3;k++)B.box(2.3-k*.13,.38,s*(hw+.02),.08,.16,.005,BLANC);B.box(1.8,.38,s*(hw+.02),.18,.05,.005,BLANC);}
  // le pont de chargement : des tôles striées, deux rails pour les roues et les chenilles
  B.box(.3,.13,0,5.05,.03,W*.86,ACIER2);for(let k=0;k<14;k++)B.box(2.6-k*.36,.16,0,.02,.01,W*.84,ACIER);for(const z of [-.42,.42])B.box(.3,.16,z,5,.02,.12,ROUILLE);
  // la proue : les deux montants de la charnière, les treuils de la rampe
  for(const s of [-1,1]){B.box(2.85,.13,s*(hw-.08),.16,.62,.12,ACIER2);B.cyl(2.62,.7,s*(hw-.12),.07,.07,.08,ACIER,8);}
  // l'arrière : le roof (logement, machines), la passerelle vitrée, sa plateforme et la rambarde, le mât, les cheminées, les radeaux
  B.box(-2.6,.13,0,.8,.68,W*.86,GRIS);B.box(-2.6,.81,0,.84,.04,W*.88,GRIS3);for(const s of [-1,1])for(const x of [-2.35,-2.75])B.box(x,.42,s*W*.435,.12,.12,.01,VITRE);
  B.box(-2.68,.85,0,.5,.34,.9,GRIS);B.box(-2.42,1.0,0,.012,.12,.8,VITRE);for(const s of [-1,1])B.box(-2.68,1.0,s*.452,.4,.12,.012,VITRE);
  B.box(-2.55,1.19,0,.8,.04,1.1,GRIS3);for(const s of [-1,1])B.rod([-2.95,1.23,s*.55],[-2.15,1.23,s*.55],.012,GRIS2);B.rod([-2.15,1.23,-.55],[-2.15,1.23,.55],.012,GRIS2);
  // le fût de l'affût, fixe sur la plateforme (la mitrailleuse, elle, tourne : la pièce « affut »)
  B.cyl(-2.45,1.19,0,.1,.12,.11,ACIER2,10);
  B.rod([-2.85,1.23,0],[-2.85,2.05,0],.022,GRIS2);B.rod([-2.85,1.85,-.32],[-2.85,1.85,.32],.012,GRIS2);
  for(const s of [-1,1]){B.cyl(-2.9,.85,s*.62,.07,.07,.42,NOIR,8);B.box(-2.35,.4,s*(hw+.03),.42,.18,.06,0xb8743a);}
  B.box(-2.99,.13,0,.04,.7,W*.9,GRIS2);
  return B;}
function lctRamp(B){const {W,hinge}=GBARGE,[hx,hy]=hinge,rw=W*.86;
  B.box(hx,hy,0,.1,.62,rw,ACIER);for(let k=0;k<5;k++)B.box(hx+.06,hy+.06+k*.12,0,.03,.04,rw*.96,ACIER2);B.box(hx,hy+.61,0,.14,.05,rw*1.02,GRIS3);
  for(const s of [-1,1])B.rod([hx,hy+.6,s*rw*.45],[hx-.25,hy+.62,s*rw*.48],.012,NOIR);
  return B;}
// la mitrailleuse lourde et son bouclier, sur l'affût tournant : le canon vers l'arrière (−x) au repos (repos : π)
function lctGun(B){const [gx,gy,gz]=GBARGE.gun;
  B.box(gx,gy,gz,.16,.08,.16,ACIER2);B.box(gx-.04,gy+.08,gz,.3,.09,.09,NOIR);B.cyl(gx-.2,gy+.11,gz+.075,.03,.03,.06,0x5a4a2a,6);
  const t=new THREE.CylinderGeometry(.018,.022,.5,8);t.rotateZ(Math.PI/2);t.translate(gx-.43,gy+.125,gz);B.add(t,NOIR);B.box(gx-.69,gy+.11,gz,.04,.03,.04,NOIR);
  B.box(gx-.2,gy+.04,gz,.03,.24,.32,ACIER);B.box(gx+.14,gy+.06,gz,.06,.05,.12,ACIER2);
  return B;}
export function grandeBargeModel(){const {L,W,hinge,gun}=GBARGE;const H=lctHull(new Build()).geo(),R=lctRamp(new Build()).geo(),G=lctGun(new Build()).geo(),full=lctGun(lctRamp(lctHull(new Build()))).geo();
  H.computeBoundingBox();const bh=H.boundingBox;
  return {ext:[L,Math.max(1.3,bh.max.y),W],name:'grande_barge',geo:H,full,mat:null,seats:{pilot:[-2.6,.85,0],gunner:[gun[0],gun[1],gun[2]]},
    parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[hinge[0],hinge[1],hinge[2]]},{name:'affut',geo:G,pivot:[gun[0],gun[1],gun[2]]}],
    byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:hinge},affut:{geo:G,pivot:gun}}};}

// ---------- le bateau bèè : une coque de planches (bois clair, bords renforcés), une barre à l'arrière, une planche à l'avant qui sert de rampe ----------
function boatHull(){const {L,W}=BARGE,B=new Build(),BOIS=0x9a6a3a,BOIS2=0x6a4426,CLAIR=0xc89a5a;
  B.box(0,0,0,L*.86,.12,W*.7,BOIS2);
  for(const s of [-1,1]){B.box(-.1,.12,s*W*.4,L*.74,.3,.08,BOIS);B.box(-.1,.42,s*W*.4,L*.74,.04,.1,CLAIR);}
  for(const s of [-1,1]){const g=new THREE.BoxGeometry(.8,.3,.08);g.rotateY(-s*.55);g.translate(L*.34,.12+.15,s*W*.28);B.add(g,BOIS);}
  B.box(-L*.42,.12,0,.08,.3,W*.72,BOIS);B.box(-.1,.12,0,L*.8,.03,W*.62,0x7a5a36);
  for(let k=0;k<4;k++)B.box(.5-k*.5,.15,0,.06,.04,W*.64,BOIS2);   // les bancs
  B.cyl(-L*.4,.12,0,.03,.03,.7,BOIS2,6);B.box(-L*.4,.8,0,.08,.03,.5,BOIS2);   // la barre
  return B.geo();}
function boatRamp(){const {W}=BARGE,hinge=[1.52,.14,0],B=new Build();B.box(hinge[0]-.06,hinge[1],0,.08,.36,W*.62,0x7a5a36);B.box(hinge[0]-.06,hinge[1]+.34,0,.1,.04,W*.64,0xc89a5a);return B.geo();}
export function bateauModel(){const {L,W}=BARGE,hinge=[1.52,.14,0],H=boatHull(),R=boatRamp();H.computeBoundingBox();const bh=H.boundingBox;
  return {ext:[L,Math.max(.6,bh.max.y),W],name:'bateau_bee',geo:H,mat:null,seats:{pilot:[-L*.4,.12,0]},parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[hinge[0]-.06,hinge[1],hinge[2]]}],byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:[hinge[0]-.06,hinge[1],hinge[2]]}}};}
