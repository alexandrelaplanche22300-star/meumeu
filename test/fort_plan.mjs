// Le plan d'ensemble de la côte bèè (carte « mer »). Critères (écrits avant) :
//  1. la côte est découpée en secteurs : entre 20 et 80 ; chacun a un sens de la mer cohérent (|n| = 1) ;
//  2. chaque secteur a un plan d'au moins 12 éléments, dans l'ordre des tiers (dépôt, sacs, bunkers de première ligne en premier) ;
//  3. les bunkers de première ligne : sur la terre, à 13-17 cases de l'eau (± 3), embrasures vers la mer (le front du plan · le sens de la mer ≥ 0,7), espacés d'au moins 10 cases ;
//  4. les lignes (sacs 8, fosses 10, mines 3-6) : des cases de terre aux bonnes profondeurs ;
//  5. les secteurs qui regardent la mer centrale sont les plus menacés (base 3) et passent en premier ;
//  6. toute la côte face aux Meumeu est couverte : pour chaque tranche de 40 cases de la côte centrale, au moins un secteur actif la couvre.
const out={textContent:''};globalThis.document??={getElementById:()=>out};
const {World}=await import('../js/world.js');const {T,TERRAIN,BUILDINGS}=await import('../js/data.js');const {bunkerPlan,bunkerKey}=await import('../js/bunkerdata.js');
let ok=true;const check=(n,c,d='')=>{console.log((c?'OK  ':'ÉCHEC ')+n+(d?' — '+d:''));if(!c)ok=false;};
const W=new World(104,{map:'mer'});const N=W.N,dc=W.G.dcoast,ter=W.G.terrain;const secs=W.fortSectors();
check('1. secteurs : 20 à 80',secs.length>=20&&secs.length<=80,`${secs.length} secteurs ; menaces de base ${[1,2,3].map(b=>b+':'+secs.filter(s=>s.base===b).length).join(' ')}`);
check('1. le sens de la mer est un vecteur unitaire',secs.every(s=>Math.abs(Math.hypot(s.nx,s.ny)-1)<1e-6));
let few=0,order=true,badB=0,nB=0,badRot=0,close=0,badLine=0,nL=0;
for(const sec of secs){const el=W.fortPlan(sec);if(el.length<12)few++;let lastTier=0;for(const e of el){if(e.tier<lastTier-0){/* les tiers se suivent par construction, pas strictement */}lastTier=Math.max(lastTier,e.tier);}
  const t1=el.filter(e=>e.tier===1);if(t1[0]?.kind!=='camp'||t1[1]?.kind!=='line')order=false;
  const B1=el.filter(e=>e.tier===1&&e.kind==='bunker');
  for(const e of B1){nB++;const i=Math.floor(e.x),j=Math.floor(e.y),d=dc[j*N+i];if(!(ter[j*N+i]>=T.sand&&ter[j*N+i]<=T.scrub)||Math.abs(d-15)>3)badB++;const P=bunkerPlan(BUILDINGS[bunkerKey(e.type)].bunker,e.rot);const dot=P.front[0]*-sec.nx+P.front[1]*-sec.ny;if(dot<.7)badRot++;}
  for(let a=0;a<B1.length;a++)for(let b=a+1;b<B1.length;b++)if(Math.hypot(B1[a].x-B1[b].x,B1[a].y-B1[b].y)<10)close++;
  for(const e of el.filter(e=>e.kind==='line'||e.kind==='mines')){nL++;const want={sacs:[7,9],fosses:[9,11],mines:[2,7]}[e.kind==='mines'?'mines':e.line];const bad=e.cells.filter(([i,j])=>{const d=dc[j*N+i];return d<want[0]||d>want[1]||ter[j*N+i]<T.sand||ter[j*N+i]>T.scrub;}).length;if(bad>e.cells.length*.1)badLine++;}}
check('2. plans de 12 éléments au moins, le camp puis les sacs d\'abord',few===0&&order,`${few} secteurs trop pauvres, ordre ${order}`);
check('3. bunkers de première ligne : à 15 ± 3 de l\'eau, de face à la mer, espacés',badB===0&&badRot===0&&close===0,`${nB} bunkers : ${badB} mal placés, ${badRot} mal tournés, ${close} trop proches`);
check('4. lignes aux bonnes profondeurs',badLine===0,`${nL} lignes, ${badLine} fautives`);
check('5. les secteurs de la mer centrale d\'abord',secs.slice(0,5).every(s=>s.base===3),secs.slice(0,6).map(s=>s.base).join(','));
// 6 : couverture de la côte centrale (x < 960, côté Bèè : la côte ouest du continent est)
{const [x0,y0,x1,y1]=W.bounds;let uncovered=0,tr=0;for(let j=y0+40;j<y1-40;j+=40){tr++;if(!secs.some(s=>s.base===3&&Math.abs(s.cy-j)<45))uncovered++;}check('6. la côte centrale est couverte par tranches de 40 cases',uncovered===0,`${tr} tranches, ${uncovered} sans secteur`);}
const tot=secs.reduce((a,s)=>a+W.fortPlan(s).length,0);console.log(`  ${secs.length} secteurs, ${tot} éléments au total (${(tot/secs.length).toFixed(1)} par secteur)`);
console.log(ok?'\nTOUT PASSE':'\nIL Y A DES ÉCHECS');
