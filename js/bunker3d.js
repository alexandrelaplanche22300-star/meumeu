// Oberkommando der Meumeu — les bunkers en 3D : un modèle par plan et par orientation, bâti case par case depuis le plan (bunkerdata.js).
// Vue en coupe : pas de toit, pour qu'on voie la garnison aller et venir ; le sol couvert est sombre, le sol à ciel ouvert est clair, les embrasures sont de
// vraies fentes, les emplacements de pièce portent un affût et un canon, les soutes des caisses. Les portes sont des pièces à part (scene3d), cachées quand
// la charge les a fait sauter. Repère : x vers la droite (les colonnes du plan), z vers la caméra (les lignes), centré ; une case = une unité.
import * as THREE from './lib/three.module.js';
import {Build,PAL} from './bldg3d.js';
import {BUNKER_IDS,bunkerPlan} from './bunkerdata.js';

const H=.42,T=.62;   // hauteur et épaisseur apparente des murs (bas et fins : on voit l'intérieur ; la case entière reste du béton pour le jeu)
const shade=(hex,k)=>{const c=new THREE.Color(hex);c.multiplyScalar(k);return c.getHex();};
const hash=(a,c,s)=>{const v=Math.sin(a*127.1+c*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};

export function bunkerGeo(id,rot){const P=bunkerPlan(id,rot),B=new Build(),w=P.w,h=P.h;const at=P.at;const wl=(a,c)=>'#ED'.includes(at(a,c));
  B.box(0,0,0,w,.03,h,0x6f6d63);   // l'aire damée sous tout le plan (elle remplit l'empreinte, même aux coins vides)
  for(let c=0;c<h;c++)for(let a=0;a<w;a++){const ch=P.rows[c][a];if(ch===' ')continue;const x=a+.5-w/2,z=c+.5-h/2,v=.92+.16*hash(a,c,id.length),wall=shade(PAL.beton,v),cap=shade(PAL.beton,v*1.14);
    if('#ED'.includes(ch)){
      // un mur fin qui se raccorde à ses voisins : tout le long de la case si un voisin du même axe est un mur, sinon un simple pilier
      const hx=wl(a-1,c)||wl(a+1,c),hz=wl(a,c-1)||wl(a,c+1),sx=hx?1:T,sz=hz?1:T;
      if(ch==='#'){B.box(x,0,z,sx,H,sz,wall);B.box(x,H,z,sx+.03,.04,sz+.03,cap);}
      else if(ch==='E'){B.box(x,0,z,sx,.12,sz,wall);B.box(x,.27,z,sx,H-.27,sz,wall);B.box(x,.12,z,sx*.9,.15,sz*.9,0x1c1b19);B.box(x,H,z,sx+.03,.04,sz+.03,cap);}
      else{B.box(x,.34,z,sx,H-.34,sz,wall);B.box(x,H,z,sx+.03,.04,sz+.03,cap);B.box(x,.03,z,1,.015,1,0x55524a);}}
    else if(ch==='o'){B.box(x,.03,z,1,.02,1,shade(0xb9a77a,v));}
    else{B.box(x,.03,z,1,.015,1,shade(0x6a675d,v));
      if(ch==='G'){const q=P.posts.find(r=>r.a===a&&r.c===c),fx=q?.fx||0,fy=q?.fy||-1;B.cyl(x,.045,z,.24,.28,.14,PAL.metal,10);B.box(x+fx*.32,.18,z+fy*.32,fx?.58:.1,.07,fy?.58:.1,PAL.noir);B.box(x,.18,z,.28,.06,.28,PAL.metalClair);}
      if(ch==='A'){B.box(x-.16,.045,z-.12,.4,.17,.3,PAL.olive);B.box(x+.2,.045,z+.18,.28,.13,.28,PAL.sable);B.box(x-.1,.215,z-.1,.28,.1,.24,PAL.jaune);}}}
  return B.geo();}

export function bunkerModels(){const out={};for(const id of BUNKER_IDS)for(let rot=0;rot<4;rot++){const geo=bunkerGeo(id,rot);const b=geo.boundingBox;out[':bk_'+id+'_'+rot]={ext:[b.max.x-b.min.x,b.max.y,b.max.z-b.min.z],geo};}return out;}
export const bunkerDoorGeo=()=>{const g=new THREE.BoxGeometry(.9,.34,.62);g.translate(0,.17+.03,0);return g;};
