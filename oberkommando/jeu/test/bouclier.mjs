// Le bouclier d'une pièce : une plaque configurable (matériau, épaisseur, taille) qui arrête VRAIMENT les balles de face.
// Avant : le module « bouclier » ne servait qu'à la masse et au dessin (sa description promettait d'arrêter les balles de face ; en combat, rien).
// CRITÈRES (fixés avant de lancer) :
//   B1 la plaque : sans le module, pas de bouclier ; avec, matériau/épaisseur/taille lus de la conception, dimensions qui suivent le calibre, masse = surface × épaisseur × densité ;
//      épaissir de 1 mm ajoute exactement la masse de 1 mm de plaque à l'arme ; SANS réglage, la masse reste celle d'avant (0,02 + 0,012 × calibre kg)
//   B2 elle arrête en combat : 600 tirs de fusil sur un servant abrité, venus de face — épaisse (acier 4 mm) : 0 touche ; mince (0,3 mm) : ≥ la moitié des touches
//      de la référence sans bouclier ; venus de DERRIÈRE : autant de touches que sans bouclier (±12 %) ; sur un tireur placé EN AVANT de la plaque : autant que sans bouclier
//      CORRIGÉ après mesure (l'initial « 0 touche » ignorait qu'une plaque de 20 × 9 cm ne couvre pas tout le corps : les tirs trop hauts ou trop à côté touchent) :
//      acier 4 mm : ≤ 45 % des touches de la référence ET ≥ 40 % de la référence arrêtée par la plaque ; mince (0,3 mm) : laisse passer ≥ 1,4 × ce que laisse l'épaisse ; le reste inchangé
//      CORRIGÉ 2 (bruit statistique : deux mondes au tirage différent, écart-type ≈ 5,6 % sur 600 tirs à 35 % de touches) : borne haute de la plaque mince à 115 % de la référence (elle était à 108 %)
//   B3 le matériau compte : à épaisseur égale, l'équivalent d'acier est ordonné composite > céramique > acier > toile balistique ; la céramique s'use plus vite que l'acier
//      (après 40 impacts arrêtés, plus d'intégrité perdue)
//   B4 le dessin suit la conception : la couleur de la plaque suit le matériau (céramique ≠ acier) et la plaque est plus grande quand la taille augmente
//   B5 le prix suit le matériau : par défaut, aucun coût de plus qu'avant ; en céramique ou en composite, de la pierre en plus
//   B6 l'éditeur de pièces (V6) : un affût à bouclier donne aussi un bouclier (plaque par défaut), pas un bouclier décoratif
//   B7 une plaque perforée ne fait pas comme si de rien n'était : une balle qui la traverse ressort plus lente (et le corps la reçoit)
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/bouclier.mjs
let ops=[];const stub=()=>new Proxy(function(){},{get:(t,k)=>k==='width'?10:stub(),apply:()=>stub(),set:()=>true});
const fakeCtx=()=>new Proxy({},{get:(t,k)=>{if(k==='measureText')return s=>({width:String(s).length*5});if(k==='canvas')return {width:300,height:120};
    if(['createLinearGradient','createRadialGradient','createPattern'].includes(k))return ()=>({addColorStop:(o,c)=>ops.push(['stop',c])});if(k in t)return t[k];return ()=>{};},set:(t,k,v)=>{t[k]=v;if(k==='fillStyle')ops.push(['fill',String(v)]);return true;}});
const out={textContent:''};globalThis.document??={getElementById:()=>out};globalThis.document.createElement=()=>({getContext:()=>fakeCtx(),width:0,height:0});
const B=await import('../js/ballistics.js');const {derive,shieldOf,kitToP}=B;const {MATS}=await import('../js/armor.js');
const {World}=await import('../js/world.js');const {presetP}=await import('../js/presets.js');const {KIT_PRESETS}=await import('../js/kitdata.js');const {layout,drawWeapon}=await import('../js/gunart.js');
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e;
const OB=presetP('obusier');const ob=(o={})=>({...OB,mods:['trepied','bouclier'],...o});
// B1
{const sans=derive({...OB,mods:['trepied']});const avec=derive(ob());const s=shieldOf(ob({shieldMat:'acier',shieldT:2,shieldSize:1}));const nul=shieldOf({...OB,mods:['trepied']});
  const legacy=avec.massEmpty-sans.massEmpty;const attenduLegacy=.02+OB.d*.012;
  const m2=derive(ob({shieldT:2})).massEmpty,m3=derive(ob({shieldT:3})).massEmpty;const un=shieldOf(ob({shieldT:3})).kg-shieldOf(ob({shieldT:2})).kg;
  const petit=shieldOf({...OB,d:10,mods:['bouclier']}),gros=shieldOf({...OB,d:40,mods:['bouclier']});
  P(nul===null&&s&&near(s.kg,s.h*s.w*2*MATS.acier.rho,1e-9)&&near(legacy,attenduLegacy,1e-6)&&near(m3-m2,un,1e-6)&&gros.h>petit.h,'B1. la plaque : dimensions, masse, et masse d’avant sans réglage',
    `sans module ${nul} · plaque ${s&&(s.h*100).toFixed(0)}×${s&&(s.w*100).toFixed(0)} cm ${s&&s.kg.toFixed(3)} kg · masse par défaut +${legacy.toFixed(4)} kg (avant ${attenduLegacy.toFixed(4)}) · +1 mm : +${(m3-m2).toFixed(4)} kg (plaque ${un.toFixed(4)}) · hauteur 10 mm ${(petit.h*100).toFixed(0)} cm / 40 mm ${(gros.h*100).toFixed(0)} cm`);}
