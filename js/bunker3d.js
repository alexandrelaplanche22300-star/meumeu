// Oberkommando der Meumeu — les bunkers en 3D : un modèle par plan et par orientation, bâti case par case depuis le plan (bunkerdata.js).
// Murs hauts et pleins (chaque case de béton est un bloc entier : ils se rejoignent, coins compris), embrasures en vraies fentes, sol couvert sombre / sol à ciel ouvert clair,
// pièces sur leur affût, soutes en caisses. Les portes sont des pièces à part (scene3d), cachées quand une charge les a fait sauter.
// LE TOIT est un modèle à part (bunkerRoofGeo) : opaque, il cache l'intérieur ; scene3d le rend presque transparent tant que NOS unités sont à l'intérieur.
// Repère : x vers la droite (les colonnes du plan), z vers la caméra (les lignes), centré ; une case = une unité.
import * as THREE from './lib/three.module.js';
import {Build,PAL} from './bldg3d.js';
import {BUNKER_IDS,bunkerPlan} from './bunkerdata.js';

export const WALL_H=.95;
const H=WALL_H;
const shade=(hex,k)=>{const c=new THREE.Color(hex);c.multiplyScalar(k);return c.getHex();};
const hash=(a,c,s)=>{const v=Math.sin(a*127.1+c*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};

export function bunkerGeo(id,rot){const P=bunkerPlan(id,rot),B=new Build(),w=P.w,h=P.h;
  B.box(0,0,0,w,.03,h,0x6f6d63);   // l'aire damée sous tout le plan (elle remplit l'empreinte, même aux coins vides)
  for(let c=0;c<h;c++)for(let a=0;a<w;a++){const ch=P.rows[c][a];if(ch===' ')continue;const x=a+.5-w/2,z=c+.5-h/2,v=.92+.16*hash(a,c,id.length),wall=shade(PAL.beton,v),cap=shade(PAL.beton,v*1.14);
    if(ch==='#'){B.box(x,0,z,1,H,1,wall);B.box(x,H,z,1.02,.05,1.02,cap);}
    else if(ch==='E'){B.box(x,0,z,1,.42,1,wall);B.box(x,.62,z,1,H-.62,1,wall);B.box(x,.42,z,.9,.2,.9,0x16150f);B.box(x,H,z,1.02,.05,1.02,cap);}      // une fente de 0,2 de haut, à hauteur de tireur
    else if(ch==='D'){B.box(x,.7,z,1,H-.7,1,wall);B.box(x,H,z,1.02,.05,1.02,cap);B.box(x,.03,z,1,.015,1,0x55524a);}                               // le linteau : la porte (pièce à part) passe dessous
    else if(ch==='o'){B.box(x,.03,z,1,.02,1,shade(0xb9a77a,v));}
    else{B.box(x,.03,z,1,.015,1,shade(0x6a675d,v));
      if(ch==='G'){const q=P.posts.find(r=>r.a===a&&r.c===c),fx=q?.fx||0,fy=q?.fy||-1;B.cyl(x,.045,z,.26,.3,.2,PAL.metal,10);B.box(x+fx*.34,.26,z+fy*.34,fx?.62:.1,.09,fy?.62:.1,PAL.noir);B.box(x,.26,z,.3,.07,.3,PAL.metalClair);}
      if(ch==='A'){B.box(x-.16,.045,z-.12,.42,.2,.32,PAL.olive);B.box(x+.2,.045,z+.18,.3,.15,.3,PAL.sable);B.box(x-.1,.245,z-.1,.3,.12,.26,PAL.jaune);}}}
  return B.geo();}

// le toit : une dalle de béton sur chaque case de sol couvert (. G A) et sur la porte ; pas sur les fosses à ciel ouvert (o) ; les murs ont déjà leur chapeau
export function bunkerRoofGeo(id,rot){const P=bunkerPlan(id,rot),B=new Build(),w=P.w,h=P.h;let any=false;
  for(let c=0;c<h;c++)for(let a=0;a<w;a++){const ch=P.rows[c][a];if(!'.GAD'.includes(ch))continue;const x=a+.5-w/2,z=c+.5-h/2,v=.94+.12*hash(a,c,id.length+7);any=true;
    B.box(x,H+.0,z,1.02,.1,1.02,shade(0x9a9d92,v));}
  return any?B.geo():null;}

export function bunkerModels(){const out={};for(const id of BUNKER_IDS)for(let rot=0;rot<4;rot++){const geo=bunkerGeo(id,rot);const b=geo.boundingBox;out[':bk_'+id+'_'+rot]={ext:[b.max.x-b.min.x,b.max.y,b.max.z-b.min.z],geo};}return out;}
export const bunkerDoorGeo=()=>{const g=new THREE.BoxGeometry(.96,.7,.62);g.translate(0,.35+.03,0);return g;};
