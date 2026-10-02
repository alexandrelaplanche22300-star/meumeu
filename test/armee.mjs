// L'armée bèè : une formation offensive conventionnelle, massive, une seule à la fois — pas de raids ni de diversions.
// CRITÈRES (fixés avant de lancer ; joueur automatique, 3 graines de 30 jours) :
//   A1 jamais deux formations offensives à la fois (hors défense, contre-batterie, reprise)
//   A2 aucune formation « diversion », et chaque formation offensive part avec au moins 24 soldats
//   A3 massive : la plus grande formation d'une partie compte ≥ 30 soldats, dans chacune des graines qui en lancent
//   A4 il y a des offensives : au moins 1 lancée par partie en moyenne
//   A5 aucune exception d'exécution
//   (garde-fou de guerre : voir test/LISEZ-MOI.md — à mesurer à part sur les 9 graines)
// CORRECTION DE CONCEPTION (2026-10-01, demande du joueur : « guerre totale », « les villes deviennent des forteresses, les assauts brutaux ») : l'escalade
//   (raidK, beee.js) permet 1 colonne au niveau 0-2, 2 au niveau 3-4, 3 au niveau 5. A1 initial gardé et affiché ; A1 corrigé : jamais plus de colonnes
//   que l'escalade n'en permet au niveau atteint (3 au plus). A2 inchangé (≥ 24 : le plancher de raidK.armyMin est remonté à 24 pour cela).
//   ELECTRON_RUN_AS_NODE=1 ../.runtime/electron.exe test/armee.mjs [graines]
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {player}=await import('./bot.mjs');
const seeds=(process.argv[2]||'101,102,103').split(',').map(Number),days=+(process.argv[3]||30);
let fail=0;const P=(ok,t,d)=>{if(!ok)fail++;console.log(`${ok?'PASS':'FAIL'}  ${t}  [${d}]`);};
const R=[];
for(const seed of seeds){const W=new World(seed),Pl=player(W),B=W.s.beee;const seen=new Map();let maxConc=0,errs=0,diversion=0,overK=0;
  for(let h=0;h<days*24;h++){try{Pl.tick();W.update(1);}catch(e){errs++;if(errs>3)break;}
    const off=(B.bands||[]).filter(b=>b.kind!=='defense'&&b.kind!=='contre'&&b.kind!=='reprise'&&b.state!=='repli');maxConc=Math.max(maxConc,off.length);if(off.length>W.raidK().maxcol)overK++;
    for(const b of (B.bands||[])){if(b.aim==='diversion')diversion++;if(b.kind!=='defense'&&b.kind!=='contre'&&b.kind!=='reprise'&&!seen.has(b.id))seen.set(b.id,{peak:b.peak||b.m.length,aim:b.aim,day:W.day});}}
  const sizes=[...seen.values()].map(x=>x.peak);R.push({seed,n:sizes.length,sizes,maxConc,diversion,errs,overK});
  console.log(`graine ${seed} : ${sizes.length} offensive(s), tailles ${sizes.join(', ')||'—'} · simultanées max ${maxConc} · diversions ${diversion}`);}
console.log(`${R.every(r=>r.maxConc<=1)?'(initial réussi)':'(initial non tenu)'}  A1 initial. une seule armée à la fois  [${R.map(r=>`${r.seed}:${r.maxConc}`).join(' ')}]`);
P(R.every(r=>r.overK===0&&r.maxConc<=3),'A1 corrigé. jamais plus de colonnes que l’escalade n’en permet (1, 2 puis 3)',R.map(r=>`${r.seed}:max ${r.maxConc}, heures au-delà ${r.overK}`).join(' '));
P(R.every(r=>r.diversion===0&&r.sizes.every(x=>x>=24)),'A2. ni diversion ni petite formation (≥ 24 au départ)',R.map(r=>`${r.seed}:min ${r.sizes.length?Math.min(...r.sizes):'—'}`).join(' '));
P(R.filter(r=>r.n>0).every(r=>Math.max(...r.sizes)>=30),'A3. la plus grande formation compte ≥ 30 soldats',R.map(r=>`${r.seed}:max ${r.sizes.length?Math.max(...r.sizes):'—'}`).join(' '));
P(R.reduce((a,r)=>a+r.n,0)/R.length>=1,'A4. au moins 1 offensive par partie en moyenne',`${(R.reduce((a,r)=>a+r.n,0)/R.length).toFixed(1)} par partie`);
P(R.every(r=>r.errs===0),'A5. aucune exception',R.map(r=>`${r.seed}:${r.errs}`).join(' '));
process.exit(fail?1:0);
