// Les Bèè loin de tout Meumeu ne sont simulés qu'un pas sur quatre (niveau de détail, world.js) : à l'écran ils restaient immobiles trois images puis
// sautaient (« les mouvements des Bèè sont très saccadés »). Correction : World.lodShow les montre en chemin entre deux de leurs pas ; View.draw remet
// aussitôt leur vraie place. La simulation ne change pas.
// CRITÈRES (fixés avant de lancer) :
//   S1 pour les Bèè éloignés qui marchent, le déplacement affiché d'une image à l'autre est régulier : coefficient de variation ≤ 0,5 et pas de pas
//      plus grand que 2 × le pas moyen, médiane des unités (avant, attendu : 0, 0, 0, puis 4 pas d'un coup → CV ≈ 1,7, rapport 4)
//      CORRIGÉ après mesure (CV 1,23, rapport 14,5 ; sans lissage 2,07 / 5,7) : le détail image par image montre des marcheurs parfaitement réguliers
//      (0,029 case à chaque image) ; les écarts venaient (a) des 2 à 4 premières images, où le test passe de pas d'une heure à des pas d'une image
//      (artefact du test, jamais en jeu), (b) des unités qui s'arrêtent pour travailler ou garder, dont le pas affiché varie par nature.
//      Mesure corrigée : après 8 images de mise en train, sur les seuls marcheurs (animation « walk » à chaque image) ; seuils inchangés.
//      CORRIGÉ 2 (taille d'échantillon : une seule fenêtre d'une heure ne donnait que 4 marcheurs continus, sous le minimum de 5) : trois fenêtres
//      d'une heure, aux jours 2, 3 et 4 ; seuils inchangés.
//   S2 après lodShow puis la remise en place, toutes les positions sont exactement les vraies (la simulation ne voit rien)
//   S3 la simulation est identique avec ou sans affichage : deux mondes de même graine, l'un « dessiné » à chaque pas, l'autre non → mêmes positions au bit près
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/bee_fluide.mjs [graine]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const SEED=+(process.argv[2]||104);
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const FR=1/60/4;   // une image à 60 i/s, à la vitesse 1 (1 h de jeu = 4 s)
const A=new World(SEED),B=new World(SEED),C=new World(SEED);
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[s.length>>1]:NaN;};
let restored=true;const stA=[],stC=[];
// une fenêtre d'une heure (8 images de mise en train + 240 mesurées) : A est « dessiné » (lodShow puis remise), B ne l'est pas, C sert de mesure sans lissage
const shown=W=>{const back=W.lodShow();const pos=new Map(W.s.units.map(u=>[u.id,[u.x,u.y]]));for(const [u,x,y] of back){u.x=x;u.y=y;}return pos;};
const stats=(track,st)=>{for(const [,t] of track){if(t.lod<200||t.pts.length<240||t.walk<t.pts.length)continue;const d=[];for(let i=1;i<t.pts.length;i++)d.push(Math.hypot(t.pts[i][0]-t.pts[i-1][0],t.pts[i][1]-t.pts[i-1][1]));
  const m=d.reduce((x,y)=>x+y,0)/d.length;if(m<1e-4)continue;const sd=Math.sqrt(d.reduce((x,y)=>x+(y-m)**2,0)/d.length);st.push({cv:sd/m,mx:Math.max(...d)/m});}};
const rec=(track,W,pos)=>{for(const u of W.s.units){if(u.f!=='beee'||!(u.hp>0))continue;const p=pos?pos.get(u.id):[u.x,u.y];let t=track.get(u.id);if(!t)track.set(u.id,t={pts:[],lod:0,walk:0});t.pts.push(p);if(u.it!==undefined)t.lod++;if(u.anim==='walk')t.walk++;}};
for(const until of [48,72,96]){
  while(A.s.t<until-1e-9){A.update(1);B.update(1);C.update(1);}
  const tA=new Map(),tC=new Map();
  for(let f=0;f<248;f++){A.update(FR);B.update(FR);C.update(FR);
    const real=new Map(A.s.units.map(u=>[u.id,[u.x,u.y]]));const pos=shown(A);
    for(const u of A.s.units){const r=real.get(u.id);if(u.x!==r[0]||u.y!==r[1])restored=false;}
    if(f<8)continue;rec(tA,A,pos);rec(tC,C,null);}
  stats(tA,stA);stats(tC,stC);}
const cv=med(stA.map(s=>s.cv)),mx=med(stA.map(s=>s.mx));
P(stA.length>=5&&cv<=.5&&mx<=2,'S1. les Bèè éloignés glissent d’une image à l’autre',`${stA.length} marcheurs au pas lent · CV médian ${cv.toFixed(2)} · plus grand pas / pas moyen ${mx.toFixed(2)}`);
P(restored,'S2. les vraies places sont remises après chaque image','');
let same=A.s.units.length===B.s.units.length;for(let i=0;same&&i<A.s.units.length;i++){const a=A.s.units[i],b=B.s.units[i];if(a.id!==b.id||a.x!==b.x||a.y!==b.y)same=false;}
P(same,'S3. la simulation ne voit rien de l’affichage',`${A.s.units.length} unités comparées`);
console.log(`info : sans lissage, CV médian ${med(stC.map(s=>s.cv)).toFixed(2)} · plus grand pas / pas moyen ${med(stC.map(s=>s.mx)).toFixed(2)} (${stC.length} marcheurs)`);
console.log(fail?`${fail} ÉCHEC(S)`:'TOUT PASSE');