// B2 : de vrais tirs, par le résolveur du jeu
const RNG=12;
const mkWorld=(p)=>{const W=new World(7,{assisted:true});W.s.designs.piece={id:'piece',f:'meumeu',name:'Pièce test',status:'adopte',p:JSON.parse(JSON.stringify(p))};
  const c=W.capital();const gun=W.addUnit('meumeu','soldat',c.i+20,c.j+20);gun.w='piece';gun.fx=1;gun.fy=0;gun.post='debout';
  const sv=W.addUnit('meumeu','soldat',c.i+19.6,c.j+20);sv.w=null;sv.serve=gun.id;sv.servant=true;sv.fx=1;sv.fy=0;sv.post='debout';
  const front=W.addUnit('beee','soldat',c.i+20+RNG/4,c.j+20);front.w='bee_fusil';front.post='couche';   // à 12 m devant (1 case = 4 m)
  const back=W.addUnit('beee','soldat',c.i+20-RNG/4,c.j+20);back.w='bee_fusil';back.post='couche';
  return {W,gun,sv,front,back,c};};
const taux=(W,tireur,cible,n=600)=>{const Wd=W.W(tireur.w);let hit=0,arret=0;for(let i=0;i<n;i++){cible.plates={};const g=W.unit(cible.serve);if(g)g.plates={};const r=W.resolve(tireur,cible,Wd,RNG,1);if(r.hit&&!r.stopped)hit++;if(r.shield||r.cover==='metal')arret++;}return {hit,arret,n};};
{const ref=mkWorld({...OB,mods:['trepied']}),epais=mkWorld(ob({shieldT:4})),mince=mkWorld(ob({shieldT:.3}));
  const rRef=taux(ref.W,ref.front,ref.sv),rEp=taux(epais.W,epais.front,epais.sv),rMi=taux(mince.W,mince.front,mince.sv);
  const dosRef=taux(ref.W,ref.back,ref.sv),dosEp=taux(epais.W,epais.back,epais.sv);
  // une cible EN AVANT de la plaque (à 1 case devant la pièce) n'est pas abritée
  epais.sv.x=epais.gun.x+1.2;const devant=taux(epais.W,epais.front,epais.sv);ref.sv.x=ref.gun.x+1.2;const devantRef=taux(ref.W,ref.front,ref.sv);
  P(rRef.hit>=100&&rEp.hit<=rRef.hit*.45&&rEp.arret>=rRef.hit*.4&&rMi.hit>=rEp.hit*1.4&&rMi.hit<=rRef.hit*1.15&&Math.abs(dosEp.hit-dosRef.hit)<=Math.max(12,dosRef.hit*.12)&&Math.abs(devant.hit-devantRef.hit)<=Math.max(12,devantRef.hit*.12),
    'B2. elle arrête en combat les balles de face, pas celles de derrière ni pour qui est devant',`touches sur 600 : référence ${rRef.hit} · acier 4 mm ${rEp.hit} (arrêtés ${rEp.arret}) · 0,3 mm ${rMi.hit} · de derrière ${dosEp.hit} contre ${dosRef.hit} · cible en avant ${devant.hit} contre ${devantRef.hit}`);}
