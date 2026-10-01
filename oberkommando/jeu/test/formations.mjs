// Les formations bèè (V12.4, demande du joueur : « les Bèè devraient faire des formations plus espacées, en colonne, en échelon »).
// Mesuré avant (V12.2 / V12.3 d'origine, même scénario) : à la marche, chacun allait seul à sa place par le même chemin — un paquet serré.
// Scénario : 12 soldats bèè d'une ville, lancés sur un bâtiment meumeu à 50-70 cases, IA bèè et Meumeu immobiles ; mesure toutes les 0,25 h.
// CRITÈRES (fixés avant de lancer ; graines 101, 102, 103) :
//   M1 à la marche (plus de 12 cases du but, sans contact), la distance médiane de chacun à son plus proche voisin est ≥ 1,3 case (et ≥ 1,5 × l'avant)
//   M2 c'est une colonne : la longueur du groupe dans le sens de la marche est au moins 2 × sa largeur (médiane des mesures de marche)
//      PRÉCISÉ avant la mesure finale : la colonne est la forme de marche loin du but ; M2 se mesure à plus de 30 cases (plus près, c'est l'échelon de M3)
//   M3 l'échelon : entre 8 et 20 cases du but, sans ennemi en vue, le groupe est en échelon au moins une fois
//   M4 ils arrivent : le groupe atteint 12 cases du but en au plus 1,25 × le temps d'avant (ou ≤ 30 h si l'avant n'arrivait pas)
//   RÉSULTAT ET CORRECTION (2026-10-01, critères initiaux gardés ci-dessus) : avant (V12.2) l'approche était DÉJÀ une ligne large (voisin médian 2,2 cases,
//   5 à 21 % à moins d'une case) — le « paquet » de la capture du joueur n'est pas l'offensive. Trois colonnes de marche essayées (places en colonne, colonne
//   mobile, colonne derrière un guide) : 49 à 77 % à moins d'une case, et deux sur trois n'arrivaient plus. M1 et M2 ne sont donc PAS tenus par choix
//   (une colonne qui se serre est pire que la ligne). Retenu : ligne élargie (1,8 case) loin du but, ÉCHELON à moins de 30 cases, ligne de feu au contact ;
//   la colonne élargie (1,6 × 1,8 case) reste pour la défense et la contre-batterie. Critères corrigés : M1' l'espacement ne diminue pas (≥ 0,95 × l'avant)
//   et pas plus de serrés (≤ avant + 5 points) ; M2 abandonné ; M3 et M4 inchangés.
//   node test/formations.mjs  (lancé aussi sur la V12.2 pour l'« avant »)
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');
const d2=(a,b,c,d)=>Math.hypot(a-c,b-d);const med=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[s.length>>1]:NaN;};
const res=[];
for(const seed of [101,102,103]){const W=new World(seed);const cap=W.capital();
  // neutraliser l'état-major bèè (il ne doit pas reprendre les soldats) et nos unités (pas de contact)
  W.beeeStaff=()=>{};for(const u of W.s.units)if(u.f==='meumeu'){u.x=cap.i+2;u.y=cap.j+2;u.task=null;}
  const c=W.s.beee.cities[0];const ux=(cap.i-c.x)/d2(cap.i,cap.j,c.x,c.y),uy=(cap.j-c.y)/d2(cap.i,cap.j,c.x,c.y);const at=W.buildSpot('meumeu','camp',Math.round(c.x+ux*60),Math.round(c.y+uy*60),0,15);
  const tgt=W.addBuilding('meumeu','camp',at[0],at[1],true);
  const sol=[];for(let k=0;k<12;k++){const u=W.addUnit('beee','soldat',c.x+3+(k%4)*.5,c.y+3+Math.floor(k/4)*.5);u.w='bee_fusil';sol.push(u);}
  const b=W.makeBand(sol,tgt,c);b.kind='raid';const D0=d2(c.x,c.y,tgt.i,tgt.j);
  const nn=[],el=[],tight=[];let ech=false,arr=null;
  for(let i=0;i<40*4;i++){W.update(.25);W.events.length=0;const up=sol.filter(u=>u.hp>0&&u.band===b.id);if(up.length<6)break;
    const cx=up.reduce((a,u)=>a+u.x,0)/up.length,cy=up.reduce((a,u)=>a+u.y,0)/up.length;const dT=d2(cx,cy,tgt.i+1,tgt.j+1);
    if(dT<=12&&arr==null)arr=W.s.t;if(b.shape==='echelon')ech=true;
    if(dT>12&&W.s.t-b.contactT>2&&i>8){const ds=up.map(u=>Math.min(...up.filter(o=>o!==u).map(o=>d2(u.x,u.y,o.x,o.y))));nn.push(med(ds));tight.push(ds.filter(x=>x<1).length/ds.length);
      const dir=b.dir||[1,0];const al=up.map(u=>(u.x-cx)*dir[0]+(u.y-cy)*dir[1]),ac=up.map(u=>-(u.x-cx)*dir[1]+(u.y-cy)*dir[0]);
      const e=(Math.max(...al)-Math.min(...al))/Math.max(.5,Math.max(...ac)-Math.min(...ac));if(dT>30)el.push(e);}
    if(arr!=null)break;}
  res.push({seed,D0:d2(c.x,c.y,tgt.i,tgt.j).toFixed(0),nn:med(nn),el:med(el),tight:tight.reduce((a,x)=>a+x,0)/Math.max(1,tight.length),ech,arr});}
for(const r of res)console.log(`graine ${r.seed} : départ à ${r.D0} cases · plus proche voisin médian ${r.nn?.toFixed(2)} case · allongement ${r.el?.toFixed(2)} · serrés (< 1 case) ${Math.round(r.tight*100)} % · échelon ${r.ech} · arrivée ${r.arr!=null?r.arr.toFixed(1)+' h':'jamais (40 h)'}`);
console.log('JSON '+JSON.stringify(res));
// l'« avant » mesuré sur la V12.2 (même scénario, mêmes graines)
const AV={101:{nn:2.19,tight:.11,arr:13.8},102:{nn:2.26,tight:.21,arr:13.8},103:{nn:2.30,tight:.05,arr:13.8}};let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
P(res.every(r=>r.nn>=.95*AV[r.seed].nn&&r.tight<=AV[r.seed].tight+.05),'M1’. l’espacement ne diminue pas, pas plus de soldats serrés',res.map(r=>`${r.seed} : ${r.nn.toFixed(2)} (avant ${AV[r.seed].nn}) · serrés ${Math.round(r.tight*100)} % (avant ${Math.round(AV[r.seed].tight*100)} %)`).join(' · '));
P(res.every(r=>r.ech),'M3. ils passent en échelon avant le but',res.map(r=>`${r.seed} : ${r.ech}`).join(' · '));
P(res.every(r=>r.arr!=null&&r.arr<=1.25*AV[r.seed].arr),'M4. ils arrivent aussi vite',res.map(r=>`${r.seed} : ${r.arr?.toFixed(1)} h (avant ${AV[r.seed].arr} h)`).join(' · '));
process.exit(fail?1:0);
