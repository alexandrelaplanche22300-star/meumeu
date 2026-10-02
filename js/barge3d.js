// Oberkommando der Meumeu — les modèles de la mer, faits par le code : la barge de débarquement (une coque à proue en V, un pont, une cabine de pilotage à l'arrière,
// une rampe de proue sur charnière : relevée elle fait mur, baissée elle devient la passerelle), et la cale de lancement (un chantier sur la plage).
// Repère de la barge : la proue vers +x, la largeur sur z, y vers le haut, centrée ; une case = une unité (3,4 de long).
import * as THREE from './lib/three.module.js';
import {Build,PAL} from './bldg3d.js';

const OLIVE=0x6b7048,OLIVE2=0x59603c,PONT=0x4f4a3e,METAL=0x5a5e60;
export const BARGE={L:3.4,W:1.3,hinge:[1.52,.14,0]};

function hull(){const {L,W}=BARGE,B=new Build();
  B.box(0,0,0,L*.9,.14,W*.78,0x3f453a);                          // la quille et le fond
  for(const s of [-1,1]){B.box(-.15,.14,s*W*.43,L*.78,.36,.09,OLIVE);B.box(-.15,.5,s*W*.43,L*.78,.05,.12,OLIVE2);}   // les flancs et leur liston
  // la proue en V : deux panneaux inclinés qui se rejoignent à l'étrave
  for(const s of [-1,1]){const g=new THREE.BoxGeometry(.95,.36,.09);g.rotateY(-s*.5);g.translate(L*.37,.14+.18,s*W*.3);B.add(g,OLIVE);const t=new THREE.BoxGeometry(.95,.05,.12);t.rotateY(-s*.5);t.translate(L*.37,.5+.025,s*W*.3);B.add(t,OLIVE2);}
  B.box(-L*.44,.14,0,.1,.36,W*.8,OLIVE);                          // le tableau arrière
  B.box(-.1,.14,0,L*.84,.04,W*.72,PONT);                          // le pont
  for(let k=0;k<5;k++)B.box(.6-k*.45,.18,0,.05,.025,W*.7,0x3d392f);   // les lattes du pont
  // la cabine de pilotage, à l'arrière : une casemate basse, une fente, un toit
  B.box(-L*.3,.18,0,.55,.5,.5,OLIVE2);B.box(-L*.3,.68,0,.62,.05,.56,OLIVE);B.box(-L*.3+.28,.42,0,.03,.07,.34,0x16201c);
  B.cyl(-L*.4,.18,.28,.04,.04,.45,METAL,6);                        // un tube d'échappement
  return B.geo();}

function ramp(){const {W,hinge}=BARGE,B=new Build();
  // la rampe relevée : une plaque épaisse debout sur la charnière (le bas est sur le pont) ; pivote autour de la charnière quand on la baisse
  B.box(hinge[0],hinge[1],0,.1,.5,W*.7,0x4a5048);B.box(hinge[0]+.05,hinge[1]+.04,0,.03,.42,W*.62,0x6a7060);B.box(hinge[0],hinge[1]+.46,0,.14,.05,W*.72,METAL);
  return B.geo();}

export function bargeModel(){const {L,W,hinge}=BARGE,H=hull(),R=ramp();const bh=H.boundingBox;
  return {ext:[L,Math.max(.7,bh.max.y),W],name:'barge',geo:H,mat:null,
    parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[hinge[0],hinge[1],hinge[2]]}],byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:hinge}}};}

// le bateau bèè : une coque de planches (bois clair, bords renforcés), une barre à l'arrière, une planche à l'avant qui sert de rampe (pivot comme la barge)
function boatHull(){const {L,W}=BARGE,B=new Build(),BOIS=0x9a6a3a,BOIS2=0x6a4426,CLAIR=0xc89a5a;L;
  B.box(0,0,0,L*.86,.12,W*.7,BOIS2);
  for(const s of [-1,1]){B.box(-.1,.12,s*W*.4,L*.74,.3,.08,BOIS);B.box(-.1,.42,s*W*.4,L*.74,.04,.1,CLAIR);}
  for(const s of [-1,1]){const g=new THREE.BoxGeometry(.8,.3,.08);g.rotateY(-s*.55);g.translate(L*.34,.12+.15,s*W*.28);B.add(g,BOIS);}
  B.box(-L*.42,.12,0,.08,.3,W*.72,BOIS);B.box(-.1,.12,0,L*.8,.03,W*.62,0x7a5a36);
  for(let k=0;k<4;k++)B.box(.5-k*.5,.15,0,.06,.04,W*.64,BOIS2);   // les bancs
  B.cyl(-L*.4,.12,0,.03,.03,.7,BOIS2,6);B.box(-L*.4,.8,0,.08,.03,.5,BOIS2);   // la barre
  return B.geo();}
function boatRamp(){const {W,hinge}=BARGE,B=new Build();B.box(hinge[0]-.06,hinge[1],0,.08,.36,W*.62,0x7a5a36);B.box(hinge[0]-.06,hinge[1]+.34,0,.1,.04,W*.64,0xc89a5a);return B.geo();}
export function bateauModel(){const {L,W,hinge}=BARGE,H=boatHull(),R=boatRamp();const bh=H.boundingBox;
  return {ext:[L,Math.max(.6,bh.max.y),W],name:'bateau_bee',geo:H,mat:null,parts:[{name:'caisse',geo:H,pivot:[0,0,0]},{name:'rampe',geo:R,pivot:[hinge[0]-.06,hinge[1],hinge[2]]}],byName:{caisse:{geo:H,pivot:[0,0,0]},rampe:{geo:R,pivot:[hinge[0]-.06,hinge[1],hinge[2]]}}};}

// la cale : un chantier sur la plage — deux longrines et des traverses vers la mer, des couples de coque en construction, un hangar de treuil, un portique
export function caleGeo(W,D){const B=new Build();
  B.box(0,0,0,W,.05,D,0x8a7a5a);                                    // le sol damé (W : le long de la plage, D : en travers)
  for(const z of [-.5,.5]){B.box(0,.05,z,W*.96,.1,.16,PAL.boisSombre);}   // les longrines (vers la mer, des deux côtés : la cale sert de l'est ou de l'ouest)
  for(let x=-W/2+.35;x<W/2;x+=.55)B.box(x,.05,0,.16,.06,D*.8,PAL.bois);   // les traverses
  for(let k=0;k<5;k++){B.box(-.9+k*.45,.16,0,.05,.45,.8,PAL.boisSombre);}   // les couples d'une coque en construction
  B.box(0,.12,0,W*.7,.1,.1,PAL.boisClair);                          // la quille posée sur les longrines
  B.box(-W*.35,.05,-D*.36,1.3,.8,.7,PAL.boisClair);B.gable(-W*.35,.85,-D*.36,1.3,.7,.3,PAL.rouille,'x');B.box(-W*.35,.05,-D*.36+.36,.3,.5,.03,PAL.boisSombre);   // le hangar de treuil
  B.rod([W*.3,.05,-D*.34],[W*.26,1.3,-D*.34],.05,METAL);B.rod([W*.4,.05,-D*.34],[W*.28,1.3,-D*.34],.05,METAL);B.rod([W*.27,1.28,-D*.34],[W*.05,1.28,-D*.34],.04,METAL);   // le portique
  for(let k=0;k<3;k++)B.box(W*.2+k*.2,.05,D*.32,.18,.14,.18,PAL.sable);   // des sacs de sable et du ciment
  return B.geo();}