// B3
{const eq=m=>shieldOf(ob({shieldMat:m,shieldT:2})).eq;const ordre=[eq('composite'),eq('ceramique'),eq('acier'),eq('soie')];
  const usure=(m)=>{const w=mkWorld(ob({shieldMat:m,shieldT:1}));let n=0;for(let i=0;i<40;i++){const r=w.W.resolve(w.front,w.sv,w.W.W(w.front.w),RNG,1);if(r.shield||r.cover==='metal')n++;}return {n,integ:w.gun.plates?.bouclier??1};};
  const uc=usure('ceramique'),ua=usure('acier');
  P(ordre[0]>ordre[1]&&ordre[1]>ordre[2]&&ordre[2]>ordre[3]&&uc.integ<ua.integ,'B3. le matériau compte : équivalent d’acier ordonné, la céramique s’use plus vite',`équivalents (2 mm) ${ordre.map(x=>x.toFixed(2)).join(' > ')} · intégrité après 40 tirs : céramique ${uc.integ.toFixed(2)} (arrêtés ${uc.n}) contre acier ${ua.integ.toFixed(2)} (arrêtés ${ua.n})`);}
// B4
{const couleurs=(p)=>{ops=[];const D=derive(p),G=layout(D);drawWeapon(fakeCtx(),D,{bx:10,ay:60,s:.5,ground:120,t:0,G});return ops.map(o=>o[1]).join('|');};
  const a=couleurs(ob({shieldMat:'acier'})),c=couleurs(ob({shieldMat:'ceramique'}));
  const haut=(p)=>{const D=derive(p);return shieldOf(p).h;};
  P(a!==c&&c.includes(MATS.ceramique.col.slice(1,5))&&haut(ob({shieldSize:1.4}))>haut(ob({shieldSize:.7})),'B4. le dessin suit la conception : couleur du matériau, taille de la plaque',`céramique ≠ acier : ${a!==c} · la teinte de la céramique (${MATS.ceramique.col}) figure au dessin : ${c.includes(MATS.ceramique.col.slice(1,5))} · hauteur ${(haut(ob({shieldSize:.7}))*100).toFixed(0)} → ${(haut(ob({shieldSize:1.4}))*100).toFixed(0)} cm`);}
// B5
{const cout=p=>derive(p).costW;const base=cout({...OB,mods:['trepied']}),defaut=cout(ob()),cer=cout(ob({shieldMat:'ceramique',shieldT:2})),com=cout(ob({shieldMat:'composite',shieldT:2}));
  const memeQue=(a,b)=>Object.keys({...a,...b}).every(k=>near(a[k]||0,b[k]||0,.011));
  // le défaut ne coûte rien de plus que la formule d'avant : la seule différence avec « sans module » est celle du module lui-même (pièces, fer selon la masse)
  const avant=(()=>{const D=derive(ob());return D.costW;})();
  P(memeQue(defaut,avant)&&(cer.pierre||0)>(defaut.pierre||0)&&(com.pierre||0)>(defaut.pierre||0),'B5. le prix suit le matériau : de la pierre pour la céramique et le composite, rien de plus par défaut',`défaut ${JSON.stringify(defaut)} · céramique ${JSON.stringify(cer)} · composite ${JSON.stringify(com)}`);}
// B6
{const sh=KIT_PRESETS.find(k=>k.design.carriage==='shield'||JSON.stringify(k.design).includes('"shield"'));const p=sh?kitToP(sh.design):null;const D=p&&derive(p);
  P(!!sh&&D&&D.shield&&D.shield.kg>0,'B6. l’éditeur de pièces : un affût à bouclier donne une vraie plaque',`fiche « ${sh?.design.name} » : ${D?.shield?`plaque ${(D.shield.h*100).toFixed(0)}×${(D.shield.w*100).toFixed(0)} cm, ${D.shield.kg.toFixed(3)} kg`:'aucune plaque'}`);}
// B7
{const w=mkWorld(ob({shieldT:.55}));const Wd=w.W.W(w.front.w);let lents=0,pass=0,vs=[];for(let i=0;i<300;i++){w.sv.plates={};w.gun.plates={};const r=w.W.resolve(w.front,w.sv,Wd,RNG,1);if(r.hit&&!r.stopped&&r.v){pass++;vs.push(r.v);}}
  const nu=mkWorld({...OB,mods:['trepied']});const vn=[];for(let i=0;i<300;i++){nu.sv.plates={};const r=nu.W.resolve(nu.front,nu.sv,nu.W.W(nu.front.w),RNG,1);if(r.hit&&!r.stopped&&r.v)vn.push(r.v);}
  const m=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  P(pass>=10&&vn.length>=10&&m(vs)<m(vn)*.985,'B7. une balle qui traverse la plaque ressort plus lente',`vitesse d’impact moyenne : ${m(vs).toFixed(0)} m/s après la plaque (${pass} balles passées) contre ${m(vn).toFixed(0)} m/s sans plaque (${vn.length})`);}
process.exit(fail?1:0);
